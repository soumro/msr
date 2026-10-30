<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scholarship_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('scholarship_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained();
            $table->string('original_name');
            $table->string('stored_path');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->enum('category', [
                'approval', 'disbursement', 'id_card',
                'transcript', 'income_certificate', 'other',
            ])->default('other');
            $table->text('description')->nullable();
            $table->timestamps();
            $table->index('scholarship_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scholarship_documents');
    }
};
