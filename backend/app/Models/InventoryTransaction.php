<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    protected $fillable = [
        'transaction_type', 'product_id', 'lot_id', 'from_location_id',
        'to_location_id', 'quantity', 'reference_code', 'performed_by',
        'approved_by', 'reason', 'transaction_number', 'source', 'metadata_json'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'metadata_json' => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function lot()
    {
        return $this->belongsTo(InventoryLot::class, 'lot_id');
    }

    public function fromLocation()
    {
        return $this->belongsTo(StorageLocation::class, 'from_location_id');
    }

    public function toLocation()
    {
        return $this->belongsTo(StorageLocation::class, 'to_location_id');
    }

    public function performer()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
