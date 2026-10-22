<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scholarship_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('installment_no');         // 1, 2, 3...
            $table->decimal('amount', 12, 2);
            $table->string('cheque_no', 60)->nullable();
            $table->date('received_date')->nullable();
            $table->enum('status', ['pending', 'received', 'failed'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['scholarship_id', 'installment_no']);
            $table->index('status');
            $table->index('received_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('installments');
    }
};
