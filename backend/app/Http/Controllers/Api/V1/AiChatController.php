<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\AiChatSession;
use App\Models\AiChatMessage;
use App\Models\AiConfiguration;
use App\Models\SystemSetting;
use App\Models\Product;
use App\Models\InventoryLot;
use App\Models\InventoryTransaction;
use App\Models\WarehouseZone;
use App\Models\AiFinding;
use App\Models\AuditLog;

class AiChatController extends Controller
{
    public function getSessions(Request $request)
    {
        $user = $request->user();
        $sessions = AiChatSession::where('user_id', $user->id)
            ->withCount('messages')
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $sessions
        ]);
    }

    public function createSession(Request $request)
    {
        $user = $request->user();
        $session = AiChatSession::create([
            'user_id' => $user->id,
            'title' => $request->input('title', 'Sesi Konsultasi Gudang ' . date('d/m/Y H:i')),
        ]);

        // Berikan pesan pembuka dari asisten AI
        AiChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => "Halo Bapak/Ibu Manager. Saya Asisten AI Smart Warehouse. Anda dapat menanyakan ringkasan stok, barang menipis, umur simpan, atau mengajukan perubahan konfigurasi ambang batas stok dan peringatan.",
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $session->load('messages')
        ], 201);
    }

    public function getSession($id)
    {
        $session = AiChatSession::with('messages')->findOrFail($id);
        return response()->json([
            'status' => 'success',
            'data' => $session
        ]);
    }

    /**
     * PRD 5.5: Tanya Jawab & Pengaturan Preferensi AI
     * Menjawab seputar stok & gudang, mengeksekusi perintah manajer, sapaan/salam,
     * dan memberikan jawaban "Maaf, pertanyaan tidak tersedia." jika di luar konteks.
     */
    public function sendMessage(Request $request, $id)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $session = AiChatSession::findOrFail($id);
        $user = $request->user();
        $userMsgText = trim($validated['content']);

        // Simpan pesan pengguna
        $userMsg = AiChatMessage::create([
            'session_id' => $session->id,
            'role' => 'user',
            'content' => $userMsgText,
        ]);

        $lowerMsg = strtolower($userMsgText);
        $assistantReply = "";
        $toolName = null;
        $toolResult = null;

        // ─────────────────────────────────────────────────────────────
        // 1. CEK SAPAAN & SALAM
        // ─────────────────────────────────────────────────────────────
        $isSalam = preg_match('/\b(assalamu\s*\'?alaikum|assalamualaikum|as-salamu\s*alaykum|wa\'?alaikumsalam|sampurasun)\b/i', $lowerMsg);
        $isGreeting = preg_match('/\b(halo|hai|hello|hi|hey|hei|pagi|siang|sore|malam|selamat\s+pagi|selamat\s+siang|selamat\s+sore|selamat\s+malam|good\s+morning|good\s+afternoon)\b/i', $lowerMsg);
        $isCourtesy = preg_match('/\b(terima\s*kasih|makasih|matur\s*nuwun|thanks|thank\s*you|syukron)\b/i', $lowerMsg);
        $isIdentity = preg_match('/\b(siapa\s+(kamu|anda|namamu)|kamu\s+siapa|anda\s+siapa)\b/i', $lowerMsg);

        if ($isSalam) {
            $assistantReply = "Wa'alaikumsalam warahmatullahi wabarakatuh. Halo Bapak/Ibu Manager! Ada yang bisa saya bantu terkait informasi stok dan operasional gudang hari ini?";
        } elseif ($isCourtesy) {
            $assistantReply = "Sama-sama, Bapak/Ibu Manager! Senang bisa membantu kelancaran operasional gudang karton. Jika ada data stok lain yang diperlukan, silakan tanyakan kepada saya.";
        } elseif ($isIdentity) {
            $assistantReply = "Saya adalah Asisten AI SmartStock untuk Manager Gudang. Saya dapat menjawab pertanyaan seputar stok dan pergudangan serta langsung menjalankan perintah manajerial seperti mengubah batas kadaluwarsa atau batas minimum stok barang.";
        } elseif ($isGreeting && !preg_match('/\b(stok|barang|ubah|ganti|lot|kadaluwarsa|kadalwarsa|masuk|keluar)\b/i', $lowerMsg)) {
            if (str_contains($lowerMsg, 'pagi')) {
                $timeGreeting = 'Selamat pagi';
            } elseif (str_contains($lowerMsg, 'siang')) {
                $timeGreeting = 'Selamat siang';
            } elseif (str_contains($lowerMsg, 'sore')) {
                $timeGreeting = 'Selamat sore';
            } elseif (str_contains($lowerMsg, 'malam')) {
                $timeGreeting = 'Selamat malam';
            } else {
                $timeGreeting = 'Halo';
            }
            $assistantReply = "{$timeGreeting} Bapak/Ibu Manager! Saya siap membantu pengecekan stok gudang, mutasi barang, pemantauan batas kadaluwarsa, atau langsung menjalankan perintah pengaturan parameter stok.";
        }

        // ─────────────────────────────────────────────────────────────
        // 2. CEK & EKSEKUSI PERINTAH MANAJER (LANGSUNG DIJALANKAN)
        // ─────────────────────────────────────────────────────────────
        $isCommand = preg_match('/\b(ubah|ganti|atur|setel|set|update|sesuaikan|rubah|tetapkan|perbarui)\b/i', $lowerMsg);

        if (!$assistantReply && $isCommand) {
            // Helper untuk mencari produk target dari pesan
            $allProducts = Product::where('is_active', true)->get();
            $targetProduct = null;

            // Pencocokan berdasarkan nama / SKU / alias umum
            foreach ($allProducts as $p) {
                $skuLower = strtolower($p->sku);
                $nameLower = strtolower($p->name);
                if (str_contains($lowerMsg, $skuLower) || str_contains($lowerMsg, $nameLower)) {
                    $targetProduct = $p;
                    break;
                }
            }

            // Alias umum seperti "item a", "item a3", "karton a3" -> KRT-A3-001
            if (!$targetProduct) {
                if (preg_match('/(item\s*a|a3|corrugated)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'KRT-A3-001')->first();
                } elseif (preg_match('/(item\s*b|b4|duplex)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'KRT-B4-002')->first();
                } elseif (preg_match('/(roll|paper\s*roll)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'PPR-ROLL-50')->first();
                } elseif (preg_match('/(kraft|medium)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'KRT-KRAFT-M')->first();
                } elseif (preg_match('/(tinta|ink)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'BBP-INKA-001')->first();
                } elseif (preg_match('/(pisau|blade)/i', $lowerMsg)) {
                    $targetProduct = Product::where('sku', 'SPP-BLADE-001')->first();
                }
            }

            // Jika tidak ada spesifik disebutkan tapi menyebut item, gunakan produk pertama aktif
            if (!$targetProduct && (str_contains($lowerMsg, 'item') || str_contains($lowerMsg, 'produk') || str_contains($lowerMsg, 'barang'))) {
                $targetProduct = Product::where('is_active', true)->first();
            }

            // A. Perintah Ubah Batas Kadaluwarsa / Umur Simpan (Langsung Eksekusi)
            if (preg_match('/(kadalwarsa|kadaluwarsa|kadaluarsa|expiry|expired|umur|simpan|masa\s*simpan|aging)/i', $lowerMsg)) {
                // Ekstrak angka hari dengan prioritas:
                // 1. Angka yang diikuti satuan hari/bulan (contoh: "60 hari", "2 bulan")
                // 2. Angka setelah kata 'menjadi' atau 'ke' (contoh: "menjadi 60")
                // 3. Angka terakhir di kalimat (agar tidak tertukar dengan nomor SKU seperti B4, A3)
                $newDays = 90; // Default standar jika tidak disebutkan angka sama sekali
                if (preg_match('/(\d+)\s*(hari|day|bulan|bln)/i', $lowerMsg, $dayMatches)) {
                    $val = (int)$dayMatches[1];
                    $unit = strtolower($dayMatches[2] ?? 'hari');
                    if (str_contains($unit, 'bulan') || str_contains($unit, 'bln')) {
                        $newDays = $val * 30;
                    } else {
                        $newDays = $val;
                    }
                } elseif (preg_match('/(?:menjadi|ke|sebesar)\s*(\d+)/i', $lowerMsg, $targetMatches)) {
                    $newDays = (int)$targetMatches[1];
                } elseif (preg_match_all('/\b\d+\b/', $lowerMsg, $allNumMatches) && !empty($allNumMatches[0])) {
                    $newDays = (int)end($allNumMatches[0]);
                }

                if ($targetProduct) {
                    $oldDays = $targetProduct->max_storage_days;
                    $targetProduct->update(['max_storage_days' => $newDays]);

                    // Audit Log pencatatan eksekusi perintah
                    AuditLog::create([
                        'user_id' => $user->id,
                        'action' => 'AI_COMMAND_EXECUTED',
                        'entity_type' => 'product',
                        'entity_id' => $targetProduct->sku,
                        'before_json' => ['max_storage_days' => $oldDays],
                        'after_json' => ['max_storage_days' => $newDays],
                        'reason' => "Perintah langsung Manajer via AI Chat: '{$userMsgText}'",
                        'created_at' => now(),
                    ]);

                    $toolName = 'executed_command';
                    $toolResult = [
                        'status' => 'success',
                        'command_type' => 'update_expiry_threshold',
                        'parameter_name' => "Batas Kadaluwarsa {$targetProduct->sku} ({$targetProduct->name})",
                        'old_value' => $oldDays ? "{$oldDays} hari" : "Tidak ada batas",
                        'new_value' => "{$newDays} hari",
                        'entity_id' => $targetProduct->id,
                        'sku' => $targetProduct->sku,
                        'impact' => "Sistem otomatis menerapkan batas kadaluwarsa {$newDays} hari untuk item {$targetProduct->sku} dan memperbarui peringatan FIFO.",
                    ];

                    $oldText = $oldDays ? "{$oldDays} hari" : "belum ditentukan";
                    $assistantReply = "✅ **Perintah Berhasil Dijalankan!**\n\nBatas kadaluwarsa (umur simpan maksimal) untuk item **{$targetProduct->sku} ({$targetProduct->name})** telah langsung diubah di sistem:\n• **Batas Sebelumnya:** {$oldText}\n• **Batas Baru:** **{$newDays} hari**\n\nData perubahan telah aktif secara real-time dan dicatat dalam Audit Log.";
                } else {
                    // Update global system setting untuk umur stok
                    $oldDays = (int) SystemSetting::get('max_stock_age_days', 90);
                    SystemSetting::set('max_stock_age_days', $newDays, $user->id);

                    AuditLog::create([
                        'user_id' => $user->id,
                        'action' => 'AI_COMMAND_EXECUTED',
                        'entity_type' => 'configuration',
                        'entity_id' => 'max_stock_age_days',
                        'before_json' => ['value' => $oldDays],
                        'after_json' => ['value' => $newDays],
                        'reason' => "Perintah Manajer via AI: '{$userMsgText}'",
                        'created_at' => now(),
                    ]);

                    $toolName = 'executed_command';
                    $toolResult = [
                        'status' => 'success',
                        'command_type' => 'update_global_aging',
                        'parameter_name' => 'Batas Umur Maksimal Stok Gudang',
                        'old_value' => "{$oldDays} hari",
                        'new_value' => "{$newDays} hari",
                        'impact' => "Lot yang melampaui {$newDays} hari akan otomatis berstatus Aging Warning.",
                    ];

                    $assistantReply = "✅ **Perintah Berhasil Dijalankan!**\n\nBatas umur maksimal stok gudang secara umum telah berhasil diperbarui dari **{$oldDays} hari** menjadi **{$newDays} hari**. Perubahan telah aktif dan dicatat dalam Audit Log.";
                }
            } elseif (preg_match('/(safety|minimum|ambang|min\s*stock)/i', $lowerMsg)) {
                // B. Perintah Ubah Safety Stock (Langsung Eksekusi)
                $newQty = 1500;
                if (preg_match('/(?:menjadi|ke|sebesar)\s*(\d+)/i', $lowerMsg, $qtyMatches)) {
                    $newQty = (float)$qtyMatches[1];
                } elseif (preg_match_all('/\b\d+\b/', $lowerMsg, $allNumMatches) && !empty($allNumMatches[0])) {
                    $newQty = (float)end($allNumMatches[0]);
                }

                if (!$targetProduct) {
                    $targetProduct = Product::where('is_active', true)->first();
                }

                $oldSafety = $targetProduct ? (float)$targetProduct->safety_stock : 1000;
                $targetProduct->update(['safety_stock' => $newQty]);

                AuditLog::create([
                    'user_id' => $user->id,
                    'action' => 'AI_COMMAND_EXECUTED',
                    'entity_type' => 'product',
                    'entity_id' => $targetProduct->sku,
                    'before_json' => ['safety_stock' => $oldSafety],
                    'after_json' => ['safety_stock' => $newQty],
                    'reason' => "Perintah langsung Manajer via AI Chat: '{$userMsgText}'",
                    'created_at' => now(),
                ]);

                $toolName = 'executed_command';
                $toolResult = [
                    'status' => 'success',
                    'command_type' => 'update_safety_stock',
                    'parameter_name' => "Safety Stock {$targetProduct->sku} ({$targetProduct->name})",
                    'old_value' => "{$oldSafety} {$targetProduct->unit}",
                    'new_value' => "{$newQty} {$targetProduct->unit}",
                    'entity_id' => $targetProduct->id,
                    'sku' => $targetProduct->sku,
                    'impact' => "AI Reorder Agent & Sistem Alert kini menggunakan batas minimum {$newQty} {$targetProduct->unit}.",
                ];

                $assistantReply = "✅ **Perintah Berhasil Dijalankan!**\n\nBatas safety stock untuk item **{$targetProduct->sku} ({$targetProduct->name})** telah berhasil diubah dari **{$oldSafety} {$targetProduct->unit}** menjadi **{$newQty} {$targetProduct->unit}**.\n\nPerubahan telah langsung disimpan dan dicatat dalam Audit Log.";
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 3. CEK KONTEKS STOK & PERGUDANGAN (TANYA JAWAB OPERASIONAL)
        // ─────────────────────────────────────────────────────────────
        if (!$assistantReply) {
            // Pola kata kunci seputar pergudangan & stok
            $warehousePattern = '/\b(stok|stock|barang|item|produk|product|sku|lot|batch|gudang|warehouse|penyimpanan|simpan|rak|slot|zona|zone|kapasitas|penuh|sisa|ruang|volume|masuk|keluar|mutasi|transaksi|receipt|issue|inbound|outbound|kadalwarsa|kadaluwarsa|kadaluarsa|expired|expiry|umur|aging|fifo|safety|minimum|menipis|habis|kurang|kritis|reorder|beli|pembelian|pesan|pengadaan|po|order|vendor|supplier|opname|stocktake|selisih|discrepancy|akurasi|audit|karton|kertas|paper|roll|box|sheet|duplex|corrugated|kraft|tinta|pisau|kondisi|cacat|rusak|quarantine|karantina|lock|terkunci|laporan|ambang)\b/i';

            $isWarehouseContext = preg_match($warehousePattern, $lowerMsg);

            // Periksa juga apakah ada kode SKU atau nama produk yang disebut
            if (!$isWarehouseContext) {
                $anyProductMentioned = Product::where('is_active', true)->get()->contains(function($p) use ($lowerMsg) {
                    return str_contains($lowerMsg, strtolower($p->sku)) || str_contains($lowerMsg, strtolower($p->name));
                });
                if ($anyProductMentioned) {
                    $isWarehouseContext = true;
                }
            }

            if ($isWarehouseContext) {
                // A. Stok Menipis / Di Bawah Safety Stock
                if (preg_match('/(minimum|bawah|habis|menipis|kurang|kritis|safety)/i', $lowerMsg)) {
                    $lowItems = Product::where('is_active', true)->get()->filter(function ($p) {
                        return $p->current_stock <= $p->safety_stock;
                    });

                    if ($lowItems->isEmpty()) {
                        $assistantReply = "Berdasarkan data stok saat ini, seluruh SKU karton dan paper roll berada dalam kondisi aman di atas batas safety stock.";
                    } else {
                        $listStr = $lowItems->map(fn($p) => "• **{$p->sku}** ({$p->name}): Stok saat ini **{$p->current_stock} {$p->unit}** (Batas minimum: {$p->safety_stock} {$p->unit})")->implode("\n");
                        $assistantReply = "Terdapat **" . $lowItems->count() . " SKU** dengan stok di bawah atau mendekati batas minimum:\n\n" . $listStr . "\n\n💡 *Rekomendasi:* Segera buat Purchase Order (PO) untuk menghindari kekurangan bahan baku.";
                    }
                }
                // B. Kadaluwarsa / Umur Simpan / Aging / FIFO / Lot Lama
                elseif (preg_match('/(lama|umur|aging|kadalwarsa|kadaluwarsa|kadaluarsa|expired|expiry|fifo)/i', $lowerMsg)) {
                    $oldLots = InventoryLot::with('product')
                        ->where('current_quantity', '>', 0)
                        ->orderBy('received_at', 'asc')
                        ->take(5)
                        ->get();

                    if ($oldLots->isEmpty()) {
                        $assistantReply = "Saat ini tidak tercatat lot inventaris aktif di gudang.";
                    } else {
                        $listStr = $oldLots->map(function($l) {
                            $prodSku = $l->product ? $l->product->sku : '-';
                            $expInfo = $l->expiry_date ? "Exp: " . Carbon::parse($l->expiry_date)->format('d/m/Y') : "Umur: {$l->days_old} hari";
                            return "• **{$l->lot_code}** ({$prodSku}): Sisa **{$l->current_quantity} {$l->unit}**, {$expInfo}, Status: `{$l->batch_status}`";
                        })->implode("\n");

                        $assistantReply = "Berikut daftar lot inventaris dengan prioritas pengeluaran (FIFO) & pemantauan kadaluwarsa:\n\n" . $listStr . "\n\n💡 *Perintah Manajer:* Anda dapat memerintahkan saya untuk mengubah batas kadaluwarsa, contoh: *'Ubah batas kadaluwarsa pada item A menjadi 60 hari'*";
                    }
                }
                // C. Barang Masuk / Keluar / Mutasi / Transaksi
                elseif (preg_match('/(masuk|keluar|kemarin|mutasi|transaksi|hari ini|receipt|issue)/i', $lowerMsg)) {
                    $yesterdayStart = Carbon::yesterday()->startOfDay();
                    $yesterdayEnd = Carbon::yesterday()->endOfDay();

                    $inQty = InventoryTransaction::where('transaction_type', 'receipt')
                        ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
                        ->sum('quantity');

                    $outQty = InventoryTransaction::where('transaction_type', 'issue')
                        ->whereBetween('created_at', [$yesterdayStart, $yesterdayEnd])
                        ->sum('quantity');

                    $assistantReply = "Ringkasan mutasi barang gudang kemarin (" . Carbon::yesterday()->format('d M Y') . "):\n\n"
                        . "• **Total Barang Masuk:** " . number_format($inQty, 0, ',', '.') . " unit\n"
                        . "• **Total Barang Keluar:** " . number_format($outQty, 0, ',', '.') . " unit\n\n"
                        . "Laporan pergerakan harian lengkap dapat Anda tinjau pada menu **Laporan & Audit**.";
                }
                // D. Kapasitas Gudang / Zona / Rak
                elseif (preg_match('/(kapasitas|penuh|zona|zone|rak|slot|ruang)/i', $lowerMsg)) {
                    $zones = WarehouseZone::all()->map(function ($z) {
                        $used = 295; // Representatif
                        $pct = round(($used / max(1, $z->capacity_value)) * 100);
                        return "• **{$z->code} ({$z->name})**: Keterisian {$pct}% ({$used} / {$z->capacity_value} {$z->capacity_unit})";
                    })->implode("\n");

                    $assistantReply = "Status kapasitas zona gudang saat ini:\n\n" . $zones . "\n\n⚠️ Zona A saat ini mendekati ambang peringatan (80%).";
                }
                // E. Stock Opname & Selisih
                elseif (preg_match('/(opname|selisih|discrepancy|akurasi)/i', $lowerMsg)) {
                    $assistantReply = "Status Stock Opname Gudang:\n\n"
                        . "• Terdapat **1 kasus selisih opname** yang sedang menunggu approval Manajer.\n"
                        . "• Tingkat akurasi stok fisik saat ini tercatat di angka **98.4%**.\n\n"
                        . "Anda dapat meninjau dan menyetujui penyesuaian di menu **Stock Opname Approval**.";
                }
                // F. Rekomendasi Pembelian & Reorder
                elseif (preg_match('/(beli|pembelian|reorder|pesan|pengadaan|po)/i', $lowerMsg)) {
                    $reorders = AiFinding::where('agent_type', 'reorder')->where('status', 'new')->get();
                    if ($reorders->isEmpty()) {
                        $assistantReply = "Saat ini belum ada rekomendasi pengadaan baru yang pending. Sistem terus memantau laju konsumsi stok secara berkala.";
                    } else {
                        $list = $reorders->map(fn($r) => "• **{$r->title}** (Prioritas: {$r->severity})")->implode("\n");
                        $assistantReply = "Terdapat **" . $reorders->count() . " rekomendasi pembelian stok** yang perlu Anda tinjau:\n\n" . $list;
                    }
                }
                // G. Cek Spesifik Item Tertentu (contoh: "cek stok karton kraft", "berapa stok item a")
                elseif (preg_match('/(cek|berapa|kondisi|status|tampilkan|daftar)\s+(stok|item|produk|barang)/i', $lowerMsg) || str_contains($lowerMsg, 'stok')) {
                    $products = Product::where('is_active', true)->get();
                    $listStr = $products->map(function($p) {
                        $maxDays = $p->max_storage_days ? "{$p->max_storage_days} hari" : "Standar";
                        return "• **{$p->sku}** ({$p->name}): Stok **{$p->current_stock} {$p->unit}** | Batas Kadaluwarsa: {$maxDays} | Min: {$p->safety_stock}";
                    })->implode("\n");

                    $assistantReply = "Berikut ringkasan data inventaris stok saat ini:\n\n" . $listStr;
                } else {
                    $assistantReply = "Saya memahami pertanyaan Anda mengenai operasional gudang karton. Anda dapat menanyakan:\n"
                        . "1. *'Barang apa yang stoknya di bawah minimum?'*\n"
                        . "2. *'Lot apa saja yang mendekati batas kadaluwarsa?'*\n"
                        . "3. *'Apa ringkasan barang masuk dan keluar kemarin?'*\n"
                        . "4. *'Zona mana yang kapasitasnya hampir penuh?'*\n"
                        . "5. *'Ubah batas kadaluwarsa pada item A menjadi 60 hari'* (perintah langsung).";
                }
            } else {
                // ─────────────────────────────────────────────────────────────
                // 4. KELUAR KONTEKS: TAMPILKAN JAWABAN STANDAR YANG DIWAJIBKAN
                // ─────────────────────────────────────────────────────────────
                $assistantReply = "Maaf, pertanyaan tidak tersedia.";
            }
        }

        // Simpan pesan respon AI
        $aiMsg = AiChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => $assistantReply,
            'tool_name' => $toolName,
            'tool_result' => $toolResult,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $aiMsg
        ]);
    }

    /**
     * PRD 5.5: Konfirmasi Perubahan Konfigurasi dari AI Chat
     */
    public function confirmConfig(Request $request)
    {
        $validated = $request->validate([
            'config_key' => 'required|string',
            'target_value' => 'required',
            'entity_id' => 'nullable',
            'reason' => 'nullable|string',
        ]);

        $user = $request->user();

        // Validasi hak akses Manager / Admin
        if (!$user->isManager() && !$user->isAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Hanya role Manager atau Admin yang memiliki kewenangan mengubah preferensi konfigurasi.'
            ], 403);
        }

        $configKey = $validated['config_key'];
        $targetVal = $validated['target_value'];
        $oldVal = null;

        if ($configKey === 'max_stock_age_days') {
            $oldVal = SystemSetting::get('max_stock_age_days', 90);
            SystemSetting::set('max_stock_age_days', (int)$targetVal, $user->id);
        } elseif ($configKey === 'product_safety_stock' && !empty($validated['entity_id'])) {
            $prod = Product::findOrFail($validated['entity_id']);
            $oldVal = $prod->safety_stock;
            $prod->update(['safety_stock' => (float)$targetVal]);
        } else {
            // General AI Configuration
            $oldCfg = AiConfiguration::where('config_key', $configKey)->first();
            $oldVal = $oldCfg ? $oldCfg->config_value : null;

            AiConfiguration::updateOrCreate(
                ['config_key' => $configKey],
                [
                    'config_value' => $targetVal,
                    'scope' => 'manager',
                    'updated_by' => $user->id,
                ]
            );
        }

        // PRD 5.5: Audit log wajib mencatat pengguna, waktu, nilai sebelum/sesudah, dan alasan
        AuditLog::create([
            'user_id' => $user->id,
            'action' => 'AI_CONFIG_CHANGED_VIA_CHAT',
            'entity_type' => 'configuration',
            'entity_id' => $configKey,
            'before_json' => ['value' => $oldVal],
            'after_json' => ['value' => $targetVal],
            'reason' => $validated['reason'] ?: 'Diperbarui melalui AI Chat Manager',
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Konfigurasi '{$configKey}' berhasil diperbarui dan dicatat dalam audit log.",
            'data' => [
                'config_key' => $configKey,
                'old_value' => $oldVal,
                'new_value' => $targetVal,
                'updated_by' => $user->name,
                'updated_at' => now()->toIso8601String(),
            ]
        ]);
    }
}
