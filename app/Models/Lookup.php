<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lookup extends Model
{
    protected $fillable = ['type', 'name', 'sort_order', 'active'];
    protected $casts = ['active' => 'boolean'];
}
