<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionOrder extends Model
{
    /**
     * Skema PRD - Entitas Production_Orders (PRD Panduan v1.0):
     *   - PO_Number        : String (PK, Wajib)
     *   - Customer_ID      : String
     *   - Item_ID          : String (FK ke products)
     *   - Order_Qty        : Numeric
     *   - Prev_Production  : Numeric (Hasil produksi 1x sebelumnya)
     *   - Status_Produksi  : Enum (Blocked_No_PO, Approved, In_Progress, Completed)
     *   - Status_Kirim     : Enum (Pending, Ready_To_Ship, Shipped)
     */
    protected $fillable = [
        'po_number',
        'customer_id',
        'item_id',
        'order_qty',
        'prev_production',
        'po_status',
        'status_produksi',
        'status_kirim',
        'actual_output',
        'materials_used_json',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'completed_at',
        'dispatched_at',
    ];

    protected $casts = [
        'order_qty'          => 'decimal:2',
        'prev_production'    => 'decimal:2',
        'actual_output'      => 'decimal:2',
        'materials_used_json' => 'array',
        'approved_at'        => 'datetime',
        'completed_at'       => 'datetime',
        'dispatched_at'      => 'datetime',
    ];

    /**
     * Relasi ke Product (via item_id = products.sku)
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'item_id', 'sku');
    }

    /**
     * Relasi ke User pembuat
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relasi ke User yang menyetujui
     */
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * PRD Metode 4: Cek apakah Work Order diizinkan
     * WORK_ORDER_ALLOWED = IF(PO_Number IS NOT NULL AND PO_Status == 'VALID', TRUE, FALSE)
     */
    public function isWorkOrderAllowed(): bool
    {
        if (empty($this->po_number)) {
            return false;
        }
        return in_array(strtoupper($this->po_status ?? ''), ['VALID', 'APPROVED', 'ACTIVE']);
    }

    /**
     * PRD Metode 4: Cek apakah perlu Immediate Dispatch
     */
    public function needsImmediateDispatch(): bool
    {
        return $this->status_produksi === 'Completed'
            && $this->status_kirim !== 'Shipped';
    }
}
