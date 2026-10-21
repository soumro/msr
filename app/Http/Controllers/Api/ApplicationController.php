<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Application;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    public function index(Request $request)
    {
        $query = Application::query();

        if ($s = $request->input('search')) {
            $query->where(function ($w) use ($s) {
                $w->where('student_id', 'like', "%$s%")
                ->orWhere('student_name', 'like', "%$s%")
                ->orWhere('cnic', 'like', "%$s%");
            });
        }
        if ($request->filled('status'))      $query->where('status', $request->input('status'));
        if ($request->filled('eligibility')) $query->where('eligibility', $request->input('eligibility'));

        $perPage = (int) $request->input('per_page', 25);
        if (!in_array($perPage, [10, 25, 50, 100], true)) $perPage = 25;

        return response()->json($query->orderByDesc('id')->paginate($perPage));
    }

    public function store(Request $request)
    {
        return response()->json(Application::create($this->validateData($request)), 201);
    }

    public function show(Application $application)
    {
        return response()->json($application);
    }

    public function update(Request $request, Application $application)
    {
        $application->update($this->validateData($request));
        return response()->json($application);
    }

    public function destroy(Application $application)
    {
        $application->delete();
        return response()->noContent();
    }

    private function validateData(Request $request): array
    {
        $data = $request->validate([
            'student_id'       => 'required|string|max:50',
            'student_name'     => 'nullable|string|max:150',
            'cnic'             => ['required', 'string', 'regex:/^\d{5}-\d{7}-\d$/'],
            'scheme'           => 'required|string|max:100',
            'academic_year'    => 'required|string|max:20',
            'eligibility'      => 'required|in:pending,eligible,ineligible',
            'status'           => 'required|in:draft,submitted,under_review,approved,rejected',
            'decision_date'    => 'nullable|date',
            'rejection_reason' => 'nullable|string|max:2000',
            'notes'            => 'nullable|string|max:2000',
        ]);

        if ($data['status'] === 'rejected' && empty($data['rejection_reason'])) {
            abort(422, 'Rejection reason is required when status is rejected.');
        }

        // Normalize empty date
        if (empty($data['decision_date'])) {
            $data['decision_date'] = null;
        }

        return $data;
    }

    public function promote(Application $application)
    {
        if ($application->scholarship_id) {
            return response()->json([
                'message' => 'Application already promoted to scholarship #' . $application->scholarship_id,
            ], 409);
        }

        if ($application->status !== 'approved') {
            return response()->json([
                'message' => 'Only approved applications can be promoted.',
            ], 422);
        }

        // Create a pending scholarship record
        $scholarship = \App\Models\Scholarship::create([
            'student_id'      => $application->student_id,
            'student_name'    => $application->student_name,
            'cnic'            => $application->cnic,
            'scheme'          => $application->scheme,
            'category'        => 'fresh',
            'academic_year'   => $application->academic_year,
            'donor'           => '',                           // admin fills later
            'funding_group'   => null,
            'approved_amount' => 0,                            // admin fills later
            'cheque_no'       => null,
            'received_date'   => null,
            'payment_status'  => 'pending',
            'renewal_status'  => 'not_due',
            'notes'           => 'Auto-created from application #' . $application->id,
        ]);

        $application->update([
            'scholarship_id' => $scholarship->id,
            'promoted_at'    => now(),
        ]);

        // Log the promotion action
        \App\Models\AuditLog::create([
            'user_id'     => auth()->id(),
            'user_email'  => auth()->user()?->email,
            'action'      => 'promoted',
            'model_type'  => \App\Models\Application::class,
            'model_id'    => $application->id,
            'old_values'  => null,
            'new_values'  => ['scholarship_id' => $scholarship->id],
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
            'description' => 'Promoted to scholarship #' . $scholarship->id,
        ]);

        return response()->json([
            'scholarship' => $scholarship,
            'application' => $application->fresh(),
        ], 201);
    }

}
