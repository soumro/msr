<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class DuplicateFlag extends Model
{
    protected $fillable = ['person_key','academic_year','schemes','total_amount','review_status','committee_note','reviewed_at'];
    protected $casts = ['schemes' => 'array', 'reviewed_at' => 'datetime'];
}
