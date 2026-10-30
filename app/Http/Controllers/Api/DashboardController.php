<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use App\Models\DuplicateFlag;
use App\Models\Installment;
use App\Support\FiscalYear;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $currentFy  = FiscalYear::current();
        $previousFy = FiscalYear::previous($currentFy);

        $fyStart     = FiscalYear::startOf($currentFy);
        $fyEnd       = FiscalYear::endOf($currentFy);
        $prevStart   = FiscalYear::startOf($previousFy);
        $prevEnd     = FiscalYear::endOf($previousFy);

        // ── Scheme / donor distribution (all-time) ──
        $byScheme = Scholarship::select('scheme', DB::raw('SUM(approved_amount) as total'))
            ->groupBy('scheme')->orderByDesc('total')->get()
            ->mapWithKeys(fn ($r) => [$r->scheme => (float) $r->total]);

        $byDonor = Scholarship::select('donor', DB::raw('SUM(approved_amount) as total'))
            ->groupBy('donor')->orderByDesc('total')->get()
            ->mapWithKeys(fn ($r) => [$r->donor => (float) $r->total]);

        // ── Cash actually received per fiscal year, by installment received_date ──
        // This is the "cash flow" view — attributes each installment to the FY it landed in,
        // regardless of which year the scholarship itself is tagged with.
        $receivedByYear = Installment::where('status', 'received')
            ->whereNotNull('received_date')
            ->get()
            ->groupBy(fn ($i) => FiscalYear::ofDate($i->received_date))
            ->map(fn ($items) => (float) $items->sum('amount'));

        // ── Scholarship aggregates by academic_year (commitment view) ──
        $scholarshipAgg = Scholarship::select('academic_year')
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw('COUNT(DISTINCT COALESCE(cnic, student_id)) as beneficiary_count')
            ->selectRaw('SUM(approved_amount) as amount')
            ->groupBy('academic_year')
            ->get()
            ->keyBy('academic_year');

        // Union of all years seen in either scholarships OR receipts
        $allYears = collect($scholarshipAgg->keys())
            ->merge($receivedByYear->keys())
            ->unique()
            ->sortDesc()
            ->values();

        $byYear = $allYears->map(fn ($year) => [
            'year'             => $year,
            'beneficiaries'    => (int) ($scholarshipAgg[$year]?->beneficiary_count ?? 0),
            'records'          => (int) ($scholarshipAgg[$year]?->record_count ?? 0),
            'amount'           => (float) ($scholarshipAgg[$year]?->amount ?? 0),
            'received_by_date' => (float) ($receivedByYear[$year] ?? 0),
            'is_current'       => $year === $currentFy,
        ])->values();

        // ── Monthly received (last 12 calendar months, rolling) ──
        $months = collect();
        for ($i = 11; $i >= 0; $i--) {
            $m = now()->subMonths($i);
            $months->push([
                'label' => $m->format('M'),
                'year'  => $m->year,
                'month' => $m->month,
                'value' => (float) Scholarship::whereNotNull('received_date')
                    ->whereYear('received_date', $m->year)
                    ->whereMonth('received_date', $m->month)
                    ->sum('approved_amount'),
            ]);
        }

        // ── Current FY KPIs (by scholarship academic_year) ──
        $fyApproved = (float) Scholarship::where('academic_year', $currentFy)->sum('approved_amount');
        $fyRecords  = Scholarship::where('academic_year', $currentFy)->count();

        $fyReceived = (float) Installment::where('status', 'received')
            ->whereHas('scholarship', fn ($q) => $q->where('academic_year', $currentFy))
            ->sum('amount');

        $fyPending = (float) Installment::where('status', 'pending')
            ->whereHas('scholarship', fn ($q) => $q->where('academic_year', $currentFy))
            ->sum('amount');

        // ── Cash in per FY (by installment received_date) ──
        $fyReceivedByDate     = (float) Installment::where('status', 'received')
            ->whereBetween('received_date', [$fyStart->toDateString(), $fyEnd->toDateString()])
            ->sum('amount');

        $prevFyReceivedByDate = (float) Installment::where('status', 'received')
            ->whereBetween('received_date', [$prevStart->toDateString(), $prevEnd->toDateString()])
            ->sum('amount');

        $receivedThisMonth = (float) Scholarship::whereNotNull('received_date')
            ->whereYear('received_date', now()->year)
            ->whereMonth('received_date', now()->month)
            ->sum('approved_amount');

        $chequesMissing = Scholarship::whereIn('payment_status', ['paid', 'partial'])
            ->whereNull('cheque_no')
            ->count();

        $fyDuplicateFlags = DuplicateFlag::where('academic_year', $currentFy)
            ->whereIn('review_status', ['pending', 'escalated'])
            ->count();

        $renewals = Scholarship::whereIn('renewal_status', ['due', 'submitted'])
            ->orderBy('renewal_status')->limit(50)->get()
            ->map(fn ($r) => [
                'id'              => $r->id,
                'student_id'      => $r->student_id,
                'student_name'    => $r->student_name,
                'scheme'          => $r->scheme,
                'category'        => $r->category,
                'academic_year'   => $r->academic_year,
                'donor'           => $r->donor,
                'renewal_status'  => $r->renewal_status,
                'approved_amount' => (float) $r->approved_amount,
            ]);

        return response()->json([
            // ── Fiscal year context ──
            'current_fiscal_year'      => $currentFy,
            'previous_fiscal_year'     => $previousFy,
            'fiscal_year_start'        => $fyStart->toDateString(),
            'fiscal_year_end'          => $fyEnd->toDateString(),
            'previous_fy_start'        => $prevStart->toDateString(),
            'previous_fy_end'          => $prevEnd->toDateString(),
            'fiscal_year_months'       => FiscalYear::monthsOf($currentFy),

            // ── All-time totals ──
            'total_approved'           => (float) Scholarship::sum('approved_amount'),
            'total_disbursed'          => (float) Scholarship::where('payment_status', 'paid')->sum('approved_amount'),
            'pending_amount'           => (float) Scholarship::whereIn('payment_status', ['pending', 'partial'])->sum('approved_amount'),
            'beneficiaries'            => Scholarship::distinct()->count('cnic'),
            'total_records'            => Scholarship::count(),

            // ── Current FY (by scholarship tag) ──
            'fy_approved'              => $fyApproved,
            'fy_records'               => $fyRecords,
            'fy_received'              => $fyReceived,
            'fy_pending'               => $fyPending,
            'fy_renewals_due'          => Scholarship::where('academic_year', $currentFy)
                ->whereIn('renewal_status', ['due', 'submitted'])->count(),
            'fy_duplicate_flags'       => $fyDuplicateFlags,

            // ── Cash in per FY (by installment received_date) ──
            'fy_received_by_date'      => $fyReceivedByDate,
            'previous_fy_received_by_date' => $prevFyReceivedByDate,

            // ── Global KPIs ──
            'received_this_month'      => $receivedThisMonth,
            'cheques_missing'          => $chequesMissing,
            'renewals_due'             => Scholarship::whereIn('renewal_status', ['due', 'submitted'])->count(),
            'duplicate_flags'          => DuplicateFlag::whereIn('review_status', ['pending', 'escalated'])->count(),

            // ── Breakdowns ──
            'by_year'                  => $byYear,
            'by_scheme'                => $byScheme,
            'by_donor'                 => $byDonor,
            'monthly_received'         => $months,
            'renewals'                 => $renewals,
        ]);
    }
}
