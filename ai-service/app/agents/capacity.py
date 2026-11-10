"""
Warehouse Capacity & Overstock Detection Agent
Berdasarkan PRD 6.3:
Menghitung pemakaian kapasitas zona/rak dan mendeteksi kondisi overload/hampir penuh.
"""
from datetime import datetime

def analyze_capacity(data):
    """
    Input data format:
    {
        "zones": [
            {
                "zone_id": 1,
                "zone_code": "ZON-C",
                "zone_name": "Zona C — Ekspor Karton",
                "capacity_value": 300,
                "current_used": 295,
                "warning_threshold": 80,
                "critical_threshold": 90
            }
        ]
    }
    """
    findings = []
    zones = data.get("zones", [])

    for z in zones:
        cap = z.get("capacity_value", 1)
        used = z.get("current_used", 0)
        pct = (used / cap) * 100.0 if cap > 0 else 0
        code = z.get("zone_code", "-")
        name = z.get("zone_name", "-")
        crit_th = z.get("critical_threshold", 90)
        warn_th = z.get("warning_threshold", 80)

        if pct >= crit_th:
            findings.append({
                "agent_type": "capacity",
                "entity_type": "warehouse_zone",
                "entity_id": str(z.get("zone_id", "")),
                "severity": "high",
                "title": f"Peringatan Kapasitas Kritis — {code} ({pct:.1f}% Terisi)",
                "explanation": (
                    f"Kapasitas {name} ({code}) telah mencapai {pct:.1f}% ({used}/{cap} slot terpakai). "
                    f"Zona berisiko macet (bottleneck) dan tidak dapat menampung batch penerimaan baru."
                ),
                "evidence_json": {
                    "zone_code": code,
                    "zone_name": name,
                    "capacity": cap,
                    "used": used,
                    "occupancy_pct": round(pct, 2),
                    "threshold_critical": crit_th
                },
                "recommendation": (
                    f"Prioritaskan pengeluaran stok di {code} atau alihkan jadwal penerimaan karton "
                    f"ke zona penyangga (buffer zone). Hindari penumpukan melebihi batas aman."
                ),
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })
        elif pct >= warn_th:
            findings.append({
                "agent_type": "capacity",
                "entity_type": "warehouse_zone",
                "entity_id": str(z.get("zone_id", "")),
                "severity": "medium",
                "title": f"Peringatan Kapasitas Mendekati Penuh — {code} ({pct:.1f}%)",
                "explanation": (
                    f"Zona {code} terisi {pct:.1f}% ({used}/{cap} slot). Mendekati ambang batas peringatan {warn_th}%."
                ),
                "evidence_json": {
                    "zone_code": code,
                    "capacity": cap,
                    "used": used,
                    "occupancy_pct": round(pct, 2)
                },
                "recommendation": f"Monitor penambahan stok masuk di zona {code} dalam 7 hari ke depan.",
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })

    return findings
