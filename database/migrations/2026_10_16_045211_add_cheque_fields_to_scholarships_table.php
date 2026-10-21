<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->string('cheque_no', 60)->nullable()->after('approved_amount');
            $table->date('received_date')->nullable()->after('cheque_no');
            $table->index('received_date');
        });
    }

    public function down(): void
    {
        Schema::table('scholarships', function (Blueprint $table) {
            $table->dropIndex(['received_date']);
            $table->dropColumn(['cheque_no', 'received_date']);
        });
    }
};
