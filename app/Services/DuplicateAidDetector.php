<?php

namespace App\Services;

use App\Models\Scholarship;
use App\Models\DuplicateFlag;
use Illuminate\Support\Facades\Log;

class DuplicateAidDetector
{
    public function rebuild(): void
    {
        try {
            $all = Scholarship::all();

            // Group by (student_id + academic_year) — roll-no-only uniqueness
            $groups = $all->groupBy(function ($r) {
                $sid = trim((string) ($r->student_id ?? ''));
                $sid = $sid !== '' ? $sid : 'UNK_' . $r->id;
                return $sid . '|' . ($r->academic_year ?? '');
            });

            // Build the flags array (do NOT delete until we know we can create)
            $toInsert = [];
            foreach ($groups as $key => $rows) {
                $schemes = $rows->pluck('scheme')->unique()->filter(fn ($s) => $s !== null && $s !== '')->values()->all();
                if (count($schemes) < 2) continue;

                [$studentId, $year] = explode('|', $key, 2);
                $personKey = 'SID:' . $studentId;

                $existing = DuplicateFlag::where('person_key', $personKey)
                    ->where('academic_year', $year)
                    ->first();

                $toInsert[] = [
                    'person_key'     => $personKey,
                    'academic_year'  => $year,
                    'schemes'        => $schemes,
                    'total_amount'   => (float) $rows->sum('approved_amount'),
                    'review_status'  => $existing->review_status ?? 'pending',
                    'committee_note' => $existing->committee_note ?? null,
                    'reviewed_at'    => $existing->reviewed_at ?? null,
                ];
            }

            // Wipe all old flags only after we've prepared the replacements
            DuplicateFlag::query()->delete();

            foreach ($toInsert as $row) {
                DuplicateFlag::create($row);
            }

            Log::info('Duplicate rebuild complete', [
                'groups_total'   => $groups->count(),
                'flags_created'  => count($toInsert),
            ]);
        } catch (\Throwable $e) {
            Log::error('Duplicate rebuild failed: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }
}
