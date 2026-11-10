<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\UserPreference;
use App\Models\SystemSetting;
use App\Models\AiConfiguration;
use App\Models\AuditLog;

class SettingsController extends Controller
{
    /**
     * PRD 3.3 & 12.9: Satu endpoint Settings dengan konten sesuai role
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();
        $role = $user->role ? $user->role->name : 'operator';

        $preferences = UserPreference::where('user_id', $user->id)
            ->pluck('preference_value', 'preference_key')
            ->toArray();

        $data = [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
            ],
            'preferences' => $preferences,
        ];

        // Manager / Admin: Include AI and threshold settings
        if ($user->isManager() || $user->isAdmin()) {
            $data['ai_settings'] = [
                'max_stock_age_days' => (int) SystemSetting::get('max_stock_age_days', 90),
                'stocktake_tolerance_pct' => (float) SystemSetting::get('stocktake_discrepancy_tolerance_pct', 1.0),
                'critical_capacity_threshold' => (float) SystemSetting::get('critical_capacity_threshold', 90.0),
                'ai_service_url' => SystemSetting::get('ai_service_url', 'http://localhost:5000'),
                'notification_channels' => ['in_app' => true, 'email_summary' => false],
            ];
        }

        // Operator: Default device / scanner preferences
        if ($role === 'operator') {
            $data['operator_settings'] = [
                'camera_facing' => $preferences['camera_facing'] ?? 'environment',
                'scan_sound' => $preferences['scan_sound'] ?? true,
                'vibrate_on_scan' => $preferences['vibrate_on_scan'] ?? true,
                'compact_cards' => $preferences['compact_cards'] ?? false,
            ];
        }

        // Admin: System maintenance settings
        if ($user->isAdmin()) {
            $data['system_settings'] = SystemSetting::all()->pluck('value_json', 'key')->toArray();
        }

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'current_password' => 'nullable|string',
            'new_password' => 'nullable|string|min:6',
        ]);

        $user->name = $validated['name'];

        if (!empty($validated['new_password'])) {
            if (empty($validated['current_password']) || !Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['message' => 'Password saat ini tidak cocok.'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'data' => $user
        ]);
    }

    public function updatePreferences(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'preferences' => 'required|array',
        ]);

        foreach ($validated['preferences'] as $key => $val) {
            UserPreference::updateOrCreate(
                ['user_id' => $user->id, 'preference_key' => $key],
                ['preference_value' => $val]
            );
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Preferensi pengguna berhasil disimpan.',
        ]);
    }

    public function updateAiConfig(Request $request)
    {
        $user = $request->user();
        if (!$user->isManager() && !$user->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'max_stock_age_days' => 'nullable|numeric|min:1',
            'stocktake_tolerance_pct' => 'nullable|numeric|min:0.1',
            'critical_capacity_threshold' => 'nullable|numeric|min:10|max:100',
        ]);

        if (isset($validated['max_stock_age_days'])) {
            SystemSetting::set('max_stock_age_days', (int)$validated['max_stock_age_days'], $user->id);
        }
        if (isset($validated['stocktake_tolerance_pct'])) {
            SystemSetting::set('stocktake_discrepancy_tolerance_pct', (float)$validated['stocktake_tolerance_pct'], $user->id);
        }
        if (isset($validated['critical_capacity_threshold'])) {
            SystemSetting::set('critical_capacity_threshold', (float)$validated['critical_capacity_threshold'], $user->id);
        }

        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'AI_SETTINGS_UPDATED',
            'entity_type' => 'settings',
            'after_json' => $validated,
            'reason' => 'Manajer memperbarui konfigurasi parameter AI di Halaman Settings',
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Pengaturan AI & Parameter Ambang Gudang berhasil disimpan.',
        ]);
    }
}
