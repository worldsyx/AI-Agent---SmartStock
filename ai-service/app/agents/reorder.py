"""
Reorder / Stock Purchase Recommendation Agent
Berdasarkan PRD Revisi v3.0 Bagian 5.2:
Membantu Manager mengetahui barang yang perlu dipertimbangkan untuk dibeli/dipesan kembali,
berdasarkan stok saat ini, batas minimum stok, rata-rata pemakaian, dan lead time.
AI memberikan estimasi saran jumlah pembelian (bukan keputusan atau pembelian otomatis).
"""

def analyze_reorder(data):
    """
    Input data format:
    {
        "products": [
            {
                "product_id": 1,
                "sku": "KRT-A3-001",
                "name": "Karton Corrugated A3",
                "current_stock": 850,
                "safety_stock": 2000,
                "avg_daily_issue": 150,
                "lead_time_days": 3,
                "unit": "Lembar",
                "vendor_name": "PT Riau Andalan Kertas"
            }
        ]
    }
    """
    findings = []
    products = data.get("products", [])

    for prod in products:
        sku = prod.get("sku", "-")
        name = prod.get("name", "-")
        current_stock = float(prod.get("current_stock", 0))
        safety_stock = float(prod.get("safety_stock", 100))
        avg_daily = float(prod.get("avg_daily_issue", 20))
        lead_time = int(prod.get("lead_time_days", 2))
        unit = prod.get("unit", "Unit")
        vendor = prod.get("vendor_name", "Vendor Terdaftar")

        # Reorder point = (avg_daily * lead_time) + safety_stock
        reorder_point = (avg_daily * lead_time) + safety_stock

        if current_stock <= safety_stock or current_stock < reorder_point:
            # Deficit calculation
            deficit = reorder_point - current_stock
            # Economic order / recommended batch (e.g., buffer 14 days of average usage)
            buffer_days = 14
            suggested_qty = round(deficit + (avg_daily * buffer_days))

            # Severity
            if current_stock <= (safety_stock * 0.5):
                severity = "high"
                urgency = "Kritis (Stok sangat menipis di bawah 50% safety stock)"
            elif current_stock <= safety_stock:
                severity = "medium"
                urgency = "Perlu Tinjauan (Di bawah batas minimum safety stock)"
            else:
                severity = "low"
                urgency = "Peringatan Dini (Mendekati Reorder Point)"

            days_remaining = round(current_stock / avg_daily, 1) if avg_daily > 0 else 99

            title = f"Rekomendasi Pembelian Stok — {sku} ({name})"
            explanation = (
                f"Stok saat ini tersisa {current_stock:,.0f} {unit}, sedangkan batas minimum stok "
                f"adalah {safety_stock:,.0f} {unit}. Dengan rata-rata pengeluaran {avg_daily:,.0f} {unit}/hari, "
                f"stok diperkirakan habis dalam {days_remaining} hari kerja. "
                f"Lead time pemasok ({vendor}) adalah {lead_time} hari."
            )
            recommendation = (
                f"Pertimbangkan pengadaan sekitar {suggested_qty:,.0f} {unit} untuk mencukupi operasional "
                f"selama {buffer_days} hari ke depan dan memulihkan safety buffer. "
                f"Catatan: Saran estimasi ini memerlukan persetujuan Manajer dan penerbitan PO internal."
            )

            findings.append({
                "agent_type": "reorder",
                "entity_type": "product",
                "entity_id": str(prod.get("product_id")),
                "severity": severity,
                "title": title,
                "explanation": explanation,
                "recommendation": recommendation,
                "evidence_json": {
                    "sku": sku,
                    "name": name,
                    "current_stock": current_stock,
                    "safety_stock": safety_stock,
                    "reorder_point": reorder_point,
                    "avg_daily_issue": avg_daily,
                    "lead_time_days": lead_time,
                    "days_remaining": days_remaining,
                    "suggested_reorder_qty": suggested_qty,
                    "unit": unit,
                    "vendor": vendor,
                    "urgency": urgency,
                    "missing_data": "Data Purchase Order dalam perjalanan belum tercatat"
                }
            })

    return findings
