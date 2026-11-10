"""
PO-Gated Work Order Workflow Agent
Berdasarkan PRD Panduan Pemrosesan Data AI v1.0 - METODE 4:
PO-Gated Work Order Workflow (Aturan 6)

Aturan Bisnis (PRD):
  - Kontrol Produksi: Strictly By-Order
  - WORK_ORDER_ALLOWED = IF(PO_Number IS NOT NULL AND PO_Status == 'VALID', TRUE, FALSE)
  - Tanpa PO Valid: sistem memblokir pembuatan Work Order (WO) dan menolak
    alokasi bahan baku/sparepart dari gudang
  - Setelah Status_Produksi = 'Completed': AI otomatis memicu perintah logistik
    (Shipping Order Notification) untuk pengiriman instan (Immediate Dispatch)

Status Produksi (PRD):
  - Blocked_No_PO : Diblokir karena tidak ada PO valid
  - Approved      : PO valid, Work Order boleh dibuat
  - In_Progress   : Produksi sedang berjalan
  - Completed     : Produksi selesai -> trigger Immediate Dispatch

Status Pengiriman (PRD):
  - Pending        : Belum siap kirim
  - Ready_To_Ship  : Produksi selesai, siap dikirim
  - Shipped        : Sudah dikirim
"""
from datetime import datetime


# Konstanta status sesuai skema PRD
VALID_PO_STATUSES = {'VALID', 'APPROVED', 'ACTIVE'}
PRODUCTION_STATUS_BLOCKED = 'Blocked_No_PO'
PRODUCTION_STATUS_APPROVED = 'Approved'
PRODUCTION_STATUS_COMPLETED = 'Completed'
SHIPPING_STATUS_READY = 'Ready_To_Ship'


def check_work_order_allowed(po_number, po_status) -> bool:
    """
    Evaluasi aturan PRD Metode 4:
    WORK_ORDER_ALLOWED = IF(PO_Number IS NOT NULL AND PO_Status == 'VALID', TRUE, FALSE)
    """
    if not po_number or str(po_number).strip() in ('', 'None', 'null'):
        return False
    return str(po_status).upper() in VALID_PO_STATUSES


