<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('collective_cheques', function (Blueprint $t) {
            $t->id();
            $t->string('cheque_no', 60);
            $t->date('date_received')->nullable();
            $t->string('scholarship_program');
            $t->string('academic_year');
            $t->enum('installment_no', ['1st','2nd','3rd','4th'])->default('1st');
            $t->decimal('amount_received', 12, 2);
            $t->decimal('refunded_to_donor', 12, 2)->default(0);
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('collective_cheques'); }
};
