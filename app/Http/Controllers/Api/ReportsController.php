<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    /**
     * GET /api/reports/year-end?academic_year=2025-2026
     *
     * Groups scholarships by funding_group → donor → scheme,
     * with per-group subtotals and a grand total.
     */
    public function yearEnd(Request $request)
    {
        $years = Scholarship::distinct()
            ->orderByDesc('academic_year')
            ->pluck('academic_year')
            ->values();

        $year = $request->input('academic_year') ?: $years->first();

        if (!$year) {
            return response()->json([
                'academic_year' => null,
                'years' => [],
                'groups' => [],
                'grand_total' => ['slots' => 0, 'amount' => 0],
            ]);
        }

        $rows = Scholarship::where('academic_year', $year)
            ->select(
                DB::raw("COALESCE(NULLIF(funding_group, ''), 'Unassigned') as funding_group"),
                'donor',
                'scheme',
                DB::raw('COUNT(*) as slots'),
                DB::raw('SUM(approved_amount) as amount')
            )
            ->groupBy('funding_group', 'donor', 'scheme')
            ->orderBy('funding_group')
            ->orderBy('donor')
            ->orderBy('scheme')
            ->get();

        $groups = $rows
            ->groupBy('funding_group')
            ->map(function ($g, $groupName) {
                $groupRows = $g->map(fn ($r) => [
                    'donor'  => $r->donor,
                    'scheme' => $r->scheme,
                    'slots'  => (int) $r->slots,
                    'amount' => (float) $r->amount,
                ])->values();

                return [
                    'funding_group' => $groupName,
                    'rows' => $groupRows,
                    'subtotal' => [
                        'slots'  => $groupRows->sum('slots'),
                        'amount' => $groupRows->sum('amount'),
                    ],
                ];
            })
            ->values();

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
}
