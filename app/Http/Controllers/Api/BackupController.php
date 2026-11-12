<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class BackupController extends Controller
{
    /**
     * Tables that hold actual business data (order matters for FK safety).
     * Deleted in reverse; inserted in this order during restore.
     */
    private const DATA_TABLES = [
        'users',
        'lookups',
        'settings',
        'announcements',
        'scholarships',
        'installments',
        'applications',
        'duplicate_flags',
        'received_amounts',
        'scholarship_notes',
        'scholarship_documents',
        'announcement_documents',
        'import_batches',
        'audit_logs',
    ];

    private const BACKUP_DIR = 'backups';

    // ============================================================
    // LIST — GET /api/backup/list
    // ============================================================
    public function list()
    {
        try {
            $dir = storage_path('app/' . self::BACKUP_DIR);
            if (!is_dir($dir)) @mkdir($dir, 0755, true);

            $files = collect(File::files($dir))
                ->filter(fn ($f) => in_array($f->getExtension(), ['json', 'sql'], true))
                ->map(fn ($f) => [
                    'name'     => $f->getFilename(),
                    'size'     => $f->getSize(),
                    'type'     => $f->getExtension(),
                    'created'  => $f->getMTime(),
                ])
                ->sortByDesc('created')
                ->values();

            return response()->json(['data' => $files]);
        } catch (\Throwable $e) {
            Log::error('Backup list failed: ' . $e->getMessage());
            return response()->json(['data' => [], 'error' => $e->getMessage()]);
        }
    }

    // ============================================================
    // DOWNLOAD JSON — GET /api/backup/download-json
    // ============================================================
    public function downloadJson()
    {
        try {
            $payload = [
                'metadata' => [
                    'app'        => config('app.name'),
                    'version'    => '1.0',
                    'generated'  => now()->toIso8601String(),
                    'timezone'   => config('app.timezone'),
                    'record_counts' => collect(self::DATA_TABLES)->mapWithKeys(
                        fn ($t) => [$t => Schema::hasTable($t) ? DB::table($t)->count() : 0]
                    )->all(),
                ],
                'data' => [],
            ];

            foreach (self::DATA_TABLES as $table) {
                if (!Schema::hasTable($table)) continue;
                $payload['data'][$table] = DB::table($table)->get()->map(fn ($row) => (array) $row)->all();
            }

            $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            $filename = 'msr-backup-' . now()->format('Y-m-d_His') . '.json';

            // Save to disk (so it appears in the list)
            File::put(storage_path('app/' . self::BACKUP_DIR . '/' . $filename), $json);

            return response($json, 200, [
                'Content-Type'        => 'application/json',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Throwable $e) {
            Log::error('JSON backup failed: ' . $e->getMessage());
            return response()->json(['message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    // ============================================================
    // DOWNLOAD SQL — GET /api/backup/download-sql
    // ============================================================
    public function downloadSql()
    {
        try {
            $mysqldump = $this->findMysqldump();

            if (!$mysqldump) {
                return response()->json([
                    'message' => 'mysqldump.exe not found. Use JSON backup instead, or add MYSQLDUMP_PATH to .env.',
                ], 500);
            }

            $db = config('database.connections.mysql');
            $filename = 'msr-backup-' . now()->format('Y-m-d_His') . '.sql';
            $fullPath = storage_path('app/' . self::BACKUP_DIR . '/' . $filename);

            if (!is_dir(dirname($fullPath))) @mkdir(dirname($fullPath), 0755, true);

            $password = $db['password'] ? '--password=' . escapeshellarg($db['password']) : '';

            $command = sprintf(
                '"%s" --user=%s %s --no-tablespaces %s > "%s" 2>&1',
                $mysqldump,
                escapeshellarg($db['username']),
                $password,
                escapeshellarg($db['database']),
                $fullPath
            );

            exec($command, $out, $code);

            if ($code !== 0 || !file_exists($fullPath) || filesize($fullPath) === 0) {
                return response()->json([
                    'message' => 'SQL backup failed. Use JSON backup instead.',
                    'detail'  => implode("\n", $out),
                ], 500);
            }

            return response()->file($fullPath, [
                'Content-Type'        => 'application/sql',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ]);
        } catch (\Throwable $e) {
            Log::error('SQL backup failed: ' . $e->getMessage());
            return response()->json(['message' => 'Backup failed: ' . $e->getMessage()], 500);
        }
    }

    // ============================================================
    // DOWNLOAD EXISTING FILE — GET /api/backup/download/{filename}
    // ============================================================
    public function download(string $filename)
    {
        $path = storage_path('app/' . self::BACKUP_DIR . '/' . basename($filename));
        abort_unless(is_file($path), 404, 'Backup not found.');

        return response()->download($path);
    }

    // ============================================================
    // DELETE FILE — DELETE /api/backup/{filename}
    // ============================================================
    public function destroy(string $filename)
    {
        $path = storage_path('app/' . self::BACKUP_DIR . '/' . basename($filename));
        abort_unless(is_file($path), 404);

        @unlink($path);
        return response()->json(['ok' => true]);
    }

    // ============================================================
    // RESTORE FROM JSON — POST /api/backup/restore
    // ============================================================
    public function restore(Request $request)
    {
        $request->validate([
            'file'        => 'required|file|mimes:json,txt|max:51200',
            'restore_users' => 'boolean',
            'wipe_current'  => 'boolean',
        ]);

        $raw = file_get_contents($request->file('file')->getRealPath());
        $parsed = json_decode($raw, true);

        if (!is_array($parsed) || !isset($parsed['data']) || !is_array($parsed['data'])) {
            return response()->json(['message' => 'Invalid backup file — no "data" block found.'], 422);
        }

        $data = $parsed['data'];
        $restoreUsers = $request->boolean('restore_users', false);
        $wipeCurrent  = $request->boolean('wipe_current', true);

        $stats = [];

        DB::beginTransaction();
        try {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            if ($wipeCurrent) {
                // Delete in reverse dependency order
                $wipeOrder = array_reverse(self::DATA_TABLES);
                foreach ($wipeOrder as $table) {
                    if ($table === 'users' && !$restoreUsers) continue;
                    if (!Schema::hasTable($table)) continue;
                    DB::table($table)->truncate();
                    $stats[$table] = ['wiped' => true];
                }
            }

            // Insert in dependency order
            foreach (self::DATA_TABLES as $table) {
                if ($table === 'users' && !$restoreUsers) continue;
                if (!Schema::hasTable($table)) continue;
                if (empty($data[$table])) continue;

                $rows = $data[$table];
                $count = 0;

                // Insert in chunks of 100 to avoid max_allowed_packet
                foreach (array_chunk($rows, 100) as $chunk) {
                    DB::table($table)->insert($chunk);
                    $count += count($chunk);
                }

                $stats[$table] = ['inserted' => $count];
            }

            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            DB::commit();

            // Rebuild duplicate flags so the restored data is consistent
            try {
                app(\App\Services\DuplicateAidDetector::class)->rebuild();
            } catch (\Throwable $e) {
                Log::warning('Post-restore duplicate rebuild failed: ' . $e->getMessage());
            }

            return response()->json([
                'ok'    => true,
                'stats' => $stats,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            Log::error('Restore failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);

            return response()->json([
                'message' => 'Restore failed: ' . $e->getMessage(),
                'stats'   => $stats,
            ], 500);
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    private function findMysqldump(): ?string
    {
        if ($path = env('MYSQLDUMP_PATH')) {
            if (is_file($path)) return $path;
        }

        $laragonRoot = 'C:\\laragon\\bin\\mysql';
        if (is_dir($laragonRoot)) {
            foreach (@scandir($laragonRoot) ?: [] as $dir) {
                if ($dir === '.' || $dir === '..') continue;
                $exe = $laragonRoot . '\\' . $dir . '\\bin\\mysqldump.exe';
                if (is_file($exe)) return $exe;
            }
        }

        $xampp = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
        if (is_file($xampp)) return $xampp;

        $where = @shell_exec('where mysqldump 2>nul');
        if ($where) {
            $first = trim(strtok($where, "\n"));
            if ($first && is_file($first)) return $first;
        }

        return null;
    }
}
