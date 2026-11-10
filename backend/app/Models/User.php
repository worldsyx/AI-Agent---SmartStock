<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string $roleName): bool
    {
        return $this->role && $this->role->name === $roleName;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isManager(): bool
    {
        return $this->hasRole('manager') || $this->isAdmin();
    }

    public function createApiToken(): string
    {
        $plainToken = Str::random(60);
        \DB::table('personal_access_tokens')->insert([
            'tokenable_type' => self::class,
            'tokenable_id' => $this->id,
            'name' => 'api-token',
            'token' => hash('sha256', $plainToken),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return $plainToken;
    }
}
