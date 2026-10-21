<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('applications', function (Blueprint $t) {
            $t->id();
            $t->string('student_id')->index();
            $t->string('student_name')->nullable();
            $t->string('cnic', 15);
            $t->string('scheme');
            $t->string('academic_year');
            $t->enum('eligibility', ['pending','eligible','ineligible'])->default('pending');
            $t->enum('status', ['draft','submitted','under_review','approved','rejected'])->default('draft');
            $t->date('decision_date')->nullable();
            $t->text('rejection_reason')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('applications'); }
};