def analyze_po_gated_workflow(data):
    """
    Input data format:
    {
        "production_orders": [
            {
                "po_number": "PO-2026-001",
                "customer_id": "CUST-001",
                "item_id": "KRT-A3-001",
                "item_name": "Karton Corrugated A3",
                "order_qty": 10000,
                "po_status": "VALID",
                "status_produksi": "Approved",
                "status_kirim": "Pending",
                "prev_production": 9500
            },
            {
                "po_number": null,
                "customer_id": "CUST-002",
                "item_id": "PPR-ROLL-50",
                "item_name": "Paper Roll 50cm",
                "order_qty": 500,
                "po_status": null,
                "status_produksi": "Blocked_No_PO",
                "status_kirim": "Pending",
                "prev_production": 480
            }
        ]
    }
    """
    findings = []
    orders = data.get("production_orders", [])

    for order in orders:
        po_number = order.get("po_number")
        customer_id = order.get("customer_id", "-")
        item_id = order.get("item_id", "-")
        item_name = order.get("item_name", "-")
        order_qty = float(order.get("order_qty", 0))
        po_status = order.get("po_status")
        status_produksi = order.get("status_produksi", "")
        status_kirim = order.get("status_kirim", "Pending")
        prev_production = order.get("prev_production", 0)

        # ----------------------------------------------------------------
        # RULE CHECK: WORK_ORDER_ALLOWED (PRD Metode 4)
        # ----------------------------------------------------------------
        work_order_allowed = check_work_order_allowed(po_number, po_status)

        # --- KASUS 1: Tidak ada PO Valid -> Blokir ---
        if not work_order_allowed:
            reason = (
                "PO Number tidak ditemukan (NULL)" if not po_number
                else f"PO status '{po_status}' tidak valid (harus VALID/APPROVED)"
            )
            findings.append({
                "agent_type": "po_gated_workflow",
                "entity_type": "production_order",
                "entity_id": str(po_number or customer_id),
                "severity": "high",
                "title": (
                    f"Work Order DIBLOKIR — {item_name} "
                    f"[{po_number or 'TANPA PO'}]"
                ),
                "explanation": (
                    f"Permintaan produksi untuk {item_name} (qty: {order_qty:,.0f}) "
                    f"DITOLAK karena: {reason}. "
                    f"Sesuai PRD Aturan 6 (Strictly By-Order), produksi tidak boleh dimulai "
                    f"tanpa Purchase Order yang valid. Alokasi bahan baku dan spare part "
                    f"dari gudang juga DIBLOKIR."
                ),
                "evidence_json": {
                    "po_number": po_number,
                    "po_status": po_status,
                    "customer_id": customer_id,
                    "item_id": item_id,
                    "item_name": item_name,
                    "order_qty": order_qty,
                    "work_order_allowed": False,
                    "block_reason": reason,
                    "status_produksi": PRODUCTION_STATUS_BLOCKED,
                    "warehouse_allocation_blocked": True,
                },
                "recommendation": (
                    f"Hentikan segala persiapan produksi untuk {item_name}. "
                    f"Minta tim Sales/Admin untuk menerbitkan PO yang valid terlebih dahulu. "
                    f"Sistem tidak akan mengizinkan pembuatan Work Order atau pengambilan "
                    f"bahan baku dari gudang sampai PO valid tersedia."
                ),
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })
            continue

        # --- KASUS 2: PO Valid, Work Order diizinkan ---
        if status_produksi == PRODUCTION_STATUS_APPROVED:
            findings.append({
                "agent_type": "po_gated_workflow",
                "entity_type": "production_order",
                "entity_id": str(po_number),
                "severity": "info",
                "title": f"Work Order Diizinkan — {po_number} [{item_name}]",
                "explanation": (
                    f"PO {po_number} untuk {item_name} (qty: {order_qty:,.0f}) "
                    f"telah diverifikasi valid (status: {po_status}). "
                    f"Work Order dapat dibuat dan alokasi bahan baku dari gudang diizinkan. "
                    f"Referensi produksi sebelumnya: {prev_production:,.0f} unit."
                ),
                "evidence_json": {
                    "po_number": po_number,
                    "po_status": po_status,
                    "customer_id": customer_id,
                    "item_id": item_id,
                    "item_name": item_name,
                    "order_qty": order_qty,
                    "prev_production": prev_production,
                    "work_order_allowed": True,
                    "status_produksi": PRODUCTION_STATUS_APPROVED,
                    "warehouse_allocation_blocked": False,
                },
                "recommendation": (
                    f"Work Order untuk PO {po_number} dapat diterbitkan. "
                    f"Lakukan alokasi bahan baku sesuai estimasi benchmarking historis "
                    f"(referensi: {prev_production:,.0f} unit pada produksi sebelumnya). "
                    f"Pastikan ketersediaan stock sebelum memulai produksi."
                ),
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })

        # --- KASUS 3: Produksi Selesai -> Trigger Immediate Dispatch ---
        if status_produksi == PRODUCTION_STATUS_COMPLETED:
            findings.append({
                "agent_type": "po_gated_workflow",
                "entity_type": "production_order",
                "entity_id": str(po_number),
                "severity": "high",   # High priority agar segera diproses
                "title": f"IMMEDIATE DISPATCH — {po_number} [{item_name}] Siap Kirim!",
                "explanation": (
                    f"Produksi PO {po_number} untuk {item_name} (qty: {order_qty:,.0f}) "
                    f"telah selesai (Status: {PRODUCTION_STATUS_COMPLETED}). "
                    f"Sesuai PRD Aturan 6 (Immediate Dispatch), pengiriman barang jadi harus "
                    f"dilakukan SECEPATNYA. Status pengiriman saat ini: {status_kirim}."
                ),
                "evidence_json": {
                    "po_number": po_number,
                    "customer_id": customer_id,
                    "item_id": item_id,
                    "item_name": item_name,
                    "order_qty": order_qty,
                    "status_produksi": PRODUCTION_STATUS_COMPLETED,
                    "status_kirim": status_kirim,
                    "shipping_action_required": status_kirim != "Shipped",
                    "dispatch_triggered_at": datetime.now().isoformat(),
                },
                "recommendation": (
                    f"SEGERA LAKUKAN PENGIRIMAN: Ubah Status Kirim PO {po_number} menjadi "
                    f"'{SHIPPING_STATUS_READY}' dan jadwalkan pengiriman ke {customer_id} "
                    f"dalam waktu sesingkat mungkin. "
                    f"Notifikasi logistik telah dipicu oleh sistem AI. "
                    f"Jangan menahan barang jadi di gudang melebihi waktu yang diperlukan."
                ),
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })

    return findings
