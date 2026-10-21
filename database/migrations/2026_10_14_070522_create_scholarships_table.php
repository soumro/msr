<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('scholarships', function (Blueprint $t) {
            $t->id();
            $t->string('student_id')->index();
            $t->string('student_name')->nullable();
            $t->string('cnic', 15)->index();
            $t->string('scheme');
            $t->string('academic_year');
            $t->string('donor');
            $t->decimal('approved_amount', 12, 2);
            $t->enum('payment_status', ['pending','partial','paid','failed'])->default('pending');
            $t->enum('renewal_status', ['not_due','due','submitted','approved','rejected'])->default('not_due');
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('scholarships'); }
};
