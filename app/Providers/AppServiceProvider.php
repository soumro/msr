<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
   public function boot(): void
    {
        \Illuminate\Support\Facades\View::composer(
            ['layouts.guest', 'auth.*', 'welcome'],
            function ($view) {
                try {
                    $view->with('appSettings', \App\Models\Setting::allAsArray());
                } catch (\Throwable $e) {
                    $view->with('appSettings', \App\Models\Setting::DEFAULTS);
                }
            }
        );
    }
}
