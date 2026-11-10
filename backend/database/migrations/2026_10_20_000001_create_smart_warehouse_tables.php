<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Roles
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique(); // admin, manager, operator
            $table->string('display_name')->nullable();
            $table->json('permissions')->nullable();
            $table->timestamps();
        });

        // Add role_id and is_active to users
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete();
            $table->boolean('is_active')->default(true);
        });

        // 2. Personal Access Tokens for API Auth (Sanctum style lightweight)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        // 3. Warehouses
        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. Warehouse Zones
        Schema::create('warehouse_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->string('code');
            $table->string('name');
            $table->decimal('capacity_value', 12, 2)->default(500);
            $table->string('capacity_unit')->default('Slot');
            $table->decimal('warning_threshold', 5, 2)->default(80.00); // 80%
            $table->timestamps();
            $table->unique(['warehouse_id', 'code']);
        });

        // 5. Storage Locations (Hierarchy: Rack / Slot)
        Schema::create('storage_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zone_id')->constrained('warehouse_zones')->cascadeOnDelete();
            $table->foreignId('parent_location_id')->nullable()->constrained('storage_locations')->nullOnDelete();
            $table->string('location_type')->default('slot'); // rack, slot
            $table->string('code')->unique();
            $table->decimal('capacity_value', 12, 2)->default(100);
            $table->string('capacity_unit')->default('Slot');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 6. Vendors
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('contact_person')->nullable();
            $table->string('address')->nullable();
            $table->string('category')->nullable();
            $table->integer('lead_time_days')->default(2);
            $table->string('tier')->default('tier_1'); // tier_1, tier_2, review
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 7. Products
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('category')->default('karton'); // karton, paper_roll
            $table->text('specification')->nullable();
            $table->string('unit')->default('Lembar'); // Lembar, Roll, Dus
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->decimal('safety_stock', 12, 2)->default(100);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 8. Inventory Lots
        Schema::create('inventory_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('vendor_id')->nullable()->constrained('vendors')->nullOnDelete();
            $table->string('lot_code')->unique();
            $table->timestamp('received_at')->useCurrent();
            $table->decimal('initial_quantity', 12, 2);
            $table->decimal('current_quantity', 12, 2);
            $table->string('unit')->default('Lembar');
            $table->string('condition_status')->default('good'); // good, damp, torn, dented, damaged
            $table->timestamps();
        });

        // 9. Inventory Balances
        Schema::create('inventory_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained('inventory_lots')->cascadeOnDelete();
            $table->foreignId('location_id')->constrained('storage_locations')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->timestamps();
            $table->unique(['lot_id', 'location_id']);
        });

        // 10. Inventory Transactions
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_type'); // receipt, issue, transfer, adjustment
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('lot_id')->constrained('inventory_lots')->cascadeOnDelete();
            $table->foreignId('from_location_id')->nullable()->constrained('storage_locations')->nullOnDelete();
            $table->foreignId('to_location_id')->nullable()->constrained('storage_locations')->nullOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->string('reference_code')->unique(); // Idempotency key
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        // 11. Stocktake Sessions
        Schema::create('stocktake_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('scope'); // e.g. "Zona A", "All"
            $table->string('status')->default('draft'); // draft, counting, submitted, reviewed, closed, rejected
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 12. Stocktake Items
        Schema::create('stocktake_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('stocktake_sessions')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('lot_id')->nullable()->constrained('inventory_lots')->nullOnDelete();
            $table->foreignId('location_id')->constrained('storage_locations')->cascadeOnDelete();
            $table->decimal('system_quantity', 12, 2)->default(0);
            $table->decimal('counted_quantity', 12, 2)->default(0);
            $table->decimal('variance', 12, 2)->default(0);
            $table->boolean('recount_required')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 13. AI Findings
        Schema::create('ai_findings', function (Blueprint $table) {
            $table->id();
            $table->string('agent_type'); // stock_accuracy, slotting, capacity, aging_fifo
            $table->string('entity_type')->nullable(); // product, storage_location, warehouse_zone, inventory_lot
            $table->string('entity_id')->nullable();
            $table->string('severity')->default('info'); // info, low, medium, high
            $table->string('title');
            $table->text('explanation');
            $table->json('evidence_json')->nullable();
            $table->text('recommendation');
            $table->string('status')->default('new'); // new, reviewed, approved, rejected, resolved
            $table->timestamp('generated_at')->useCurrent();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('resolution_notes')->nullable();
            $table->timestamps();
        });

        // 14. Audit Logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('entity_type');
            $table->string('entity_id')->nullable();
            $table->json('before_json')->nullable();
            $table->json('after_json')->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });

        // 15. System Settings
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->json('value_json');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('ai_findings');
        Schema::dropIfExists('stocktake_items');
        Schema::dropIfExists('stocktake_sessions');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory_balances');
        Schema::dropIfExists('inventory_lots');
        Schema::dropIfExists('products');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('storage_locations');
        Schema::dropIfExists('warehouse_zones');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('personal_access_tokens');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn(['role_id', 'is_active']);
        });
        Schema::dropIfExists('roles');
    }
};
