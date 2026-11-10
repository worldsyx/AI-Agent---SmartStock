<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModel extends Model
{
    protected $fillable = [
        'model_name',
        'model_type',
        'model_version',
        'status',
        'description',
    ];

    public function versions()
    {
        return $this->hasMany(AiModelVersion::class, 'model_id');
    }

    public function evaluationRuns()
    {
        return $this->hasMany(AiEvaluationRun::class, 'model_id');
    }

    public function processingLogs()
    {
        return $this->hasMany(AiProcessingLog::class, 'model_id');
    }
}
