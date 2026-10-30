<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceivedAmount;
use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReconciliationController extends Controller
{
    public function index()
    {
        // ── Expected: SUM approved_amount per donor + year ──
        $expected = Scholarship::select('donor', 'academic_year')
            ->selectRaw('SUM(approved_amount) as expected')
            ->selectRaw('COUNT(*) as records')
            ->groupBy('donor', 'academic_year')
            ->get();

        // ── Installments: joined through scholarships ──
        $installmentTotals = DB::table('installments')
            ->join('scholarships', 'installments.scholarship_id', '=', 'scholarships.id')
            ->select('scholarships.donor', 'scholarships.academic_year')
            ->selectRaw("SUM(CASE WHEN installments.status = 'received' THEN installments.amount ELSE 0 END) as received")
            ->selectRaw("SUM(CASE WHEN installments.status = 'pending'  THEN installments.amount ELSE 0 END) as pending")
            ->selectRaw("SUM(CASE WHEN installments.status = 'failed'   THEN installments.amount ELSE 0 END) as failed")
            ->groupBy('scholarships.donor', 'scholarships.academic_year')
            ->get()
            ->keyBy(fn ($r) => $r->donor . '|' . $r->academic_year);

        // ── Manual overrides from received_amounts table ──
        $manual = ReceivedAmount::all()->keyBy(fn ($r) => $r->donor . '|' . $r->academic_year);

        $rows = $expected->map(function ($e) use ($installmentTotals, $manual) {
            $key  = $e->donor . '|' . $e->academic_year;
            $inst = $installmentTotals->get($key);
            $man  = $manual->get($key);

            $installmentReceived = $inst ? (float) $inst->received : 0.0;
            $installmentPending  = $inst ? (float) $inst->pending  : 0.0;
            $installmentFailed   = $inst ? (float) $inst->failed   : 0.0;

            $manualReceived = $man ? (float) $man->amount : null;

            // Effective "received":
            //  - If a manual entry exists AND is > 0 → use it (finance override / bank verified)
            //  - Else → use the installment total (source of truth)
            //  - If neither → null (unreconciled)
            $hasManual = $manualReceived !== null && $manualReceived > 0;
            $hasInstallments = $installmentReceived > 0 || $installmentPending > 0 || $installmentFailed > 0;

            if ($hasManual) {
                $effectiveReceived = $manualReceived;
            } elseif ($hasInstallments) {
                $effectiveReceived = $installmentReceived;
            } else {
                $effectiveReceived = null;
            }

            $expectedAmt = (float) $e->expected;
            $variance    = $effectiveReceived === null ? null : $effectiveReceived - $expectedAmt;

            $status = 'unreconciled';
            if ($effectiveReceived !== null) {
                if (abs($variance) < 0.5)      $status = 'matched';
                elseif ($variance < 0)          $status = 'shortfall';
                else                            $status = 'over';
            }

            return [
                'donor'                => $e->donor,
                'academic_year'        => $e->academic_year,
                'records'              => (int) $e->records,
                'expected'             => $expectedAmt,
                'installment_received' => $installmentReceived,
                'installment_pending'  => $installmentPending,
                'installment_failed'   => $installmentFailed,
                'manual_received'      => $manualReceived,
                'effective_received'   => $effectiveReceived,
                'variance'             => $variance,
                'status'               => $status,
                'notes'                => $man->notes ?? '',
            ];
        })->sortBy([['donor', 'asc'], ['academic_year', 'asc']])->values();

        return response()->json(['data' => $rows]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'donor'         => 'required|string',
            'academic_year' => 'required|string',
            'amount'        => 'nullable|numeric|min:0',
            'notes'         => 'nullable|string|max:2000',
        ]);

        $row = ReceivedAmount::updateOrCreate(
            ['donor' => $data['donor'], 'academic_year' => $data['academic_year']],
            ['amount' => $data['amount'] ?? 0, 'notes' => $data['notes'] ?? null]
        );

        return response()->json(['data' => $row]);
    }
}
