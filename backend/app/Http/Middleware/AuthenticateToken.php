<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;

class AuthenticateToken
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $header = $request->header('Authorization');
        if (!$header || !str_starts_with($header, 'Bearer ')) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $plainToken = substr($header, 7);
        $hashed = hash('sha256', $plainToken);

        $tokenRecord = DB::table('personal_access_tokens')
            ->where('token', $hashed)
            ->first();

        if (!$tokenRecord) {
            return response()->json(['message' => 'Invalid or expired token.'], 401);
        }

        $user = User::with('role')->find($tokenRecord->tokenable_id);
        if (!$user || !$user->is_active) {
            return response()->json(['message' => 'User account is inactive or not found.'], 401);
        }

        // Set authenticated user
        auth()->setUser($user);
        $request->setUserResolver(fn() => $user);

        // RBAC check if roles are specified
        if (!empty($roles)) {
            $userRole = $user->role ? $user->role->name : null;
            if (!$userRole || !in_array($userRole, $roles)) {
                return response()->json([
                    'message' => 'Unauthorized. Insufficient permissions for this action.',
                    'required_roles' => $roles,
                    'current_role' => $userRole
                ], 403);
            }
        }

        return $next($request);
    }
}
