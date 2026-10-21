<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class ReceivedAmount extends Model
{
    protected $fillable = ['donor','academic_year','amount','notes'];
}
