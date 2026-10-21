<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    ScholarshipController,
    DuplicateCheckController,
    DashboardController,
    ApplicationController,
    ReconciliationController,
    AnnouncementController,
    LookupController,
    ReportsController,
    RenewalController,
    BulkImportController,
    AuditLogController,
};

// Public health check (no auth)
Route::get('health', fn () => response()->json(['ok' => true]));

Route::middleware('auth:sanctum')->group(function () {

    // ---------- AUTH HELPERS ----------
    Route::get('user', fn (Request $r) => $r->user());

    Route::post('logout', function (Request $request) {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok' => true]);
    });

    // ---------- READ (any logged-in user) ----------
    Route::get('dashboard', [DashboardController::class, 'index']);

    Route::get('scholarships', [ScholarshipController::class, 'index']);
    Route::get('scholarships/{scholarship}', [ScholarshipController::class, 'show']);

    Route::get('duplicates', [DuplicateCheckController::class, 'index']);
    Route::get('cheque-duplicates', [DuplicateCheckController::class, 'chequeDuplicates']);

    Route::get('renewals', [RenewalController::class, 'index']);

    Route::get('applications', [ApplicationController::class, 'index']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);

    Route::get('reconciliation', [ReconciliationController::class, 'index']);
    Route::get('announcements', [AnnouncementController::class, 'index']);
    Route::get('lookups', [LookupController::class, 'index']);
    Route::get('reports/year-end', [ReportsController::class, 'yearEnd']);

    Route::get('import/template', [BulkImportController::class, 'template']);
    Route::get('import/sheet-template', [BulkImportController::class, 'sheetTemplate']);
    Route::get('import/history', [BulkImportController::class, 'history']);

    // ---------- EDIT (admin + committee) ----------
    Route::middleware('role:admin,committee')->group(function () {
        Route::post('scholarships', [ScholarshipController::class, 'store']);
        Route::put('scholarships/{scholarship}', [ScholarshipController::class, 'update']);
        Route::patch('scholarships/bulk', [ScholarshipController::class, 'bulkUpdate']);

        Route::post('duplicates/{flag}/review', [DuplicateCheckController::class, 'review']);

        Route::patch('renewals/{scholarship}/status', [RenewalController::class, 'updateStatus']);
        Route::post('renewals/bulk-status', [RenewalController::class, 'bulkStatus']);

        Route::post('applications', [ApplicationController::class, 'store']);
        Route::put('applications/{application}', [ApplicationController::class, 'update']);

        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);

        Route::post('import/validate', [BulkImportController::class, 'validate']);
        Route::post('import/commit', [BulkImportController::class, 'commit']);
        Route::post('import/sheet-validate', [BulkImportController::class, 'sheetValidate']);
        Route::post('import/sheet-commit', [BulkImportController::class, 'sheetCommit']);

        Route::post('applications/{application}/promote', [ApplicationController::class, 'promote']);

        Route::patch('scholarships/bulk', [ScholarshipController::class, 'bulkUpdate']);

    });

    // ---------- FINANCE (admin + finance) ----------
    Route::middleware('role:admin,finance')->group(function () {
        Route::put('reconciliation', [ReconciliationController::class, 'update']);
    });

    // ---------- ADMIN ONLY ----------
    Route::middleware('role:admin')->group(function () {

        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);

        Route::delete('scholarships/{scholarship}', [ScholarshipController::class, 'destroy']);
        Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        Route::post('lookups', [LookupController::class, 'store']);
        Route::put('lookups/{lookup}', [LookupController::class, 'update']);
        Route::patch('lookups/{lookup}', [LookupController::class, 'update']);
        Route::delete('lookups/{lookup}', [LookupController::class, 'destroy']);
        Route::post('lookups/reorder', [LookupController::class, 'reorder']);

        // Backups
        Route::get('backup/list', function () {
            return response()->json([
                'data' => collect(\Storage::files('backups'))
                    ->map(fn ($f) => [
                        'name'     => basename($f),
                        'size'     => \Storage::size($f),
                        'modified' => \Storage::lastModified($f),
                    ])
                    ->sortByDesc('modified')
                    ->values(),
            ]);
        });

        Route::get('backup/download/{file}', function ($file) {
            $path = 'backups/' . basename($file);
            abort_unless(\Storage::exists($path), 404);
            return \Storage::download($path);
        });

        Route::post('backup/run', function () {
            \Artisan::call('backup:database');
            return response()->json(['ok' => true]);
        });
    });
});
