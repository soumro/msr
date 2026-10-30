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
                // person_key is 'SID:K23EL086' or legacy 'C:...' / 'S:...'
                $studentId = null;
                if (str_starts_with($f->person_key, 'SID:')) {
                    $studentId = substr($f->person_key, 4);
                } elseif (str_starts_with($f->person_key, 'S:')) {
                    $studentId = substr($f->person_key, 2);
                }

                $cnicDigits = null;
                if (str_starts_with($f->person_key, 'C:')) {
                    $cnicDigits = substr($f->person_key, 2);
                }

                $rows = Scholarship::where('academic_year', $f->academic_year)
                    ->when($studentId, fn ($q) => $q->where('student_id', $studentId))
                    ->when(!$studentId && $cnicDigits, function ($q) use ($cnicDigits) {
                        $q->whereRaw("REPLACE(REPLACE(cnic,'-',''),' ','') = ?", [$cnicDigits]);
                    })
                    ->get(['id','student_id','student_name','cnic','scheme','donor','approved_amount','payment_status']);

                return [
                    'id'             => $f->id,
                    'person_key'     => $f->person_key,
                    'student_id'     => $studentId ?? $f->person_key,
                    'academic_year'  => $f->academic_year,
                    'schemes'        => $f->schemes,
                    'total_amount'   => (float) $f->total_amount,
                    'review_status'  => $f->review_status,
                    'committee_note' => $f->committee_note,
                    'reviewed_at'    => $f->reviewed_at?->toIso8601String(),
                    'rows'           => $rows,
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

    public function chequeDuplicates()
    {
        $groups = Scholarship::whereNotNull('cheque_no')
            ->where('cheque_no', '!=', '')
            ->select('cheque_no')
            ->selectRaw('COUNT(*) as record_count')
            ->selectRaw('COUNT(DISTINCT student_id) as student_count')
            ->selectRaw('SUM(approved_amount) as total_amount')
            ->groupBy('cheque_no')
            ->havingRaw('COUNT(DISTINCT student_id) > 1')
            ->get();

        $flags = $groups->map(function ($g) {
            $rows = Scholarship::where('cheque_no', $g->cheque_no)
                ->get(['id','student_id','student_name','cnic','scheme','donor',
                       'approved_amount','payment_status','received_date','academic_year']);

            return [
                'cheque_no'     => $g->cheque_no,
                'record_count'  => (int) $g->record_count,
                'student_count' => (int) $g->student_count,
                'total_amount'  => (float) $g->total_amount,
                'rows'          => $rows,
            ];
        });

        return response()->json(['data' => $flags->values()]);
    }
}
