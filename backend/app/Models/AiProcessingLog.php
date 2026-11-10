<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiProcessingLog extends Model
{
    protected $fillable = [
        'model_id',
        'process_type',
        'input_count',
        'success_count',
        'failed_count',
        'processing_duration',
        'status',
        'error_message',
    ];

    protected $casts = [
        'input_count' => 'integer',
        'success_count' => 'integer',
        'failed_count' => 'integer',
        'processing_duration' => 'float',
    ];

    public function model()
    {
        return $this->belongsTo(AiModel::class, 'model_id');
    }
}
