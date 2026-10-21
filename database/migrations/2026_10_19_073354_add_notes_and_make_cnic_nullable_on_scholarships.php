<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add notes column
        Schema::table('scholarships', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('renewal_status');
        });

        // Make cnic nullable — per-scholarship sheets don't include it
        DB::statement("ALTER TABLE `scholarships` MODIFY COLUMN `cnic` VARCHAR(15) NULL");
    }

    public function down(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropColumn('notes');
        });

        DB::statement("ALTER TABLE `scholarships` MODIFY COLUMN `cnic` VARCHAR(15) NOT NULL");
    }
};
