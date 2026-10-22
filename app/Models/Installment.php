<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Installment extends Model
{
    protected $fillable = [
        'scholarship_id', 'installment_no', 'amount',
        'cheque_no', 'received_date', 'status', 'notes',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'received_date' => 'date',
    ];

    public function scholarship()
    {
        return $this->belongsTo(Scholarship::class);
    }
}
