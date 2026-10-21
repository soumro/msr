<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Scholarship;
use App\Models\DuplicateFlag;
use App\Models\AuditLog;
use App\Services\DuplicateAidDetector;
use Illuminate\Http\Request;

class ScholarshipController extends Controller
{
    public function index(Request $request)
    {
        $query = Scholarship::query();

        if ($s = $request->input('search')) {
            $query->where(function ($w) use ($s) {
                $w->where('student_id', 'like', "%$s%")
                  ->orWhere('student_name', 'like', "%$s%")
                  ->orWhere('cnic', 'like', "%$s%")
                  ->orWhere('scheme', 'like', "%$s%")
                  ->orWhere('donor', 'like', "%$s%")
                  ->orWhere('cheque_no', 'like', "%$s%")
                  ->orWhere('notes', 'like', "%$s%");
            });
        }

        foreach (['academic_year','scheme','donor','funding_group','payment_status','renewal_status','category'] as $f) {
            if ($request->filled($f)) {
                $query->where($f, $request->input($f));
            }
        }

        if ($request->filled('received_from')) {
            $query->whereDate('received_date', '>=', $request->input('received_from'));
        }
        if ($request->filled('received_to')) {
            $query->whereDate('received_date', '<=', $request->input('received_to'));
        }

        $sortBy  = $request->input('sort_by', 'id');
        $sortDir = $request->input('sort_dir', 'desc') === 'asc' ? 'asc' : 'desc';
        $sortable = ['id','student_id','student_name','approved_amount','received_date','cheque_no'];
        if (in_array($sortBy, $sortable, true)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderByDesc('id');
        }

        $perPage = (int) $request->input('per_page', 25);
        if (!in_array($perPage, [10, 25, 50, 100], true)) $perPage = 25;

        $page = $query->paginate($perPage);

        $flagKeys = DuplicateFlag::whereIn('review_status', ['pending','escalated'])
            ->get()
            ->map(fn ($f) => $f->person_key . '|' . $f->academic_year)
            ->all();

        $page->getCollection()->transform(function ($row) use ($flagKeys) {
            $d = preg_replace('/\D/', '', (string) $row->cnic);
            $key = ($d !== '' ? 'C:'.$d : 'S:'.strtoupper(trim($row->student_id))) . '|' . $row->academic_year;
            $row->flagged = in_array($key, $flagKeys, true);
            return $row;
        });

        return response()->json($page);
    }

    public function store(Request $request)
    {
        $scholarship = Scholarship::create($this->validateData($request));
        app(DuplicateAidDetector::class)->rebuild();
        return response()->json($scholarship, 201);
    }

    public function show(Scholarship $scholarship)
    {
        return response()->json(['data' => $scholarship]);
    }

    public function update(Request $request, Scholarship $scholarship)
    {
        $scholarship->update($this->validateData($request));
        app(DuplicateAidDetector::class)->rebuild();
        return response()->json($scholarship);
    }

    public function destroy(Scholarship $scholarship)
    {
        $scholarship->delete();
        app(DuplicateAidDetector::class)->rebuild();
        return response()->noContent();
    }

    /**
     * Bulk update — used by the Register page checkboxes.
     * Body: { ids: [1,2,3], payment_status?: "paid", renewal_status?: "approved", category?: "fresh" }
     */
    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'ids'            => 'required|array|min:1',
            'ids.*'          => 'integer|exists:scholarships,id',
            'payment_status' => 'nullable|in:pending,partial,paid,failed',
            'renewal_status' => 'nullable|in:not_due,due,submitted,approved,rejected',
            'category'       => 'nullable|in:fresh,renewal',
        ]);

        $patch = array_filter([
            'payment_status' => $data['payment_status'] ?? null,
            'renewal_status' => $data['renewal_status'] ?? null,
            'category'       => $data['category'] ?? null,
        ], fn ($v) => $v !== null);

        if (empty($patch)) {
            return response()->json(['message' => 'No fields to update.'], 422);
        }

        $count = Scholarship::whereIn('id', $data['ids'])->update($patch);

        AuditLog::create([
            'user_id'     => auth()->id(),
            'user_email'  => auth()->user()?->email,
            'action'      => 'bulk_updated',
            'model_type'  => Scholarship::class,
            'model_id'    => null,
            'old_values'  => null,
            'new_values'  => ['ids' => $data['ids'], 'patch' => $patch],
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
            'description' => "Bulk updated {$count} records",
        ]);

        app(DuplicateAidDetector::class)->rebuild();

        return response()->json(['updated' => $count, 'patch' => $patch]);
    }

    private function validateData(Request $request): array
    {
        $data = $request->validate([
            'student_id'      => 'required|string|max:50',
            'student_name'    => 'nullable|string|max:150',
            'cnic'            => ['nullable','string','regex:/^\d{5}-\d{7}-\d$/'],
            'scheme'          => 'required|string|max:100',
            'category'        => 'required|in:fresh,renewal',
            'academic_year'   => 'required|string|max:20',
            'donor'           => 'required|string|max:100',
            'funding_group'   => 'nullable|string|max:100',
            'approved_amount' => 'required|numeric|min:0',
            'cheque_no'       => 'nullable|string|max:60',
            'received_date'   => 'nullable|date',
            'payment_status'  => 'required|in:pending,partial,paid,failed',
            'renewal_status'  => 'required|in:not_due,due,submitted,approved,rejected',
            'notes'           => 'nullable|string|max:2000',
        ]);

        if (empty($data['cheque_no']))     $data['cheque_no'] = null;
        if (empty($data['received_date'])) $data['received_date'] = null;
        if (empty($data['funding_group'])) $data['funding_group'] = null;
        if (empty($data['cnic']))          $data['cnic'] = null;

        if ($data['received_date'] && $data['payment_status'] === 'pending') {
            $data['payment_status'] = 'paid';
        }

        return $data;
    }
}
