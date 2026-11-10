<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'config_key',
        'config_value',
        'scope',
        'updated_by',
    ];

    protected $casts = [
        'config_value' => 'array',
    ];

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function getVal(string $key, $default = null)
    {
        $cfg = static::where('config_key', $key)->first();
        return $cfg ? $cfg->config_value : $default;
    }
}
