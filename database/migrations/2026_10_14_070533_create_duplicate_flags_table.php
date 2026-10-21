<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('duplicate_flags', function (Blueprint $t) {
            $t->id();
            $t->string('person_key')->index();
            $t->string('academic_year');
            $t->json('schemes');
            $t->decimal('total_amount', 12, 2)->default(0);
            $t->enum('review_status', ['pending','cleared','confirmed_duplicate','escalated'])->default('pending');
            $t->text('committee_note')->nullable();
            $t->timestamp('reviewed_at')->nullable();
            $t->timestamps();
            $t->unique(['person_key','academic_year']);
        });
    }
    public function down(): void { Schema::dropIfExists('duplicate_flags'); }
};
