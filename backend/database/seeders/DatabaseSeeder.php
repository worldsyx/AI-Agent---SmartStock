<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\Role;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseZone;
use App\Models\StorageLocation;
use App\Models\Vendor;
use App\Models\Product;
use App\Models\InventoryLot;
use App\Models\InventoryBalance;
use App\Models\InventoryTransaction;
use App\Models\StocktakeSession;
use App\Models\StocktakeItem;
use App\Models\AiFinding;
use App\Models\AuditLog;
use App\Models\SystemSetting;
use App\Models\ProductionOrder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Roles
        $roleAdmin = Role::create([
            'name' => 'admin',
            'display_name' => 'Administrator Sistem',
            'permissions' => ['*'],
        ]);

        $roleManager = Role::create([
            'name' => 'manager',
            'display_name' => 'Manajer / Kepala Gudang',
            'permissions' => ['approve_stocktake', 'approve_transfer', 'review_ai', 'view_reports', 'manage_settings'],
        ]);

        $roleOperator = Role::create([
            'name' => 'operator',
            'display_name' => 'Operator Gudang',
            'permissions' => ['record_receipt', 'record_issue', 'record_transfer', 'execute_stocktake'],
        ]);

        // 2. Users
        $admin = User::create([
            'name' => 'Admin Sistem',
            'email' => 'admin@smartstock.id',
            'password' => Hash::make('password'),
            'role_id' => $roleAdmin->id,
            'is_active' => true,
        ]);

        $manager = User::create([
            'name' => 'Budi Santoso',
            'email' => 'manager@smartstock.id',
            'password' => Hash::make('password'),
            'role_id' => $roleManager->id,
            'is_active' => true,
        ]);

        $operator = User::create([
            'name' => 'Andi Saputra',
            'email' => 'operator@smartstock.id',
            'password' => Hash::make('password'),
            'role_id' => $roleOperator->id,
            'is_active' => true,
        ]);

        // 3. Warehouses
        $whCkr = Warehouse::create([
            'code' => 'GDG-CKR',
            'name' => 'Gudang Pusat Cikarang',
            'address' => 'Kawasan Industri Jababeka, Cikarang',
            'is_active' => true,
        ]);

        $whSby = Warehouse::create([
            'code' => 'GDG-SBY',
            'name' => 'Gudang Surabaya',
            'address' => 'Rungkut Industri, Surabaya',
            'is_active' => true,
        ]);

        $whMdn = Warehouse::create([
            'code' => 'GDG-MDN',
            'name' => 'Gudang Medan Hub',
            'address' => 'KIM II, Medan',
            'is_active' => true,
        ]);

        // 4. Warehouse Zones
        $zoneA = WarehouseZone::create([
            'warehouse_id' => $whCkr->id,
            'code' => 'ZON-A',
            'name' => 'Zona A — Karton Masuk',
            'capacity_value' => 500,
            'capacity_unit' => 'Slot',
            'warning_threshold' => 80.00,
        ]);

        $zoneB = WarehouseZone::create([
            'warehouse_id' => $whCkr->id,
            'code' => 'ZON-B',
            'name' => 'Zona B — Paper Roll',
            'capacity_value' => 200,
            'capacity_unit' => 'Slot',
            'warning_threshold' => 80.00,
        ]);

        $zoneC = WarehouseZone::create([
            'warehouse_id' => $whSby->id,
            'code' => 'ZON-C',
            'name' => 'Zona C — Ekspor Karton',
            'capacity_value' => 300,
            'capacity_unit' => 'Slot',
            'warning_threshold' => 85.00,
        ]);

        // 5. Storage Locations
        // Racks in Zone A
        $rackA1 = StorageLocation::create([
            'zone_id' => $zoneA->id,
            'location_type' => 'rack',
            'code' => 'RAK-A1',
            'capacity_value' => 200,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);
        $slotA101 = StorageLocation::create([
            'zone_id' => $zoneA->id,
            'parent_location_id' => $rackA1->id,
            'location_type' => 'slot',
            'code' => 'A1-01',
            'capacity_value' => 100,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);
        $slotA102 = StorageLocation::create([
            'zone_id' => $zoneA->id,
            'parent_location_id' => $rackA1->id,
            'location_type' => 'slot',
            'code' => 'A1-02',
            'capacity_value' => 100,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);

        $rackA2 = StorageLocation::create([
            'zone_id' => $zoneA->id,
            'location_type' => 'rack',
            'code' => 'RAK-A2',
            'capacity_value' => 200,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);
        $slotA201 = StorageLocation::create([
            'zone_id' => $zoneA->id,
            'parent_location_id' => $rackA2->id,
            'location_type' => 'slot',
            'code' => 'A2-01',
            'capacity_value' => 100,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);

        // Racks in Zone B
        $rackB1 = StorageLocation::create([
            'zone_id' => $zoneB->id,
            'location_type' => 'rack',
            'code' => 'RAK-B1',
            'capacity_value' => 100,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);
        $slotB101 = StorageLocation::create([
            'zone_id' => $zoneB->id,
            'parent_location_id' => $rackB1->id,
            'location_type' => 'slot',
            'code' => 'B1-01',
            'capacity_value' => 50,
            'capacity_unit' => 'Slot',
            'is_active' => true,
        ]);

        // 6. Vendors
        $v1 = Vendor::create([
            'code' => 'VND-001',
            'name' => 'PT Sumber Pangan Utama',
            'contact_person' => 'Bambang Haryadi',
            'address' => 'Jakarta Utara',
            'category' => 'Karton & Packaging',
            'lead_time_days' => 2,
            'tier' => 'tier_1',
            'is_active' => true,
        ]);
        $v2 = Vendor::create([
            'code' => 'VND-002',
            'name' => 'CV Fast Logistics Hub',
            'contact_person' => 'Rina Anggraini',
            'address' => 'Cikarang',
            'category' => 'Karton & Packaging',
            'lead_time_days' => 1,
            'tier' => 'tier_1',
            'is_active' => true,
        ]);
        $v3 = Vendor::create([
            'code' => 'VND-003',
            'name' => 'Indofood Logistics Partner',
            'contact_person' => 'Darmawan Susilo',
            'address' => 'Surabaya',
            'category' => 'Paper Roll',
            'lead_time_days' => 3,
            'tier' => 'tier_1',
            'is_active' => true,
        ]);
        $v4 = Vendor::create([
            'code' => 'VND-004',
            'name' => 'PT Aroma Kimia Lestari',
            'contact_person' => 'Siti Fatimah',
            'address' => 'Tangerang',
            'category' => 'Paper Roll',
            'lead_time_days' => 4,
            'tier' => 'review',
            'is_active' => true,
        ]);

        // 7. Products
        // Kategori sesuai enum PRD Aturan 5:
        //   Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part
        // Max Storage Days sesuai PRD Aturan 1 & 2:
        //   Roll Kertas = 730 hari, Box = 180 hari, lainnya = NULL
        $p1 = Product::create([
            'sku'              => 'KRT-A3-001',
            'name'             => 'Karton Corrugated A3',
            'category'         => 'Sheet',           // PRD: Sheet (lembaran karton)
            'specification'    => '3-Ply, 300gsm, 420x297mm',
            'unit'             => 'Lembar',
            'vendor_id'        => $v2->id,
            'safety_stock'     => 1000,
            'max_storage_days' => null,              // Sheet: tidak ada batas simpan PRD
            'is_active'        => true,
        ]);

        $p2 = Product::create([
            'sku'              => 'KRT-B4-002',
            'name'             => 'Karton Duplex B4',
            'category'         => 'Box',             // PRD: Box (dus/kotak kemasan)
            'specification'    => '250gsm, 250x353mm',
            'unit'             => 'Lembar',
            'vendor_id'        => $v1->id,
            'safety_stock'     => 500,
            'max_storage_days' => 180,               // PRD Aturan 2: Box = 6 Bulan (180 hari)
            'is_active'        => true,
        ]);

        $p3 = Product::create([
            'sku'              => 'PPR-ROLL-50',
            'name'             => 'Paper Roll 50cm',
            'category'         => 'Roll Kertas',     // PRD: Roll Kertas
            'specification'    => '80gsm, ⌀50cm, L100m',
            'unit'             => 'Roll',
            'vendor_id'        => $v3->id,
            'safety_stock'     => 50,
            'max_storage_days' => 730,               // PRD Aturan 1: Roll Kertas = 24 Bulan (730 hari)
            'is_active'        => true,
        ]);

        $p4 = Product::create([
            'sku'              => 'KRT-KRAFT-M',
            'name'             => 'Karton Kraft Medium',
            'category'         => 'Box',             // PRD: Box (dus kraft)
            'specification'    => '2-Ply, 200gsm, 310x220mm',
            'unit'             => 'Lembar',
            'vendor_id'        => $v1->id,
            'safety_stock'     => 800,
            'max_storage_days' => 180,               // PRD Aturan 2: Box = 6 Bulan (180 hari)
            'is_active'        => true,
        ]);

        // Produk tambahan sesuai PRD Aturan 5 (Bahan Baku Pembantu & Spare Part)
        $p5 = Product::create([
            'sku'              => 'BBP-INKA-001',
            'name'             => 'Tinta Cetak Hitam (Ink)',
            'category'         => 'Bahan Baku Pembantu',
            'specification'    => 'Water-based, 1 Liter/kaleng',
            'unit'             => 'Kaleng',
            'vendor_id'        => $v4->id,
            'safety_stock'     => 20,
            'max_storage_days' => null,              // Bahan Baku Pembantu: tidak ada batas PRD
            'is_active'        => true,
        ]);

        $p6 = Product::create([
            'sku'              => 'SPP-BLADE-001',
            'name'             => 'Pisau Slitting Mesin',
            'category'         => 'Spare Part',
            'specification'    => 'HSS Circular Blade, 300mm',
            'unit'             => 'Pcs',
            'vendor_id'        => $v4->id,
            'safety_stock'     => 5,
            'max_storage_days' => null,              // Spare Part: tidak ada batas PRD
            'is_active'        => true,
        ]);

        // 8. Inventory Lots (with realistic dates for FIFO)
        // expiry_date dihitung: received_at + max_storage_days kategori produk (PRD Aturan 1 & 2)
        // batch_status dihitung berdasarkan PRD Metode 1 (H-30/H+0 logic)

        // LOT-2025-001: Sheet (KRT-A3-001), 120 hari, tidak ada batas simpan -> Active
        $lot1 = InventoryLot::create([
            'product_id'       => $p1->id,
            'vendor_id'        => $v2->id,
            'lot_code'         => 'LOT-2025-001',
            'received_at'      => now()->subDays(120),
            'initial_quantity' => 15000,
            'current_quantity' => 12450,
            'unit'             => 'Lembar',
            'condition_status' => 'good',
            'expiry_date'      => null,              // Sheet: tidak ada batas simpan PRD
            'batch_status'     => 'Active',
            'is_locked'        => false,
        ]);

        // LOT-2025-002: Box (KRT-B4-002), 85 hari dari batas 180 hari -> 95 hari sisa -> Active
        $lot2 = InventoryLot::create([
            'product_id'       => $p2->id,
            'vendor_id'        => $v1->id,
            'lot_code'         => 'LOT-2025-002',
            'received_at'      => now()->subDays(85),
            'initial_quantity' => 10000,
            'current_quantity' => 8720,
            'unit'             => 'Lembar',
            'condition_status' => 'good',
            'expiry_date'      => now()->subDays(85)->addDays(180)->toDateString(), // Box: +180 hari
            'batch_status'     => 'Active',          // 95 hari sisa, belum masuk H-30 warning
            'is_locked'        => false,
        ]);

        // LOT-2025-003: Roll Kertas (PPR-ROLL-50), 101 hari dari batas 730 hari -> Active
        // Tapi kondisi 'damp' -> tetap trigger finding kondisi
        $lot3 = InventoryLot::create([
            'product_id'       => $p3->id,
            'vendor_id'        => $v3->id,
            'lot_code'         => 'LOT-2025-003',
            'received_at'      => now()->subDays(101),
            'initial_quantity' => 100,
            'current_quantity' => 40,
            'unit'             => 'Roll',
            'condition_status' => 'damp',           // lembap -> trigger kondisi finding
            'expiry_date'      => now()->subDays(101)->addDays(730)->toDateString(), // Roll Kertas: +730 hari
            'batch_status'     => 'Active',          // 629 hari sisa, masih jauh dari kadaluarsa
            'is_locked'        => false,
        ]);

        // LOT-2025-004: Box (KRT-KRAFT-M), 45 hari dari batas 180 hari -> 135 hari sisa -> Active
        $lot4 = InventoryLot::create([
            'product_id'       => $p4->id,
            'vendor_id'        => $v1->id,
            'lot_code'         => 'LOT-2025-004',
            'received_at'      => now()->subDays(45),
            'initial_quantity' => 6000,
            'current_quantity' => 5100,
            'unit'             => 'Lembar',
            'condition_status' => 'good',
            'expiry_date'      => now()->subDays(45)->addDays(180)->toDateString(), // Box: +180 hari
            'batch_status'     => 'Active',
            'is_locked'        => false,
        ]);

        // LOT-2025-005: Box (KRT-B4-002) mendekati kadaluarsa -> Aging_Warning (H-20)
        $lot5 = InventoryLot::create([
            'product_id'       => $p2->id,
            'vendor_id'        => $v1->id,
            'lot_code'         => 'LOT-2025-005',
            'received_at'      => now()->subDays(160),  // 160 hari, sisa 20 hari dari 180
            'initial_quantity' => 5000,
            'current_quantity' => 3200,
            'unit'             => 'Lembar',
            'condition_status' => 'good',
            'expiry_date'      => now()->subDays(160)->addDays(180)->toDateString(), // kadaluarsa 20 hari lagi
            'batch_status'     => 'Aging_Warning',   // H-20: masuk zona peringatan PRD
            'is_locked'        => false,
        ]);

        // 9. Inventory Balances
        InventoryBalance::create([
            'product_id'  => $p1->id,
            'lot_id'      => $lot1->id,
            'location_id' => $slotA101->id,
            'quantity'    => 12450,
        ]);

        InventoryBalance::create([
            'product_id'  => $p2->id,
            'lot_id'      => $lot2->id,
            'location_id' => $slotA102->id,
            'quantity'    => 8720,
        ]);

        InventoryBalance::create([
            'product_id'  => $p3->id,
            'lot_id'      => $lot3->id,
            'location_id' => $slotB101->id,
            'quantity'    => 40,
        ]);

        InventoryBalance::create([
            'product_id'  => $p4->id,
            'lot_id'      => $lot4->id,
            'location_id' => $slotA201->id,
            'quantity'    => 5100,
        ]);

        // LOT-2025-005: Box mendekati kadaluarsa (Aging_Warning)
        InventoryBalance::create([
            'product_id'  => $p2->id,
            'lot_id'      => $lot5->id,
            'location_id' => $slotA201->id,
            'quantity'    => 3200,
        ]);

        // 10. Sample Transactions
        InventoryTransaction::create([
            'transaction_type' => 'receipt',
            'product_id' => $p1->id,
            'lot_id' => $lot1->id,
            'from_location_id' => null,
            'to_location_id' => $slotA101->id,
            'quantity' => 15000,
            'reference_code' => 'REC-2025-0001',
            'performed_by' => $operator->id,
            'approved_by' => $manager->id,
            'reason' => 'Penerimaan batch PO-8921 dari CV Fast Logistics',
            'created_at' => now()->subDays(120),
        ]);

        InventoryTransaction::create([
            'transaction_type' => 'issue',
            'product_id' => $p1->id,
            'lot_id' => $lot1->id,
            'from_location_id' => $slotA101->id,
            'to_location_id' => null,
            'quantity' => 2550,
            'reference_code' => 'ISS-2025-0001',
            'performed_by' => $operator->id,
            'approved_by' => $manager->id,
            'reason' => 'Pengiriman reguler ke lini packing',
            'created_at' => now()->subDays(10),
        ]);

        // 11. Stocktake Session
        $session = StocktakeSession::create([
            'code' => 'OPN-2025-001',
            'scope' => 'Zona A — Karton Masuk',
            'status' => 'submitted',
            'created_by' => $operator->id,
            'started_at' => now()->subDays(2),
            'submitted_at' => now()->subDays(1),
            'notes' => 'Pemeriksaan kuartal 3 untuk karton corrugated',
        ]);

        StocktakeItem::create([
            'session_id' => $session->id,
            'product_id' => $p1->id,
            'lot_id' => $lot1->id,
            'location_id' => $slotA101->id,
            'system_quantity' => 12450,
            'counted_quantity' => 12210,
            'variance' => -240,
            'recount_required' => true,
            'notes' => 'Selisih 240 lembar, terindikasi tertinggal di area transit',
        ]);

        // 12. AI Findings — disesuaikan dengan aturan PRD v1.0
        // PRD Metode 2: Discrepancy 1.93% < 2.0% -> Auto-Adjustment Approved (bukan high severity)
        AiFinding::create([
            'agent_type'    => 'stock_accuracy',
            'entity_type'   => 'product',
            'entity_id'     => (string) $p1->id,
            'severity'      => 'low',   // PRD: 1.93% <= 2.0% -> Auto-Adjustment Approved
            'title'         => 'Selisih Stok Terdeteksi — KRT-A3-001 (-240 unit, 1.93%)',
            'explanation'   => 'Sistem mencatat 12.450 unit di lokasi A1-01, namun hasil hitungan fisik menunjukkan 12.210 unit (selisih -240 unit atau 1.93%). Batas toleransi PRD: 2.0%. Keputusan AI: Auto-Adjustment Approved (dalam batas toleransi PRD 2%).',
            'evidence_json' => [
                'sku'                 => 'KRT-A3-001',
                'location'            => 'A1-01',
                'system_quantity'     => 12450,
                'counted_quantity'    => 12210,
                'variance'            => -240,
                'variance_percentage' => 1.93,
                'tolerance_percentage' => 2.0,
                'prd_tolerance_pct'   => 2.0,
                'action'              => 'auto_adjustment_approved',
                'transaction_locked'  => false,
            ],
            'recommendation' => 'Lakukan hitung ulang konfirmasi pada slot A1-01. Jika angka terkonfirmasi, penyesuaian otomatis dapat disetujui karena masih dalam batas toleransi PRD 2.0%.',
            'status'         => 'new',
            'generated_at'   => now()->subHours(4),
        ]);

        // Contoh Anomaly: >2.0% -> Anomaly Detected (kunci transaksi)
        AiFinding::create([
            'agent_type'    => 'stock_accuracy',
            'entity_type'   => 'product',
            'entity_id'     => (string) $p2->id,
            'severity'      => 'high',   // PRD: >2.0% -> ANOMALY DETECTED
            'title'         => 'ANOMALI Stok Terdeteksi — KRT-B4-002 (-320 unit, 3.67%)',
            'explanation'   => 'Sistem mencatat 8.720 unit di lokasi A1-02, namun hasil hitungan fisik menunjukkan 8.400 unit (selisih -320 unit atau 3.67%). Batas toleransi PRD: 2.0%. Keputusan AI: ANOMALY DETECTED — Transaksi Dikunci, Alert ke Audit Manager.',
            'evidence_json' => [
                'sku'                 => 'KRT-B4-002',
                'location'            => 'A1-02',
                'system_quantity'     => 8720,
                'counted_quantity'    => 8400,
                'variance'            => -320,
                'variance_percentage' => 3.67,
                'tolerance_percentage' => 2.0,
                'prd_tolerance_pct'   => 2.0,
                'action'              => 'anomaly_detected',
                'transaction_locked'  => true,
            ],
            'recommendation' => 'TINDAKAN WAJIB: Kunci transaksi terkait produk KRT-B4-002 di lokasi A1-02. Kirim notifikasi ke Audit Manager untuk investigasi mendalam. Lakukan hitung ulang (recount) dan periksa log mutasi 48 jam terakhir.',
            'status'         => 'new',
            'generated_at'   => now()->subHours(2),
        ]);

        AiFinding::create([
            'agent_type'    => 'capacity',
            'entity_type'   => 'warehouse_zone',
            'entity_id'     => (string) $zoneC->id,
            'severity'      => 'high',
            'title'         => 'Peringatan Kapasitas Kritis — ZON-C (98.3% Terisi)',
            'explanation'   => 'Kapasitas Zona C — Ekspor Karton telah mencapai 98.3% (295/300 slot terpakai). Zona berisiko macet (bottleneck).',
            'evidence_json' => [
                'zone_code'        => 'ZON-C',
                'capacity'         => 300,
                'used'             => 295,
                'occupancy_pct'    => 98.3,
                'threshold_critical' => 90,
            ],
            'recommendation' => 'Prioritaskan pengeluaran stok di ZON-C atau alihkan jadwal penerimaan karton ke zona penyangga.',
            'status'         => 'new',
            'generated_at'   => now()->subHours(6),
        ]);

        // PRD Metode 1: Roll Kertas 101 hari dari 730 hari -> kondisi damp (bukan expired)
        AiFinding::create([
            'agent_type'    => 'aging_fifo',
            'entity_type'   => 'inventory_lot',
            'entity_id'     => (string) $lot3->id,
            'severity'      => 'medium',  // Kondisi damp, tapi jauh dari expiry (629 hari sisa)
            'title'         => 'Peringatan Kondisi Fisik — PPR-ROLL-50 (LOT-2025-003) [Roll Kertas]',
            'explanation'   => 'Lot LOT-2025-003 (PPR-ROLL-50) kategori Roll Kertas di slot B1-01 sebanyak 40 Roll telah disimpan 101 hari. Batas simpan PRD Roll Kertas: 730 hari (629 hari sisa). Kondisi fisik terdeteksi lembap (damp) — potensi penurunan mutu.',
            'evidence_json' => [
                'lot_code'         => 'LOT-2025-003',
                'sku'              => 'PPR-ROLL-50',
                'category'         => 'Roll Kertas',
                'days_in_warehouse' => 101,
                'max_allowed_days' => 730,
                'days_to_expiry'   => 629,
                'batch_status'     => 'Active',
                'condition'        => 'damp',
                'quantity'         => 40,
                'location'         => 'B1-01',
            ],
            'recommendation' => 'Lakukan inspeksi fisik oleh operator di slot B1-01. Prioritaskan sebagai batch pengeluaran terdepan (FIFO) untuk mencegah kerusakan lebih lanjut.',
            'status'         => 'reviewed',
            'generated_at'   => now()->subHours(12),
        ]);

        // PRD Metode 1: Box LOT-2025-005 -> Aging_Warning H-20 (20 hari menuju kadaluarsa)
        AiFinding::create([
            'agent_type'    => 'aging_fifo',
            'entity_type'   => 'inventory_lot',
            'entity_id'     => (string) $lot5->id,
            'severity'      => 'medium',
            'title'         => 'Peringatan Aging H-20 — KRT-B4-002 (LOT-2025-005) [Box]',
            'explanation'   => 'Lot LOT-2025-005 (KRT-B4-002) kategori Box di slot A2-01 mendekati batas simpan dalam 20 hari (batas PRD Box: 180 hari, saat ini 160 hari). Status: Aging_Warning.',
            'evidence_json' => [
                'lot_code'         => 'LOT-2025-005',
                'sku'              => 'KRT-B4-002',
                'category'         => 'Box',
                'days_in_warehouse' => 160,
                'max_allowed_days' => 180,
                'days_to_expiry'   => 20,
                'batch_status'     => 'Aging_Warning',
                'condition'        => 'good',
                'quantity'         => 3200,
                'location'         => 'A2-01',
            ],
            'recommendation' => 'Lot LOT-2025-005 mendekati kadaluarsa dalam 20 hari. Prioritaskan pengeluaran segera (FIFO). Lakukan inspeksi fisik di slot A2-01.',
            'status'         => 'new',
            'generated_at'   => now()->subHours(1),
        ]);

        // 13. Audit Log
        AuditLog::create([
            'user_id'     => $admin->id,
            'action'      => 'SYSTEM_INIT',
            'entity_type' => 'system',
            'entity_id'   => '1',
            'before_json' => null,
            'after_json'  => ['version' => '3.1.0', 'prd_version' => '1.0', 'environment' => 'production_ready'],
            'reason'      => 'Inisialisasi sistem Smart Warehouse — PRD Pemrosesan Data AI v1.0',
            'created_at'  => now(),
        ]);

        // 14. System Settings — sesuai PRD v1.0
        SystemSetting::set('warning_capacity_threshold', 80, $admin->id);
        SystemSetting::set('critical_capacity_threshold', 90, $admin->id);
        // PRD Aturan 3: batas toleransi discrepancy MAKSIMAL 2% (bukan 1%)
        SystemSetting::set('stocktake_discrepancy_tolerance_pct', 2.0, $admin->id);
        // PRD Aturan 1 & 2: batas simpan per kategori (tidak lagi flat 90 hari)
        SystemSetting::set('max_storage_days_roll_kertas', 730, $admin->id);  // 24 Bulan
        SystemSetting::set('max_storage_days_box', 180, $admin->id);          // 6 Bulan
        // Warning H-30 sebelum expiry (PRD Metode 1)
        SystemSetting::set('aging_warning_days_before_expiry', 30, $admin->id);
        SystemSetting::set('ai_service_url', 'http://localhost:5000', $admin->id);

        // 15. Sample Production Orders (PRD Skema - Entitas Production_Orders)
        // PO dengan status valid -> Work Order diizinkan
        $po1 = ProductionOrder::create([
            'po_number'       => 'PO-2026-001',
            'customer_id'     => 'CUST-PT-INDO',
            'item_id'         => 'KRT-A3-001',
            'order_qty'       => 10000,
            'prev_production' => 9500,       // referensi historis 1x sebelumnya (PRD Aturan 4)
            'po_status'       => 'VALID',
            'status_produksi' => 'Approved', // Work Order diizinkan
            'status_kirim'    => 'Pending',
            'materials_used_json' => null,
            'notes'           => 'Order reguler kuartal 4 — PT Indofood',
            'created_by'      => $manager->id,
            'approved_by'     => $manager->id,
            'approved_at'     => now()->subDays(1),
        ]);

        // PO tanpa PO Number -> Blocked_No_PO (PRD Aturan 6)
        $po2 = ProductionOrder::create([
            'po_number'       => null,       // TANPA PO -> harus diblokir
            'customer_id'     => 'CUST-WALK-IN',
            'item_id'         => 'PPR-ROLL-50',
            'order_qty'       => 500,
            'prev_production' => 480,
            'po_status'       => null,
            'status_produksi' => 'Blocked_No_PO', // Diblokir karena tidak ada PO
            'status_kirim'    => 'Pending',
            'materials_used_json' => null,
            'notes'           => 'Permintaan mendadak tanpa PO — DIBLOKIR sistem',
            'created_by'      => $operator->id,
        ]);

        // PO selesai -> trigger Immediate Dispatch (PRD Aturan 6)
        $po3 = ProductionOrder::create([
            'po_number'       => 'PO-2026-000',
            'customer_id'     => 'CUST-PT-SARA',
            'item_id'         => 'KRT-B4-002',
            'order_qty'       => 8000,
            'prev_production' => 7800,
            'po_status'       => 'VALID',
            'status_produksi' => 'Completed', // Selesai -> harus langsung dikirim
            'status_kirim'    => 'Ready_To_Ship',
            'actual_output'   => 7950,
            'materials_used_json' => [        // data untuk benchmarking PO berikutnya
                'Roll Kertas'        => ['qty' => 380, 'unit' => 'Roll'],
                'Sheet'              => ['qty' => 7800, 'unit' => 'Lembar'],
                'Box'                => ['qty' => 160, 'unit' => 'Box'],
                'Bahan Baku Pembantu' => ['qty' => 40, 'unit' => 'Kg'],
                'Spare Part'         => ['qty' => 1, 'unit' => 'Pcs'],
            ],
            'notes'           => 'Produksi selesai — siap dikirim segera (Immediate Dispatch)',
            'created_by'      => $manager->id,
            'approved_by'     => $manager->id,
            'approved_at'     => now()->subDays(5),
            'completed_at'    => now()->subHours(2),
        ]);

        // AI Finding untuk PO-Gated Workflow
        AiFinding::create([
            'agent_type'    => 'po_gated_workflow',
            'entity_type'   => 'production_order',
            'entity_id'     => 'CUST-WALK-IN',
            'severity'      => 'high',
            'title'         => 'Work Order DIBLOKIR — Paper Roll 50cm [TANPA PO]',
            'explanation'   => 'Permintaan produksi untuk PPR-ROLL-50 (qty: 500) DITOLAK karena: PO Number tidak ditemukan (NULL). Sesuai PRD Aturan 6 (Strictly By-Order), alokasi bahan baku dari gudang juga DIBLOKIR.',
            'evidence_json' => [
                'po_number'                => null,
                'po_status'                => null,
                'customer_id'              => 'CUST-WALK-IN',
                'item_id'                  => 'PPR-ROLL-50',
                'order_qty'                => 500,
                'work_order_allowed'       => false,
                'block_reason'             => 'PO Number tidak ditemukan (NULL)',
                'status_produksi'          => 'Blocked_No_PO',
                'warehouse_allocation_blocked' => true,
            ],
            'recommendation' => 'Hentikan segala persiapan produksi. Minta tim Sales/Admin untuk menerbitkan PO yang valid terlebih dahulu.',
            'status'         => 'new',
            'generated_at'   => now()->subMinutes(30),
        ]);

        AiFinding::create([
            'agent_type'    => 'po_gated_workflow',
            'entity_type'   => 'production_order',
            'entity_id'     => 'PO-2026-000',
            'severity'      => 'high',
            'title'         => 'IMMEDIATE DISPATCH — PO-2026-000 [KRT-B4-002] Siap Kirim!',
            'explanation'   => 'Produksi PO-2026-000 untuk Karton Duplex B4 (qty: 8.000) telah selesai. Sesuai PRD Aturan 6 (Immediate Dispatch), pengiriman harus dilakukan SECEPATNYA. Status kirim: Ready_To_Ship.',
            'evidence_json' => [
                'po_number'              => 'PO-2026-000',
                'customer_id'            => 'CUST-PT-SARA',
                'item_id'                => 'KRT-B4-002',
                'order_qty'              => 8000,
                'status_produksi'        => 'Completed',
                'status_kirim'           => 'Ready_To_Ship',
                'shipping_action_required' => true,
            ],
            'recommendation' => 'SEGERA LAKUKAN PENGIRIMAN: Jadwalkan pengiriman ke CUST-PT-SARA dalam waktu sesingkat mungkin. Notifikasi logistik telah dipicu oleh sistem AI.',
            'status'         => 'new',
            'generated_at'   => now()->subHours(1),
        ]);
    }
}
