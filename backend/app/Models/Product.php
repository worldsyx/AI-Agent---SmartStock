<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    /**
     * Kategori material sesuai PRD Panduan Pemrosesan Data AI v1.0 - Aturan 5:
     *   Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part
     *
     * Max Storage Days sesuai PRD Aturan 1 & 2:
     *   Roll Kertas = 730 hari (24 Bulan)
     *   Box         = 180 hari (6 Bulan)
     *   Lainnya     = NULL (tidak ada batas)
     */
    const CATEGORY_ROLL_KERTAS    = 'Roll Kertas';
    const CATEGORY_SHEET          = 'Sheet';
    const CATEGORY_BOX            = 'Box';
    const CATEGORY_BAHAN_PEMBANTU = 'Bahan Baku Pembantu';
    const CATEGORY_SPARE_PART     = 'Spare Part';

    /** Batas simpan per kategori (PRD Aturan 1 & 2) */
    const MAX_STORAGE_DAYS = [
        self::CATEGORY_ROLL_KERTAS => 730,  // 24 Bulan
        self::CATEGORY_BOX         => 180,  // 6 Bulan
    ];

    protected $fillable = [
        'sku', 'name', 'category', 'specification', 'unit',
        'vendor_id', 'safety_stock', 'max_storage_days', 'is_active'
    ];

    protected $casts = [
        'safety_stock'     => 'decimal:2',
        'max_storage_days' => 'integer',
        'is_active'        => 'boolean',
    ];

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function lots()
    {
        return $this->hasMany(InventoryLot::class);
    }

    public function balances()
    {
        return $this->hasMany(InventoryBalance::class);
    }

    public function getCurrentStockAttribute()
    {
        return $this->balances()->sum('quantity');
    }

    /**
     * Kembalikan batas simpan (hari) berdasarkan kategori PRD.
     * Roll Kertas: 730 hari | Box: 180 hari | Lainnya: null
     */
    public function getPrdMaxStorageDaysAttribute(): ?int
    {
        return self::MAX_STORAGE_DAYS[$this->category] ?? null;
    }

    /**
     * Apakah kategori ini memiliki batas simpan menurut PRD?
     */
    public function hasPrdStorageLimit(): bool
    {
        return isset(self::MAX_STORAGE_DAYS[$this->category]);
    }
}
