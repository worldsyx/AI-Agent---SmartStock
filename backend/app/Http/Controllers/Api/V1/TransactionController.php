<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Product;
use App\Models\InventoryLot;
use App\Models\InventoryBalance;
use App\Models\InventoryTransaction;
use App\Models\StorageLocation;
use App\Models\AuditLog;

class TransactionController extends Controller
{
    /**
     * 12.1 Penerimaan Barang (Receipt)
     */
    public function receipt(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string',
            'quantity' => 'required|numeric|min:0.01',
            'location_id' => 'required|string', // location code or id
            'lot_code' => 'nullable|string',
            'vendor_id' => 'nullable|string',
            'unit' => 'nullable|string',
            'reference_code' => 'required|string', // Idempotency Key
            'reason' => 'nullable|string',
        ]);

        // Idempotency check: Jika reference_code sudah ada, kembalikan transaksi sebelumnya
        $existingTx = InventoryTransaction::where('reference_code', $validated['reference_code'])->first();
        if ($existingTx) {
            return response()->json([
                'message' => 'Transaksi telah diproses sebelumnya (Idempotent response).',
                'data' => $existingTx,
            ], 200);
        }

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            // Find Product
            $product = Product::where('sku', $validated['sku'])
                ->orWhere('id', is_numeric($validated['sku']) ? $validated['sku'] : 0)
                ->firstOrFail();

            // Find Location (by code or id)
            $location = StorageLocation::where('code', $validated['location_id'])
                ->orWhere('id', is_numeric($validated['location_id']) ? $validated['location_id'] : 0)
                ->firstOrFail();

            $qty = (float) $validated['quantity'];
            $lotCode = !empty($validated['lot_code']) ? $validated['lot_code'] : ('LOT-' . date('Ymd') . '-' . rand(100, 999));
            $reason = !empty($validated['reason']) ? $validated['reason'] : 'Penerimaan barang masuk';
            $unit = !empty($validated['unit']) ? $validated['unit'] : $product->unit;

            // Find or create lot
            $lot = InventoryLot::firstOrCreate(
                ['lot_code' => $lotCode],
                [
                    'product_id' => $product->id,
                    'vendor_id' => $product->vendor_id,
                    'received_at' => now(),
                    'initial_quantity' => $qty,
                    'current_quantity' => $qty,
                    'unit' => $unit,
                    'condition_status' => 'good',
                ]
            );

            // Update balance with row lock
            $balance = InventoryBalance::lockForUpdate()
                ->firstOrCreate(
                    [
                        'product_id' => $product->id,
                        'lot_id' => $lot->id,
                        'location_id' => $location->id,
                    ],
                    ['quantity' => 0]
                );

            $oldQty = (float) $balance->quantity;
            $newQty = $oldQty + $qty;
            $balance->update(['quantity' => $newQty]);

            // Create Transaction record
            $tx = InventoryTransaction::create([
                'transaction_type' => 'receipt',
                'product_id' => $product->id,
                'lot_id' => $lot->id,
                'from_location_id' => null,
                'to_location_id' => $location->id,
                'quantity' => $qty,
                'reference_code' => $validated['reference_code'],
                'performed_by' => optional($user)->id,
                'reason' => $reason,
            ]);

            // Audit Log
            AuditLog::create([
                'user_id' => optional($user)->id,
                'action' => 'STOCK_RECEIPT',
                'entity_type' => 'inventory_balance',
                'entity_id' => (string) $balance->id,
                'before_json' => ['quantity' => $oldQty],
                'after_json' => ['quantity' => $newQty, 'transaction_id' => $tx->id],
                'reason' => $reason,
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Penerimaan barang berhasil dicatat.',
                'data' => $tx->load(['product', 'lot', 'toLocation']),
            ], 201);
        });
    }

    /**
     * 12.3 Pengeluaran Barang (Issue - FIFO Enforced)
     */
    public function issue(Request $request)
    {
        $validated = $request->validate([
            'lot_id' => 'required', // lot_code or id
            'quantity' => 'required|numeric|min:0.01',
            'reference_code' => 'required|string',
            'reason' => 'nullable|string',
        ]);

        $existingTx = InventoryTransaction::where('reference_code', $validated['reference_code'])->first();
        if ($existingTx) {
            return response()->json([
                'message' => 'Transaksi telah diproses sebelumnya (Idempotent response).',
                'data' => $existingTx,
            ], 200);
        }

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            // Find lot
            $lot = InventoryLot::where('lot_code', $validated['lot_id'])
                ->orWhere('id', is_numeric($validated['lot_id']) ? $validated['lot_id'] : 0)
                ->firstOrFail();

            $qtyToIssue = (float) $validated['quantity'];

            // Find balance with lock
            $balance = InventoryBalance::lockForUpdate()
                ->where('lot_id', $lot->id)
                ->where('quantity', '>', 0)
                ->first();

            if (!$balance || $balance->quantity < $qtyToIssue) {
                $available = $balance ? $balance->quantity : 0;
                return response()->json([
                    'message' => "Saldo stok tidak mencukupi untuk dikeluarkan. Tersedia: {$available}, Diminta: {$qtyToIssue}."
                ], 422);
            }

            $oldQty = (float) $balance->quantity;
            $newQty = $oldQty - $qtyToIssue;

            // Aturan ketat: Stok tidak boleh negatif
            if ($newQty < 0) {
                return response()->json(['message' => 'Transaksi ditolak: saldo stok tidak boleh negatif.'], 422);
            }

            $balance->update(['quantity' => $newQty]);
            $lot->update(['current_quantity' => max(0, $lot->current_quantity - $qtyToIssue)]);

            $reason = !empty($validated['reason']) ? $validated['reason'] : 'Pengeluaran barang FIFO';

            $tx = InventoryTransaction::create([
                'transaction_type' => 'issue',
                'product_id' => $lot->product_id,
                'lot_id' => $lot->id,
                'from_location_id' => $balance->location_id,
                'to_location_id' => null,
                'quantity' => $qtyToIssue,
                'reference_code' => $validated['reference_code'],
                'performed_by' => optional($user)->id,
                'reason' => $reason,
            ]);

            AuditLog::create([
                'user_id' => optional($user)->id,
                'action' => 'STOCK_ISSUE',
                'entity_type' => 'inventory_balance',
                'entity_id' => (string) $balance->id,
                'before_json' => ['quantity' => $oldQty],
                'after_json' => ['quantity' => $newQty, 'transaction_id' => $tx->id],
                'reason' => $reason,
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Pengeluaran barang berhasil dicatat.',
                'data' => $tx->load(['product', 'lot', 'fromLocation']),
            ], 201);
        });
    }

    /**
     * 12.2 Perpindahan Lokasi (Transfer)
     */
    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'lot_id' => 'required',
            'from_location_id' => 'required',
            'to_location_id' => 'required',
            'quantity' => 'required|numeric|min:0.01',
            'reference_code' => 'required|string',
            'reason' => 'nullable|string',
        ]);

        $existingTx = InventoryTransaction::where('reference_code', $validated['reference_code'])->first();
        if ($existingTx) {
            return response()->json([
                'message' => 'Transaksi telah diproses sebelumnya (Idempotent response).',
                'data' => $existingTx,
            ], 200);
        }

        $user = $request->user();

        return DB::transaction(function () use ($validated, $user) {
            $lot = InventoryLot::where('lot_code', $validated['lot_id'])
                ->orWhere('id', is_numeric($validated['lot_id']) ? $validated['lot_id'] : 0)
                ->firstOrFail();

            $fromLoc = StorageLocation::where('code', $validated['from_location_id'])
                ->orWhere('id', is_numeric($validated['from_location_id']) ? $validated['from_location_id'] : 0)
                ->firstOrFail();

            $toLoc = StorageLocation::where('code', $validated['to_location_id'])
                ->orWhere('id', is_numeric($validated['to_location_id']) ? $validated['to_location_id'] : 0)
                ->firstOrFail();

            if ($fromLoc->id === $toLoc->id) {
                return response()->json(['message' => 'Lokasi asal dan tujuan tidak boleh sama.'], 422);
            }

            $qty = (float) $validated['quantity'];

            // Lock source balance
            $srcBal = InventoryBalance::lockForUpdate()
                ->where('lot_id', $lot->id)
                ->where('location_id', $fromLoc->id)
                ->first();

            if (!$srcBal || $srcBal->quantity < $qty) {
                $cur = $srcBal ? $srcBal->quantity : 0;
                return response()->json([
                    'message' => "Stok di lokasi asal tidak mencukupi. Tersedia: {$cur}, Diminta: {$qty}."
                ], 422);
            }

            // Lock destination balance
            $dstBal = InventoryBalance::lockForUpdate()
                ->firstOrCreate(
                    [
                        'product_id' => $lot->product_id,
                        'lot_id' => $lot->id,
                        'location_id' => $toLoc->id,
                    ],
                    ['quantity' => 0]
                );

            $srcBal->update(['quantity' => $srcBal->quantity - $qty]);
            $dstBal->update(['quantity' => $dstBal->quantity + $qty]);

            $tx = InventoryTransaction::create([
                'transaction_type' => 'transfer',
                'product_id' => $lot->product_id,
                'lot_id' => $lot->id,
                'from_location_id' => $fromLoc->id,
                'to_location_id' => $toLoc->id,
                'quantity' => $qty,
                'reference_code' => $validated['reference_code'],
                'performed_by' => optional($user)->id,
                'reason' => $validated['reason'] ?: 'Relokasi / transfer antar lokasi',
            ]);

            AuditLog::create([
                'user_id' => optional($user)->id,
                'action' => 'STOCK_TRANSFER',
                'entity_type' => 'storage_location',
                'entity_id' => "{$fromLoc->code} -> {$toLoc->code}",
                'before_json' => ['from' => $fromLoc->code, 'to' => $toLoc->code, 'qty' => $qty],
                'after_json' => ['transaction_id' => $tx->id],
                'reason' => $validated['reason'] ?: 'Transfer lokasi',
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Perpindahan stok berhasil dicatat.',
                'data' => $tx->load(['product', 'lot', 'fromLocation', 'toLocation']),
            ], 201);
        });
    }

    public function getTransactions(Request $request)
    {
        $query = InventoryTransaction::with(['product', 'lot', 'fromLocation', 'toLocation', 'performer']);

        if ($type = $request->query('type')) {
            $query->where('transaction_type', $type);
        }

        $paginated = $query->latest()->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
            ]
        ]);
    }
}
