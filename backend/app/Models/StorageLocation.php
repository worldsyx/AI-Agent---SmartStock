<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorageLocation extends Model
{
    protected $fillable = [
        'zone_id', 'parent_location_id', 'location_type', 'code', 'capacity_value', 'capacity_unit', 'is_active'
    ];

    public function zone()
    {
        return $this->belongsTo(WarehouseZone::class, 'zone_id');
    }

    public function parent()
    {
        return $this->belongsTo(StorageLocation::class, 'parent_location_id');
    }

    public function children()
    {
        return $this->hasMany(StorageLocation::class, 'parent_location_id');
    }

    public function balances()
    {
        return $this->hasMany(InventoryBalance::class, 'location_id');
    }
}
