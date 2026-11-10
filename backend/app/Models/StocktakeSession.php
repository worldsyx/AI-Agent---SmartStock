<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StocktakeSession extends Model
{
    protected $fillable = [
        'code', 'scope', 'status', 'created_by', 'reviewed_by',
        'started_at', 'submitted_at', 'reviewed_at', 'notes'
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function items()
    {
        return $this->hasMany(StocktakeItem::class, 'session_id');
    }
}
