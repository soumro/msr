<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['title','category','deadline','published','body'];
    protected $casts = ['published' => 'boolean', 'deadline' => 'date'];
}
