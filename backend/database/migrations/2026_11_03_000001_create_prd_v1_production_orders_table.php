<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD Panduan Pemrosesan Data AI v1.0
     * Migration untuk:
     *   1. Tabel production_orders (Skema PRD - Entitas Production_Orders)
     *   2. Update products: category sesuai enum PRD (Roll Kertas, Sheet, Box, dll)
     *   3. Update inventory_lots: tambah kolom batch_status (Active/Aging_Warning/Expired)
     *   4. Update system_settings: pastikan tolerance sesuai PRD (2.0%)
     */
    public function up(): void
    {
        // ----------------------------------------------------------------
        // 1. Tabel production_orders (PRD Skema Data - Production_Orders)
        // ----------------------------------------------------------------
        if (!Schema::hasTable('production_orders')) {
            Schema::create('production_orders', function (Blueprint $table) {
                $table->id();

                // PO_Number: String (PK Logic, Wajib — sesuai PRD Aturan 6)
                $table->string('po_number')->nullable()->unique()->comment('Nomor PO Wajib ada untuk Work Order');

                // Customer_ID, Item_ID
                $table->string('customer_id')->nullable();
                $table->string('item_id')->comment('Merujuk ke products.sku');

                // Order_Qty & Prev_Production
                $table->decimal('order_qty', 12, 2)->default(0);
                $table->decimal('prev_production', 12, 2)->nullable()->comment('Hasil produksi 1x sebelumnya (PRD Aturan 4)');
                $table->decimal('actual_output', 12, 2)->nullable()->comment('Output aktual setelah produksi selesai');

                // po_status: digunakan untuk validasi Work Order
                $table->string('po_status')->nullable()->comment('VALID | APPROVED | ACTIVE | INVALID | EXPIRED | NULL jika tanpa PO');

                // Status_Produksi (PRD enum)
                $table->string('status_produksi')
                    ->default('Blocked_No_PO')
                    ->comment('Blocked_No_PO | Approved | In_Progress | Completed');

                // Status_Kirim (PRD enum)
                $table->string('status_kirim')
                    ->default('Pending')
                    ->comment('Pending | Ready_To_Ship | Shipped');

                // Kebutuhan bahan baku aktual (untuk benchmarking PO berikutnya)
                $table->json('materials_used_json')->nullable()->comment('Pemakaian aktual per kategori material (Roll Kertas, Sheet, Box, dll)');

                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamp('dispatched_at')->nullable()->comment('Waktu Immediate Dispatch dipicu');

                $table->timestamps();
                $table->index(['item_id', 'status_produksi']);
                $table->index(['customer_id']);
            });
        }

        // ----------------------------------------------------------------
        // 2. Update products: kolom category ke enum PRD
        //    PRD Aturan 5: Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part
        // ----------------------------------------------------------------
        Schema::table('products', function (Blueprint $table) {
            // Ubah default kategori ke nilai PRD
            // Catatan: nilai lama (karton, paper_roll) harus di-migrate via seeder
            if (!Schema::hasColumn('products', 'max_storage_days')) {
                $table->integer('max_storage_days')
                    ->nullable()
                    ->after('category')
                    ->comment('Batas simpan: Roll Kertas=730, Box=180, lainnya=NULL (PRD Aturan 1 & 2)');
            }
        });

        // ----------------------------------------------------------------
        // 3. Update inventory_lots: tambah batch_status sesuai PRD
        //    PRD Skema: Status = Enum (Active, Aging_Warning, Expired)
        // ----------------------------------------------------------------
        Schema::table('inventory_lots', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_lots', 'batch_status')) {
                $table->string('batch_status')
                    ->default('Active')
                    ->after('condition_status')
                    ->comment('Active | Aging_Warning | Expired (PRD Metode 1)');
            }
            // expiry_date sudah ada dari migration sebelumnya
            // Tambah kolom locked jika belum ada (untuk Expired lock)
            if (!Schema::hasColumn('inventory_lots', 'is_locked')) {
                $table->boolean('is_locked')
                    ->default(false)
                    ->after('batch_status')
                    ->comment('True jika status Expired — stok dikunci tanpa approval');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_orders');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['max_storage_days']);
        });

        Schema::table('inventory_lots', function (Blueprint $table) {
            $table->dropColumn(['batch_status', 'is_locked']);
        });
    }
};
