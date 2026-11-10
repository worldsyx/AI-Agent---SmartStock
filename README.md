# SmartStock PRO — Smart Warehouse Karton & Paper Roll

Sistem Manajemen Pergudangan Cerdas (Smart Warehouse) berbasis web untuk inventaris karton (*corrugated*, *duplex*, *kraft*) dan *paper roll*, dilengkapi 4 AI Analysis Agents deterministik, jejak audit transaksi atomik, dan antarmuka modern yang disesuaikan secara presisi dari aset desain.

---

## 1. Arsitektur Sistem

- **Frontend**: React.js 18 + Vite + Tailwind CSS + Lucide React + Recharts
- **Backend API**: PHP Laravel 12 (REST API `/api/v1`, RBAC, Idempotency, Database Transactions, Locking)
- **Database**: SQLite (Out-of-the-box local ACID transaction) & PostgreSQL compatible
- **AI Microservice**: Python 3.11 Flask (Port 5000: Stock Accuracy, Slotting, Capacity, Aging FIFO)

---

## 2. Kredensial Akun Bawaan (Demo)

| Role | Email | Password | Wewenang Utama |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@smartstock.id` | `password` | Kelola master barang, lokasi gudang, vendor, pengguna, & konfigurasi parameter sistem |
| **Manajer / Kepala Gudang** | `manager@smartstock.id` | `password` | Otorisasi PO, persetujuan penyesuaian stok, audit log, review & approve rekomendasi AI |
| **Operator Gudang** | `operator@smartstock.id` | `password` | Scan barcode/QR, catat penerimaan (receipt), pengeluaran (issue - FIFO), transfer, dan opname fisik |

---

## 3. Fitur Utama Sesuai PRD & Aset Desain

1. **Command Center Dashboard** (`asset desain/SmartStock Pro - Command Center Dashboard.png`):
   - Metrik *Smart Inventory* (total nilai Rp 1.489.500.000, 4.820 SKU aktif, 98.4% optimal).
   - Bar chart tren pergerakan barang bulanan & indikator kapasitas 84%.
   - Estimasi modal pengadaan dengan grafik gelombang likuiditas & sisa pagu anggaran.
   - Tabel riwayat pergerakan stok real-time dengan deteksi pola anomali.
2. **Manajemen Dokumen & Otorisasi Purchase Order** (`asset desain/SmartStock Pro - Dokumen PO & Persetujuan.png`):
   - Engine 1-Click otorisasi batch (Rp 168.450.000 siap rilis).
   - Metrik alur status PO (Siap Setujui, Spv, Transit, Selesai) & progress pagu anggaran.
   - Tabel dokumen PO interaktif dengan termin bayar dan otorisasi satu klik.
3. **Direktori Mitra & Performa Vendor** (`asset desain/SmartStock Pro - Kontak Vendor & Supplier.png`):
   - Kepatuhan SLA mitra 98.2%, on-time delivery 96.8%, rata-rata lead time 3.2 hari.
   - Tabel direktori vendor kemasan karton & paper roll, rating tier kemitraan, dan riwayat tagihan.
4. **Laporan Kinerja & Analisis Arus Kas** (`asset desain/SmartStock Pro - Laporan & Analisis.png`):
   - Margin kotor rata-rata 32.4%, grafik tren arus kas masuk mingguan, cadangan likuiditas Rp 520 Juta.
   - Tabel omzet dan performa kategori logistik dengan tombol ekspor laporan.
5. **Riwayat Stok & Audit Keselamatan** (`asset desain/SmartStock Pro - Riwayat Stok & Audit.png`):
   - Safety stock compliance 98.4%, silinder grafik mutasi harian, akurasi opname 99.1%.
   - Tabel log mutasi pergerakan barang masuk/keluar dengan kuantitas berwarna & status verifikasi.
6. **Operasional Gudang Lengkap (PRD Core Modules)**:
   - **Scan & Transaksi**: Penerimaan barang atomik, pengeluaran FIFO terproteksi, dan transfer antar-lokasi.
   - **Peta Lokasi Gudang**: Visualisasi hierarki Gudang › Zona › Rak › Slot dengan okupansi kapasitas.
   - **Stock Opname & Rekonsiliasi**: Sesi opname, perhitungan varians fisik vs sistem otomatis, dan alur persetujuan bertingkat.
   - **AI Intelligence Center**: 4 Agent terintegrasi (*Stock Accuracy*, *Slotting Optimization*, *Capacity & Overstock*, *Carton Aging & FIFO*) dengan rincian bukti (*evidence JSON*) dan penjelasan deterministik.
   - **Pengaturan Parameter Bisnis**: Konfigurasi ambang kapasitas (warning/critical), batas umur stok, dan URL service AI.

---

## 4. Cara Menjalankan Aplikasi

### Cara 1: Satu Klik untuk Menjalankan Semua Service (Rekomendasi)
Cukup klik dua kali file **`start_all.bat`** di folder root proyek ini (`cex`).
File ini akan otomatis membuka 3 jendela terminal terpisah untuk:
1. **Backend Laravel API** di `http://127.0.0.1:8000`
2. **AI Data Service (Flask)** di `http://127.0.0.1:5000`
3. **Frontend React UI** di `http://localhost:5173`

