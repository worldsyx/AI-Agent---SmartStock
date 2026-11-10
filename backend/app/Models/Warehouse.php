<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    protected $fillable = ['code', 'name', 'address', 'is_active'];

    public function zones()
    {
        return $this->hasMany(WarehouseZone::class);
    }
}
