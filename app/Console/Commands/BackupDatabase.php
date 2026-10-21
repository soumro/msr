<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--keep=7 : Number of backups to keep}';
    protected $description = 'Back up the MySQL database to a SQL file';

    public function handle()
    {
        Storage::makeDirectory('backups');

        $db = config('database.connections.mysql');
        $filename = 'backups/db-' . now()->format('Y-m-d_His') . '.sql';
        $fullPath = storage_path('app/' . $filename);

        $password = $db['password'] ? '--password=' . escapeshellarg($db['password']) : '';

        $command = sprintf(
            'mysqldump --user=%s %s %s > %s',
            escapeshellarg($db['username']),
            $password,
            escapeshellarg($db['database']),
            escapeshellarg($fullPath)
        );

        exec($command, $output, $return);

        if ($return !== 0 || !file_exists($fullPath)) {
            $this->error('Backup failed.');
            return 1;
        }

        $keep = (int) $this->option('keep');
        $files = collect(Storage::files('backups'))
            ->filter(fn ($f) => str_ends_with($f, '.sql'))
            ->sortDesc()
            ->values();

        $files->slice($keep)->each(fn ($f) => Storage::delete($f));

        $this->info('Backup saved: ' . $filename);
        return 0;
    }
}
