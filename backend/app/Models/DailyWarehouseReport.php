<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyWarehouseReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'warehouse_id',
        'report_date',
        'period_start',
        'period_end',
        'generated_at',
        'status',
        'summary_json',
        'error_message',
    ];

    protected $casts = [
        'report_date' => 'date',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'generated_at' => 'datetime',
        'summary_json' => 'array',
    ];

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
