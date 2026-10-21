<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DuplicateFlag;
use App\Models\Scholarship;
use App\Services\DuplicateAidDetector;
use Illuminate\Http\Request;

class DuplicateCheckController extends Controller
{
    public function index(DuplicateAidDetector $detector)
    {
        $detector->rebuild();

        $flags = DuplicateFlag::orderByRaw("FIELD(review_status,'pending','escalated','confirmed_duplicate','cleared')")
            ->get()
            ->map(function ($f) {
                $digits = str_starts_with($f->person_key, 'C:') ? substr($f->person_key, 2) : null;
                $sid = str_starts_with($f->person_key, 'S:') ? substr($f->person_key, 2) : null;

                $rows = Scholarship::where('academic_year', $f->academic_year)
                    ->when($digits, fn ($q) => $q->whereRaw("REPLACE(cnic,'-','') = ?", [$digits]))
                    ->when(!$digits, fn ($q) => $q->where('student_id', $sid))
                    ->get(['id','student_id','student_name','cnic','scheme','donor','approved_amount','payment_status','cheque_no','received_date']);
                return [
                    'id'            => $f->id,
                    'person_key'    => $f->person_key,
                    'academic_year' => $f->academic_year,
                    'schemes'       => $f->schemes,
                    'total_amount'  => (float) $f->total_amount,
                    'review_status' => $f->review_status,
                    'committee_note'=> $f->committee_note,
                    'reviewed_at'   => $f->reviewed_at?->toIso8601String(),
                    'rows'          => $rows,
                ];
            });

        return response()->json(['data' => $flags]);
    }

    public function review(Request $request, DuplicateFlag $flag)
    {
        $data = $request->validate([
            'review_status'  => 'required|in:pending,cleared,confirmed_duplicate,escalated',
            'committee_note' => 'nullable|string|max:2000',
        ]);

        $flag->update([
            'review_status'  => $data['review_status'],
            'committee_note' => $data['committee_note'] ?? null,
            'reviewed_at'    => now(),
        ]);

        return response()->json(['data' => $flag]);
    }
}
