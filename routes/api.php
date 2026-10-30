<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Artisan;

use App\Http\Controllers\Api\ScholarshipController;
use App\Http\Controllers\Api\ScholarshipDetailController;
use App\Http\Controllers\Api\InstallmentController;
use App\Http\Controllers\Api\DuplicateCheckController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ApplicationController;
use App\Http\Controllers\Api\ReconciliationController;
use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AnnouncementDocumentController;
use App\Http\Controllers\Api\LookupController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\RenewalController;
use App\Http\Controllers\Api\BulkImportController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SettingController;

/*
|--------------------------------------------------------------------------
| Public — no auth required
|--------------------------------------------------------------------------
*/

Route::get('health', fn () => response()->json(['ok' => true]));

/*
|--------------------------------------------------------------------------
| Authenticated (any logged-in user)
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    // ---------- Session ----------
    Route::get('user', fn (Request $r) => $r->user());

    Route::post('logout', function (Request $request) {
        auth()->guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return response()->json(['ok' => true]);
    });

    // ---------- Profile (own account) ----------
    Route::get('profile',          [ProfileController::class, 'show']);
    Route::put('profile',          [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'updatePassword']);

    // ---------- App Settings (read) ----------
    // Any logged-in user can read; only admin can change.
    Route::get('settings', [SettingController::class, 'index']);

    // ---------- Dashboard ----------
    Route::get('dashboard', [DashboardController::class, 'index']);

    // ---------- Scholarships — read ----------
    Route::get('scholarships', [ScholarshipController::class, 'index']);
    Route::get('scholarships/{scholarship}', [ScholarshipController::class, 'show']);

    // ---------- Installments — read ----------
    Route::get('scholarships/{scholarship}/installments', [InstallmentController::class, 'index']);

    // ---------- Student detail — read ----------
    Route::prefix('scholarships/{scholarship}')->group(function () {
        Route::get('notes',     [ScholarshipDetailController::class, 'notes']);
        Route::get('documents', [ScholarshipDetailController::class, 'documents']);
        Route::get('related',   [ScholarshipDetailController::class, 'related']);
        Route::get('history',   [ScholarshipDetailController::class, 'history']);
        Route::get('documents/{document}/download', [ScholarshipDetailController::class, 'downloadDocument']);
    });

    // ---------- Duplicates ----------
    Route::get('duplicates',        [DuplicateCheckController::class, 'index']);
    Route::get('cheque-duplicates', [DuplicateCheckController::class, 'chequeDuplicates']);

    // ---------- Renewals — read ----------
    Route::get('renewals', [RenewalController::class, 'index']);

    // ---------- Applications — read ----------
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);

    // ---------- Reconciliation — read ----------
    Route::get('reconciliation', [ReconciliationController::class, 'index']);

    // ---------- Announcements — read ----------
    Route::get('announcements', [AnnouncementController::class, 'index']);
    Route::get('announcements/{announcement}/documents', [AnnouncementDocumentController::class, 'index']);
    Route::get('announcements/{announcement}/documents/{document}/download', [AnnouncementDocumentController::class, 'download']);

    // ---------- Lookups — read ----------
    Route::get('lookups', [LookupController::class, 'index']);

    // ---------- Reports — read ----------
    Route::get('reports/year-end',       [ReportsController::class, 'yearEnd']);
    Route::get('reports/student-wise',   [ReportsController::class, 'studentWise']);
    Route::get('reports/year-wise',      [ReportsController::class, 'yearWise']);
    Route::get('reports/department-wise',[ReportsController::class, 'departmentWise']);
    Route::get('reports/summary',        [ReportsController::class, 'summary']);
    Route::get('reports/donor-wise',     [ReportsController::class, 'donorWise']);
    Route::get('reports/student-detail', [ReportsController::class, 'studentDetail']);
    Route::get('reports/pending-installments', [ReportsController::class, 'pendingInstallments']);

    // Route::get('reports/student-wise',   [ReportsController::class, 'studentWise']);
    // Route::get('reports/year-wise',      [ReportsController::class, 'yearWise']);
    // Route::get('reports/department-wise',[ReportsController::class, 'departmentWise']);
    // Route::get('reports/summary',        [ReportsController::class, 'summary']);

    // ---------- Import — read ----------
    Route::get('import/template',       [BulkImportController::class, 'template']);
    Route::get('import/sheet-template', [BulkImportController::class, 'sheetTemplate']);
    Route::get('import/history',        [BulkImportController::class, 'history']);

    /*
    |----------------------------------------------------------------------
    | EDIT (admin + committee)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,committee')->group(function () {

        // ---------- Scholarships — write ----------
        Route::post('scholarships', [ScholarshipController::class, 'store']);
        Route::put('scholarships/{scholarship}', [ScholarshipController::class, 'update']);
        Route::patch('scholarships/bulk', [ScholarshipController::class, 'bulkUpdate']);

        // ---------- Installments — write ----------
        Route::post('scholarships/{scholarship}/installments', [InstallmentController::class, 'store']);
        Route::put('scholarships/{scholarship}/installments', [InstallmentController::class, 'replaceAll']);
        Route::put('scholarships/{scholarship}/installments/{installment}', [InstallmentController::class, 'update']);
        Route::delete('scholarships/{scholarship}/installments/{installment}', [InstallmentController::class, 'destroy']);

        // ---------- Student detail — write ----------
        Route::prefix('scholarships/{scholarship}')->group(function () {
            Route::post('notes',                  [ScholarshipDetailController::class, 'storeNote']);
            Route::delete('notes/{note}',         [ScholarshipDetailController::class, 'destroyNote']);
            Route::post('documents',              [ScholarshipDetailController::class, 'storeDocument']);
            Route::delete('documents/{document}', [ScholarshipDetailController::class, 'destroyDocument']);
        });

        // ---------- Duplicate review ----------
        Route::post('duplicates/{flag}/review', [DuplicateCheckController::class, 'review']);

        // ---------- Renewals — write ----------
        Route::patch('renewals/{scholarship}/status', [RenewalController::class, 'updateStatus']);
        Route::post('renewals/bulk-status', [RenewalController::class, 'bulkStatus']);

        // ---------- Applications — write ----------
        Route::post('applications', [ApplicationController::class, 'store']);
        Route::put('applications/{application}', [ApplicationController::class, 'update']);
        Route::post('applications/{application}/promote', [ApplicationController::class, 'promote']);

        // ---------- Announcements — write ----------
        Route::post('announcements', [AnnouncementController::class, 'store']);
        Route::put('announcements/{announcement}', [AnnouncementController::class, 'update']);

        // ---------- Announcement documents — write ----------
        Route::post('announcements/{announcement}/documents', [AnnouncementDocumentController::class, 'store']);
        Route::delete('announcements/{announcement}/documents/{document}', [AnnouncementDocumentController::class, 'destroy']);

        // ---------- Import — write ----------
        Route::post('import/validate',       [BulkImportController::class, 'validate']);
        Route::post('import/commit',         [BulkImportController::class, 'commit']);
        Route::post('import/sheet-validate', [BulkImportController::class, 'sheetValidate']);
        Route::post('import/sheet-commit',   [BulkImportController::class, 'sheetCommit']);

        Route::post('scholarships/{scholarship}/roll-over', [ScholarshipController::class, 'rollOver']);

    });

    /*
    |----------------------------------------------------------------------
    | FINANCE (admin + finance)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,finance')->group(function () {
        Route::put('reconciliation', [ReconciliationController::class, 'update']);
    });

    /*
    |----------------------------------------------------------------------
    | ADMIN only
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin')->group(function () {

        // ---------- Deletes ----------
        Route::delete('scholarships/{scholarship}', [ScholarshipController::class, 'destroy']);
        Route::delete('applications/{application}', [ApplicationController::class, 'destroy']);
        Route::delete('announcements/{announcement}', [AnnouncementController::class, 'destroy']);

        // ---------- Lookups — full CRUD ----------
        Route::post('lookups', [LookupController::class, 'store']);
        Route::post('lookups/reorder', [LookupController::class, 'reorder']);
        Route::put('lookups/{lookup}', [LookupController::class, 'update']);
        Route::patch('lookups/{lookup}', [LookupController::class, 'update']);
        Route::delete('lookups/{lookup}', [LookupController::class, 'destroy']);

        // // ---------- Audit Log ----------
        // Route::get('audit-logs', [AuditLogController::class, 'index']);
        // Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);

        // ---------- App Settings — write ----------
        Route::post('settings',        [SettingController::class, 'update']);
        Route::post('settings/logo',   [SettingController::class, 'uploadLogo']);
        Route::delete('settings/logo', [SettingController::class, 'removeLogo']);

        // ---------- Backups ----------
        Route::get('backup/list', function () {
            return response()->json([
                'data' => collect(Storage::files('backups'))
                    ->map(fn ($f) => [
                        'name'     => basename($f),
                        'size'     => Storage::size($f),
                        'modified' => Storage::lastModified($f),
                    ])
                    ->sortByDesc('modified')
                    ->values(),
            ]);
        });

        Route::get('backup/download/{file}', function ($file) {
            $path = 'backups/' . basename($file);
            abort_unless(Storage::exists($path), 404);
            return Storage::download($path);
        });

        Route::post('backup/run', function () {
            Artisan::call('backup:database');
            return response()->json(['ok' => true]);
        });
    });

        /*
    |----------------------------------------------------------------------
    | AUDITOR (admin + auditor)
    |----------------------------------------------------------------------
    */
    Route::middleware('role:admin,auditor')->group(function () {
        Route::get('audit-logs', [AuditLogController::class, 'index']);
        Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);
    });
});
