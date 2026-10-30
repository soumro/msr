<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScholarshipDocument extends Model
{
    protected $fillable = [
        'scholarship_id', 'user_id', 'original_name', 'stored_path',
        'mime_type', 'size_bytes', 'category', 'description',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
    ];

    public function scholarship()
    {
        return $this->belongsTo(Scholarship::class);
    }
}
