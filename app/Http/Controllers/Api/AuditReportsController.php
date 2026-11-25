<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CollectiveCheque;
use App\Models\Recovery;
use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditReportsController extends Controller
{
    // ============================================================
    // DISTRIBUTION REGISTER
    // ============================================================
    public function distribution(Request $request)
    {
        $filterYear = $request->filled('academic_year')
            ? $this->normalizeYear($request->input('academic_year'))
            : null;

        $query = Scholarship::with([
            'installments' => fn ($q) => $q->orderBy('installment_no'),
            'recoveries',
        ]);

        if ($request->filled('scheme')) {
            $query->where('scheme', $request->input('scheme'));
        }

        $rows = $query->orderBy('student_name')->get()->values()->map(function ($s, $i) {
            $inst  = $s->installments->keyBy('installment_no');
            $gross = (float) $s->installments->sum('amount');
            $recovered = (float) $s->recoveries->sum('recovered_amount');

            return [
                's_no'          => $i + 1,
                'id'            => $s->id,
                'student_name'  => $s->student_name,
                'father_name'   => $s->father_name,
                'roll_no'       => $s->student_id,
                'cnic'          => $s->cnic,
                'scholarship'   => $s->scheme,
                'academic_year' => $s->academic_year,
                'inst_1'        => $this->instRow($inst->get(1)),
                'inst_2'        => $this->instRow($inst->get(2)),
                'inst_3'        => $this->instRow($inst->get(3)),
                'inst_4'        => $this->instRow($inst->get(4)),
                'gross_paid'         => $gross,
                'recovery_cheque_no' => $s->recoveries->first()?->recovery_cheque_no,
                'recovered_amount'   => $recovered,
                'recovery_date'      => $s->recoveries->first()?->recovery_date?->format('Y-m-d'),
                'net_retained'       => $gross - $recovered,
                'cheque_status'      => $s->cheque_status,
                'receiver_sign'      => $s->receiver_sign,
            ];
        });

        // Filter by year in PHP so any format works
        if ($filterYear) {
            $rows = $rows->filter(
                fn ($r) => $this->normalizeYear($r['academic_year']) === $filterYear
            )->values();
        }

        $byProgram = $rows->groupBy('scholarship')->map(fn ($g, $k) => [
            'program'      => $k,
            'students'     => $g->count(),
            'gross_paid'   => $g->sum('gross_paid'),
            'recovered'    => $g->sum('recovered_amount'),
            'net_retained' => $g->sum('net_retained'),
        ])->sortBy('program')->values();

        $byYear = $rows->groupBy('academic_year')->map(fn ($g, $k) => [
            'year'         => $k,
            'students'     => $g->count(),
            'inst_1'       => $g->sum(fn ($r) => $r['inst_1']['amount'] ?? 0),
            'inst_2'       => $g->sum(fn ($r) => $r['inst_2']['amount'] ?? 0),
            'inst_3'       => $g->sum(fn ($r) => $r['inst_3']['amount'] ?? 0),
            'inst_4'       => $g->sum(fn ($r) => $r['inst_4']['amount'] ?? 0),
            'gross_paid'   => $g->sum('gross_paid'),
            'recovered'    => $g->sum('recovered_amount'),
            'net_retained' => $g->sum('net_retained'),
        ])->sortByDesc('year')->values();

        $byStatus = $rows->groupBy('cheque_status')->map(fn ($g, $k) => [
            'status'       => $k ?: 'issued',
            'count'        => $g->count(),
            'gross_amount' => $g->sum('gross_paid'),
        ])->values();

        return response()->json([
            'rows'               => $rows,
            'summary_by_program' => $byProgram,
            'summary_by_year'    => $byYear,
            'summary_by_status'  => $byStatus,
            'grand_total' => [
                'students'     => $rows->count(),
                'inst_1'       => $rows->sum(fn ($r) => $r['inst_1']['amount'] ?? 0),
                'inst_2'       => $rows->sum(fn ($r) => $r['inst_2']['amount'] ?? 0),
                'inst_3'       => $rows->sum(fn ($r) => $r['inst_3']['amount'] ?? 0),
                'inst_4'       => $rows->sum(fn ($r) => $r['inst_4']['amount'] ?? 0),
                'gross_paid'   => $rows->sum('gross_paid'),
                'recovered'    => $rows->sum('recovered_amount'),
                'net_retained' => $rows->sum('net_retained'),
            ],
        ]);
    }

    private function instRow($installment): ?array
    {
        if (!$installment) return null;
        return [
            'cheque_no' => $installment->cheque_no,
            'amount'    => (float) $installment->amount,
            'dated'     => $installment->received_date?->format('Y-m-d'),
            'status'    => $installment->status,
        ];
    }

    // ============================================================
    // FUND RECONCILIATION
    // ============================================================
    public function fundReconciliation(Request $request)
    {
        $filterYear = $request->filled('academic_year')
            ? $this->normalizeYear($request->input('academic_year'))
            : null;

        $allCheques = CollectiveCheque::orderBy('date_received')->get();

        if ($filterYear) {
            $allCheques = $allCheques->filter(
                fn ($c) => $this->normalizeYear($c->academic_year) === $filterYear
            )->values();
        }

        $rows = $allCheques->values()->map(function ($c, $i) {
            $instNo = match ($c->installment_no) {
                '1st' => 1, '2nd' => 2, '3rd' => 3, '4th' => 4, default => 1,
            };

            $normalizedYear = $this->normalizeYear($c->academic_year);

            $distributed = (float) DB::table('scholarships')
                ->join('installments', 'installments.scholarship_id', '=', 'scholarships.id')
                ->where('scholarships.scheme', $c->scholarship_program)
                ->where('scholarships.academic_year', $normalizedYear)
                ->where('installments.installment_no', $instNo)
                ->where('installments.status', 'received')
                ->sum('installments.amount');

            $recovered = 0;
            if (DB::getSchemaBuilder()->hasTable('recoveries')) {
                $recovered = (float) DB::table('recoveries')
                    ->join('scholarships', 'recoveries.scholarship_id', '=', 'scholarships.id')
                    ->where('scholarships.scheme', $c->scholarship_program)
                    ->where('scholarships.academic_year', $normalizedYear)
                    ->sum('recoveries.recovered_amount');
            }

            $balance = (float) $c->amount_received - $distributed + $recovered - (float) $c->refunded_to_donor;
            $status  = abs($balance) < 0.5
                ? 'Reconciled'
                : ($balance > 0 ? 'Unspent / Refund Due' : 'Over-Distributed');

            return [
                's_no'                => $i + 1,
                'id'                  => $c->id,
                'cheque_no'           => $c->cheque_no,
                'date_received'       => $c->date_received?->format('Y-m-d'),
                'scholarship_program' => $c->scholarship_program,
                'academic_year'       => $c->academic_year,
                'installment_no'      => $c->installment_no,
                'collective_amount'   => (float) $c->amount_received,
                'distributed'         => $distributed,
                'recovered'           => $recovered,
                'refunded_to_donor'   => (float) $c->refunded_to_donor,
                'net_unspent'         => $balance,
                'status'              => $status,
                'notes'               => $c->notes,
            ];
        });

        return response()->json([
            'rows' => $rows,
            'grand_total' => [
                'collective'  => $rows->sum('collective_amount'),
                'distributed' => $rows->sum('distributed'),
                'recovered'   => $rows->sum('recovered'),
                'refunded'    => $rows->sum('refunded_to_donor'),
                'net_unspent' => $rows->sum('net_unspent'),
            ],
        ]);
    }

    // ============================================================
    // BANK FORWARDING LIST
    // ============================================================
    public function bankForwarding(Request $request)
    {
        $filterYear = $request->filled('academic_year')
            ? $this->normalizeYear($request->input('academic_year'))
            : null;

        $query = Scholarship::with('installments');

        if ($request->filled('scheme')) {
            $query->where('scheme', $request->input('scheme'));
        }

        $rows = $query->orderBy('student_name')->get()->values()->map(function ($s, $i) {
            $inst = $s->installments->firstWhere('installment_no', 1);
            return [
                's_no'          => $i + 1,
                'student_name'  => $s->student_name,
                'father_name'   => $s->father_name,
                'cnic'          => $s->cnic,
                'roll_no'       => $s->student_id,
                'scholarship'   => $s->scheme,
                'academic_year' => $s->academic_year,
                'cheque_no'     => $inst?->cheque_no,
                'cheque_amount' => (float) ($inst?->amount ?? 0),
            ];
        });

        if ($filterYear) {
            $rows = $rows->filter(
                fn ($r) => $this->normalizeYear($r['academic_year']) === $filterYear
            )->values();
        }

        return response()->json([
            'rows' => $rows,
            'grand_total' => ['amount' => $rows->sum('cheque_amount')],
        ]);
    }

    // ============================================================
    // COLLECTIVE CHEQUE CRUD
    // ============================================================
    public function storeCollective(Request $request)
    {
        $data = $request->validate([
            'cheque_no'           => 'required|string|max:60',
            'date_received'       => 'nullable|date',
            'scholarship_program' => 'required|string|max:100',
            'academic_year'       => 'required|string|max:20',
            'installment_no'      => 'required|in:1st,2nd,3rd,4th',
            'amount_received'     => 'required|numeric|min:0',
            'refunded_to_donor'   => 'nullable|numeric|min:0',
            'notes'               => 'nullable|string|max:1000',
        ]);

        // Normalize year format on save
        $data['academic_year'] = $this->normalizeYear($data['academic_year']);

        return response()->json(CollectiveCheque::create($data), 201);
    }

    public function destroyCollective(CollectiveCheque $collective)
    {
        $collective->delete();
        return response()->noContent();
    }

    // ============================================================
    // YEAR NORMALIZATION HELPER
    // ============================================================
    private function normalizeYear(?string $year): string
    {
        if (!$year) return '';
        $year = trim($year);

        // Match "YYYY-YYYY", "YYYY-YY", "YY-YY", "YY-YYYY"
        if (preg_match('/^(\d{2,4})\s*[-–\/]\s*(\d{2,4})$/', $year, $m)) {
            $start = (int) $m[1];
            $end   = (int) $m[2];

            if (strlen($m[1]) === 2) $start += 2000;
            if (strlen($m[2]) === 2) $end   += 2000;
            if ($end < $start) $end = $start + 1;

            return $start . '-' . $end;
        }

        // Single year "2025" or "25"
        if (preg_match('/^(\d{2,4})$/', $year, $m)) {
            $start = (int) $m[1];
            if (strlen($m[1]) === 2) $start += 2000;
            return $start . '-' . ($start + 1);
        }

        return $year;
    }

    public function distributionFlat(Request $request)
    {
        $filterYear = $request->filled('academic_year')
            ? $this->normalizeYear($request->input('academic_year'))
            : null;

        $query = Scholarship::with([
            'installments' => fn ($q) => $q->orderBy('installment_no'),
            'recoveries',
        ]);
        if ($request->filled('scheme')) $query->where('scheme', $request->input('scheme'));

        $scholarships = $query->orderBy('student_name')->get();
        $rows = []; $sno = 1; $uniqueStudents = 0;

        foreach ($scholarships as $s) {
            if ($filterYear && $this->normalizeYear($s->academic_year) !== $filterYear) continue;
            $uniqueStudents++;
            $recovered = (float) $s->recoveries->sum('recovered_amount');
            $firstRecovery = $s->recoveries->first();

            foreach ($s->installments->sortBy('installment_no') as $inst) {
                $isFirst = $inst->installment_no === 1;
                $rows[] = [
                    's_no'           => $sno++,
                    'student_name'   => $s->student_name,
                    'father_name'    => $s->father_name,
                    'roll_no'        => $s->student_id,
                    'cnic'           => $s->cnic,
                    'scholarship'    => $s->scheme,
                    'academic_year'  => $s->academic_year,
                    'installment_no' => $inst->installment_no,
                    'installment'    => match ($inst->installment_no) {
                        1 => '1st Installment', 2 => '2nd Installment',
                        3 => '3rd Installment', default => '4th Installment',
                    },
                    'category'       => $isFirst ? 'Fresh' : 'Renewal',
                    'cheque_no'      => $inst->cheque_no,
                    'cheque_date'    => $inst->received_date?->format('Y-m-d'),
                    'gross_amount'   => (float) $inst->amount,
                    'recovered'      => $isFirst ? $recovered : 0,
                    'net_retained'   => (float) $inst->amount - ($isFirst ? $recovered : 0),
                    'recovery_chq'   => $isFirst ? $firstRecovery?->recovery_cheque_no : null,
                    'recovery_date'  => $isFirst ? $firstRecovery?->recovery_date?->format('Y-m-d') : null,
                    'cheque_status'  => $s->cheque_status,
                    'remarks'        => $inst->notes ?? $s->notes,
                ];
            }
        }

        $totalGross = array_sum(array_column($rows, 'gross_amount'));
        $totalRecovered = array_sum(array_column($rows, 'recovered'));
        $totalFresh = 0; $totalRenewal = 0;
        foreach ($rows as $r) {
            if ($r['category'] === 'Fresh') $totalFresh += $r['gross_amount'];
            else $totalRenewal += $r['gross_amount'];
        }

        return response()->json([
            'rows' => $rows,
            'kpis' => [
                'total_cheques'   => count($rows),
                'unique_students' => $uniqueStudents,
                'fresh_pkr'       => $totalFresh,
                'renewal_pkr'     => $totalRenewal,
                'total_gross'     => $totalGross,
                'total_recovered' => $totalRecovered,
                'net_retained'    => $totalGross - $totalRecovered,
            ],
        ]);
    }

    public function executiveSummary(Request $request)
    {
        $filterYear = $request->filled('academic_year')
            ? $this->normalizeYear($request->input('academic_year'))
            : null;

        $query = Scholarship::with(['installments', 'recoveries']);
        if ($filterYear) {
            $query->where('academic_year', $filterYear);
        }

        $scholarships = $query->get();
        $flat = []; $uniqueStudents = 0;

        foreach ($scholarships as $s) {
            $uniqueStudents++;
            $recovered = (float) $s->recoveries->sum('recovered_amount');
            foreach ($s->installments as $inst) {
                $flat[] = [
                    'scholarship'    => $s->scheme,
                    'academic_year'  => $s->academic_year,
                    'installment_no' => $inst->installment_no,
                    'category'       => $inst->installment_no === 1 ? 'Fresh' : 'Renewal',
                    'gross'          => (float) $inst->amount,
                    'recovered'      => $inst->installment_no === 1 ? $recovered : 0,
                ];
            }
        }

        $byProgram = collect($flat)->groupBy('scholarship')->map(fn ($g, $k) => [
            'program' => $k,
            'cheques' => $g->count(),
            'fresh'   => collect($g)->where('category', 'Fresh')->sum('gross'),
            'renewal' => collect($g)->where('category', 'Renewal')->sum('gross'),
            'net'     => collect($g)->sum('gross') - collect($g)->sum('recovered'),
        ])->sortBy('program')->values();

        $byYear = collect($flat)->groupBy('academic_year')->map(fn ($g, $k) => [
            'year'      => $k,
            'cheques'   => $g->count(),
            'inst_1st'  => collect($g)->where('installment_no', 1)->sum('gross'),
            'inst_2nd'  => collect($g)->where('installment_no', 2)->sum('gross'),
            'inst_3rd'  => collect($g)->where('installment_no', 3)->sum('gross'),
            'inst_4th'  => collect($g)->where('installment_no', 4)->sum('gross'),
            'gross'     => collect($g)->sum('gross'),
            'recovered' => collect($g)->sum('recovered'),
            'net'       => collect($g)->sum('gross') - collect($g)->sum('recovered'),
        ])->sortByDesc('year')->values();

        return response()->json([
            'by_program'      => $byProgram,
            'by_year'         => $byYear,
            'unique_students' => $uniqueStudents,
            'total_cheques'   => count($flat),
        ]);
    }

    private function buildFlatRows(?string $filterYear = null): array
    {
        // Same logic as distributionFlat but returns rows array only
        // (extract from Batch 2 code)
    }
}
