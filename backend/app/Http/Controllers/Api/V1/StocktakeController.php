<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\StocktakeSession;
use App\Models\StocktakeItem;
use App\Models\InventoryBalance;
use App\Models\InventoryTransaction;
use App\Models\AuditLog;
use App\Models\Product;
use App\Models\StorageLocation;

class StocktakeController extends Controller
{
    public function index(Request $request)
    {
        $query = StocktakeSession::with(['creator', 'reviewer', 'items']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $paginated = $query->latest()->paginate((int) $request->query('per_page', 15));

        $data = collect($paginated->items())->map(function ($s) {
            $discrepancies = $s->items->where('variance', '!=', 0)->count();
            return [
                'id' => $s->id,
                'code' => $s->code,
                'scope' => $s->scope,
                'status' => $s->status,
                'created_by_name' => $s->creator ? $s->creator->name : '-',
                'started_at' => $s->started_at ? $s->started_at->toISOString() : null,
                'submitted_at' => $s->submitted_at ? $s->submitted_at->toISOString() : null,
                'reviewed_at' => $s->reviewed_at ? $s->reviewed_at->toISOString() : null,
                'discrepancies' => $discrepancies,
                'notes' => $s->notes,
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
            ]
        ]);
    }

    public function show($id)
    {
        $session = StocktakeSession::with(['creator', 'reviewer', 'items.product', 'items.lot', 'items.location'])->findOrFail($id);
        return response()->json(['data' => $session]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'scope' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $code = 'OPN-' . date('Ymd') . '-' . rand(100, 999);
        $user = $request->user();

        $session = StocktakeSession::create([
            'code' => $code,
            'scope' => $validated['scope'],
            'status' => 'counting',
            'created_by' => optional($user)->id,
            'started_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'Sesi stock opname berhasil dibuat.',
            'data' => $session
        ], 201);
    }

    public function count(Request $request, $id)
    {
        $session = StocktakeSession::findOrFail($id);
        if ($session->status === 'closed') {
            return response()->json(['message' => 'Sesi stock opname ini sudah selesai dan ditutup.'], 422);
        }

        $validated = $request->validate([
            'sku' => 'required|string',
            'location_id' => 'required',
            'counted_quantity' => 'required|numeric|min:0',
            'lot_id' => 'nullable',
            'notes' => 'nullable|string',
        ]);

        $product = Product::where('sku', $validated['sku'])
            ->orWhere('id', is_numeric($validated['sku']) ? $validated['sku'] : 0)
            ->firstOrFail();

        $location = StorageLocation::where('code', $validated['location_id'])
            ->orWhere('id', is_numeric($validated['location_id']) ? $validated['location_id'] : 0)
            ->firstOrFail();

        // Get system balance
        $bal = InventoryBalance::where('product_id', $product->id)
            ->where('location_id', $location->id)
            ->first();

        $sysQty = $bal ? (float) $bal->quantity : 0;
        $cntQty = (float) $validated['counted_quantity'];
        $variance = $cntQty - $sysQty;

        $item = StocktakeItem::updateOrCreate(
            [
                'session_id' => $session->id,
                'product_id' => $product->id,
                'location_id' => $location->id,
            ],
            [
                'lot_id' => $bal ? $bal->lot_id : null,
                'system_quantity' => $sysQty,
                'counted_quantity' => $cntQty,
                'variance' => $variance,
                'recount_required' => abs($variance) > 0,
                'notes' => $validated['notes'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'Hasil hitungan fisik dicatat.',
            'data' => $item
        ]);
    }

    public function submit($id)
    {
        $session = StocktakeSession::findOrFail($id);
        $session->update([
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return response()->json([
            'message' => 'Sesi stock opname berhasil diajukan untuk ditinjau Manajer.',
            'data' => $session
        ]);
    }

    /**
     * Persetujuan Penyesuaian Stok (HANYA Role Manajer / Admin)
     */
    public function approve(Request $request, $id)
    {
        $session = StocktakeSession::with('items')->findOrFail($id);
        $user = $request->user();

        // Aturan ketat PRD: Operator tidak boleh menyetujui
        if ($user && $user->role && $user->role->name === 'operator') {
            return response()->json(['message' => 'Operator tidak berwenang menyetujui penyesuaian stok.'], 403);
        }

        return DB::transaction(function () use ($session, $user, $request) {
            foreach ($session->items as $item) {
                if ($item->variance != 0) {
                    $bal = InventoryBalance::lockForUpdate()
                        ->where('product_id', $item->product_id)
                        ->where('location_id', $item->location_id)
                        ->first();

                    $oldQty = $bal ? (float) $bal->quantity : 0;
                    $newQty = (float) $item->counted_quantity;

                    if ($bal) {
                        $bal->update(['quantity' => $newQty]);
                    } else {
                        $bal = InventoryBalance::create([
                            'product_id' => $item->product_id,
                            'lot_id' => $item->lot_id,
                            'location_id' => $item->location_id,
                            'quantity' => $newQty,
                        ]);
                    }

                    // Record Adjustment Transaction
                    $ref = 'ADJ-' . $session->code . '-' . $item->id;
                    InventoryTransaction::create([
                        'transaction_type' => 'adjustment',
                        'product_id' => $item->product_id,
                        'lot_id' => $item->lot_id ?: 1,
                        'from_location_id' => $item->location_id,
                        'to_location_id' => $item->location_id,
                        'quantity' => abs($item->variance),
                        'reference_code' => $ref,
                        'performed_by' => $session->created_by,
                        'approved_by' => optional($user)->id,
                        'reason' => "Penyesuaian Stock Opname {$session->code}: " . ($request->input('notes') ?: 'Persetujuan Manajer'),
                    ]);

                    AuditLog::create([
                        'user_id' => optional($user)->id,
                        'action' => 'STOCKTAKE_APPROVED',
                        'entity_type' => 'inventory_balance',
                        'entity_id' => (string) $bal->id,
                        'before_json' => ['quantity' => $oldQty],
                        'after_json' => ['quantity' => $newQty],
                        'reason' => "Stock Opname {$session->code} disetujui",
                        'created_at' => now(),
                    ]);
                }
            }

            $session->update([
                'status' => 'closed',
                'reviewed_by' => optional($user)->id,
                'reviewed_at' => now(),
                'notes' => $request->input('notes') ?: $session->notes,
            ]);

            return response()->json([
                'message' => 'Penyesuaian stok berhasil disetujui dan saldo inventaris telah diperbarui secara permanen.',
                'data' => $session
            ]);
        });
    }

    public function reject(Request $request, $id)
    {
        $session = StocktakeSession::findOrFail($id);
        $user = $request->user();

        $session->update([
            'status' => 'rejected',
            'reviewed_by' => optional($user)->id,
            'reviewed_at' => now(),
            'notes' => $request->input('notes') ?: 'Ditolak oleh manajer',
        ]);

        return response()->json([
            'message' => 'Penyesuaian stock opname ditolak.',
            'data' => $session
        ]);
    }
}
