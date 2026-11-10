<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QrCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'entity_type',
        'entity_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function getEntityAttribute()
    {
        if ($this->entity_type === 'product') {
            return Product::find($this->entity_id);
        } elseif ($this->entity_type === 'lot') {
            return InventoryLot::with('product')->find($this->entity_id);
        } elseif ($this->entity_type === 'location') {
            return StorageLocation::with('zone')->find($this->entity_id);
        }
        return null;
    }
}
