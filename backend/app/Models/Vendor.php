<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vendor extends Model
{
    protected $fillable = [
        'code', 'name', 'contact_person', 'address', 'category', 'lead_time_days', 'tier', 'is_active'
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function lots()
    {
        return $this->hasMany(InventoryLot::class);
    }
}
