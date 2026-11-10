<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiEvaluationDetail extends Model
{
    protected $fillable = [
        'evaluation_run_id',
        'sample_id',
        'input_data',
        'predicted_result',
        'actual_result',
        'error_value',
        'evaluation_status',
        'notes',
    ];

    protected $casts = [
        'input_data' => 'array',
        'error_value' => 'float',
    ];

    public function evaluationRun()
    {
        return $this->belongsTo(AiEvaluationRun::class, 'evaluation_run_id');
    }
}
