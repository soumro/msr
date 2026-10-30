<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnnouncementDocument extends Model
{
    protected $fillable = [
        'announcement_id', 'user_id', 'original_name', 'stored_path',
        'mime_type', 'size_bytes', 'description',
    ];

    protected $casts = ['size_bytes' => 'integer'];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }
}
