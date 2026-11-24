<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('scholarships', function (Blueprint $t) {
            $t->string('father_name', 150)->nullable()->after('student_name');
            $t->enum('cheque_status', ['issued','cleared','stale','cancelled','recovered'])
              ->default('issued')->after('payment_status');
            $t->string('receiver_sign', 200)->nullable();
        });
    }
    public function down(): void {
        Schema::table('scholarships', function (Blueprint $t) {
            $t->dropColumn(['father_name','cheque_status','receiver_sign']);
        });
    }
};
