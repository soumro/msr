<?php

namespace Database\Seeders;

use App\Models\Lookup;
use Illuminate\Database\Seeder;

class LookupSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            'scheme' => [
                ['PMLTC', 8],
                ['PBM', 10],
                ['SEEF', 11],
                ['Internal Merit', 12],
                ['SANA', 13],
                ['ZAKAT', 14],
                ['USAID', 15],
                ['PPL', 16],
                ['Zeb-un-Nisa and Fatima Zakat/ Need Cum Merit Scholarship', 17],
                ['Diya', 18],
            ],
            'donor' => [
                ['PMLTC', 0],
                ['Pakistan Bait-ul-mal', 1],
                ['Government of Sindh', 2],
                ['MUET Campus', 3],
                ['Sindhi Association of North America', 4],
                ['USAID', 5],
                ['Pakistan Petroleum Limited', 6],
                ['Late Mr. Bashir Ahmed Memon and his family.', 7],
                ['DIYAPAK', 8],
            ],
            'funding_group' => [
                ['MUET SZAB', 0],
                ['External Donor', 1],
                ['MUET Jamshoro', 2],
                ['Other', 3],
                ['MUET Campus', 4],
                ['External Scholarship', 5],
                ['Government of Sindh', 6],
            ],
            'academic_year' => [
                ['2023-2024', 0],
                ['2024-2025', 1],
                ['2025-2026', 2],
                ['2026-2027', 3],
            ],
            'semester' => [
                ['Fall', 0],
                ['Spring', 1],
            ],
        ];

        foreach ($data as $type => $items) {
            foreach ($items as [$name, $sortOrder]) {
                Lookup::updateOrCreate(
                    ['type' => $type, 'name' => $name],
                    ['sort_order' => $sortOrder, 'active' => true]
                );
            }
        }
    }
}
