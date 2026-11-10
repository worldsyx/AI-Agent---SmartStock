<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\MasterController;
use App\Http\Controllers\Api\V1\TransactionController;
use App\Http\Controllers\Api\V1\StocktakeController;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\ManagerController;
use App\Http\Controllers\Api\V1\OperatorController;
use App\Http\Controllers\Api\V1\QrController;
use App\Http\Controllers\Api\V1\AiChatController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\AiPerformanceController;

/*
|--------------------------------------------------------------------------
| API Routes (Prefix: /api/v1) - PRD Panduan Pemrosesan Data AI v1.0
|--------------------------------------------------------------------------
*/

// Public Auth routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected routes (Requires Token)
Route::middleware('auth.token')->group(function () {
    // 12.1 Auth
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // 12.2 Dashboard & Laporan Manager (Role: manager, admin)
    Route::prefix('manager')->middleware('auth.token:manager,admin')->group(function () {
        Route::get('/dashboard/summary', [ManagerController::class, 'summary']);
        Route::get('/dashboard/alerts', [ManagerController::class, 'alerts']);
        Route::get('/reports/morning', [ManagerController::class, 'morningReport']);
        Route::get('/reports/daily', [ManagerController::class, 'morningReport']);

        // AI Chat Manager (PRD 12.8)
        Route::get('/ai-chat/sessions', [AiChatController::class, 'getSessions']);
        Route::post('/ai-chat/sessions', [AiChatController::class, 'createSession']);
        Route::get('/ai-chat/sessions/{id}', [AiChatController::class, 'getSession']);
        Route::post('/ai-chat/sessions/{id}/messages', [AiChatController::class, 'sendMessage']);
        Route::post('/ai-chat/configuration/confirm', [AiChatController::class, 'confirmConfig']);

        // AI Accuracy & Performance Evaluation (PRD AI Accuracy & Performance Evaluation)
        Route::get('/ai-performance/overview', [AiPerformanceController::class, 'getOverview']);
        Route::get('/ai-performance/statistics', [AiPerformanceController::class, 'getStatistics']);
        Route::get('/ai-performance/models', [AiPerformanceController::class, 'getModels']);
        Route::get('/ai-performance/trends', [AiPerformanceController::class, 'getTrends']);
        Route::get('/ai-performance/error-analysis', [AiPerformanceController::class, 'getErrorAnalysis']);
        Route::get('/ai-performance/history', [AiPerformanceController::class, 'getHistory']);
        Route::get('/ai-performance/history/{id}', [AiPerformanceController::class, 'getHistoryDetail']);
        Route::post('/ai-performance/test-run', [AiPerformanceController::class, 'runTest']);
        Route::get('/ai-performance/export', [AiPerformanceController::class, 'export']);
    });

    // 12.3 Operator Workspace (Role: operator, admin)
    Route::prefix('operator')->group(function () {
        Route::get('/home', [OperatorController::class, 'home']);
        Route::get('/tasks', [OperatorController::class, 'tasks']);
        Route::get('/history', [OperatorController::class, 'history']);
    });

    // 12.6 QR Code Resolution & Scanning
    Route::post('/qr/resolve', [QrController::class, 'resolve']);
    Route::get('/qr/{code}', [QrController::class, 'show']);

    // 12.9 Settings (Satu endpoint Settings dinamis sesuai role)
    Route::get('/settings', [SettingsController::class, 'getSettings']);
    Route::patch('/settings/profile', [SettingsController::class, 'updateProfile']);
    Route::patch('/settings/preferences', [SettingsController::class, 'updatePreferences']);
    Route::patch('/settings/ai', [SettingsController::class, 'updateAiConfig'])->middleware('auth.token:manager,admin');

    // 12.4 Inventaris & Master Data
    Route::get('/products', [MasterController::class, 'getProducts']);
    Route::get('/products/{id}', [MasterController::class, 'getProduct']);
    Route::post('/products', [MasterController::class, 'createProduct'])->middleware('auth.token:admin');
    Route::patch('/products/{id}', [MasterController::class, 'updateProduct'])->middleware('auth.token:admin');

    Route::get('/vendors', [MasterController::class, 'getVendors']);
    Route::post('/vendors', [MasterController::class, 'createVendor'])->middleware('auth.token:admin');
    Route::get('/warehouses', [MasterController::class, 'getWarehouses']);

    // 12.5 Transaksi Stok
    Route::post('/transactions/receipts', [TransactionController::class, 'receipt']);
    Route::post('/transactions/issues', [TransactionController::class, 'issue']);
    Route::post('/transactions/transfers', [TransactionController::class, 'transfer']);
    Route::get('/transactions', [TransactionController::class, 'getTransactions']);

    // Stock Opname
    Route::get('/stocktakes', [StocktakeController::class, 'index']);
    Route::post('/stocktakes', [StocktakeController::class, 'store']);
    Route::get('/stocktakes/{id}', [StocktakeController::class, 'show']);
    Route::post('/stocktakes/{id}/count', [StocktakeController::class, 'count']);
    Route::post('/stocktakes/{id}/submit', [StocktakeController::class, 'submit']);
    Route::post('/stocktakes/{id}/approve', [StocktakeController::class, 'approve'])->middleware('auth.token:manager,admin');
    Route::post('/stocktakes/{id}/reject', [StocktakeController::class, 'reject'])->middleware('auth.token:manager,admin');

    // 12.7 Rekomendasi AI
    Route::get('/ai/findings', [AiController::class, 'getFindings']);
    Route::get('/ai/findings/{id}', [AiController::class, 'show']);
    Route::post('/ai/findings/{id}/review', [AiController::class, 'review'])->middleware('auth.token:manager,admin');
    Route::post('/ai/findings/{id}/approve', [AiController::class, 'approve'])->middleware('auth.token:manager,admin');
    Route::post('/ai/findings/{id}/reject', [AiController::class, 'reject'])->middleware('auth.token:manager,admin');
    Route::post('/ai/findings/{id}/resolve', [AiController::class, 'resolve'])->middleware('auth.token:manager,admin');
    // Metode 1-4 PRD: stock_accuracy, aging_fifo, capacity, slotting, reorder,
    //                  production_benchmarking, po_gated_workflow
    Route::post('/ai/run/{agentType}', [AiController::class, 'runAgent'])->middleware('auth.token:manager,admin');

    // 12.11 Production Orders (PRD Metode 3 & 4)
    Route::get('/production-orders', [AiController::class, 'getProductionOrders'])->middleware('auth.token:manager,admin');
    Route::post('/production-orders', [AiController::class, 'createProductionOrder'])->middleware('auth.token:manager,admin');
    Route::patch('/production-orders/{id}/status', [AiController::class, 'updateProductionOrderStatus'])->middleware('auth.token:manager,admin');

    // 12.10 Laporan & Audit
    Route::get('/reports/inventory', [ReportController::class, 'inventory']);
    Route::get('/reports/transactions', [ReportController::class, 'transactions']);
    Route::get('/reports/capacity', [ReportController::class, 'capacity']);
    Route::get('/reports/aging', [ReportController::class, 'aging']);
    Route::get('/audit-logs', [ReportController::class, 'auditLogs'])->middleware('auth.token:manager,admin');

    // Admin Only
    Route::get('/users', [UserController::class, 'index'])->middleware('auth.token:admin');
    Route::post('/users', [UserController::class, 'store'])->middleware('auth.token:admin');

    // Legacy/alias routes
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);
    Route::get('/dashboard/alerts', [DashboardController::class, 'alerts']);
});
