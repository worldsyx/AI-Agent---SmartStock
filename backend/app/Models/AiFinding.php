<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiFinding extends Model
{
    protected $fillable = [
        'agent_type', 'entity_type', 'entity_id', 'severity',
        'title', 'explanation', 'evidence_json', 'recommendation',
        'status', 'generated_at', 'reviewed_by', 'reviewed_at', 'resolution_notes'
    ];

    protected $casts = [
        'evidence_json' => 'array',
        'generated_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
