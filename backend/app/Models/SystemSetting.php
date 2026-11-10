<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = ['key', 'value_json', 'updated_by'];

    protected $casts = [
        'value_json' => 'array',
    ];

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value_json : $default;
    }

    public static function set(string $key, $value, ?int $userId = null)
    {
        return static::updateOrCreate(
            ['key' => $key],
            ['value_json' => $value, 'updated_by' => $userId]
        );
    }
}
