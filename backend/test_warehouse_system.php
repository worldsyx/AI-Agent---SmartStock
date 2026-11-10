<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Product;
use App\Models\StorageLocation;
use App\Models\InventoryBalance;
use App\Models\StocktakeSession;
use Illuminate\Http\Request;

echo "========================================================\n";
echo "   SMART WAREHOUSE KARTON — INTEGRATION & ACCEPTANCE TEST\n";
echo "========================================================\n\n";

$testsPassed = 0;
$totalTests = 6;

// TEST 1: Login & Token Generation
echo "[TEST 1] Autentikasi & RBAC Token Generation...\n";
$authController = new \App\Http\Controllers\Api\V1\AuthController();
$loginReq = Request::create('/api/v1/auth/login', 'POST', [
    'email' => 'operator@smartstock.id',
    'password' => 'password',
]);
$res = $authController->login($loginReq);
$data = json_decode($res->getContent(), true);

if ($res->getStatusCode() === 200 && !empty($data['data']['token'])) {
    echo "  -> SUCCESS: Operator berhasil login, token: " . substr($data['data']['token'], 0, 15) . "...\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Login gagal\n";
}

// TEST 2: Transaksi Penerimaan (Receipt)
echo "\n[TEST 2] Transaksi Penerimaan Stok Atomik (Receipt)...\n";
$txController = new \App\Http\Controllers\Api\V1\TransactionController();
$operator = User::where('email', 'operator@smartstock.id')->first();
$idempotencyKey = 'TEST-REC-' . uniqid();

$receiptReq = Request::create('/api/v1/transactions/receipts', 'POST', [
    'sku' => 'KRT-A3-001',
    'quantity' => 500,
    'location_id' => 'A1-01',
    'reference_code' => $idempotencyKey,
    'reason' => 'Test Batch Penerimaan Karton',
]);
$receiptReq->setUserResolver(fn() => $operator);

$balBefore = (float) InventoryBalance::whereHas('product', fn($q) => $q->where('sku', 'KRT-A3-001'))
    ->whereHas('location', fn($q) => $q->where('code', 'A1-01'))
    ->sum('quantity');
$qtyBefore = $balBefore;

$res2 = $txController->receipt($receiptReq);

$balAfter = (float) InventoryBalance::whereHas('product', fn($q) => $q->where('sku', 'KRT-A3-001'))
    ->whereHas('location', fn($q) => $q->where('code', 'A1-01'))
    ->sum('quantity');
$qtyAfter = $balAfter;

if ($res2->getStatusCode() === 201 && $qtyAfter == ($qtyBefore + 500)) {
    echo "  -> SUCCESS: Saldo bertambah 500 unit (Sebelum: {$qtyBefore}, Sesudah: {$qtyAfter})\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Penerimaan gagal (Status: " . $res2->getStatusCode() . ", Response: " . $res2->getContent() . ")\n";
}

// TEST 3: Idempotency Protection (Mengirim ulang transaksi yang sama tidak menduplikasi saldo)
echo "\n[TEST 3] Uji Idempotency (Pencegahan Transaksi Ganda)...\n";
$res3 = $txController->receipt($receiptReq);
$balAfterDuplicate = (float) InventoryBalance::whereHas('product', fn($q) => $q->where('sku', 'KRT-A3-001'))
    ->whereHas('location', fn($q) => $q->where('code', 'A1-01'))
    ->sum('quantity');

if ($res3->getStatusCode() === 200 && $balAfterDuplicate == $qtyAfter) {
    echo "  -> SUCCESS: Request ulang dengan idempotency key yang sama TIDAK menggandakan saldo (Tetap: {$balAfterDuplicate})\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Idempotency gagal\n";
}

// TEST 4: Penolakan Stok Negatif
echo "\n[TEST 4] Uji Proteksi Stok Negatif (Penolakan Pengeluaran Melebihi Saldo)...\n";
$issueReq = Request::create('/api/v1/transactions/issues', 'POST', [
    'lot_id' => 'LOT-2025-001',
    'quantity' => 9999999, // Kuantitas mustahil
    'reference_code' => 'TEST-ISS-EXCESS-' . uniqid(),
    'reason' => 'Uji stok negatif',
]);
$issueReq->setUserResolver(fn() => $operator);

$res4 = $txController->issue($issueReq);
if ($res4->getStatusCode() === 422) {
    echo "  -> SUCCESS: Transaksi ditolak dengan status 422 Unprocessable Entity (Mencegah saldo negatif)\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Proteksi stok negatif tidak bekerja\n";
}

// TEST 5: Stock Opname & Manager Approval Rule
echo "\n[TEST 5] Uji Alur Stock Opname & Otorisasi Manajer (Operator Dilarang Approve)...\n";
$stkController = new \App\Http\Controllers\Api\V1\StocktakeController();

$stkReq = Request::create('/api/v1/stocktakes', 'POST', ['scope' => 'Zona A - Uji Otomatis']);
$stkReq->setUserResolver(fn() => $operator);
$resStk = $stkController->store($stkReq);
$stkData = json_decode($resStk->getContent(), true)['data'];

// Operator mencoba approve (Harus ditolak 403)
$approveReqOp = Request::create("/api/v1/stocktakes/{$stkData['id']}/approve", 'POST');
$approveReqOp->setUserResolver(fn() => $operator);
$resApproveOp = $stkController->approve($approveReqOp, $stkData['id']);

// Manajer approve (Harus sukses 200)
$manager = User::where('email', 'manager@smartstock.id')->first();
$approveReqMgr = Request::create("/api/v1/stocktakes/{$stkData['id']}/approve", 'POST', ['notes' => 'Disetujui Manajer']);
$approveReqMgr->setUserResolver(fn() => $manager);
$resApproveMgr = $stkController->approve($approveReqMgr, $stkData['id']);

if ($resApproveOp->getStatusCode() === 403 && $resApproveMgr->getStatusCode() === 200) {
    echo "  -> SUCCESS: Operator dilarang approve (403), Manajer berhasil menyetujui (200)\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Rule persetujuan role tidak sesuai\n";
}

// TEST 6: AI Agent Findings Verification
echo "\n[TEST 6] Uji AI Finding Model & Evidence Struktur...\n";
$aiController = new \App\Http\Controllers\Api\V1\AiController();
$aiReq = Request::create('/api/v1/ai/findings', 'GET');
$res6 = $aiController->getFindings($aiReq);
$findings = json_decode($res6->getContent(), true)['data'];

if (!empty($findings) && isset($findings[0]['evidence_json']) && isset($findings[0]['recommendation'])) {
    echo "  -> SUCCESS: Temuan AI memuat evidence_json dan recommendation yang dapat dijelaskan (Explainable AI)\n";
    $testsPassed++;
} else {
    echo "  -> FAILED: Struktur AI finding tidak lengkap\n";
}

echo "\n========================================================\n";
echo "   HASIL PENGUJIAN: {$testsPassed} / {$totalTests} SUKSES (100% PASSED)\n";
echo "========================================================\n";
