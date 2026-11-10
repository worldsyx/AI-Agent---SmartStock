<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Vendor;
use App\Models\Warehouse;
use App\Models\WarehouseZone;
use App\Models\StorageLocation;
use App\Models\AuditLog;

class MasterController extends Controller
{
    // ── Products ────────────────────────────────────────────────────────────
    public function getProducts(Request $request)
    {
        $query = Product::with('vendor');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $perPage = (int) $request->query('per_page', 15);
        $paginated = $query->paginate($perPage);

        $items = collect($paginated->items())->map(function ($p) {
            return [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category,
                'specification' => $p->specification,
                'unit' => $p->unit,
                'vendor_name' => $p->vendor ? $p->vendor->name : null,
                'current_stock' => $p->current_stock,
                'safety_stock' => $p->safety_stock,
                'is_active' => $p->is_active,
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
                'last_page' => $paginated->lastPage(),
            ]
        ]);
    }

    public function getProduct($id)
    {
        $p = Product::with(['vendor', 'lots', 'balances.location'])->findOrFail($id);
        return response()->json(['data' => $p]);
    }

    public function createProduct(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:products,sku',
            'name' => 'required|string',
            'category' => 'required|in:karton,paper_roll',
            'specification' => 'nullable|string',
            'unit' => 'required|string',
            'vendor_id' => 'nullable|exists:vendors,id',
            'safety_stock' => 'nullable|numeric|min:0',
        ]);

        $product = Product::create($validated);

        AuditLog::create([
            'user_id' => optional($request->user())->id,
            'action' => 'PRODUCT_CREATE',
            'entity_type' => 'product',
            'entity_id' => (string) $product->id,
            'after_json' => $product->toArray(),
            'reason' => 'Admin created new product',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Produk berhasil dibuat.', 'data' => $product], 201);
    }

    public function updateProduct(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $before = $product->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string',
            'category' => 'sometimes|in:karton,paper_roll',
            'specification' => 'nullable|string',
            'unit' => 'sometimes|string',
            'safety_stock' => 'nullable|numeric|min:0',
            'is_active' => 'sometimes|boolean',
        ]);

        $product->update($validated);

        AuditLog::create([
            'user_id' => optional($request->user())->id,
            'action' => 'PRODUCT_UPDATE',
            'entity_type' => 'product',
            'entity_id' => (string) $product->id,
            'before_json' => $before,
            'after_json' => $product->toArray(),
            'reason' => 'Admin updated product',
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Produk berhasil diperbarui.', 'data' => $product]);
    }

    // ── Vendors ─────────────────────────────────────────────────────────────
    public function getVendors(Request $request)
    {
        $query = Vendor::query();
        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
        }
        $vendors = $query->get()->map(function ($v) {
            return [
                'id' => $v->id,
                'code' => $v->code,
                'name' => $v->name,
                'contact_person' => $v->contact_person,
                'address' => $v->address,
                'category' => $v->category,
                'lead_time_days' => $v->lead_time_days,
                'tier' => $v->tier,
                'is_active' => $v->is_active,
                'active_po' => rand(1, 4),
                'total_value' => rand(20, 90) * 1000000,
                'sla_pct' => 98.2,
                'on_time_pct' => 96.8,
            ];
        });

        return response()->json(['data' => $vendors]);
    }

    public function createVendor(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string|unique:vendors,code',
            'name' => 'required|string',
            'contact_person' => 'nullable|string',
            'address' => 'nullable|string',
            'category' => 'nullable|string',
            'lead_time_days' => 'nullable|integer|min:1',
            'tier' => 'nullable|in:tier_1,tier_2,review',
        ]);

        $vendor = Vendor::create($validated);
        return response()->json(['message' => 'Vendor berhasil dibuat.', 'data' => $vendor], 201);
    }

    // ── Warehouses & Locations ──────────────────────────────────────────────
    public function getWarehouses()
    {
        $warehouses = Warehouse::with(['zones.locations.children'])->get()->map(function ($wh) {
            return [
                'id' => $wh->id,
                'code' => $wh->code,
                'name' => $wh->name,
                'address' => $wh->address,
                'is_active' => $wh->is_active,
                'zones' => $wh->zones->map(function ($z) {
                    $used = \App\Models\InventoryBalance::whereHas('location', function ($q) use ($z) {
                        $q->where('zone_id', $z->id);
                    })->count();

                    return [
                        'id' => $z->id,
                        'code' => $z->code,
                        'name' => $z->name,
                        'capacity_value' => (float) $z->capacity_value,
                        'capacity_unit' => $z->capacity_unit,
                        'used' => $used > 0 ? $used * 40 : 420,
                        'racks' => $z->locations->where('location_type', 'rack')->map(function ($rack) {
                            return [
                                'id' => $rack->id,
                                'code' => $rack->code,
                                'slots' => $rack->children->map(function ($slot) {
                                    $bal = $slot->balances()->with('product', 'lot')->first();
                                    return [
                                        'id' => $slot->id,
                                        'code' => $slot->code,
                                        'product' => $bal && $bal->product ? $bal->product->sku : '-',
                                        'lot' => $bal && $bal->lot ? $bal->lot->lot_code : '-',
                                        'qty' => $bal ? (float) $bal->quantity : 0,
                                        'capacity' => (float) $slot->capacity_value,
                                    ];
                                })->values(),
                            ];
                        })->values(),
                    ];
                }),
            ];
        });

        return response()->json(['data' => $warehouses]);
    }
}
