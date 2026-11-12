<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Preserves your original admin account (email) but resets password to "password"
        // Change password after first login via /profile
        User::updateOrCreate(
            ['email' => 'ashraf@msr.test'],
            [
                'name'              => 'Muhammad Ashraf Soomro',
                'password'          => Hash::make('password'),
                'role'              => 'admin',
                'email_verified_at' => now(),
            ]
        );
    }
}
