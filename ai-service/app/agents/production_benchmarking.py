"""
Historical Production Benchmarking Agent
Berdasarkan PRD Panduan Pemrosesan Data AI v1.0 - METODE 3:
Historical Production Benchmarking (Aturan 4)

Aturan Bisnis (PRD):
  - Benchmark/Referensi Historis: 1x dari hasil produksi sebelumnya
  - Saat PO baru masuk, AI menarik data hasil produksi 1x tepat sebelumnya
  - AI membandingkan target produksi saat ini dengan kapasitas/yield historis
  - AI mengkalkulasi kebutuhan bahan baku secara presisi menggunakan rasio aktual sebelumnya

Kategori Material yang dihitung (PRD Aturan 5):
  - Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part
"""
from datetime import datetime


def analyze_production_benchmarking(data):
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
                "prev_production": {
                    "po_number": "PO-2025-099",
                    "order_qty": 9500,
                    "actual_output": 9300,
                    "materials_used": {
                        "Roll Kertas": {"qty": 450, "unit": "Roll"},
                        "Sheet": {"qty": 9500, "unit": "Lembar"},
                        "Box": {"qty": 200, "unit": "Box"},
                        "Bahan Baku Pembantu": {"qty": 50, "unit": "Kg"},
                        "Spare Part": {"qty": 2, "unit": "Pcs"}
                    }
                }
            }
        ]
    }
    """
    findings = []
    orders = data.get("production_orders", [])

    for order in orders:
        po_number = order.get("po_number", "-")
        customer_id = order.get("customer_id", "-")
        item_id = order.get("item_id", "-")
        item_name = order.get("item_name", "-")
        order_qty = float(order.get("order_qty", 0))
        prev = order.get("prev_production", {})

        if not prev:
            # Tidak ada data historis — tandai sebagai baseline baru
            findings.append({
                "agent_type": "production_benchmarking",
                "entity_type": "production_order",
                "entity_id": po_number,
                "severity": "low",
                "title": f"Benchmark Historis Tidak Tersedia — {po_number} ({item_name})",
                "explanation": (
                    f"PO {po_number} untuk {item_name} (qty: {order_qty:,.0f}) tidak memiliki "
                    f"data produksi sebelumnya. Ini akan menjadi baseline referensi pertama."
                ),
                "evidence_json": {
                    "po_number": po_number,
                    "customer_id": customer_id,
                    "item_id": item_id,
                    "order_qty": order_qty,
                    "prev_production": None,
                    "benchmark_ratio": None,
                },
                "recommendation": (
                    f"Catat semua pemakaian bahan baku aktual untuk PO {po_number} "
                    f"secara detail (Roll Kertas, Sheet, Box, Bahan Baku Pembantu, Spare Part) "
                    f"agar dapat digunakan sebagai referensi historis untuk PO berikutnya."
                ),
                "status": "new",
                "generated_at": datetime.now().isoformat()
            })
            continue

        prev_order_qty = float(prev.get("order_qty", 1))
        prev_actual_output = float(prev.get("actual_output", prev_order_qty))
        prev_materials = prev.get("materials_used", {})
        prev_po = prev.get("po_number", "-")

        # Rasio yield historis: actual_output / order_qty (efisiensi produksi)
        yield_ratio = prev_actual_output / prev_order_qty if prev_order_qty > 0 else 1.0

        # Rasio skala: order baru vs order sebelumnya
        scale_ratio = order_qty / prev_order_qty if prev_order_qty > 0 else 1.0

        # Kalkulasi kebutuhan bahan baku berdasarkan rasio aktual sebelumnya (PRD Aturan 4)
        material_estimates = {}
        warnings = []
        for category, mat_data in prev_materials.items():
            prev_qty = float(mat_data.get("qty", 0))
            unit = mat_data.get("unit", "Unit")

            # Estimasi = qty sebelumnya * scale_ratio (proporsional terhadap order baru)
            estimated_qty = round(prev_qty * scale_ratio, 2)
            # Usage rate per unit produk
            usage_rate = prev_qty / prev_actual_output if prev_actual_output > 0 else 0

            material_estimates[category] = {
                "estimated_qty": estimated_qty,
                "unit": unit,
                "prev_qty_used": prev_qty,
                "usage_rate_per_unit": round(usage_rate, 4),
                "note": f"Estimasi berdasarkan rasio aktual {prev_po} (scale x{scale_ratio:.2f})"
            }

        # Tentukan apakah ada deviasi signifikan dari kapasitas historis
        deviation_pct = abs(scale_ratio - 1.0) * 100
        if deviation_pct > 30:
            severity = "high"
            deviation_note = (
                f"Order qty saat ini ({order_qty:,.0f}) berbeda {deviation_pct:.1f}% "
                f"dari referensi historis ({prev_order_qty:,.0f}). "
                f"Estimasi bahan baku perlu verifikasi manual."
            )
            warnings.append(deviation_note)
        elif deviation_pct > 15:
            severity = "medium"
            deviation_note = (
                f"Order qty saat ini berbeda {deviation_pct:.1f}% dari referensi historis. "
                f"Perhatikan estimasi kebutuhan bahan baku."
            )
            warnings.append(deviation_note)
        else:
            severity = "info"
            deviation_note = f"Order qty dalam rentang normal (deviasi {deviation_pct:.1f}% dari historis)."

        title = f"Benchmarking Produksi — {po_number} vs {prev_po} [{item_name}]"
        explanation = (
            f"PO {po_number} untuk {item_name} sejumlah {order_qty:,.0f} unit. "
            f"Referensi historis: PO {prev_po} (order {prev_order_qty:,.0f}, "
            f"aktual output {prev_actual_output:,.0f}, yield ratio {yield_ratio:.2%}). "
            f"Scale factor: x{scale_ratio:.2f}. {deviation_note}"
        )
        recommendation = (
            f"Estimasi kebutuhan bahan baku untuk PO {po_number} berdasarkan rasio aktual {prev_po}:\n"
            + "\n".join([
                f"  - {cat}: {est['estimated_qty']:,.2f} {est['unit']}"
                for cat, est in material_estimates.items()
            ])
            + (f"\n\nPerhatian: {'; '.join(warnings)}" if warnings else "")
            + f"\n\nCatatan: Saran estimasi ini memerlukan konfirmasi dari Manajer Produksi."
        )

        findings.append({
            "agent_type": "production_benchmarking",
            "entity_type": "production_order",
            "entity_id": po_number,
            "severity": severity,
            "title": title,
            "explanation": explanation,
            "evidence_json": {
                "po_number": po_number,
                "customer_id": customer_id,
                "item_id": item_id,
                "item_name": item_name,
                "order_qty": order_qty,
                "prev_po_number": prev_po,
                "prev_order_qty": prev_order_qty,
                "prev_actual_output": prev_actual_output,
                "yield_ratio": round(yield_ratio, 4),
                "scale_ratio": round(scale_ratio, 4),
                "deviation_pct": round(deviation_pct, 2),
                "material_estimates": material_estimates,
                "warnings": warnings,
            },
            "recommendation": recommendation,
            "status": "new",
            "generated_at": datetime.now().isoformat()
        })

    return findings
