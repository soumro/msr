<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function ($model) {
            static::writeAudit($model, 'created', null, $model->getAttributes());
        });

        static::updated(function ($model) {
            $dirty = $model->getDirty();
            if (empty($dirty)) return;

            $old = [];
            $new = [];
            foreach ($dirty as $key => $newVal) {
                $old[$key] = $model->getOriginal($key);
                $new[$key] = $newVal;
            }
            static::writeAudit($model, 'updated', $old, $new);
        });

        static::deleted(function ($model) {
            static::writeAudit($model, 'deleted', $model->getAttributes(), null);
        });
    }

    protected static function writeAudit($model, string $action, ?array $old, ?array $new): void
    {
        if ($model instanceof AuditLog) return;

        foreach (['created_at', 'updated_at'] as $k) {
            unset($old[$k], $new[$k]);
        }

        AuditLog::create([
            'user_id'     => Auth::id(),
            'user_email'  => Auth::user()?->email,
            'action'      => $action,
            'model_type'  => get_class($model),
            'model_id'    => $model->getKey(),
            'old_values'  => $old,
            'new_values'  => $new,
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
        ]);
    }
}
