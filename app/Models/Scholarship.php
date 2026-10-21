<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

class Scholarship extends Model
{
    use Auditable;

    protected $fillable = [
    'student_id', 'student_name', 'cnic',
    'scheme', 'category', 'academic_year', 'donor', 'funding_group',
    'approved_amount', 'cheque_no', 'received_date',
    'payment_status', 'renewal_status',
    'notes',
    ];

    protected $casts = [
        'approved_amount' => 'decimal:2',
        'received_date'   => 'date',
    ];
}
