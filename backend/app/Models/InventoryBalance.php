<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryBalance extends Model
{
    protected $fillable = [
        'product_id', 'lot_id', 'location_id', 'quantity'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function lot()
    {
        return $this->belongsTo(InventoryLot::class, 'lot_id');
    }

    public function location()
    {
        return $this->belongsTo(StorageLocation::class, 'location_id');
    }
}
