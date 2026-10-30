<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scholarship_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scholarship_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained();
            $table->string('user_email')->nullable();
            $table->text('body');
            $table->timestamps();
            $table->index('scholarship_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_notes');
    }
};
