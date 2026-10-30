<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $appSettings['app_name'] ?? config('app.name') }}</title>
    @vite(['resources/css/app.css'])
</head>
<body class="font-sans text-slate-900 antialiased bg-slate-50">
    <div class="min-h-screen flex flex-col sm:justify-center items-center pt-8 sm:pt-0 bg-gradient-to-br from-emerald-50 via-white to-slate-100">
        <div class="mb-8 text-center px-4">
            @if (!empty($appSettings['logo_path']))
                <img src="{{ $appSettings['logo_path'] }}" alt="Logo"
                     class="w-20 h-20 mx-auto mb-4 object-contain rounded-2xl bg-white shadow-md border border-slate-200 p-2">
            @else
                <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-emerald-900 text-white grid place-items-center text-2xl font-extrabold shadow-md">
                    {{ strtoupper(substr($appSettings['app_name'] ?? 'MSR', 0, 3)) }}
                </div>
            @endif

            <h1 class="text-2xl font-bold text-emerald-900">
                {{ $appSettings['app_name'] ?? 'Master Scholarship Register' }}
            </h1>

            @if (!empty($appSettings['app_slogan']))
                <p class="text-sm text-slate-600 mt-1 max-w-md">{{ $appSettings['app_slogan'] }}</p>
            @endif
        </div>

        <div class="w-full sm:max-w-md px-6 py-8 bg-white shadow-lg overflow-hidden sm:rounded-2xl border border-slate-200">
            {{ $slot }}
        </div>

        <p class="mt-6 mb-6 text-xs text-slate-500">
            &copy; {{ date('Y') }} {{ $appSettings['app_name'] ?? 'MSR' }}
        </p>
    </div>
</body>
</html>
