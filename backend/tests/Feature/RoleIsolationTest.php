<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class RoleIsolationTest extends TestCase
{
    use RefreshDatabase;
    protected function getAuthTokenForRole(string $roleName): string
    {
        $role = Role::firstOrCreate(['name' => $roleName]);
        $user = User::where('email', "{$roleName}@smartstock.id")->first();
        if (!$user) {
            $user = User::create([
                'name' => ucfirst($roleName) . ' Test',
                'email' => "{$roleName}@smartstock.id",
                'password' => bcrypt('password'),
                'role_id' => $role->id,
                'is_active' => true,
            ]);
        }

        return $user->createApiToken();
    }

    public function test_manager_can_access_manager_dashboard()
    {
        $token = $this->getAuthTokenForRole('manager');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/manager/dashboard/summary');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                'total_skus',
                'total_stock_qty',
                'in_today',
                'out_today',
                'transfers_today',
                'low_stock_count',
                'aging_lots_count',
                'capacity_used_pct'
            ]
        ]);
    }

    public function test_operator_is_denied_from_manager_dashboard()
    {
        $token = $this->getAuthTokenForRole('operator');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/manager/dashboard/summary');

        // RBAC must block operator from manager endpoints
        $response->assertStatus(403);
    }

    public function test_operator_can_access_operator_home()
    {
        $token = $this->getAuthTokenForRole('operator');

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/operator/home');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'data' => [
                'operator',
                'today_stats' => [
                    'receipts_count',
                    'issues_count',
                    'transfers_count'
                ]
            ]
        ]);
    }

    public function test_both_roles_can_access_unified_settings()
    {
        $mgrToken = $this->getAuthTokenForRole('manager');
        $opToken = $this->getAuthTokenForRole('operator');

        $mgrRes = $this->withHeader('Authorization', "Bearer {$mgrToken}")
            ->getJson('/api/v1/settings');
        $mgrRes->assertStatus(200);
        $this->assertArrayHasKey('ai_settings', $mgrRes->json('data'));

        $opRes = $this->withHeader('Authorization', "Bearer {$opToken}")
            ->getJson('/api/v1/settings');
        $opRes->assertStatus(200);
        $this->assertArrayHasKey('operator_settings', $opRes->json('data'));
    }

    public function test_qr_resolution_identifies_product()
    {
        $token = $this->getAuthTokenForRole('operator');
        Product::firstOrCreate(
            ['sku' => 'KRT-A3-001'],
            ['name' => 'Karton Corrugated A3', 'category' => 'karton', 'unit' => 'Lembar', 'safety_stock' => 100]
        );

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/qr/resolve', ['code' => 'KRT-A3-001']);

        $response->assertStatus(200);
        $this->assertEquals('product', $response->json('entity_type'));
    }
}
