<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ScholarshipNote extends Model
{
    protected $fillable = ['scholarship_id', 'user_id', 'user_email', 'body'];

    public function scholarship()
    {
        return $this->belongsTo(Scholarship::class);
    }
}
