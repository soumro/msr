<?php

namespace Database\Seeders;

use App\Models\Lookup;
use Illuminate\Database\Seeder;

class LookupSeeder extends Seeder
{
    public function run(): void
    {
        $seed = [
            'scheme' => [
            'Need-Based', 'Merit-Based', 'HEC Need-Based',
            'Ehsaas Undergraduate', 'PEEF', 'Orphan Support',
            'Sports', 'Donor-Specific', 'PMLTC',
            ],
            'donor' => [
                'MUET SZAB', 'Higher Education Commission', 'Govt of Sindh',
                'Government of Pakistan', 'Pakistan Bait-ul-Mal', 'Sindh Education Endowment Fund', 'PakK Matiari Transmission Lines Company', 'Other Donors'
            ],
            'academic_year' => [
                '2023-2024', '2024-2025', '2025-2026', '2026-2027',
            ],
            'funding_group' => [
                'MUET SZAB', 'External Donor', 'MUET Jamshoro', 'Other'
            ]

        ];

        foreach ($seed as $type => $names) {
            foreach ($names as $i => $name) {
                Lookup::updateOrCreate(
                    ['type' => $type, 'name' => $name],
                    ['sort_order' => $i, 'active' => true]
                );
            }
        }
    }
}
