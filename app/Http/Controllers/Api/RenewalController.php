<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use Illuminate\Http\Request;

class RenewalController extends Controller
{
    public function index(Request $request)
    {
        $query = Scholarship::where('category', 'renewal');

        if ($request->filled('status')) {
            $query->where('renewal_status', $request->input('status'));
        } else {
            $query->whereIn('renewal_status', ['due', 'submitted']);
        }

        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($w) use ($s) {
                $w->where('student_id', 'like', "%$s%")
                  ->orWhere('student_name', 'like', "%$s%")
                  ->orWhere('cnic', 'like', "%$s%")
                  ->orWhere('scheme', 'like', "%$s%")
                  ->orWhere('donor', 'like', "%$s%");
            });
        }

        if ($request->filled('academic_year')) {
            $query->where('academic_year', $request->input('academic_year'));
        }

        $rows = $query->orderBy('renewal_status')->orderBy('student_name')->get();

        $counts = [
            'due'       => Scholarship::where('category', 'renewal')->where('renewal_status', 'due')->count(),
            'submitted' => Scholarship::where('category', 'renewal')->where('renewal_status', 'submitted')->count(),
            'approved'  => Scholarship::where('category', 'renewal')->where('renewal_status', 'approved')->count(),
            'rejected'  => Scholarship::where('category', 'renewal')->where('renewal_status', 'rejected')->count(),
        ];

        return response()->json(['data' => $rows, 'counts' => $counts]);
    }

    public function updateStatus(Request $request, Scholarship $scholarship)
    {
        if ($scholarship->category !== 'renewal') {
            return response()->json(['message' => 'Not a renewal record.'], 422);
        }

        $data = $request->validate([
            'renewal_status'   => 'required|in:not_due,due,submitted,approved,rejected',
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        if ($data['renewal_status'] === 'rejected' && empty($data['rejection_reason'])) {
            return response()->json(['message' => 'Rejection reason is required.'], 422);
        }

        $scholarship->renewal_status = $data['renewal_status'];
        $scholarship->save();

        return response()->json($scholarship);
    }

    public function bulkStatus(Request $request)
    {
        $data = $request->validate([
            'ids'            => 'required|array',
            'ids.*'          => 'integer|exists:scholarships,id',
            'renewal_status' => 'required|in:due,submitted,approved,rejected',
        ]);

        Scholarship::whereIn('id', $data['ids'])
            ->where('category', 'renewal')
            ->update(['renewal_status' => $data['renewal_status']]);

        return response()->json(['ok' => true, 'updated' => count($data['ids'])]);
    }
}
