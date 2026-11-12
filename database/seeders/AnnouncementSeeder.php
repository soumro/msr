<?php

namespace Database\Seeders;

use App\Models\Announcement;
use Illuminate\Database\Seeder;

class AnnouncementSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'title'    => 'Zakat',
                'category' => 'announcement',
                'deadline' => '2026-11-02',
                'published'=> true,
                'body'     => 'Zakat by Sindh Government',
            ],
            [
                'title'    => 'PMLTC',
                'category' => 'announcement',
                'deadline' => '2026-10-01',
                'published'=> true,
                'body'     => 'Pak Matiari Transmission Line 2026-27',
            ],
        ];

        foreach ($items as $item) {
            // Match on title so re-running the seeder doesn't duplicate
            Announcement::updateOrCreate(
                ['title' => $item['title']],
                $item
            );
        }
    }
}
