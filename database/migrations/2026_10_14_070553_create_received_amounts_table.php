<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('received_amounts', function (Blueprint $t) {
            $t->id();
            $t->string('donor');
            $t->string('academic_year');
            $t->decimal('amount', 12, 2)->default(0);
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->unique(['donor','academic_year']);
        });
    }
    public function down(): void { Schema::dropIfExists('received_amounts'); }
};
