<?php

use Illuminate\Support\Facades\Route;

require __DIR__.'/auth.php';

Route::middleware('auth')->group(function () {
    Route::get('/', fn () => view('app'))->name('home');
    Route::get('/dashboard', fn () => view('app'))->name('dashboard');
    Route::get('/{any}', fn () => view('app'))->where('any', '.*');
});
