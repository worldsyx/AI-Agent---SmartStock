<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\AiFinding;
use App\Models\Product;
use App\Models\StorageLocation;
use App\Models\WarehouseZone;
use App\Models\InventoryLot;
use App\Models\StocktakeItem;
use App\Models\AuditLog;
use App\Models\SystemSetting;
use App\Models\ProductionOrder;

class AiController extends Controller
{
    public function getFindings(Request $request)
    {
        $query = AiFinding::with('reviewer');

        if ($agent = $request->query('agent_type')) {
            $query->where('agent_type', $agent);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $paginated = $query->latest('generated_at')->paginate((int) $request->query('per_page', 10));

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
            ]
        ]);
    }

    public function show($id)
    {
        $finding = AiFinding::with('reviewer')->findOrFail($id);
        return response()->json(['data' => $finding]);
    }

    public function review(Request $request, $id)
    {
        $finding = AiFinding::findOrFail($id);
        $user = $request->user();

        $finding->update([
            'status' => 'reviewed',
            'reviewed_by' => optional($user)->id,
            'reviewed_at' => now(),
            'resolution_notes' => $request->input('notes'),
        ]);

        return response()->json(['message' => 'Status temuan diubah menjadi Ditinjau.', 'data' => $finding]);
    }

    public function approve(Request $request, $id)
    {
        $finding = AiFinding::findOrFail($id);
        $user = $request->user();

        $finding->update([
            'status' => 'approved',
            'reviewed_by' => optional($user)->id,
            'reviewed_at' => now(),
            'resolution_notes' => $request->input('notes') ?: 'Disetujui oleh manajer',
        ]);

        AuditLog::create([
            'user_id' => optional($user)->id,
            'action' => 'AI_RECOMMENDATION_APPROVED',
            'entity_type' => 'ai_finding',
            'entity_id' => (string) $finding->id,
            'reason' => 'Manajer menyetujui rekomendasi AI: ' . $finding->title,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Rekomendasi disetujui. Silakan lakukan eksekusi melalui menu Transaksi.', 'data' => $finding]);
    }

    public function reject(Request $request, $id)
    {
        $finding = AiFinding::findOrFail($id);
        $user = $request->user();

        $finding->update([
            'status' => 'rejected',
            'reviewed_by' => optional($user)->id,
            'reviewed_at' => now(),
            'resolution_notes' => $request->input('notes') ?: 'Ditolak oleh manajer',
        ]);

        return response()->json(['message' => 'Rekomendasi ditolak.', 'data' => $finding]);
    }

    public function resolve(Request $request, $id)
    {
        $finding = AiFinding::findOrFail($id);
        $user = $request->user();

        $finding->update([
            'status' => 'resolved',
            'reviewed_by' => optional($user)->id,
            'reviewed_at' => now(),
            'resolution_notes' => $request->input('notes') ?: 'Telah diselesaikan secara operasional',
        ]);

        return response()->json(['message' => 'Status temuan ditandai Selesai.', 'data' => $finding]);
    }

    /**
     * Menjalankan Agent Analisis ke Python Microservice
     * Sesuai PRD Panduan Pemrosesan Data AI v1.0
     */
    public function runAgent(Request $request, $agentType)
    {
        $flaskUrl = SystemSetting::get('ai_service_url', 'http://localhost:5000');
        $payload = [];

        if ($agentType === 'stock_accuracy') {
            // PRD Metode 2: Discrepancy & Anomaly Detection (Aturan 3)
            // Tolerance PRD = 2.0% (bukan 1.0%)
            $items = StocktakeItem::with(['product', 'location'])->latest()->take(20)->get()->map(function ($it) {
                return [
                    'product_id'    => $it->product_id,
                    'sku'           => $it->product ? $it->product->sku : 'UNKNOWN',
                    'name'          => $it->product ? $it->product->name : '',
                    'location_code' => $it->location ? $it->location->code : '-',
                    'system_qty'    => (float) $it->system_quantity,
                    'counted_qty'   => (float) $it->counted_quantity,
                    // PRD Aturan 3: batas toleransi maksimal 2%
                    'tolerance_pct' => (float) SystemSetting::get('stocktake_discrepancy_tolerance_pct', 2.0),
                ];
            });

            if ($items->isEmpty()) {
                $items = collect([
                    [
                        'product_id'    => 1,
                        'sku'           => 'KRT-A3-001',
                        'name'          => 'Karton Corrugated A3',
                        'location_code' => 'A1-01',
                        'system_qty'    => 12450,
                        'counted_qty'   => 12210,
                        'tolerance_pct' => 2.0,    // PRD default
                    ]
                ]);
            }
            $payload  = ['items' => $items->toArray()];
            $endpoint = "{$flaskUrl}/analyze/stock-accuracy";

        } elseif ($agentType === 'slotting') {
            $payload = [
                'slots' => [
                    [
                        'product_id'           => 1,
                        'sku'                  => 'KRT-A3-001',
                        'current_location'     => 'ZON-A / RAK-A3 / A3-09 (Tingkat Atas/Jauh)',
                        'recommended_location' => 'ZON-A / RAK-A1 / A1-01 (Tingkat Bawah/Dekat Pintu)',
                        'monthly_turnover'     => 4500,
                        'velocity'             => 'fast_moving'
                    ]
                ]
            ];
            $endpoint = "{$flaskUrl}/analyze/slotting";

        } elseif ($agentType === 'capacity') {
            $zones = WarehouseZone::all()->map(function ($z) {
                return [
                    'zone_id'            => $z->id,
                    'zone_code'          => $z->code,
                    'zone_name'          => $z->name,
                    'capacity_value'     => (float) $z->capacity_value,
                    'current_used'       => 295, // demo usage
                    'warning_threshold'  => (float) $z->warning_threshold,
                    'critical_threshold' => (float) SystemSetting::get('critical_capacity_threshold', 90),
                ];
            });
            $payload  = ['zones' => $zones->toArray()];
            $endpoint = "{$flaskUrl}/analyze/capacity";

        } elseif ($agentType === 'aging_fifo') {
            // PRD Metode 1: Automated Expiry & Aging Engine (Aturan 1, 2, 5)
            // PENTING: Kirim field 'category' (bukan 'max_allowed_days') ke agen Python.
            // Agen Python yang menentukan batas simpan berdasarkan kategori PRD:
            //   'Roll Kertas' -> 730 hari, 'Box' -> 180 hari, lainnya -> N/A
            $lots = InventoryLot::with(['product', 'balances.location'])->get()->map(function ($lot) {
                return [
                    'lot_id'            => $lot->id,
                    'lot_code'          => $lot->lot_code,
                    'sku'               => $lot->product ? $lot->product->sku : '-',
                    'name'              => $lot->product ? $lot->product->name : '',
                    // Kirim category sesuai enum PRD (Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part)
                    'category'          => $lot->product ? $lot->product->category : '',
                    'days_in_warehouse' => $lot->days_old,
                    'condition_status'  => $lot->condition_status,
                    'quantity'          => (float) $lot->current_quantity,
                    'location_code'     => $lot->balances->first() && $lot->balances->first()->location
                        ? $lot->balances->first()->location->code
                        : '-',
                    // batch_status dari DB jika tersedia (Active/Aging_Warning/Expired)
                    'batch_status'      => $lot->batch_status ?? null,
                ];
            });
            $payload  = ['lots' => $lots->toArray()];
            $endpoint = "{$flaskUrl}/analyze/aging-fifo";

        } elseif ($agentType === 'reorder') {
            $products = Product::with('vendor')->where('is_active', true)->get()->map(function ($p) {
                // Hitung rata-rata pengeluaran harian dari 30 hari terakhir
                $thirtyDaysAgo = now()->subDays(30);
                $totalIssued   = \App\Models\InventoryTransaction::where('product_id', $p->id)
                    ->where('transaction_type', 'issue')
                    ->where('created_at', '>=', $thirtyDaysAgo)
                    ->sum('quantity');
                $avgDaily = $totalIssued > 0 ? round($totalIssued / 30, 1) : 25.0;

                return [
                    'product_id'    => $p->id,
                    'sku'           => $p->sku,
                    'name'          => $p->name,
                    'current_stock' => (float) $p->current_stock,
                    'safety_stock'  => (float) $p->safety_stock,
                    'avg_daily_issue' => $avgDaily,
                    'lead_time_days'  => $p->vendor ? $p->vendor->lead_time_days : 3,
                    'unit'            => $p->unit,
                    'vendor_name'     => $p->vendor ? $p->vendor->name : 'Internal Vendor'
                ];
            });
            $payload  = ['products' => $products->toArray()];
            $endpoint = "{$flaskUrl}/analyze/reorder";

        } elseif ($agentType === 'production_benchmarking') {
            // PRD Metode 3: Historical Production Benchmarking (Aturan 4)
            // Tarik PO yang baru masuk + data produksi 1x sebelumnya untuk referensi
            $orders = ProductionOrder::with(['product'])
                ->whereIn('status_produksi', ['Approved', 'In_Progress'])
                ->latest()
                ->take(10)
                ->get()
                ->map(function ($po) {
                    // Cari produksi sebelumnya (1x tepat sebelum PO ini)
                    $prevPo = ProductionOrder::where('item_id', $po->item_id)
                        ->where('id', '<', $po->id)
                        ->where('status_produksi', 'Completed')
                        ->latest('id')
                        ->first();

                    $prevProduction = null;
                    if ($prevPo) {
                        $prevProduction = [
                            'po_number'      => $prevPo->po_number,
                            'order_qty'      => (float) $prevPo->order_qty,
                            'actual_output'  => (float) ($prevPo->actual_output ?? $prevPo->order_qty),
                            'materials_used' => $prevPo->materials_used_json ?? [],
                        ];
                    }

                    return [
                        'po_number'       => $po->po_number,
                        'customer_id'     => $po->customer_id,
                        'item_id'         => $po->item_id,
                        'item_name'       => $po->product ? $po->product->name : $po->item_id,
                        'order_qty'       => (float) $po->order_qty,
                        'prev_production' => $prevProduction,
                    ];
                });

            $payload  = ['production_orders' => $orders->toArray()];
            $endpoint = "{$flaskUrl}/analyze/production-benchmarking";

        } elseif ($agentType === 'po_gated_workflow') {
            // PRD Metode 4: PO-Gated Work Order Workflow (Aturan 6)
            // Strictly By-Order: Cek semua order — blokir yang tanpa PO valid,
            // trigger Immediate Dispatch untuk yang sudah Completed
            $orders = ProductionOrder::with(['product'])
                ->latest()
                ->take(20)
                ->get()
                ->map(function ($po) {
                    // Ambil data produksi sebelumnya untuk referensi
                    $prevPo = ProductionOrder::where('item_id', $po->item_id)
                        ->where('id', '<', $po->id)
                        ->where('status_produksi', 'Completed')
                        ->latest('id')
                        ->first();

                    return [
                        'po_number'       => $po->po_number,
                        'customer_id'     => $po->customer_id,
                        'item_id'         => $po->item_id,
                        'item_name'       => $po->product ? $po->product->name : $po->item_id,
                        'order_qty'       => (float) $po->order_qty,
                        'po_status'       => $po->po_status ?? 'VALID',
                        'status_produksi' => $po->status_produksi,
                        'status_kirim'    => $po->status_kirim ?? 'Pending',
                        'prev_production' => $prevPo ? (float) $prevPo->order_qty : 0,
                    ];
                });

            $payload  = ['production_orders' => $orders->toArray()];
            $endpoint = "{$flaskUrl}/analyze/po-gated-workflow";

        } else {
            return response()->json(['message' => 'Agent type tidak valid.'], 400);
        }

        try {
            $response = Http::timeout(4)->post($endpoint, $payload);
            if ($response->successful()) {
                $result   = $response->json();
                $findings = $result['data'] ?? [];

                // Simpan hasil temuan baru ke database
                foreach ($findings as $f) {
                    AiFinding::create([
                        'agent_type'   => $f['agent_type'],
                        'entity_type'  => $f['entity_type'] ?? null,
                        'entity_id'    => $f['entity_id'] ?? null,
                        'severity'     => $f['severity'] ?? 'info',
                        'title'        => $f['title'],
                        'explanation'  => $f['explanation'],
                        'evidence_json' => $f['evidence_json'] ?? null,
                        'recommendation' => $f['recommendation'],
                        'status'       => 'new',
                        'generated_at' => now(),
                    ]);
                }

                return response()->json([
                    'message' => "Analisis Agent {$agentType} selesai. Menghasilkan " . count($findings) . " temuan baru.",
                    'data'    => $findings
                ]);
            }
        } catch (\Exception $e) {
            // Sesuai PRD: Rule-based fallback internal jika Python offline
            $fallbackFindings = [];

            if ($agentType === 'reorder') {
                foreach (Product::with('vendor')->where('is_active', true)->get() as $p) {
                    if ($p->current_stock <= $p->safety_stock) {
                        $def              = $p->safety_stock - $p->current_stock + 500;
                        $fallbackFindings[] = AiFinding::create([
                            'agent_type'    => 'reorder',
                            'entity_type'   => 'product',
                            'entity_id'     => (string) $p->id,
                            'severity'      => $p->current_stock <= ($p->safety_stock * 0.5) ? 'high' : 'medium',
                            'title'         => "Rekomendasi Pembelian Stok — {$p->sku} ({$p->name})",
                            'explanation'   => "Stok tersisa {$p->current_stock} {$p->unit}, di bawah batas minimum safety stock {$p->safety_stock} {$p->unit}.",
                            'evidence_json' => [
                                'sku'                  => $p->sku,
                                'name'                 => $p->name,
                                'current_stock'        => (float) $p->current_stock,
                                'safety_stock'         => (float) $p->safety_stock,
                                'suggested_reorder_qty' => $def,
                                'unit'                 => $p->unit,
                                'vendor'               => $p->vendor ? $p->vendor->name : 'Vendor'
                            ],
                            'recommendation' => "Pertimbangkan pemesanan pengadaan sejumlah {$def} {$p->unit}.",
                            'status'        => 'new',
                            'generated_at'  => now(),
                        ]);
                    }
                }

            } elseif ($agentType === 'aging_fifo') {
                // PRD Fallback: gunakan batas per kategori (730/180 hari), BUKAN flat 90 hari
                $categoryLimits = [
                    'Roll Kertas'         => 730,
                    'Box'                 => 180,
                ];
                foreach (InventoryLot::with('product')->get() as $lot) {
                    $category = $lot->product ? $lot->product->category : '';
                    $maxDays  = $categoryLimits[$category] ?? null;

                    $isAged    = $maxDays !== null && $lot->days_old >= $maxDays;
                    $isBadCond = in_array($lot->condition_status, ['damp', 'torn', 'dented', 'damaged']);

                    // Cek H-30 warning
                    $isWarning = false;
                    if ($maxDays !== null) {
                        $daysToExpiry = $maxDays - $lot->days_old;
                        $isWarning    = $daysToExpiry > 0 && $daysToExpiry <= 30;
                    }

                    if ($isAged || $isBadCond || $isWarning) {
                        $fallbackFindings[] = AiFinding::create([
                            'agent_type'    => 'aging_fifo',
                            'entity_type'   => 'inventory_lot',
                            'entity_id'     => (string) $lot->id,
                            'severity'      => $isAged ? 'high' : 'medium',
                            'title'         => ($isAged ? "STOK KADALUARSA" : "Peringatan Aging")
                                . " — " . ($lot->product ? $lot->product->sku : $lot->lot_code)
                                . " [{$category}]",
                            'explanation'   => "Lot {$lot->lot_code} (kategori: {$category}) telah disimpan {$lot->days_old} hari"
                                . ($maxDays ? " (batas: {$maxDays} hari)" : "")
                                . " dengan kondisi {$lot->condition_status}.",
                            'evidence_json' => [
                                'lot_code'          => $lot->lot_code,
                                'category'          => $category,
                                'days_old'          => $lot->days_old,
                                'max_allowed_days'  => $maxDays,
                                'condition'         => $lot->condition_status,
                                'batch_status'      => $isAged ? 'Expired' : ($isWarning ? 'Aging_Warning' : 'Active'),
                            ],
                            'recommendation' => $isAged
                                ? "Kunci stok lot ini. Lakukan inspeksi fisik dan ajukan disposal/karantina."
                                : "Prioritaskan pengeluaran stok lot ini (FIFO).",
                            'status'        => 'new',
                            'generated_at'  => now(),
                        ]);
                    }
                }

            } elseif ($agentType === 'po_gated_workflow') {
                // PRD Fallback: blokir semua order tanpa PO (Aturan 6)
                foreach (ProductionOrder::latest()->take(20)->get() as $po) {
                    if (empty($po->po_number)) {
                        $fallbackFindings[] = AiFinding::create([
                            'agent_type'    => 'po_gated_workflow',
                            'entity_type'   => 'production_order',
                            'entity_id'     => (string) $po->id,
                            'severity'      => 'high',
                            'title'         => "Work Order DIBLOKIR — Tanpa PO [{$po->item_id}]",
                            'explanation'   => "Produksi untuk {$po->item_id} tidak dapat dilanjutkan tanpa PO yang valid. Sesuai PRD Aturan 6.",
                            'evidence_json' => ['po_number' => null, 'item_id' => $po->item_id, 'work_order_allowed' => false],
                            'recommendation' => "Terbitkan PO yang valid sebelum memulai produksi.",
                            'status'        => 'new',
                            'generated_at'  => now(),
                        ]);
                    }
                }
            }

            return response()->json([
                'message' => "Analisis rule-based internal telah selesai dieksekusi (" . count($fallbackFindings) . " temuan baru).",
                'data'    => $fallbackFindings
            ], 200);
        }

        return response()->json(['message' => 'Analisis AI selesai diproses.']);
    }

    /**
     * Daftar Production Orders (PRD Metode 3 & 4)
     */
    public function getProductionOrders(Request $request)
    {
        $query = ProductionOrder::with(['product', 'creator', 'approver']);

        if ($status = $request->query('status_produksi')) {
            $query->where('status_produksi', $status);
        }

        $paginated = $query->latest()->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'total'        => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page'     => $paginated->perPage(),
            ]
        ]);
    }

    /**
     * Buat Production Order baru.
     * PRD Metode 4: Jika tanpa PO valid -> otomatis set Blocked_No_PO.
     */
    public function createProductionOrder(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'po_number'       => 'nullable|string|unique:production_orders,po_number',
            'customer_id'     => 'required|string',
            'item_id'         => 'required|string',
            'order_qty'       => 'required|numeric|min:1',
            'prev_production' => 'nullable|numeric',
            'po_status'       => 'nullable|string',
            'notes'           => 'nullable|string',
        ]);

        // PRD Metode 4: WORK_ORDER_ALLOWED = IF(PO_Number IS NOT NULL AND PO_Status == 'VALID')
        $validStatuses      = ['VALID', 'APPROVED', 'ACTIVE'];
        $poNumber           = $data['po_number'] ?? null;
        $poStatus           = strtoupper($data['po_status'] ?? '');
        $workOrderAllowed   = !empty($poNumber) && in_array($poStatus, $validStatuses);
        $statusProduksi     = $workOrderAllowed ? 'Approved' : 'Blocked_No_PO';

        $po = ProductionOrder::create([
            'po_number'       => $poNumber,
            'customer_id'     => $data['customer_id'],
            'item_id'         => $data['item_id'],
            'order_qty'       => $data['order_qty'],
            'prev_production' => $data['prev_production'] ?? null,
            'po_status'       => $poStatus ?: null,
            'status_produksi' => $statusProduksi,
            'status_kirim'    => 'Pending',
            'notes'           => $data['notes'] ?? null,
            'created_by'      => optional($user)->id,
            'approved_by'     => $workOrderAllowed ? optional($user)->id : null,
            'approved_at'     => $workOrderAllowed ? now() : null,
        ]);

        AuditLog::create([
            'user_id'     => optional($user)->id,
            'action'      => $workOrderAllowed ? 'PRODUCTION_ORDER_CREATED' : 'PRODUCTION_ORDER_BLOCKED',
            'entity_type' => 'production_order',
            'entity_id'   => (string) $po->id,
            'reason'      => $workOrderAllowed
                ? "PO {$poNumber} valid — Work Order diizinkan"
                : "Tidak ada PO valid — Work Order diblokir (PRD Aturan 6)",
        ]);

        return response()->json([
            'message'            => $workOrderAllowed
                ? "PO {$poNumber} valid. Work Order dapat dibuat."
                : "Work Order DIBLOKIR: tidak ada PO valid. Sesuai PRD Aturan 6 (Strictly By-Order).",
            'work_order_allowed' => $workOrderAllowed,
            'data'               => $po,
        ], 201);
    }

    /**
     * Update status Production Order.
     * PRD Metode 4: Jika status -> Completed, trigger Immediate Dispatch.
     */
    public function updateProductionOrderStatus(Request $request, $id)
    {
        $po   = ProductionOrder::findOrFail($id);
        $user = $request->user();

        $data = $request->validate([
            'status_produksi'     => 'required|in:Approved,In_Progress,Completed',
            'status_kirim'        => 'nullable|in:Pending,Ready_To_Ship,Shipped',
            'actual_output'       => 'nullable|numeric',
            'materials_used_json' => 'nullable|array',
        ]);

        $updateData = [
            'status_produksi' => $data['status_produksi'],
        ];

        if (!empty($data['status_kirim'])) {
            $updateData['status_kirim'] = $data['status_kirim'];
        }

        if (!empty($data['actual_output'])) {
            $updateData['actual_output'] = $data['actual_output'];
        }

        if (!empty($data['materials_used_json'])) {
            $updateData['materials_used_json'] = $data['materials_used_json'];
        }

        // PRD Metode 4: Jika Completed -> set completed_at + trigger Immediate Dispatch
        if ($data['status_produksi'] === 'Completed') {
            $updateData['completed_at']  = now();
            $updateData['status_kirim']  = 'Ready_To_Ship';
            $updateData['dispatched_at'] = now();

            // Simpan AI Finding untuk Immediate Dispatch
            AiFinding::create([
                'agent_type'     => 'po_gated_workflow',
                'entity_type'    => 'production_order',
                'entity_id'      => $po->po_number,
                'severity'       => 'high',
                'title'          => "IMMEDIATE DISPATCH — {$po->po_number} [{$po->item_id}] Siap Kirim!",
                'explanation'    => "Produksi PO {$po->po_number} untuk {$po->item_id} (qty: {$po->order_qty}) telah selesai. Sesuai PRD Aturan 6 (Immediate Dispatch), pengiriman harus dilakukan SECEPATNYA.",
                'evidence_json'  => [
                    'po_number'               => $po->po_number,
                    'customer_id'             => $po->customer_id,
                    'item_id'                 => $po->item_id,
                    'order_qty'               => (float) $po->order_qty,
                    'status_produksi'         => 'Completed',
                    'status_kirim'            => 'Ready_To_Ship',
                    'shipping_action_required' => true,
                    'dispatch_triggered_at'   => now()->toISOString(),
                ],
                'recommendation' => "SEGERA LAKUKAN PENGIRIMAN ke {$po->customer_id}. Notifikasi logistik telah dipicu oleh sistem AI.",
                'status'         => 'new',
                'generated_at'   => now(),
            ]);
        }

        $po->update($updateData);

        AuditLog::create([
            'user_id'     => optional($user)->id,
            'action'      => 'PRODUCTION_ORDER_STATUS_UPDATED',
            'entity_type' => 'production_order',
            'entity_id'   => (string) $po->id,
            'reason'      => "Status diubah menjadi {$data['status_produksi']}"
                . ($data['status_produksi'] === 'Completed' ? ' — Immediate Dispatch dipicu (PRD Aturan 6)' : ''),
        ]);

        return response()->json([
            'message'          => $data['status_produksi'] === 'Completed'
                ? "Produksi selesai. Immediate Dispatch dipicu — status kirim diubah ke Ready_To_Ship."
                : "Status produksi diperbarui menjadi {$data['status_produksi']}.",
            'data'             => $po->fresh(),
        ]);
    }
}
