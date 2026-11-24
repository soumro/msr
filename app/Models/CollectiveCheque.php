<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class CollectiveCheque extends Model
{
    protected $fillable = ['cheque_no','date_received','scholarship_program','academic_year','installment_no','amount_received','refunded_to_donor','notes'];
    protected $casts = ['amount_received' => 'decimal:2','refunded_to_donor' => 'decimal:2','date_received' => 'date'];
}
