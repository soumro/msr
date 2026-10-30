<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Installment;
use App\Models\Scholarship;
use Illuminate\Http\Request;

class InstallmentController extends Controller
{
    public function index(Scholarship $scholarship)
    {
        return response()->json(['data' => $scholarship->installments]);
    }

    public function store(Request $request, Scholarship $scholarship)
    {
        $data = $request->validate([
            'installment_no' => 'nullable|integer|min:1',
            'amount'         => 'required|numeric|min:0',
            'cheque_no'      => 'nullable|string|max:60',
            'received_date'  => 'nullable|date',
            'status'         => 'required|in:pending,received,failed',
            'notes'          => 'nullable|string|max:2000',
        ]);

        if (empty($data['installment_no'])) {
            $data['installment_no'] = ((int) $scholarship->installments()->max('installment_no')) + 1;
        }

        $exists = $scholarship->installments()
            ->where('installment_no', $data['installment_no'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => "Installment #{$data['installment_no']} already exists for this scholarship.",
            ], 422);
        }

        if (empty($data['cheque_no']))     $data['cheque_no'] = null;
        if (empty($data['received_date'])) $data['received_date'] = null;

        $installment = $scholarship->installments()->create($data);
        $scholarship->syncPaymentStatus();

        return response()->json($installment, 201);
    }

    public function update(Request $request, Scholarship $scholarship, Installment $installment)
    {
        if ($installment->scholarship_id !== $scholarship->id) {
            abort(404);
        }

        $data = $request->validate([
            'amount'        => 'sometimes|numeric|min:0',
            'cheque_no'     => 'nullable|string|max:60',
            'received_date' => 'nullable|date',
            'status'        => 'sometimes|in:pending,received,failed',
            'notes'         => 'nullable|string|max:2000',
        ]);

        if (array_key_exists('cheque_no', $data) && empty($data['cheque_no'])) {
            $data['cheque_no'] = null;
        }
        if (array_key_exists('received_date', $data) && empty($data['received_date'])) {
            $data['received_date'] = null;
        }

        $installment->update($data);
        $scholarship->syncPaymentStatus();

        return response()->json($installment);
    }

    public function destroy(Scholarship $scholarship, Installment $installment)
    {
        if ($installment->scholarship_id !== $scholarship->id) {
            abort(404);
        }

        $installment->delete();
        $scholarship->syncPaymentStatus();

        return response()->noContent();
    }

    /**
     * Replace ALL installments for a scholarship in one call.
     * Body: { installments: [ {installment_no, amount, cheque_no, received_date, status, notes}, ... ] }
     */
    public function replaceAll(Request $request, Scholarship $scholarship)
    {
    $data = $request->validate([
        'installments'                  => 'required|array|min:1',
        'installments.*.installment_no' => 'required|integer|min:1',
        'installments.*.amount'         => 'required|numeric|min:0',
        'installments.*.cheque_no'      => 'nullable|string|max:60',
        'installments.*.received_date'  => 'nullable|date',
        'installments.*.status'         => 'required|in:pending,received,failed',
        'installments.*.notes'          => 'nullable|string|max:2000',
    ]);

    // Prevent duplicate installment_no (would trigger unique constraint)
    $seenNos = [];
    foreach ($data['installments'] as $i => $row) {
        $no = (int) $row['installment_no'];
        if (in_array($no, $seenNos, true)) {
            return response()->json([
                'message' => "Duplicate installment_no {$no} at row " . ($i + 1),
            ], 422);
        }
        $seenNos[] = $no;
    }

    try {
        \DB::transaction(function () use ($scholarship, $data) {
            $scholarship->installments()->delete();

            foreach ($data['installments'] as $row) {
                $scholarship->installments()->create([
                    'installment_no' => (int) $row['installment_no'],
                    'amount'         => (float) $row['amount'],
                    'cheque_no'      => !empty($row['cheque_no']) ? $row['cheque_no'] : null,
                    'received_date'  => !empty($row['received_date']) ? $row['received_date'] : null,
                    'status'         => $row['status'],
                    'notes'          => !empty($row['notes']) ? $row['notes'] : null,
                ]);
            }

            $scholarship->syncPaymentStatus();
        });
    } catch (\Throwable $e) {
        \Log::error('replaceAll failed: ' . $e->getMessage(), [
            'scholarship_id' => $scholarship->id,
            'installments'   => $data['installments'],
        ]);
        return response()->json(['message' => 'Failed to save installments: ' . $e->getMessage()], 500);
    }

    $scholarship = $scholarship->fresh();
    $scholarship->load('installments');

    return response()->json(['data' => $scholarship]);
    }
}
