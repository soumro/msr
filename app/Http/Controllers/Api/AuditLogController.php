<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::query()->orderByDesc('id');

        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }
        if ($request->filled('user_email')) {
            $query->where('user_email', 'like', '%' . $request->input('user_email') . '%');
        }
        if ($request->filled('model_type')) {
            $query->where('model_type', 'like', '%' . $request->input('model_type') . '%');
        }
        if ($request->filled('model_id')) {
            $query->where('model_id', $request->input('model_id'));
        }
        if ($request->filled('from')) {
            $query->whereDate('created_at', '>=', $request->input('from'));
        }
        if ($request->filled('to')) {
            $query->whereDate('created_at', '<=', $request->input('to'));
        }
        if ($request->filled('search')) {
            $s = $request->input('search');
            $query->where(function ($w) use ($s) {
                $w->where('description', 'like', "%$s%")
                  ->orWhere('user_email', 'like', "%$s%")
                  ->orWhere('model_type', 'like', "%$s%");
            });
        }

        $perPage = (int) $request->input('per_page', 50);
        if (!in_array($perPage, [25, 50, 100, 200], true)) $perPage = 50;

        return response()->json($query->paginate($perPage));
    }

    public function show(AuditLog $auditLog)
    {
        return response()->json($auditLog);
    }
}
