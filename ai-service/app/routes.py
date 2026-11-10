from flask import Blueprint, request, jsonify
from app.agents.stock_accuracy import analyze_stock_accuracy
from app.agents.slotting import analyze_slotting
from app.agents.capacity import analyze_capacity
from app.agents.aging_fifo import analyze_aging_fifo
from app.agents.reorder import analyze_reorder
from app.agents.production_benchmarking import analyze_production_benchmarking
from app.agents.po_gated_workflow import analyze_po_gated_workflow
from app.agents.evaluation import evaluate_samples

api_bp = Blueprint('api', __name__)

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "SmartStock AI Data Service",
        "version": "3.1.0",
        "prd_version": "1.0",
        "supported_agents": [
            "stock_accuracy",
            "slotting",
            "capacity",
            "aging_fifo",
            "reorder",
            "production_benchmarking",
            "po_gated_workflow"
        ]
    }), 200

@api_bp.route('/analyze/stock-accuracy', methods=['POST'])
def run_stock_accuracy():
    payload = request.get_json() or {}
    findings = analyze_stock_accuracy(payload)
    return jsonify({
        "agent": "stock_accuracy",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/slotting', methods=['POST'])
def run_slotting():
    payload = request.get_json() or {}
    findings = analyze_slotting(payload)
    return jsonify({
        "agent": "slotting",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/capacity', methods=['POST'])
def run_capacity():
    payload = request.get_json() or {}
    findings = analyze_capacity(payload)
    return jsonify({
        "agent": "capacity",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/aging-fifo', methods=['POST'])
def run_aging_fifo():
    payload = request.get_json() or {}
    findings = analyze_aging_fifo(payload)
    return jsonify({
        "agent": "aging_fifo",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/reorder', methods=['POST'])
def run_reorder():
    payload = request.get_json() or {}
    findings = analyze_reorder(payload)
    return jsonify({
        "agent": "reorder",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/production-benchmarking', methods=['POST'])
def run_production_benchmarking():
    """
    Metode 3 PRD: Historical Production Benchmarking (Aturan 4)
    Membandingkan target produksi PO baru dengan kapasitas/yield historis 1x sebelumnya,
    dan mengkalkulasi estimasi kebutuhan bahan baku berdasarkan rasio aktual.
    """
    payload = request.get_json() or {}
    findings = analyze_production_benchmarking(payload)
    return jsonify({
        "agent": "production_benchmarking",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/analyze/po-gated-workflow', methods=['POST'])
def run_po_gated_workflow():
    """
    Metode 4 PRD: PO-Gated Work Order Workflow (Aturan 6)
    Memvalidasi keberadaan PO yang sah sebelum Work Order dibuat,
    memblokir alokasi bahan baku jika tidak ada PO valid,
    dan memicu Immediate Dispatch setelah produksi selesai.
    """
    payload = request.get_json() or {}
    findings = analyze_po_gated_workflow(payload)
    return jsonify({
        "agent": "po_gated_workflow",
        "total_findings": len(findings),
        "data": findings
    }), 200

@api_bp.route('/evaluate/test-run', methods=['POST'])
def run_evaluation_test():
    """
    PRD AI Accuracy & Performance Evaluation:
    Evaluasi model AI dengan metrik Accuracy, MAE, MAPE, Precision, Recall, F1
    """
    payload = request.get_json() or {}
    results = evaluate_samples(payload)
    return jsonify({
        "status": "success",
        "evaluation": results
    }), 200

