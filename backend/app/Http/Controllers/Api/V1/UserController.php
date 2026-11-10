<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\AuditLog;

class UserController extends Controller
{
    public function index()
    {
        $users = User::with('role')->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_active' => $u->is_active,
                'created_at' => $u->created_at ? $u->created_at->toISOString() : null,
            ];
        });

        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'required|string|exists:roles,name',
        ]);

        $role = Role::where('name', $validated['role'])->firstOrFail();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        AuditLog::create([
            'user_id' => optional($request->user())->id,
            'action' => 'USER_CREATE',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'reason' => 'Admin created new user ' . $user->name,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Pengguna berhasil dibuat.', 'data' => $user->load('role')], 201);
    }
}
