<?php
namespace App\Services;

use App\Models\Scholarship;
use App\Models\DuplicateFlag;

class DuplicateAidDetector
{
    public function rebuild(): void
    {
        $groups = Scholarship::all()->groupBy(fn ($r) => $this->personKey($r) . '|' . $r->academic_year);

        $activeKeys = [];
        foreach ($groups as $key => $rows) {
            $schemes = $rows->pluck('scheme')->unique()->values()->all();
            if (count($schemes) < 2) continue;

            [$personKey, $year] = explode('|', $key, 2);
            $activeKeys[] = $personKey;

            $existing = DuplicateFlag::where('person_key', $personKey)
                ->where('academic_year', $year)->first();

            DuplicateFlag::updateOrCreate(
                ['person_key' => $personKey, 'academic_year' => $year],
                [
                    'schemes'        => $schemes,
                    'total_amount'   => $rows->sum('approved_amount'),
                    'review_status'  => $existing->review_status ?? 'pending',
                    'committee_note' => $existing->committee_note ?? null,
                ]
            );
        }

        if ($activeKeys) {
            DuplicateFlag::whereNotIn('person_key', $activeKeys)->delete();
        } else {
            DuplicateFlag::query()->delete();
        }
    }

    private function personKey($row): string
    {
        $d = preg_replace('/\D/', '', (string) $row->cnic);
        return $d !== '' ? 'C:' . $d : 'S:' . strtoupper(trim($row->student_id));
    }
}
