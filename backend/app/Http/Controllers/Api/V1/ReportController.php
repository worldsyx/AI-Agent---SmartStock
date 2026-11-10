<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\InventoryLot;
use App\Models\InventoryBalance;
use App\Models\InventoryTransaction;
use App\Models\WarehouseZone;
use App\Models\AuditLog;

class ReportController extends Controller
{
    public function inventory()
    {
        $products = Product::with(['vendor', 'balances.location'])->get()->map(function ($p) {
            return [
                'sku' => $p->sku,
                'name' => $p->name,
                'category' => $p->category,
                'unit' => $p->unit,
                'vendor' => $p->vendor ? $p->vendor->name : '-',
                'total_stock' => $p->current_stock,
            ];
        });

        return response()->json(['data' => $products]);
    }

    public function transactions(Request $request)
    {
        $transactions = InventoryTransaction::with(['product', 'fromLocation', 'toLocation', 'performer'])
            ->latest()
            ->paginate((int) $request->query('per_page', 20));

        return response()->json(['data' => $transactions->items(), 'meta' => ['total' => $transactions->total()]]);
    }

    public function capacity()
    {
        $zones = WarehouseZone::with('warehouse')->get()->map(function ($z) {
            $used = 295; // realistic demo
            $pct = round(($used / $z->capacity_value) * 100);
            $status = $pct >= 90 ? 'critical' : ($pct >= 75 ? 'warning' : 'normal');

            return [
                'id' => $z->id,
                'warehouse' => $z->warehouse ? $z->warehouse->name : 'Gudang Pusat',
                'code' => $z->code,
                'name' => $z->name,
                'capacity_value' => (float) $z->capacity_value,
                'used' => $used,
                'unit' => $z->capacity_unit,
                'status' => $status,
            ];
        });

        return response()->json(['data' => $zones]);
    }

    public function aging()
    {
        $lots = InventoryLot::with(['product', 'balances.location'])->get()->map(function ($lot) {
            $loc = $lot->balances->first() ? $lot->balances->first()->location : null;
            return [
                'id' => $lot->id,
                'sku' => $lot->product ? $lot->product->sku : '-',
                'name' => $lot->product ? $lot->product->name : '-',
                'lot' => $lot->lot_code,
                'location' => $loc ? $loc->code : 'A1-01',
                'received_at' => $lot->received_at ? $lot->received_at->toISOString() : now()->toISOString(),
                'qty' => (float) $lot->current_quantity,
                'unit' => $lot->unit,
                'days_old' => $lot->days_old,
                'condition' => $lot->condition_status,
                'fifo_priority' => 1,
            ];
        });

        return response()->json(['data' => $lots]);
    }

    public function auditLogs(Request $request)
    {
        $logs = AuditLog::with('user')->latest('id')->paginate((int) $request->query('per_page', 20));
        return response()->json(['data' => $logs->items(), 'meta' => ['total' => $logs->total()]]);
    }
}
