<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public $timestamps = true;

    /** Defaults used when a key hasn't been set yet. */
    public const DEFAULTS = [
        'app_name'     => 'Master Scholarship Register',
        'app_slogan'   => 'Empowering students, one scholarship at a time',
        'logo_path'    => '',
        'nav_style'    => 'horizontal',  // 'horizontal' | 'vertical'
    ];

    public static function value(string $key, $default = null)
    {
        $row = static::where('key', $key)->first();
        return $row?->value ?? ($default ?? (static::DEFAULTS[$key] ?? null));
    }

    /** Cached per-request full map: [key => value] with defaults merged. */
    public static function allAsArray(): array
    {
        static $cache = null;
        if ($cache !== null) return $cache;

        $stored = static::pluck('value', 'key')->toArray();
        $cache = array_merge(static::DEFAULTS, $stored);
        return $cache;
    }
}
