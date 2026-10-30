<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use App\Support\StudentKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    public function yearEnd(Request $request)
    {
        $years = Scholarship::distinct()->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year') ?: $years->first();

        if (!$year) {
            return response()->json([
                'academic_year' => null, 'years' => [], 'groups' => [],
                'grand_total' => ['slots' => 0, 'amount' => 0],
            ]);
        }

        $rows = Scholarship::where('academic_year', $year)
            ->select(
                DB::raw("COALESCE(NULLIF(funding_group, ''), 'Unassigned') as funding_group"),
                'donor', 'scheme',
                DB::raw('COUNT(*) as slots'),
                DB::raw('SUM(approved_amount) as amount')
            )
            ->groupBy('funding_group', 'donor', 'scheme')
            ->orderBy('funding_group')->orderBy('donor')->orderBy('scheme')
            ->get();

        $groups = $rows->groupBy('funding_group')
            ->map(function ($g, $groupName) {
                $groupRows = $g->map(fn ($r) => [
                    'donor' => $r->donor, 'scheme' => $r->scheme,
                    'slots' => (int) $r->slots, 'amount' => (float) $r->amount,
                ])->values();

                return [
                    'funding_group' => $groupName,
                    'rows' => $groupRows,
                    'subtotal' => [
                        'slots'  => $groupRows->sum('slots'),
                        'amount' => $groupRows->sum('amount'),
                    ],
                ];
            })->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'slots'  => $rows->sum('slots'),
                'amount' => $rows->sum('amount'),
            ],
        ]);
    }

    public function summary(Request $request)
    {
        $years = Scholarship::distinct()->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year') ?: $years->first();

        $query = Scholarship::query();
        if ($year) $query->where('academic_year', $year);

        $rows = $query->select('donor', 'scheme')
            ->selectRaw('COUNT(*) as slots')
            ->selectRaw('COUNT(DISTINCT ' . StudentKey::sqlExpression() . ') as students')
            ->selectRaw('SUM(approved_amount) as amount')
            ->groupBy('donor', 'scheme')
            ->orderBy('donor')->orderBy('scheme')->get();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'rows' => $rows->map(fn ($r) => [
                'donor' => $r->donor, 'scheme' => $r->scheme,
                'slots' => (int) $r->slots, 'students' => (int) $r->students,
                'amount' => (float) $r->amount,
            ])->values(),
            'grand_total' => [
                'slots'    => (int) $rows->sum('slots'),
                'students' => (int) $rows->sum('students'),
                'amount'   => (float) $rows->sum('amount'),
            ],
        ]);
    }

    public function studentWise(Request $request)
    {
        $years = Scholarship::distinct()->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year');

        $query = Scholarship::query();
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
                    'total_amount' => (float) $group->sum('approved_amount'),
                    'records'      => $group->map(fn ($r) => [
                        'id'              => $r->id,
                        'scheme'          => $r->scheme,
                        'category'        => $r->category,
                        'academic_year'   => $r->academic_year,
                        'donor'           => $r->donor,
                        'cheque_no'       => $r->cheque_no,
                        'received_date'   => $r->received_date?->format('Y-m-d'),
                        'approved_amount' => (float) $r->approved_amount,
                        'payment_status'  => $r->payment_status,
                        'renewal_status'  => $r->renewal_status,
                        'notes'           => $r->notes,
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
                'amount'   => (float) $rows->sum('approved_amount'),
            ],
        ]);
    }

    public function yearWise()
    {
        $rows = Scholarship::orderByDesc('academic_year')->get();

        $groups = $rows->groupBy('academic_year')
            ->sortKeysDesc()
            ->map(function ($group, $year) {
                return [
                    'academic_year' => $year,
                    'total_slots'   => $group->count(),
                    'total_amount'  => (float) $group->sum('approved_amount'),
                    'students'      => $group->map(fn ($r) => StudentKey::fromRow($r))->unique()->count(),
                ];
            })->values();

        return response()->json([
            'groups' => $groups,
            'grand_total' => [
                'years'  => $groups->count(),
                'slots'  => $rows->count(),
                'amount' => (float) $rows->sum('approved_amount'),
            ],
        ]);
    }

    public function departmentWise(Request $request)
    {
        $years = Scholarship::distinct()->orderByDesc('academic_year')->pluck('academic_year')->values();
        $year = $request->input('academic_year');

        $query = Scholarship::query();
        if ($year) $query->where('academic_year', $year);

        $rows = $query->get();

        $groups = $rows->groupBy(fn ($r) => $r->department ?: 'Unassigned')
            ->map(function ($group, $dept) {
                return [
                    'department'   => $dept,
                    'total_slots'  => $group->count(),
                    'total_amount' => (float) $group->sum('approved_amount'),
                    'students'     => $group->map(fn ($r) => StudentKey::fromRow($r))->unique()->count(),
                ];
            })
            ->sortBy('department')
            ->values();

        return response()->json([
            'academic_year' => $year,
            'years' => $years,
            'groups' => $groups,
            'grand_total' => [
                'departments' => $groups->count(),
                'slots'       => $rows->count(),
                'amount'      => (float) $rows->sum('approved_amount'),
            ],
        ]);
    }

    public function donorWise(Request $request)
    {
        $years = Scholarship::distinct()
            ->whereNotNull('academic_year')
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->values();

        $year = $request->input('academic_year');

        $query = Scholarship::query();
        if ($year) $query->where('academic_year', $year);

        $rows = $query->get();

        $groups = $rows->groupBy(fn ($r) => $r->donor ?: 'Unassigned')
            ->map(function ($group, $donor) {
                return [
                    'donor'         => $donor,
                    'total_slots'   => $group->count(),
                    'total_amount'  => (float) $group->sum('approved_amount'),
                    'students'      => $group->map(fn ($r) => StudentKey::fromRow($r))->unique()->count(),
                    'schemes'       => $group->pluck('scheme')->unique()->values()->all(),
                ];
            })
            ->sortBy('donor')
            ->values();

        return response()->json([
            'academic_year' => $year,
            'years'         => $years,
            'groups'        => $groups,
            'grand_total' => [
                'donors'  => $groups->count(),
                'slots'   => $rows->count(),
                'amount'  => (float) $rows->sum('approved_amount'),
            ],
        ]);
    }

    public function studentDetail(Request $request)
    {
        $query = Scholarship::query();

        foreach (['academic_year','donor','scheme','funding_group','department','category'] as $f) {
            if ($request->filled($f)) $query->where($f, $request->input($f));
        }

        $rows = $query->orderBy('student_name')->get();

        return response()->json([
            'data' => $rows->values()->map(fn ($r, $i) => [
                's_no'            => $i + 1,
                'student_name'    => $r->student_name,
                'student_id'      => $r->student_id,
                'cheque_no'       => $r->cheque_no,
                'received_date'   => $r->received_date?->format('Y-m-d'),
                'approved_amount' => (float) $r->approved_amount,
                'notes'           => $r->notes,
                'scheme'          => $r->scheme,
                'donor'           => $r->donor,
                'academic_year'   => $r->academic_year,
                'department'      => $r->department,
                'funding_group'   => $r->funding_group,
            ]),
            'grand_total' => [
                'count'  => $rows->count(),
                'amount' => (float) $rows->sum('approved_amount'),
            ],
        ]);
    }

        /**
     * Students with 2+ scholarship records.
     * Explains why Records > Beneficiaries (e.g. 239 - 236 = 3).
     */
    public function multiRecordStudents(Request $request)
    {
        $year = $request->input('academic_year');

        $query = Scholarship::query();
        if ($year) $query->where('academic_year', $year);

        // Group by student_id (roll-no-only uniqueness)
        $allRows = $query->orderBy('student_id')->orderBy('academic_year')->get();

        $grouped = $allRows->groupBy(fn ($r) => trim((string) ($r->student_id ?? '')))
            ->filter(fn ($group, $key) => $key !== '' && $group->count() > 1)
            ->map(function ($group, $studentId) {
                $first = $group->first();
                return [
                    'student_id'    => $first->student_id,
                    'student_name'  => $first->student_name,
                    'cnic'          => $first->cnic,
                    'department'    => $first->department,
                    'record_count'  => $group->count(),
                    'total_amount'  => (float) $group->sum('approved_amount'),
                    'records'       => $group->map(fn ($r) => [
                        'id'              => $r->id,
                        'scheme'          => $r->scheme,
                        'donor'           => $r->donor,
                        'category'        => $r->category,
                        'academic_year'   => $r->academic_year,
                        'approved_amount' => (float) $r->approved_amount,
                        'cheque_no'       => $r->cheque_no,
                        'received_date'   => $r->received_date?->format('Y-m-d'),
                        'payment_status'  => $r->payment_status,
                        'notes'           => $r->notes,
                    ])->values(),
                ];
            })
            ->sortByDesc('record_count')
            ->values();

        $extraRecords = $grouped->sum(fn ($g) => $g['record_count'] - 1);

        return response()->json([
            'academic_year' => $year,
            'students' => $grouped,
            'summary' => [
                'multi_students'  => $grouped->count(),
                'extra_records'   => (int) $extraRecords,
                'total_records'   => (int) $allRows->count(),
                'unique_students' => (int) $allRows->pluck('student_id')->filter()->unique()->count(),
            ],
        ]);
    }

    /**
     * Students with 2+ installments on any scholarship (2nd, 3rd, ... payment).
     * This is the "who's getting their 2nd installment" financial view.
     */
    public function secondInstallments(Request $request)
    {
        $year = $request->input('academic_year');

        // Load scholarships that have 2+ installments
        $query = Scholarship::with('installments');
        if ($year) $query->where('academic_year', $year);

        $withMultiple = $query->get()->filter(fn ($s) => $s->installments->count() > 1);

        $rows = $withMultiple->map(function ($s) {
            $installments = $s->installments->sortBy('installment_no');

            return [
                'scholarship_id'   => $s->id,
                'student_id'       => $s->student_id,
                'student_name'     => $s->student_name,
                'scheme'           => $s->scheme,
                'donor'            => $s->donor,
                'academic_year'    => $s->academic_year,
                'approved_amount'  => (float) $s->approved_amount,
                'installment_count'=> $installments->count(),
                'received_count'   => $installments->where('status', 'received')->count(),
                'received_amount'  => (float) $installments->where('status', 'received')->sum('amount'),
                'installments'     => $installments->values()->map(fn ($i) => [
                    'id'              => $i->id,
                    'installment_no'  => $i->installment_no,
                    'amount'          => (float) $i->amount,
                    'cheque_no'       => $i->cheque_no,
                    'received_date'   => $i->received_date?->format('Y-m-d'),
                    'status'          => $i->status,
                    'notes'           => $i->notes,
                ]),
            ];
        })->sortBy('student_id')->values();

        // Which installment number is currently awaiting payment?
        $awaiting2nd = $rows->filter(fn ($r) => $r['installments']->firstWhere('installment_no', 2) &&
                                            $r['installments']->firstWhere('installment_no', 2)['status'] === 'pending')
                            ->count();
        $awaiting3rd = $rows->filter(fn ($r) => $r['installments']->firstWhere('installment_no', 3) &&
                                            $r['installments']->firstWhere('installment_no', 3)['status'] === 'pending')
                            ->count();

        return response()->json([
            'academic_year' => $year,
            'rows' => $rows,
            'summary' => [
                'scholarships_with_multi_installments' => $rows->count(),
                'awaiting_2nd_payment' => $awaiting2nd,
                'awaiting_3rd_payment' => $awaiting3rd,
                'total_installments'   => $rows->sum('installment_count'),
                'total_received'       => $rows->sum('received_amount'),
            ],
        ]);
    }

    public function pendingInstallments(Request $request)
    {
        $query = \App\Models\Installment::query()
            ->where('status', 'pending')
            ->with('scholarship');

        if ($request->filled('academic_year')) {
            $query->whereHas('scholarship', fn ($q) => $q->where('academic_year', $request->input('academic_year')));
        }
        if ($request->filled('donor')) {
            $query->whereHas('scholarship', fn ($q) => $q->where('donor', $request->input('donor')));
        }
        if ($request->filled('scheme')) {
            $query->whereHas('scholarship', fn ($q) => $q->where('scheme', $request->input('scheme')));
        }

        $installments = $query->orderBy('installment_no')->get();

        $grouped = $installments->groupBy(fn ($i) => $i->scholarship?->student_id ?: 'UNKNOWN')
            ->map(function ($items, $studentId) {
                $first = $items->first();
                $s = $first->scholarship;
                return [
                    'student_id'     => $studentId,
                    'student_name'   => $s?->student_name,
                    'cnic'           => $s?->cnic,
                    'department'     => $s?->department,
                    'pending_count'  => $items->count(),
                    'pending_amount' => (float) $items->sum('amount'),
                    'installments'   => $items->map(fn ($i) => [
                        'id'             => $i->id,
                        'scholarship_id' => $i->scholarship_id,
                        'installment_no' => $i->installment_no,
                        'amount'         => (float) $i->amount,
                        'scheme'         => $s?->scheme,
                        'donor'          => $s?->donor,
                        'academic_year'  => $s?->academic_year,
                        'cheque_no'      => $i->cheque_no,
                        'received_date'  => $i->received_date?->format('Y-m-d'),
                        'notes'          => $i->notes,
                    ])->values(),
                ];
            })->sortByDesc('pending_amount')->values();

        $years   = \App\Models\Scholarship::distinct()->whereNotNull('academic_year')->orderByDesc('academic_year')->pluck('academic_year')->values();
        $donors  = \App\Models\Scholarship::distinct()->whereNotNull('donor')->orderBy('donor')->pluck('donor')->values();
        $schemes = \App\Models\Scholarship::distinct()->whereNotNull('scheme')->orderBy('scheme')->pluck('scheme')->values();

        return response()->json([
            'data' => $grouped,
            'filters' => ['years' => $years, 'donors' => $donors, 'schemes' => $schemes],
            'summary' => [
                'students_with_pending' => $grouped->count(),
                'total_pending_records' => $installments->count(),
                'total_pending_amount'  => (float) $installments->sum('amount'),
            ],
        ]);
    }
}
