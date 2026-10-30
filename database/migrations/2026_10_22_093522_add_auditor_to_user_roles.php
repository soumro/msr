<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY COLUMN `role`
            ENUM('admin', 'committee', 'finance', 'viewer', 'auditor')
            NOT NULL DEFAULT 'viewer'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `users`
            MODIFY COLUMN `role`
            ENUM('admin', 'committee', 'finance', 'viewer')
            NOT NULL DEFAULT 'viewer'
        ");
    }
};
