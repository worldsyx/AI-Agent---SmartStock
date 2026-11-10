<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiModelVersion extends Model
{
    protected $fillable = [
        'model_id',
        'version',
        'change_description',
        'deployment_date',
        'status',
    ];

    protected $casts = [
        'deployment_date' => 'date',
    ];

    public function model()
    {
        return $this->belongsTo(AiModel::class, 'model_id');
    }
}
