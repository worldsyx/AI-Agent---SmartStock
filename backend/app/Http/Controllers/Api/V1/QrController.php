<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\InventoryLot;
use App\Models\StorageLocation;
use App\Models\QrCode;

class QrController extends Controller
{
    /**
     * PRD 6.5 & 12.6: Resolusi QR Code / Barcode (Scan / Input Manual)
     */
    public function resolve(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $rawCode = trim($validated['code']);

        // 1. Cek tabel qr_codes terdaftar
        $qrRecord = QrCode::where('code', $rawCode)->where('is_active', true)->first();
        if ($qrRecord) {
            $entity = $qrRecord->entity;
            return response()->json([
                'status' => 'success',
                'resolved' => true,
                'entity_type' => $qrRecord->entity_type,
                'code' => $rawCode,
                'data' => $entity,
            ]);
        }

        // 2. Cek apakah cocok dengan SKU Produk
        $product = Product::where('sku', $rawCode)->orWhere('name', 'like', "%{$rawCode}%")->first();
        if ($product) {
            $product->load(['vendor', 'balances.location', 'balances.lot']);
            return response()->json([
                'status' => 'success',
                'resolved' => true,
                'entity_type' => 'product',
                'code' => $rawCode,
                'data' => [
                    'id' => $product->id,
                    'sku' => $product->sku,
                    'name' => $product->name,
                    'category' => $product->category,
                    'unit' => $product->unit,
                    'safety_stock' => (float)$product->safety_stock,
                    'current_stock' => (float)$product->current_stock,
                    'vendor' => $product->vendor ? $product->vendor->name : null,
                    'balances' => $product->balances,
                ],
                'suggested_actions' => ['receipt', 'issue', 'view_stock']
            ]);
        }

        // 3. Cek apakah cocok dengan Lot Code
        $lot = InventoryLot::where('lot_code', $rawCode)->first();
        if ($lot) {
            $lot->load(['product', 'vendor', 'balances.location']);
            return response()->json([
                'status' => 'success',
                'resolved' => true,
                'entity_type' => 'lot',
                'code' => $rawCode,
                'data' => [
                    'id' => $lot->id,
                    'lot_code' => $lot->lot_code,
                    'product' => $lot->product,
                    'initial_quantity' => (float)$lot->initial_quantity,
                    'current_quantity' => (float)$lot->current_quantity,
                    'unit' => $lot->unit,
                    'condition_status' => $lot->condition_status,
                    'received_at' => $lot->received_at,
                    'days_old' => $lot->days_old,
                    'balances' => $lot->balances,
                ],
                'suggested_actions' => ['issue', 'transfer', 'inspect']
            ]);
        }

        // 4. Cek apakah cocok dengan Storage Location Code (Slot / Rack)
        $location = StorageLocation::where('code', $rawCode)->first();
        if ($location) {
            $location->load(['zone.warehouse', 'balances.product', 'balances.lot']);
            return response()->json([
                'status' => 'success',
                'resolved' => true,
                'entity_type' => 'location',
                'code' => $rawCode,
                'data' => [
                    'id' => $location->id,
                    'code' => $location->code,
                    'location_type' => $location->location_type,
                    'capacity_value' => (float)$location->capacity_value,
                    'capacity_unit' => $location->capacity_unit,
                    'zone' => $location->zone,
                    'balances' => $location->balances,
                ],
                'suggested_actions' => ['transfer_to', 'stocktake', 'view_capacity']
            ]);
        }

        return response()->json([
            'status' => 'error',
            'resolved' => false,
            'message' => "QR Code atau Kode Manual '{$rawCode}' tidak terdaftar di sistem.",
            'code' => $rawCode
        ], 404);
    }

    public function show($code)
    {
        return $this->resolve(new Request(['code' => $code]));
    }
}
