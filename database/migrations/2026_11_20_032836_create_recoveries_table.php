<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('recoveries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('scholarship_id')->constrained()->cascadeOnDelete();
            $t->string('recovery_cheque_no', 60);
            $t->decimal('recovered_amount', 12, 2);
            $t->date('recovery_date')->nullable();
            $t->text('reason')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('recoveries'); }
};
