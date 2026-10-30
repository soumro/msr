<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Setting::allAsArray()]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'app_name'   => 'nullable|string|max:120',
            'app_slogan' => 'nullable|string|max:200',
            'nav_style'  => 'nullable|in:horizontal,vertical',
        ]);

        foreach ($data as $key => $value) {
            if ($value === null) continue;
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }

        return response()->json(['data' => Setting::allAsArray()]);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|file|mimes:png,jpg,jpeg,svg,webp|max:2048',
        ]);

        $file = $request->file('logo');
        $ext = $file->getClientOriginalExtension();
        $filename = 'logo-' . time() . '.' . $ext;

        // Store under public/uploads/app — accessible via /uploads/app/...
        $dir = public_path('uploads/app');
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        $file->move($dir, $filename);

        $url = '/uploads/app/' . $filename;

        // Delete old
        $old = Setting::value('logo_path');
        if ($old && str_starts_with($old, '/uploads/app/')) {
            $oldFile = public_path(ltrim($old, '/'));
            if (is_file($oldFile)) @unlink($oldFile);
        }

        Setting::updateOrCreate(['key' => 'logo_path'], ['value' => $url]);

        return response()->json(['data' => Setting::allAsArray()]);
    }

    public function removeLogo()
    {
        $old = Setting::value('logo_path');
        if ($old && str_starts_with($old, '/uploads/app/')) {
            $oldFile = public_path(ltrim($old, '/'));
            if (is_file($oldFile)) @unlink($oldFile);
        }
        Setting::updateOrCreate(['key' => 'logo_path'], ['value' => '']);
        return response()->json(['data' => Setting::allAsArray()]);
    }
}
