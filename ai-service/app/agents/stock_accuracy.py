"""
Stock Accuracy & Inventory Discrepancy Agent
Berdasarkan PRD Panduan Pemrosesan Data AI v1.0 - METODE 2:
Discrepancy & Anomaly Detection (Aturan 3)

Formula Discrepancy (PRD):
  | System_Qty - Physical_Qty | / System_Qty * 100%

Logika Keputusan AI (PRD):
  - Discrepancy <= 2.0% : Auto-Adjustment Approved
  - Discrepancy >  2.0% : Anomaly Detected -> kunci transaksi, alert Audit Manager
"""
from datetime import datetime

# Konstanta toleransi sesuai PRD Aturan 3
PRD_TOLERANCE_PCT = 2.0   # Batas maksimum toleransi ketidakcocokan data/stok


def analyze_stock_accuracy(data):
    """
    Input data format:
    {
        "items": [
            {
                "product_id": 1,
                "sku": "KRT-A3-001",
                "name": "Karton Corrugated A3",
                "location_code": "A1-01",
                "system_qty": 12450,
                "counted_qty": 12210,
                "tolerance_pct": 2.0
            }
        ]
    }

    Catatan: 'tolerance_pct' dari input digunakan jika dikirim, namun batas keputusan
    "Anomaly Detected" selalu mengikuti PRD_TOLERANCE_PCT = 2.0%.
    """
    findings = []
    items = data.get("items", [])

    for item in items:
        sys_qty = item.get("system_qty", 0)
        cnt_qty = item.get("counted_qty", 0)
        # Selisih: positif = stok fisik lebih banyak, negatif = stok fisik kurang
        variance = cnt_qty - sys_qty
        sku = item.get("sku", "UNKNOWN")
        loc = item.get("location_code", "-")

        # Formula PRD: |System_Qty - Physical_Qty| / System_Qty * 100%
        if sys_qty > 0:
            var_pct = abs(variance) / sys_qty * 100.0
        else:
            var_pct = 100.0 if cnt_qty > 0 else 0.0

        # Gunakan tolerance dari input, fallback ke PRD default (2.0%)
        tol_pct = float(item.get("tolerance_pct", PRD_TOLERANCE_PCT))

        # Hanya buat finding jika ada selisih dan melebihi toleransi
        if abs(variance) > 0 and var_pct > tol_pct:

            # Logika Keputusan AI sesuai PRD Metode 2:
            #   <= 2.0% -> Auto-Adjustment Approved
            #   >  2.0% -> Anomaly Detected (kunci transaksi + alert Audit Manager)
            if var_pct > PRD_TOLERANCE_PCT:
                action = "anomaly_detected"
                severity = "high"
                action_label = "ANOMALY DETECTED — Transaksi Dikunci, Alert ke Audit Manager"
            else:
                # Dalam batas PRD tapi melebihi config lokal
                action = "auto_adjustment_approved"
                severity = "low"
                action_label = "Auto-Adjustment Approved (dalam batas toleransi PRD 2%)"

            # Granularitas severity untuk anomaly
            if action == "anomaly_detected":
                if var_pct >= 10.0 or abs(variance) >= 1000:
                    severity = "high"
                elif var_pct >= 5.0 or abs(variance) >= 500:
                    severity = "high"
                else:
                    severity = "medium"   # >2% tapi belum ekstrem

            title = (
                f"{'🚨 ANOMALI' if action == 'anomaly_detected' else '⚠️ Selisih'} Stok "
                f"Terdeteksi — {sku} ({variance:+d} unit, {var_pct:.2f}%)"
            )
            explanation = (
                f"Sistem mencatat {sys_qty:,} unit di lokasi {loc}, "
                f"namun hasil hitungan fisik menunjukkan {cnt_qty:,} unit "
                f"(selisih {variance:+d} unit atau {var_pct:.2f}%). "
                f"Batas toleransi PRD: {PRD_TOLERANCE_PCT:.1f}%. "
                f"Keputusan AI: {action_label}."
            )

            if action == "anomaly_detected":
                recommendation = (
                    f"TINDAKAN WAJIB: Kunci transaksi terkait produk {sku} di lokasi {loc}. "
                    f"Kirim notifikasi ke Audit Manager untuk investigasi mendalam. "
                    f"Lakukan hitung ulang (recount) pada slot {loc} dan periksa log mutasi "
                    f"48 jam terakhir untuk kemungkinan transaksi tidak sah atau salah catat."
                )
            else:
                recommendation = (
                    f"Lakukan hitung ulang konfirmasi pada slot {loc}. "
                    f"Jika angka terkonfirmasi, penyesuaian otomatis dapat disetujui "
                    f"karena masih dalam batas toleransi PRD {PRD_TOLERANCE_PCT:.1f}%."
                )

            findings.append({
                "agent_type": "stock_accuracy",
                "entity_type": "product",
                "entity_id": str(item.get("product_id", "")),
                "severity": severity,
                "title": title,
                "explanation": explanation,
                "evidence_json": {
                    "sku": sku,
                    "location": loc,
                    "system_quantity": sys_qty,
                    "counted_quantity": cnt_qty,
                    "variance": variance,
                    "variance_percentage": round(var_pct, 2),
                    "tolerance_percentage": tol_pct,
                    "prd_tolerance_pct": PRD_TOLERANCE_PCT,
                    "action": action,           # auto_adjustment_approved | anomaly_detected
                    "transaction_locked": action == "anomaly_detected",
                },
                "recommendation": recommendation,
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })

    return findings
