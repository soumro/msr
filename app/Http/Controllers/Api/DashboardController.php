<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use App\Models\DuplicateFlag;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $byScheme = Scholarship::select('scheme', DB::raw('SUM(approved_amount) as total'))
            ->groupBy('scheme')->orderByDesc('total')->get()
            ->mapWithKeys(fn ($r) => [$r->scheme => (float) $r->total]);

        $byDonor = Scholarship::select('donor', DB::raw('SUM(approved_amount) as total'))
            ->groupBy('donor')->orderByDesc('total')->get()
            ->mapWithKeys(fn ($r) => [$r->donor => (float) $r->total]);

        $renewals = Scholarship::whereIn('renewal_status', ['due','submitted'])
            ->orderBy('renewal_status')->limit(50)->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'student_id' => $r->student_id,
                'student_name' => $r->student_name,
                'scheme' => $r->scheme,
                'category' => $r->category,
                'academic_year' => $r->academic_year,
                'donor' => $r->donor,
                'renewal_status' => $r->renewal_status,
                'approved_amount' => (float) $r->approved_amount,
            ]);

        $receivedThisMonth = (float) Scholarship::whereNotNull('received_date')
            ->whereYear('received_date', now()->year)
            ->whereMonth('received_date', now()->month)
            ->sum('approved_amount');

        $chequesMissing = Scholarship::whereIn('payment_status', ['paid', 'partial'])
            ->whereNull('cheque_no')
            ->count();

        // Fresh vs Renewal breakdown
        $freshCount    = Scholarship::where('category', 'fresh')->count();
        $renewalCount  = Scholarship::where('category', 'renewal')->count();
        $freshAmount   = (float) Scholarship::where('category', 'fresh')->sum('approved_amount');
        $renewalAmount = (float) Scholarship::where('category', 'renewal')->sum('approved_amount');

        return response()->json([
            'total_approved'     => (float) Scholarship::sum('approved_amount'),
            'total_disbursed'    => (float) Scholarship::where('payment_status','paid')->sum('approved_amount'),
            'pending_amount'     => (float) Scholarship::whereIn('payment_status',['pending','partial'])->sum('approved_amount'),
            'received_this_month'=> $receivedThisMonth,
            'cheques_missing'    => $chequesMissing,
            'beneficiaries'      => Scholarship::distinct()->count('cnic'),
            'renewals_due'       => Scholarship::whereIn('renewal_status',['due','submitted'])->count(),
            'duplicate_flags'    => DuplicateFlag::whereIn('review_status',['pending','escalated'])->count(),
            'fresh_count'        => $freshCount,
            'renewal_count'      => $renewalCount,
            'fresh_amount'       => $freshAmount,
            'renewal_amount'     => $renewalAmount,
            'by_scheme'          => $byScheme,
            'by_donor'           => $byDonor,
            'renewals'           => $renewals,
        ]);
    }
}
