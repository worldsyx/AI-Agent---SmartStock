<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WarehouseZone extends Model
{
    protected $fillable = [
        'warehouse_id', 'code', 'name', 'capacity_value', 'capacity_unit', 'warning_threshold'
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function locations()
    {
        return $this->hasMany(StorageLocation::class, 'zone_id');
    }
}