---

### Cara 2: Menjalankan Masing-Masing Layanan Secara Manual

#### A. Menjalankan Backend Laravel API (Port 8000)
Klik dua kali **`start_backend.bat`** atau jalankan perintah:
```powershell
cd backend
php artisan serve --port=8000
```
API endpoint aktif di: `http://localhost:8000/api/v1`

#### B. Menjalankan Python Flask AI Service (Port 5000)
Klik dua kali **`start_ai.bat`** atau jalankan perintah:
```powershell
cd ai-service
python wsgi.py
```
Microservice AI aktif di: `http://localhost:5000` (Health check: `http://localhost:5000/health`)

#### C. Menjalankan Frontend React Vite (Port 5173)
Klik dua kali **`start_frontend.bat`** atau jalankan perintah:
```powershell
cd frontend
npm run dev
```
Buka browser di: **`http://localhost:5173`**

---

## 5. Menjalankan Pengujian Otomatis (Acceptance Test)

Tersedia automated integration test suite yang memverifikasi seluruh aturan bisnis PRD:
```powershell
cd backend
php test_warehouse_system.php
```

**Cakupan Verifikasi (100% Passed):**
1. `[TEST 1]` Autentikasi token bearer & verifikasi RBAC.
2. `[TEST 2]` Transaksi penerimaan stok atomik (Receipt) dan mutasi saldo.
3. `[TEST 3]` Idempotency key: Pengiriman ulang transaksi identik tidak menduplikasi saldo.
4. `[TEST 4]` Proteksi saldo negatif: Pengeluaran melebihi saldo ditolak dengan status HTTP 422.
5. `[TEST 5]` Otorisasi Stock Opname: Operator dilarang menyetujui (403), Manajer berwenang menyetujui (200).
6. `[TEST 6]` Integritas Model & Kontrak Temuan AI Agent (Explainable AI & Evidence Data).

---

## 6. Struktur Direktori Proyek

```
cex/
├── frontend/               # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── app/            # Providers, router, App.jsx
│   │   ├── components/     # Reusable UI library (Button, Modal, Card, Table, Badge)
│   │   ├── features/       # 14 Modul Halaman sesuai PRD & Desain Aset
│   │   ├── services/       # Centralized apiClient & api endpoints
│   │   └── utils/          # Formatter IDR, datetime, status resolvers
│   └── dist/               # Production build ready
├── backend/                # Laravel 12 REST API Service
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/ # Auth, Transaction, Stocktake, AI, Report, Master
│   │   ├── Http/Middleware/         # Token Auth & RBAC
│   │   └── Models/                  # Eloquent models dengan relasi lengkap
│   ├── database/migrations/         # Skema 15 tabel pergudangan karton
│   ├── database/seeders/            # Seeder data realistis multi-gudang
│   └── test_warehouse_system.php    # Automated acceptance test suite
├── ai-service/             # Python Flask AI/Data Microservice
│   ├── app/agents/         # 4 Rule Engine Agents (Stock Accuracy, Slotting, Capacity, FIFO)
│   ├── app/routes.py       # Endpoint analisis internal
│   └── wsgi.py             # Server runner port 5000
└── asset desain/           # 5 Desain mockup asli dari pengguna
```
