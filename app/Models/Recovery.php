<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Recovery extends Model
{
    protected $fillable = ['scholarship_id','recovery_cheque_no','recovered_amount','recovery_date','reason'];
    protected $casts = ['recovered_amount' => 'decimal:2','recovery_date' => 'date'];

    public function scholarship() { return $this->belongsTo(Scholarship::class); }
}
