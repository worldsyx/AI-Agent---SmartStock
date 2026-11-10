<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StocktakeItem extends Model
{
    protected $fillable = [
        'session_id', 'product_id', 'lot_id', 'location_id',
        'system_quantity', 'counted_quantity', 'variance',
        'recount_required', 'notes'
    ];

    protected $casts = [
        'system_quantity' => 'decimal:2',
        'counted_quantity' => 'decimal:2',
        'variance' => 'decimal:2',
        'recount_required' => 'boolean',
    ];

    public function session()
    {
        return $this->belongsTo(StocktakeSession::class, 'session_id');
    }

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
