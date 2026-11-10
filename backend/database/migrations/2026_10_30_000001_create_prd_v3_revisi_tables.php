<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. AI Configurations (PRD 11.2)
        if (!Schema::hasTable('ai_configurations')) {
            Schema::create('ai_configurations', function (Blueprint $table) {
                $table->id();
                $table->string('config_key')->unique();
                $table->json('config_value');
                $table->string('scope')->default('global'); // global, warehouse, manager
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 2. AI Chat Sessions (PRD 11.3)
        if (!Schema::hasTable('ai_chat_sessions')) {
            Schema::create('ai_chat_sessions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('title')->default('Sesi Konsultasi AI');
                $table->timestamps();
            });
        }

        // 3. AI Chat Messages (PRD 11.4)
        if (!Schema::hasTable('ai_chat_messages')) {
            Schema::create('ai_chat_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('session_id')->constrained('ai_chat_sessions')->cascadeOnDelete();
                $table->string('role'); // user, assistant, tool, system
                $table->text('content');
                $table->string('tool_name')->nullable();
                $table->json('tool_result')->nullable();
                $table->timestamps();
            });
        }

        // 4. Daily Warehouse Reports (PRD 11.5)
        if (!Schema::hasTable('daily_warehouse_reports')) {
            Schema::create('daily_warehouse_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
                $table->date('report_date');
                $table->timestamp('period_start')->nullable();
                $table->timestamp('period_end')->nullable();
                $table->timestamp('generated_at')->useCurrent();
                $table->string('status')->default('completed'); // queued, processing, completed, failed
                $table->json('summary_json');
                $table->text('error_message')->nullable();
                $table->timestamps();
                $table->index(['warehouse_id', 'report_date']);
            });
        }

        // 5. Notifications (PRD 11.6)
        if (!Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('type'); // low_stock, aging, discrepancy, report, general
                $table->string('title');
                $table->text('message');
                $table->json('data_json')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }

        // 6. QR Codes (PRD 11.7)
        if (!Schema::hasTable('qr_codes')) {
            Schema::create('qr_codes', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('entity_type'); // product, lot, location
                $table->unsignedBigInteger('entity_id');
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->index(['entity_type', 'entity_id']);
            });
        }

        // 7. User Preferences (PRD 11.1)
        if (!Schema::hasTable('user_preferences')) {
            Schema::create('user_preferences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('preference_key');
                $table->json('preference_value');
                $table->timestamps();
                $table->unique(['user_id', 'preference_key']);
            });
        }

        // 8. Update inventory_lots (PRD 11.9)
        Schema::table('inventory_lots', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_lots', 'expiry_date')) {
                $table->date('expiry_date')->nullable();
            }
            if (!Schema::hasColumn('inventory_lots', 'condition_notes')) {
                $table->text('condition_notes')->nullable();
            }
            if (!Schema::hasColumn('inventory_lots', 'placed_at')) {
                $table->timestamp('placed_at')->nullable();
            }
        });

        // 9. Update inventory_transactions (PRD 11.8)
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_transactions', 'transaction_number')) {
                $table->string('transaction_number')->nullable()->unique();
            }
            if (!Schema::hasColumn('inventory_transactions', 'source')) {
                $table->string('source')->default('manual'); // manual, qr
            }
            if (!Schema::hasColumn('inventory_transactions', 'metadata_json')) {
                $table->json('metadata_json')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_preferences');
        Schema::dropIfExists('qr_codes');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('daily_warehouse_reports');
        Schema::dropIfExists('ai_chat_messages');
        Schema::dropIfExists('ai_chat_sessions');
        Schema::dropIfExists('ai_configurations');

        Schema::table('inventory_lots', function (Blueprint $table) {
            $table->dropColumn(['expiry_date', 'condition_notes', 'placed_at']);
        });

        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropColumn(['transaction_number', 'source', 'metadata_json']);
        });
    }
};
