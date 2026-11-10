"""
Carton Inventory Aging & FIFO Agent
Berdasarkan PRD Panduan Pemrosesan Data AI v1.0 - METODE 1:
Automated Expiry & Aging Engine (Aturan 1, 2, & 5)

Aturan Bisnis:
  - Category = 'Roll Kertas' -> Max Storage = 730 Hari (24 Bulan)
  - Category = 'Box'         -> Max Storage = 180 Hari (6 Bulan)
  - Category lainnya         -> N/A (tidak ada batas kadaluarsa)
  - H-30 Hari  : Trigger warning "Stock Aging Soon"  -> Status: Aging_Warning
  - H+0 Hari   : Ubah status 'Expired', kunci stok   -> Status: Expired
"""
from datetime import datetime, date

# Konstanta batas simpan per kategori (sesuai Aturan 1, 2 PRD)
MAX_STORAGE_DAYS = {
    'Roll Kertas': 730,   # 24 Bulan
    'Box': 180,           # 6 Bulan
}
WARNING_DAYS_BEFORE_EXPIRY = 30  # H-30 trigger warning


def get_max_storage_days(category: str) -> int | None:
    """
    Mengembalikan batas simpan (hari) berdasarkan kategori material.
    Sesuai PRD Aturan 1 & 2:
      - Roll Kertas : 730 hari
      - Box         : 180 hari
      - Lainnya     : None (tidak ada batas)
    """
    return MAX_STORAGE_DAYS.get(category, None)


def classify_batch_status(days_in_warehouse: int, max_days: int) -> str:
    """
    Klasifikasi status batch berdasarkan umur penyimpanan.
    Sesuai PRD Metode 1 (Tindakan AI):
      - H-30 s/d H+0 : 'Aging_Warning'
      - H+0 ke atas  : 'Expired'
      - Sebelum H-30  : 'Active'
    """
    days_to_expiry = max_days - days_in_warehouse
    if days_to_expiry <= 0:
        return 'Expired'
    elif days_to_expiry <= WARNING_DAYS_BEFORE_EXPIRY:
        return 'Aging_Warning'
    else:
        return 'Active'


def analyze_aging_fifo(data):
    """
    Input data format:
    {
        "lots": [
            {
                "lot_id": 3,
                "lot_code": "LOT-2025-003",
                "sku": "PPR-ROLL-50",
                "name": "Paper Roll 50cm",
                "category": "Roll Kertas",
                "days_in_warehouse": 101,
                "condition_status": "damp",
                "quantity": 40,
                "location_code": "B1-01"
            }
        ]
    }

    Catatan: 'max_allowed_days' tidak lagi dikirim dari backend.
    Agent ini yang menentukan batas simpan berdasarkan 'category' (PRD Aturan 1, 2 & 5).
    """
    findings = []
    lots = data.get("lots", [])

    for lot in lots:
        days = lot.get("days_in_warehouse", 0)
        category = lot.get("category", "")
        cond = lot.get("condition_status", "good")
        lot_code = lot.get("lot_code", "-")
        sku = lot.get("sku", "-")
        loc = lot.get("location_code", "-")
        qty = lot.get("quantity", 0)

        # Tentukan batas simpan berdasarkan kategori (PRD Aturan 1 & 2)
        max_days = get_max_storage_days(category)

        # Untuk kategori tanpa batas simpan (Sheet, Bahan Baku Pembantu, Spare Part),
        # hanya cek kondisi fisik
        if max_days is None:
            is_aged = False
            batch_status = 'Active'
        else:
            is_aged = days >= max_days
            batch_status = classify_batch_status(days, max_days)

        is_bad_cond = cond in ["damp", "torn", "dented", "damaged"]
        days_to_expiry = (max_days - days) if max_days is not None else None

        # Hanya buat finding jika ada masalah aging atau kondisi buruk
        if is_aged or batch_status == 'Aging_Warning' or is_bad_cond:
            # Penentuan severity
            if batch_status == 'Expired' and is_bad_cond:
                severity = "high"
            elif batch_status == 'Expired' or is_bad_cond:
                severity = "high" if batch_status == 'Expired' else "medium"
            elif batch_status == 'Aging_Warning':
                severity = "medium"
            else:
                severity = "low"

            reasons = []
            if batch_status == 'Expired':
                reasons.append(
                    f"telah KADALUARSA — disimpan {days} hari "
                    f"(batas kategori '{category}': {max_days} hari)"
                )
            elif batch_status == 'Aging_Warning':
                reasons.append(
                    f"mendekati kadaluarsa dalam {days_to_expiry} hari "
                    f"(batas '{category}': {max_days} hari, saat ini {days} hari)"
                )
            if is_bad_cond:
                reasons.append(
                    f"kondisi fisik terdeteksi '{cond}' (potensi penurunan mutu)"
                )

            # Judul dan penjelasan berbeda tergantung status
            if batch_status == 'Expired':
                title = f"STOK KADALUARSA — {sku} ({lot_code}) [{category}]"
                action_text = (
                    f"KUNCI STOK: Lot {lot_code} harus dikunci dan tidak boleh digunakan "
                    f"tanpa approval manajer. "
                )
            elif batch_status == 'Aging_Warning':
                title = f"Peringatan Aging H-{days_to_expiry} — {sku} ({lot_code}) [{category}]"
                action_text = (
                    f"Lot {lot_code} mendekati batas simpan. Prioritaskan pengeluaran segera. "
                )
            else:
                title = f"Peringatan Kondisi Fisik — {sku} ({lot_code})"
                action_text = ""

            explanation = (
                f"Lot {lot_code} ({sku}) kategori '{category}' di slot {loc} "
                f"sebanyak {qty} unit: {' dan '.join(reasons)}. "
                f"Sesuai PRD, batas simpan '{category}' adalah "
                f"{max_days if max_days else 'N/A'} hari."
            )
            recommendation = (
                f"{action_text}"
                f"Lakukan inspeksi fisik oleh operator di slot {loc}. "
                f"{'Ajukan disposal/karantina jika kualitas tidak layak.' if batch_status == 'Expired' else 'Prioritaskan sebagai batch pengeluaran terdepan (FIFO).'}"
            )

            findings.append({
                "agent_type": "aging_fifo",
                "entity_type": "inventory_lot",
                "entity_id": str(lot.get("lot_id", "")),
                "severity": severity,
                "title": title,
                "explanation": explanation,
                "evidence_json": {
                    "lot_code": lot_code,
                    "sku": sku,
                    "category": category,
                    "days_in_warehouse": days,
                    "max_allowed_days": max_days,
                    "days_to_expiry": days_to_expiry,
                    "batch_status": batch_status,   # Active | Aging_Warning | Expired
                    "condition": cond,
                    "quantity": qty,
                    "location": loc
                },
                "recommendation": recommendation,
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })

    return findings
