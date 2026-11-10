<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiEvaluationRun extends Model
{
    protected $fillable = [
        'model_id',
        'dataset_name',
        'test_type',
        'total_samples',
        'correct_results',
        'incorrect_results',
        'failed_results',
        'pending_results',
        'accuracy',
        'mae',
        'mape',
        'precision',
        'recall',
        'f1_score',
        'processing_time',
        'evaluation_date',
        'tested_by',
        'status',
        'notes',
    ];

    protected $casts = [
        'accuracy' => 'float',
        'mae' => 'float',
        'mape' => 'float',
        'precision' => 'float',
        'recall' => 'float',
        'f1_score' => 'float',
        'processing_time' => 'float',
        'evaluation_date' => 'datetime',
        'total_samples' => 'integer',
        'correct_results' => 'integer',
        'incorrect_results' => 'integer',
        'failed_results' => 'integer',
        'pending_results' => 'integer',
    ];

    public function model()
    {
        return $this->belongsTo(AiModel::class, 'model_id');
    }

    public function details()
    {
        return $this->hasMany(AiEvaluationDetail::class, 'evaluation_run_id');
    }

    public function tester()
    {
        return $this->belongsTo(User::class, 'tested_by');
    }
}
