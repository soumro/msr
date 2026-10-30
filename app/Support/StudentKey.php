<?php

namespace App\Support;

class StudentKey
{
    /**
     * Roll-No-only composite key.
     * Every distinct student_id = one unique student.
     * CNIC is ignored for uniqueness.
     *
     * Fallback: if student_id is empty, use a per-row unique
     * value so empty rows don't collapse into one "student".
     */
    public static function fromRow($row): string
    {
        $sid = $row->student_id ?? null;

        if ($sid === null || trim((string) $sid) === '') {
            return 'UNKNOWN_' . ($row->id ?? uniqid());
        }

        return 'SID:' . trim((string) $sid);
    }

    /**
     * SQL equivalent of fromRow().
     * Uses CONCAT to prefix, matching the PHP prefix.
     * NULL/empty student_id → grouped per-row via id, so
     * records without roll no. stay distinct.
     */
    public static function sqlExpression(): string
    {
        return "COALESCE(CONCAT('SID:', NULLIF(student_id, '')), CONCAT('UNKNOWN_', id))";
    }
}
