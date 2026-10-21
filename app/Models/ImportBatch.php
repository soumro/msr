<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    protected $fillable = [
        'user_id', 'filename',
        'total_rows', 'imported', 'skipped', 'failed', 'errors',
    ];

    protected $casts = ['errors' => 'array'];
}
