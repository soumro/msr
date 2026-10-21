<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceivedAmount;
use App\Models\Scholarship;
use Illuminate\Http\Request;

class ReconciliationController extends Controller
{
    public function index()
    {
        $expected = Scholarship::select('donor', 'academic_year')
            ->selectRaw('SUM(approved_amount) as expected')
            ->selectRaw('COUNT(*) as records')
            ->groupBy('donor', 'academic_year')
            ->get();

        $received = ReceivedAmount::all()->keyBy(fn ($r) => $r->donor . '|' . $r->academic_year);

        $rows = $expected->map(function ($e) use ($received) {
            $key = $e->donor . '|' . $e->academic_year;
            $r = $received->get($key);
            $rec = $r ? (float) $r->amount : null;
            $variance = $rec === null ? null : $rec - (float) $e->expected;

            return [
                'donor'         => $e->donor,
                'academic_year' => $e->academic_year,
                'records'       => (int) $e->records,
                'expected'      => (float) $e->expected,
                'received'      => $rec,
                'variance'      => $variance,
                'status'        => $rec === null
                    ? 'unreconciled'
                    : (abs($variance) < 0.5 ? 'matched' : ($variance < 0 ? 'shortfall' : 'over')),
                'notes'         => $r->notes ?? '',
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
