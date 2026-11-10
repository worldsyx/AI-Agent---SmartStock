<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\Product;
use App\Models\InventoryBalance;
use App\Models\InventoryLot;
use App\Models\InventoryTransaction;
use App\Models\WarehouseZone;
use App\Models\AiFinding;
use App\Models\DailyWarehouseReport;
use App\Models\StocktakeItem;

class ManagerController extends Controller
{
    /**
     * PRD 4.2: Ringkasan Utama Manager Dashboard
     */
    public function summary(Request $request)
    {
        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        $totalSkus = Product::where('is_active', true)->count();
        $totalStockQty = (float) InventoryBalance::sum('quantity');

        // Transaksi Hari Ini
        $inToday = (float) InventoryTransaction::where('transaction_type', 'receipt')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('quantity');

        $outToday = (float) InventoryTransaction::where('transaction_type', 'issue')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('quantity');

        $transfersToday = (float) InventoryTransaction::where('transaction_type', 'transfer')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        // Stok di bawah safety stock (minimum)
        $lowStockCount = Product::where('is_active', true)->get()->filter(function ($p) {
            return $p->current_stock <= $p->safety_stock;
        })->count();

        // Stok lama (>90 hari) atau perlu pemeriksaan kondisi fisik
        $agingLotsCount = InventoryLot::where('current_quantity', '>', 0)
            ->get()
            ->filter(function ($lot) {
                return $lot->days_old > 90 || in_array($lot->condition_status, ['damp', 'torn', 'dented', 'damaged']);
            })
            ->count();

        // Temuan selisih stok yang belum selesai
        $unresolvedDiscrepancies = StocktakeItem::where('variance', '!=', 0)->count();

        // Kapasitas Gudang
        $totalCapacity = (float) WarehouseZone::sum('capacity_value');
        $capacityPct = $totalCapacity > 0 ? round(($totalStockQty / $totalCapacity) * 100, 1) : 0;

        // Pending AI Recommendations count
        $newAiRecommendations = AiFinding::where('status', 'new')->count();

        // Recent 5 Transactions
        $recentTransactions = InventoryTransaction::with(['product', 'performer', 'fromLocation', 'toLocation'])
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_skus' => $totalSkus,
                'total_stock_qty' => $totalStockQty,
                'in_today' => $inToday,
                'out_today' => $outToday,
                'transfers_today' => $transfersToday,
                'low_stock_count' => $lowStockCount,
                'aging_lots_count' => $agingLotsCount,
                'unresolved_discrepancies' => $unresolvedDiscrepancies,
                'total_capacity' => $totalCapacity,
                'capacity_used_pct' => min(100, $capacityPct),
                'new_ai_recommendations' => $newAiRecommendations,
                'recent_transactions' => $recentTransactions,
                'server_time' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * PRD 4.4 & 8.3: Pusat Perhatian & Alerts Manager
     */
    public function alerts(Request $request)
    {
        $alerts = [];

        // 1. Critical Low Stock Alerts
        $lowStockProducts = Product::where('is_active', true)->get()->filter(function ($p) {
            return $p->current_stock <= ($p->safety_stock * 0.7);
        });

        foreach ($lowStockProducts as $p) {
            $alerts[] = [
                'id' => 'low-stock-' . $p->id,
                'priority' => $p->current_stock <= ($p->safety_stock * 0.4) ? 'high' : 'medium',
                'category' => 'low_stock',
                'title' => "Stok Kritis: {$p->sku} ({$p->name})",
                'message' => "Stok tersisa {$p->current_stock} {$p->unit} (Batas safety stock: {$p->safety_stock} {$p->unit}).",
                'link' => '/manager/ai-recommendations',
                'created_at' => now()->toIso8601String(),
            ];
        }

        // 2. Aging / FIFO Alerts
        $agingLots = InventoryLot::with('product')
            ->where('current_quantity', '>', 0)
            ->get()
            ->filter(function ($lot) {
                return $lot->days_old > 90 || in_array($lot->condition_status, ['damp', 'torn', 'dented', 'damaged']);
            });

        foreach ($agingLots->take(3) as $lot) {
            $alerts[] = [
                'id' => 'aging-lot-' . $lot->id,
                'priority' => $lot->days_old > 120 ? 'high' : 'medium',
                'category' => 'aging',
                'title' => "Stok Berumur Lama: Lot {$lot->lot_code}",
                'message' => "Telah disimpan {$lot->days_old} hari (Status fisik: {$lot->condition_status}). Perlu pemeriksaan.",
                'link' => '/manager/reports',
                'created_at' => $lot->received_at ? $lot->received_at->toIso8601String() : now()->toIso8601String(),
            ];
        }

        // 3. New AI Findings
        $findings = AiFinding::where('status', 'new')->latest()->take(3)->get();
        foreach ($findings as $f) {
            $alerts[] = [
                'id' => 'ai-finding-' . $f->id,
                'priority' => $f->severity,
                'category' => 'ai_recommendation',
                'title' => $f->title,
                'message' => $f->explanation,
                'link' => '/manager/ai-recommendations',
                'created_at' => $f->created_at->toIso8601String(),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $alerts
        ]);
    }

    /**
     * PRD 4.3 & 8.2: Laporan Pencatatan Setiap Pagi (Morning Report)
     */
    public function morningReport(Request $request)
    {
        // Default range: hari kemarin (00:00 - 23:59) atau tanggal yang diminta
        $targetDate = $request->query('date') 
            ? Carbon::parse($request->query('date'))->startOfDay() 
            : Carbon::yesterday()->startOfDay();

        $start = $targetDate->copy()->startOfDay();
        $end = $targetDate->copy()->endOfDay();

        // Ambil transaksi pada rentang laporan
        $transactions = InventoryTransaction::with(['product', 'lot', 'fromLocation', 'toLocation', 'performer'])
            ->whereBetween('created_at', [$start, $end])
            ->get();

        $receipts = $transactions->where('transaction_type', 'receipt');
        $issues = $transactions->where('transaction_type', 'issue');
        $transfers = $transactions->where('transaction_type', 'transfer');

        $receiptsQty = (float) $receipts->sum('quantity');
        $issuesQty = (float) $issues->sum('quantity');

        // Ringkasan per SKU
        $skuSummary = [];
        foreach ($transactions as $tx) {
            $sku = $tx->product ? $tx->product->sku : 'UNKNOWN';
            $name = $tx->product ? $tx->product->name : '-';
            $unit = $tx->product ? $tx->product->unit : 'Unit';

            if (!isset($skuSummary[$sku])) {
                $skuSummary[$sku] = [
                    'sku' => $sku,
                    'name' => $name,
                    'unit' => $unit,
                    'in_qty' => 0,
                    'out_qty' => 0,
                    'transfer_count' => 0,
                ];
            }

            if ($tx->transaction_type === 'receipt') {
                $skuSummary[$sku]['in_qty'] += (float) $tx->quantity;
            } elseif ($tx->transaction_type === 'issue') {
                $skuSummary[$sku]['out_qty'] += (float) $tx->quantity;
            } elseif ($tx->transaction_type === 'transfer') {
                $skuSummary[$sku]['transfer_count'] += 1;
            }
        }

        // Cek anomali atau selisih yang tercatat
        $unresolvedItems = StocktakeItem::with(['product', 'location'])
            ->where('variance', '!=', 0)
            ->get();

        $reportData = [
            'report_date' => $targetDate->toDateString(),
            'period_start' => $start->toIso8601String(),
            'period_end' => $end->toIso8601String(),
            'generated_at' => now()->toIso8601String(),
            'total_receipts_tx' => $receipts->count(),
            'total_receipts_qty' => $receiptsQty,
            'total_issues_tx' => $issues->count(),
            'total_issues_qty' => $issuesQty,
            'total_transfers_tx' => $transfers->count(),
            'sku_breakdown' => array_values($skuSummary),
            'has_transactions' => $transactions->isNotEmpty(),
            'anomalies_count' => $unresolvedItems->count(),
            'anomalies' => $unresolvedItems,
            'status' => 'completed',
        ];

        return response()->json([
            'status' => 'success',
            'data' => $reportData
        ]);
    }
}
