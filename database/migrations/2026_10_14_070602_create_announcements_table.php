<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('announcements', function (Blueprint $t) {
            $t->id();
            $t->string('title');
            $t->enum('category', ['announcement','deadline','guidance','renewal'])->default('announcement');
            $t->date('deadline')->nullable();
            $t->boolean('published')->default(true);
            $t->text('body');
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('announcements'); }
};
