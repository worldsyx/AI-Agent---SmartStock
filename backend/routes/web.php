<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'status' => 'healthy',
        'service' => 'SmartStock PRO Laravel Backend',
        'timestamp' => now()->toISOString(),
    ]);
});
