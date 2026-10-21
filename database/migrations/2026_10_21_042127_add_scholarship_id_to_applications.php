<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->foreignId('scholarship_id')->nullable()->after('id')
                  ->constrained('scholarships')->nullOnDelete();
            $table->timestamp('promoted_at')->nullable()->after('decision_date');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropForeign(['scholarship_id']);
            $table->dropColumn(['scholarship_id', 'promoted_at']);
        });
    }
};
