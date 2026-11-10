"""
AI Model Accuracy & Performance Evaluation Engine
Berdasarkan PRD AI Accuracy & Performance Evaluation:
- Classification Accuracy: (TP + TN) / (TP + TN + FP + FN) * 100%
- Mean Absolute Error (MAE): Σ |Actual - Predicted| / N
- Mean Absolute Percentage Error (MAPE): (Σ |(Actual - Predicted) / Actual| / N) * 100%
- Precision, Recall, F1-Score untuk Anomaly Detection
- Sample-level discrepancy diagnosis & ground-truth validation
"""
import time
from datetime import datetime

def evaluate_samples(data):
    """
    Input format:
    {
        "model_type": "prediction" | "anomaly_detection" | "recommendation" | "classification",
        "samples": [
            {
                "sample_id": "SMP-001",
                "input_data": {"sku": "KRT-A3-001", "name": "Karton A3"},
                "predicted": 100,
                "actual": 100
            }
        ]
    }
    """
    start_time = time.time()
    model_type = data.get("model_type", "prediction")
    samples = data.get("samples", [])
    
    total_samples = len(samples)
    correct_count = 0
    incorrect_count = 0
    pending_count = 0
    failed_count = 0
    
    tp, tn, fp, fn = 0, 0, 0, 0
    abs_errors = []
    pct_errors = []
    
    details = []
    
    for s in samples:
        s_id = str(s.get("sample_id", f"SMP-{len(details)+1:03d}"))
        input_data = s.get("input_data", {})
        pred = s.get("predicted")
        act = s.get("actual")
        
        # Pending evaluation if actual is None
        if act is None or act == "" or str(act).lower() == "none" or str(act).lower() == "pending":
            pending_count += 1
            details.append({
                "sample_id": s_id,
                "input_data": input_data,
                "predicted_result": str(pred),
                "actual_result": None,
                "error_value": None,
                "evaluation_status": "pending",
                "notes": "Belum ada data aktual pembanding (Pending Evaluation)"
            })
            continue
            
        # Evaluation logic based on model type
        if model_type in ["prediction", "numeric"]:
            try:
                p_val = float(pred)
                a_val = float(act)
                err = abs(a_val - p_val)
                abs_errors.append(err)
                
                # Check exact or tolerance match (e.g., exact match)
                is_correct = (p_val == a_val)
                
                if a_val != 0:
                    mape_item = (err / abs(a_val)) * 100.0
                    pct_errors.append(mape_item)
                else:
                    mape_item = 0.0
                
                if is_correct:
                    correct_count += 1
                    status = "correct"
                    note = "Presisi 100% Cocok Sempurna"
                else:
                    incorrect_count += 1
                    status = "incorrect"
                    note = f"Selisih {err:,.1f} unit (Deviasi {mape_item:.2f}%)"
                    
                details.append({
                    "sample_id": s_id,
                    "input_data": input_data,
                    "predicted_result": str(pred),
                    "actual_result": str(act),
                    "error_value": round(err, 4),
                    "evaluation_status": status,
                    "notes": note
                })
            except Exception as e:
                failed_count += 1
                details.append({
                    "sample_id": s_id,
                    "input_data": input_data,
                    "predicted_result": str(pred),
                    "actual_result": str(act),
                    "error_value": None,
                    "evaluation_status": "failed",
                    "notes": f"Format numerik tidak valid: {str(e)}"
                })
        else:
            # Classification / Categorical / Anomaly Detection
            pred_str = str(pred).strip().lower()
            act_str = str(act).strip().lower()
            
            is_anomaly_pred = "anomali" in pred_str or "anomaly" in pred_str or "warning" in pred_str or "expired" in pred_str
            is_anomaly_act = "anomali" in act_str or "anomaly" in act_str or "warning" in act_str or "expired" in act_str
            
            if is_anomaly_pred and is_anomaly_act:
                tp += 1
            elif not is_anomaly_pred and not is_anomaly_act:
                tn += 1
            elif is_anomaly_pred and not is_anomaly_act:
                fp += 1
            elif not is_anomaly_pred and is_anomaly_act:
                fn += 1
                
            is_correct = (pred_str == act_str) or (is_anomaly_pred == is_anomaly_act)
            if is_correct:
                correct_count += 1
                status = "correct"
                note = "Klasifikasi Sesuai Kondisi Aktual"
            else:
                incorrect_count += 1
                status = "incorrect"
                note = f"Misklasifikasi: Prediksi '{pred}' vs Aktual '{act}'"
                
            details.append({
                "sample_id": s_id,
                "input_data": input_data,
                "predicted_result": str(pred),
                "actual_result": str(act),
                "error_value": 0 if is_correct else 1,
                "evaluation_status": status,
                "notes": note
            })

    # Calculations
    evaluated_count = correct_count + incorrect_count
    accuracy = (correct_count / evaluated_count * 100.0) if evaluated_count > 0 else 0.0
    
    mae = (sum(abs_errors) / len(abs_errors)) if abs_errors else None
    mape = (sum(pct_errors) / len(pct_errors)) if pct_errors else None
    
    precision = (tp / (tp + fp) * 100.0) if (tp + fp) > 0 else None
    recall = (tp / (tp + fn) * 100.0) if (tp + fn) > 0 else None
    
    f1 = None
    if precision is not None and recall is not None and (precision + recall) > 0:
        f1 = (2 * precision * recall) / (precision + recall)
        
    duration = round(time.time() - start_time, 3)
    
    return {
        "total_samples": total_samples,
        "evaluated_samples": evaluated_count,
        "correct_results": correct_count,
        "incorrect_results": incorrect_count,
        "pending_results": pending_count,
        "failed_results": failed_count,
        "accuracy": round(accuracy, 2),
        "mae": round(mae, 2) if mae is not None else None,
        "mape": round(mape, 2) if mape is not None else None,
        "precision": round(precision, 2) if precision is not None else None,
        "recall": round(recall, 2) if recall is not None else None,
        "f1_score": round(f1, 2) if f1 is not None else None,
        "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "processing_time": duration,
        "details": details
    }
