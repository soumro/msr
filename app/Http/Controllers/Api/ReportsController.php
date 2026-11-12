<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Installment;
use App\Models\Scholarship;
use App\Support\FiscalYear;
use App\Support\StudentKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    // ==========================================================
    // GROUPED (Funding → Donor → Scheme)
    // ==========================================================
    public function yearEnd(Request $request)
    {
        $years = Scholarship::distinct()->whereNotNull('academic_year')
            ->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year') ?: $years->first();

        if (!$year) {
            return response()->json([
                'academic_year' => null, 'years' => [], 'groups' => [],
                'grand_total' => ['slots' => 0, 'approved' => 0, 'received' => 0],
            ]);
        }

        $fyStart = FiscalYear::startOf($year)->toDateString();
        $fyEnd   = FiscalYear::endOf($year)->toDateString();

        // Approved: sum by group
        $approvedRows = Scholarship::where('academic_year', $year)
            ->select(
                DB::raw("COALESCE(NULLIF(funding_group, ''), 'Unassigned') as funding_group"),
                'donor', 'scheme',
                DB::raw('COUNT(*) as slots'),
                DB::raw('SUM(approved_amount) as approved')
            )
            ->groupBy('funding_group', 'donor', 'scheme')
            ->get()
            ->keyBy(fn ($r) => $r->funding_group . '|' . $r->donor . '|' . $r->scheme);

        // Received: sum of installments landed in this FY, grouped by donor+scheme
        $receivedRows = Installment::where('installments.status', 'received')
            ->whereNotNull('installments.received_date')
            ->whereBetween('installments.received_date', [$fyStart, $fyEnd])
            ->join('scholarships', 'installments.scholarship_id', '=', 'scholarships.id')
            ->where('scholarships.academic_year', $year)
            ->select(
                DB::raw("COALESCE(NULLIF(scholarships.funding_group, ''), 'Unassigned') as funding_group"),
                'scholarships.donor', 'scholarships.scheme',
                DB::raw('SUM(installments.amount) as received')
            )
            ->groupBy('scholarships.funding_group', 'scholarships.donor', 'scholarships.scheme')
            ->get()
            ->keyBy(fn ($r) => $r->funding_group . '|' . $r->donor . '|' . $r->scheme);

        $allKeys = $approvedRows->keys()->merge($receivedRows->keys())->unique()->values();

        $groups = $allKeys->map(function ($key) use ($approvedRows, $receivedRows) {
            [$fundingGroup] = explode('|', $key, 2);
            $approved = $approvedRows->get($key);
            $received = $receivedRows->get($key);

            return [
                'funding_group' => $fundingGroup,
                'donor'  => $approved?->donor ?? $received?->donor,
                'scheme' => $approved?->scheme ?? $received?->scheme,
                'slots'  => (int) ($approved?->slots ?? 0),
                'approved' => (float) ($approved?->approved ?? 0),
                'received' => (float) ($received?->received ?? 0),
            ];
        })
        ->groupBy('funding_group')
        ->map(function ($rows, $groupName) {
            $rows = $rows->sortBy('donor')->values();
            return [
                'funding_group' => $groupName,
                'rows' => $rows,
                'subtotal' => [
                    'slots'    => $rows->sum('slots'),
                    'approved' => $rows->sum('approved'),
                    'received' => $rows->sum('received'),
                ],
            ];
        })
        ->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'slots'    => $groups->sum(fn ($g) => $g['subtotal']['slots']),
                'approved' => $groups->sum(fn ($g) => $g['subtotal']['approved']),
                'received' => $groups->sum(fn ($g) => $g['subtotal']['received']),
            ],
        ]);
    }

    // ==========================================================
    // SUMMARY (donor + scheme flat)
    // ==========================================================
    public function summary(Request $request)
    {
        $years = Scholarship::distinct()->whereNotNull('academic_year')
            ->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year') ?: $years->first();

        $fyStart = $year ? FiscalYear::startOf($year)->toDateString() : null;
        $fyEnd   = $year ? FiscalYear::endOf($year)->toDateString() : null;

        $approvedQuery = Scholarship::query();
        if ($year) $approvedQuery->where('academic_year', $year);

        $approvedRows = $approvedQuery
            ->select('donor', 'scheme', DB::raw('COUNT(*) as slots'), DB::raw('SUM(approved_amount) as approved'))
            ->groupBy('donor', 'scheme')->get()
            ->keyBy(fn ($r) => $r->donor . '|' . $r->scheme);

        $receivedQuery = Installment::where('installments.status', 'received')
            ->whereNotNull('installments.received_date')
            ->join('scholarships', 'installments.scholarship_id', '=', 'scholarships.id');
        if ($year) {
            $receivedQuery->where('scholarships.academic_year', $year)
                ->whereBetween('installments.received_date', [$fyStart, $fyEnd]);
        }
        $receivedRows = $receivedQuery
            ->select('scholarships.donor', 'scholarships.scheme', DB::raw('SUM(installments.amount) as received'))
            ->groupBy('scholarships.donor', 'scholarships.scheme')->get()
            ->keyBy(fn ($r) => $r->donor . '|' . $r->scheme);

        $allKeys = $approvedRows->keys()->merge($receivedRows->keys())->unique()->values();

        $rows = $allKeys->map(function ($key) use ($approvedRows, $receivedRows) {
            $approved = $approvedRows->get($key);
            $received = $receivedRows->get($key);
            return [
                'donor'    => $approved?->donor ?? $received?->donor,
                'scheme'   => $approved?->scheme ?? $received?->scheme,
                'slots'    => (int) ($approved?->slots ?? 0),
                'approved' => (float) ($approved?->approved ?? 0),
                'received' => (float) ($received?->received ?? 0),
            ];
        })->sortBy('donor')->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'rows' => $rows,
            'grand_total' => [
                'slots'    => (int)   $rows->sum('slots'),
                'approved' => (float) $rows->sum('approved'),
                'received' => (float) $rows->sum('received'),
            ],
        ]);
    }

    // ==========================================================
    // YEAR-WISE (union of scholarship years + receipt years)
    // ==========================================================
    public function yearWise()
    {
        $approvedByYear = Scholarship::select('academic_year')
            ->selectRaw('COUNT(*) as records')
            ->selectRaw('COUNT(DISTINCT COALESCE(cnic, student_id)) as students')
            ->selectRaw('SUM(approved_amount) as approved')
            ->groupBy('academic_year')->get()
            ->keyBy('academic_year');

        $receivedByYear = Installment::where('status', 'received')
            ->whereNotNull('received_date')->get()
            ->groupBy(fn ($i) => FiscalYear::ofDate($i->received_date))
            ->map(fn ($items) => (float) $items->sum('amount'));

        $allYears = $approvedByYear->keys()->merge($receivedByYear->keys())
            ->unique()->sortDesc()->values();

        $groups = $allYears->map(function ($year) use ($approvedByYear, $receivedByYear) {
            $a = $approvedByYear[$year] ?? null;
            return [
                'academic_year' => $year,
                'students'      => (int) ($a?->students ?? 0),
                'records'       => (int) ($a?->records ?? 0),
                'approved'      => (float) ($a?->approved ?? 0),
                'received'      => (float) ($receivedByYear[$year] ?? 0),
                'is_current'    => $year === FiscalYear::current(),
            ];
        })->values();

        return response()->json([
            'groups' => $groups,
            'grand_total' => [
                'years'    => $groups->count(),
                'records'  => (int)   $groups->sum('records'),
                'students' => (int)   $groups->sum('students'),
                'approved' => (float) $groups->sum('approved'),
                'received' => (float) $groups->sum('received'),
            ],
        ]);
    }

    // ==========================================================
    // DEPARTMENT-WISE
    // ==========================================================
    public function departmentWise(Request $request)
    {
        $years = Scholarship::distinct()->whereNotNull('academic_year')
            ->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year');

        $fyStart = $year ? FiscalYear::startOf($year)->toDateString() : null;
        $fyEnd   = $year ? FiscalYear::endOf($year)->toDateString() : null;

        $approvedQuery = Scholarship::query();
        if ($year) $approvedQuery->where('academic_year', $year);

        $approvedRows = $approvedQuery
            ->select(
                DB::raw("COALESCE(NULLIF(department, ''), 'Unassigned') as department"),
                DB::raw('COUNT(*) as slots'),
                DB::raw('COUNT(DISTINCT COALESCE(cnic, student_id)) as students'),
                DB::raw('SUM(approved_amount) as approved')
            )
            ->groupBy('department')->get()
            ->keyBy('department');

        $receivedQuery = Installment::where('installments.status', 'received')
            ->whereNotNull('installments.received_date')
            ->join('scholarships', 'installments.scholarship_id', '=', 'scholarships.id');
        if ($year) {
            $receivedQuery->where('scholarships.academic_year', $year)
                ->whereBetween('installments.received_date', [$fyStart, $fyEnd]);
        }
        $receivedRows = $receivedQuery
            ->select(
                DB::raw("COALESCE(NULLIF(scholarships.department, ''), 'Unassigned') as department"),
                DB::raw('SUM(installments.amount) as received')
            )
            ->groupBy('scholarships.department')->get()
            ->keyBy('department');

        $allKeys = $approvedRows->keys()->merge($receivedRows->keys())->unique()->values();

        $groups = $allKeys->map(function ($dept) use ($approvedRows, $receivedRows) {
            $a = $approvedRows[$dept] ?? null;
            $r = $receivedRows[$dept] ?? null;
            return [
                'department' => $dept,
                'slots'      => (int) ($a?->slots ?? 0),
                'students'   => (int) ($a?->students ?? 0),
                'approved'   => (float) ($a?->approved ?? 0),
                'received'   => (float) ($r?->received ?? 0),
            ];
        })->sortBy('department')->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'departments' => $groups->count(),
                'slots'       => (int)   $groups->sum('slots'),
                'students'    => (int)   $groups->sum('students'),
                'approved'    => (float) $groups->sum('approved'),
                'received'    => (float) $groups->sum('received'),
            ],
        ]);
    }

    // ==========================================================
    // DONOR-WISE
    // ==========================================================
    public function donorWise(Request $request)
    {
        $years = Scholarship::distinct()->whereNotNull('academic_year')
            ->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year');

        $fyStart = $year ? FiscalYear::startOf($year)->toDateString() : null;
        $fyEnd   = $year ? FiscalYear::endOf($year)->toDateString() : null;

        $approvedQuery = Scholarship::query();
        if ($year) $approvedQuery->where('academic_year', $year);

        $approvedRows = $approvedQuery
            ->select(
                DB::raw("COALESCE(NULLIF(donor, ''), 'Unassigned') as donor"),
                DB::raw('COUNT(*) as slots'),
                DB::raw('COUNT(DISTINCT COALESCE(cnic, student_id)) as students'),
                DB::raw('SUM(approved_amount) as approved'),
                DB::raw('GROUP_CONCAT(DISTINCT scheme) as schemes')
            )
            ->groupBy('donor')->get()
            ->keyBy('donor');

        $receivedQuery = Installment::where('installments.status', 'received')
            ->whereNotNull('installments.received_date')
            ->join('scholarships', 'installments.scholarship_id', '=', 'scholarships.id');
        if ($year) {
            $receivedQuery->where('scholarships.academic_year', $year)
                ->whereBetween('installments.received_date', [$fyStart, $fyEnd]);
        }
        $receivedRows = $receivedQuery
            ->select(
                DB::raw("COALESCE(NULLIF(scholarships.donor, ''), 'Unassigned') as donor"),
                DB::raw('SUM(installments.amount) as received')
            )
            ->groupBy('scholarships.donor')->get()
            ->keyBy('donor');

        $allKeys = $approvedRows->keys()->merge($receivedRows->keys())->unique()->values();

        $groups = $allKeys->map(function ($donor) use ($approvedRows, $receivedRows) {
            $a = $approvedRows[$donor] ?? null;
            $r = $receivedRows[$donor] ?? null;
            return [
                'donor'    => $donor,
                'slots'    => (int) ($a?->slots ?? 0),
                'students' => (int) ($a?->students ?? 0),
                'approved' => (float) ($a?->approved ?? 0),
                'received' => (float) ($r?->received ?? 0),
                'schemes'  => $a?->schemes ? explode(',', $a->schemes) : [],
            ];
        })->sortBy('donor')->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'donors'   => $groups->count(),
                'slots'    => (int)   $groups->sum('slots'),
                'students' => (int)   $groups->sum('students'),
                'approved' => (float) $groups->sum('approved'),
                'received' => (float) $groups->sum('received'),
            ],
        ]);
    }

    // ==========================================================
    // STUDENT-WISE
    // ==========================================================
    public function studentWise(Request $request)
    {
        $years = Scholarship::distinct()->whereNotNull('academic_year')
            ->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year');

        $query = Scholarship::with('installments');
        if ($year) $query->where('academic_year', $year);

        $rows = $query->orderBy('student_name')->orderBy('academic_year', 'desc')->get();

        $groups = $rows->groupBy(fn ($r) => StudentKey::fromRow($r))
            ->map(function ($group) {
                $first = $group->first();
                return [
                    'student_id'   => $first->student_id,
                    'student_name' => $first->student_name,
                    'cnic'         => $first->cnic,
                    'department'   => $first->department,
                    'total_slots'  => $group->count(),
                    'total_approved' => (float) $group->sum('approved_amount'),
                    'total_received' => (float) $group->sum(fn ($r) => $r->installments->where('status','received')->sum('amount')),
                    'records' => $group->map(fn ($r) => [
                        'id'              => $r->id,
                        'scheme'          => $r->scheme,
                        'category'        => $r->category,
                        'academic_year'   => $r->academic_year,
                        'donor'           => $r->donor,
                        'approved_amount' => (float) $r->approved_amount,
                        'received_amount' => (float) $r->installments->where('status','received')->sum('amount'),
                        'payment_status'  => $r->payment_status,
                        'installments'    => $r->installments->map(fn ($i) => [
                            'installment_no' => $i->installment_no,
                            'amount'         => (float) $i->amount,
                            'received_date'  => $i->received_date?->format('Y-m-d'),
                            'fiscal_year'    => $i->received_date ? FiscalYear::ofDate($i->received_date) : null,
                            'status'         => $i->status,
                        ])->values(),
                    ])->values(),
                ];
            })->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'students' => $groups->count(),
                'slots'    => $rows->count(),
                'approved' => (float) $rows->sum('approved_amount'),
                'received' => (float) $rows->sum(fn ($r) => $r->installments->where('status','received')->sum('amount')),
            ],
        ]);
    }

    // ==========================================================
    // STUDENT DETAIL (for the modal on any clicked row)
    // ==========================================================
    public function studentDetail(Request $request)
    {
        $query = Scholarship::with('installments');

        foreach (['academic_year','donor','scheme','funding_group','department','category'] as $f) {
            if ($request->filled($f)) $query->where($f, $request->input($f));
        }

        $rows = $query->orderBy('student_name')->get();

        return response()->json([
            'data' => $rows->values()->map(fn ($r, $i) => [
                's_no'            => $i + 1,
                'student_name'    => $r->student_name,
                'student_id'      => $r->student_id,
                'cnic'            => $r->cnic,
                'scheme'          => $r->scheme,
                'donor'           => $r->donor,
                'department'      => $r->department,
                'academic_year'   => $r->academic_year,
                'approved_amount' => (float) $r->approved_amount,
                'received_amount' => (float) $r->installments->where('status','received')->sum('amount'),
                'payment_status'  => $r->payment_status,
                'notes'           => $r->notes,
                'installments'    => $r->installments->map(fn ($i) => [
                    'installment_no' => $i->installment_no,
                    'amount'         => (float) $i->amount,
                    'cheque_no'      => $i->cheque_no,
                    'received_date'  => $i->received_date?->format('Y-m-d'),
                    'fiscal_year'    => $i->received_date ? FiscalYear::ofDate($i->received_date) : null,
                    'status'         => $i->status,
                    'notes'          => $i->notes,
                ])->values(),
            ]),
            'grand_total' => [
                'count'    => $rows->count(),
                'approved' => (float) $rows->sum('approved_amount'),
                'received' => (float) $rows->sum(fn ($r) => $r->installments->where('status','received')->sum('amount')),
            ],
        ]);
    }
}
