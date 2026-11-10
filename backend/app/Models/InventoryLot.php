<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryLot extends Model
{
    /**
     * Status batch sesuai PRD Panduan Pemrosesan Data AI v1.0 - Metode 1:
     *   Active        : Normal, belum mendekati expiry
     *   Aging_Warning : H-30 menuju expiry -> trigger warning
     *   Expired       : H+0 -> stok dikunci, tidak bisa digunakan tanpa approval
     */
    const STATUS_ACTIVE        = 'Active';
    const STATUS_AGING_WARNING = 'Aging_Warning';
    const STATUS_EXPIRED       = 'Expired';

    const AGING_WARNING_DAYS = 30; // H-30 sebelum expiry (PRD Metode 1)

    protected $fillable = [
        'product_id', 'vendor_id', 'lot_code', 'received_at',
        'initial_quantity', 'current_quantity', 'unit', 'condition_status',
        'expiry_date', 'condition_notes', 'placed_at',
        'batch_status', 'is_locked',
    ];

    protected $casts = [
        'received_at'      => 'datetime',
        'expiry_date'      => 'date',
        'placed_at'        => 'datetime',
        'initial_quantity' => 'decimal:2',
        'current_quantity' => 'decimal:2',
        'is_locked'        => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function vendor()
    {
        return $this->belongsTo(Vendor::class);
    }

    public function balances()
    {
        return $this->hasMany(InventoryBalance::class, 'lot_id');
    }

    /** Usia lot dalam hari sejak received_at */
    public function getDaysOldAttribute(): int
    {
        return $this->received_at ? (int) $this->received_at->diffInDays(now()) : 0;
    }

    /**
     * Sisa hari menuju expiry berdasarkan kategori PRD.
     * Null jika kategori tidak punya batas simpan.
     */
    public function getDaysToExpiryAttribute(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }
        return (int) now()->startOfDay()->diffInDays($this->expiry_date->startOfDay(), false);
    }

    /**
     * Hitung dan perbarui batch_status sesuai logika PRD Metode 1:
     *   H-30 s/d H-1 : Aging_Warning
     *   H+0 ke atas  : Expired (kunci stok)
     *   Sebelum H-30  : Active
     */
    public function recalculateBatchStatus(): string
    {
        if ($this->expiry_date === null) {
            return self::STATUS_ACTIVE;
        }

        $daysToExpiry = $this->days_to_expiry;

        if ($daysToExpiry <= 0) {
            return self::STATUS_EXPIRED;
        } elseif ($daysToExpiry <= self::AGING_WARNING_DAYS) {
            return self::STATUS_AGING_WARNING;
        }

        return self::STATUS_ACTIVE;
    }

    /**
     * Perbarui batch_status dan is_locked ke DB.
     * Dipanggil oleh scheduled worker harian (PRD Metode 1: daily worker).
     */
    public function syncBatchStatus(): void
    {
        $newStatus = $this->recalculateBatchStatus();
        $isLocked  = ($newStatus === self::STATUS_EXPIRED);

        $this->update([
            'batch_status' => $newStatus,
            'is_locked'    => $isLocked,
        ]);
    }

    /** Apakah stok ini dikunci (Expired)? */
    public function isLockedForUse(): bool
    {
        return (bool) $this->is_locked;
    }
}
