<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AiModel;
use App\Models\AiModelVersion;
use App\Models\AiEvaluationRun;
use App\Models\AiEvaluationDetail;
use App\Models\AiProcessingLog;
use App\Models\User;
use Carbon\Carbon;

class AiPerformanceSeeder extends Seeder
{
    public function run(): void
    {
        $manager = User::where('email', 'manager@smartstock.id')->first() ?? User::first();

        // 1. Models (PRD 4.C)
        $stockPredModel = AiModel::firstOrCreate(
            ['model_name' => 'Stock Prediction AI'],
            [
                'model_type' => 'prediction',
                'model_version' => 'v1.2.0',
                'status' => 'active',
                'description' => 'Memprediksi kebutuhan stok bahan karton dan paper roll berdasarkan tren permintaan historis dan rasio pemakaian produksi.',
            ]
        );

        $anomalyModel = AiModel::firstOrCreate(
            ['model_name' => 'Anomaly Detection AI'],
            [
                'model_type' => 'anomaly_detection',
                'model_version' => 'v1.3.1',
                'status' => 'active',
                'description' => 'Mendeteksi ketidaksesuaian stok opname dan anomali transaksi gudang dengan ambang deviasi 2.0%.',
            ]
        );

        $reorderModel = AiModel::firstOrCreate(
            ['model_name' => 'Stock Recommendation AI'],
            [
                'model_type' => 'recommendation',
                'model_version' => 'v2.0.0',
                'status' => 'active',
                'description' => 'Memberikan rekomendasi pembelian kembali stok karton berdasarkan safety stock, buffer 14 hari, dan lead time vendor.',
            ]
        );

        $expiryModel = AiModel::firstOrCreate(
            ['model_name' => 'Expiry Detection AI'],
            [
                'model_type' => 'classification',
                'model_version' => 'v1.1.4',
                'status' => 'active',
                'description' => 'Mengidentifikasi lot karton dan roll mendekati batas masa simpan maksimal (730 hari untuk roll, 180 hari untuk box) dan kondisi fisik.',
            ]
        );

        // 2. Model Versions (PRD 8.E)
        $models = [$stockPredModel, $anomalyModel, $reorderModel, $expiryModel];
        foreach ($models as $m) {
            AiModelVersion::firstOrCreate(
                ['model_id' => $m->id, 'version' => $m->model_version],
                [
                    'change_description' => 'Peningkatan presisi kalkulasi metrik deterministik dan integrasi ground-truth validation.',
                    'deployment_date' => Carbon::now()->subDays(15),
                    'status' => 'active',
                ]
            );
            AiModelVersion::firstOrCreate(
                ['model_id' => $m->id, 'version' => 'v1.0.0'],
                [
                    'change_description' => 'Rilis baseline awal algoritma heuristik pergudangan.',
                    'deployment_date' => Carbon::now()->subMonths(3),
                    'status' => 'archived',
                ]
            );
        }

        // 3. Processing Logs (PRD 4.B & 8.D)
        $processes = [
            ['model' => $stockPredModel, 'type' => 'batch_prediction', 'in' => 4500, 'suc' => 4420, 'fail' => 80, 'dur' => 0.24, 'status' => 'success'],
            ['model' => $anomalyModel, 'type' => 'realtime_analysis', 'in' => 3800, 'suc' => 3780, 'fail' => 20, 'dur' => 0.18, 'status' => 'success'],
            ['model' => $reorderModel, 'type' => 'batch_recommendation', 'in' => 4200, 'suc' => 4150, 'fail' => 50, 'dur' => 0.31, 'status' => 'success'],
            ['model' => $expiryModel, 'type' => 'scheduled_evaluation', 'in' => 2980, 'suc' => 2940, 'fail' => 40, 'dur' => 0.15, 'status' => 'success'],
        ];

        foreach ($processes as $p) {
            AiProcessingLog::create([
                'model_id' => $p['model']->id,
                'process_type' => $p['type'],
                'input_count' => $p['in'],
                'success_count' => $p['suc'],
                'failed_count' => $p['fail'],
                'processing_duration' => $p['dur'],
                'status' => $p['status'],
                'created_at' => Carbon::now()->subHours(rand(1, 48)),
            ]);
        }

        // 4. Evaluation Runs & Details (PRD Section 4.E, 4.F, and Section 6)
        // Run 1: Stock Prediction AI — Benchmark Uji Sampel 10 Item PRD Section 6
        $run1 = AiEvaluationRun::create([
            'model_id' => $stockPredModel->id,
            'dataset_name' => 'Dataset Uji Kebutuhan Stok Karton (PRD Section 6)',
            'test_type' => 'custom_sample',
            'total_samples' => 10,
            'correct_results' => 8,
            'incorrect_results' => 2,
            'failed_results' => 0,
            'pending_results' => 0,
            'accuracy' => 80.00,
            'mae' => 4.00,
            'mape' => 2.11,
            'precision' => null,
            'recall' => null,
            'f1_score' => null,
            'processing_time' => 0.420,
            'evaluation_date' => Carbon::now()->subDays(1),
            'tested_by' => optional($manager)->id,
            'status' => 'completed',
            'notes' => 'Pengujian 10 sampel kebutuhan stok sesuai spesifikasi PRD Bagian 6.',
        ]);

        $samplesStock = [
            ['id' => 'SMP-STK-001', 'item' => 'Karton Corrugated A3', 'pred' => 100, 'act' => 100, 'stat' => 'correct'],
            ['id' => 'SMP-STK-002', 'item' => 'Karton Box B4 Duplex', 'pred' => 200, 'act' => 200, 'stat' => 'correct'],
            ['id' => 'SMP-STK-003', 'item' => 'Paper Roll Kraft 50cm', 'pred' => 150, 'act' => 150, 'stat' => 'correct'],
            ['id' => 'SMP-STK-004', 'item' => 'Karton Corrugated A1', 'pred' => 300, 'act' => 320, 'stat' => 'incorrect'],
            ['id' => 'SMP-STK-005', 'item' => 'Paper Roll Medium 60cm', 'pred' => 250, 'act' => 250, 'stat' => 'correct'],
            ['id' => 'SMP-STK-006', 'item' => 'Karton Box C5 Heavy', 'pred' => 400, 'act' => 400, 'stat' => 'correct'],
            ['id' => 'SMP-STK-007', 'item' => 'Sheet Kraft Single Wall', 'pred' => 180, 'act' => 180, 'stat' => 'correct'],
            ['id' => 'SMP-STK-008', 'item' => 'Karton Box Master D1', 'pred' => 220, 'act' => 200, 'stat' => 'incorrect'],
            ['id' => 'SMP-STK-009', 'item' => 'Paper Roll Liner 40cm', 'pred' => 350, 'act' => 350, 'stat' => 'correct'],
            ['id' => 'SMP-STK-010', 'item' => 'Karton Corrugated A4 Pack', 'pred' => 500, 'act' => 500, 'stat' => 'correct'],
        ];

        foreach ($samplesStock as $s) {
            $err = abs($s['act'] - $s['pred']);
            AiEvaluationDetail::create([
                'evaluation_run_id' => $run1->id,
                'sample_id' => $s['id'],
                'input_data' => ['sku' => $s['id'], 'product_name' => $s['item']],
                'predicted_result' => (string) $s['pred'],
                'actual_result' => (string) $s['act'],
                'error_value' => $err,
                'evaluation_status' => $s['stat'],
                'notes' => $err > 0 ? "Selisih {$err} unit (MAPE " . round(($err / $s['act']) * 100, 2) . "%)" : "Presisi sempurna 100%",
            ]);
        }

        // Run 2: Anomaly Detection AI — 30 Sampel Stock Opname
        $run2 = AiEvaluationRun::create([
            'model_id' => $anomalyModel->id,
            'dataset_name' => 'Data Verifikasi Audit Opname Fisik Q3-Q4',
            'test_type' => 'historical',
            'total_samples' => 30,
            'correct_results' => 28,
            'incorrect_results' => 2,
            'failed_results' => 0,
            'pending_results' => 2, // pending ground truth audit
            'accuracy' => 93.33,
            'mae' => null,
            'mape' => null,
            'precision' => 94.12,
            'recall' => 92.50,
            'f1_score' => 93.30,
            'processing_time' => 0.580,
            'evaluation_date' => Carbon::now()->subDays(2),
            'tested_by' => optional($manager)->id,
            'status' => 'completed',
            'notes' => 'Pengujian deteksi deviasi stok opname terhadap data investigasi manajer.',
        ]);

        $samplesAnomaly = [
            ['id' => 'ANM-001', 'item' => 'Karton A3 Lot 101', 'pred' => 'Normal (Var: 0.8%)', 'act' => 'Normal', 'stat' => 'correct', 'err' => 0],
            ['id' => 'ANM-002', 'item' => 'Paper Roll Lot 204', 'pred' => 'Anomaly Detected (Var: 4.5%)', 'act' => 'Anomaly Detected', 'stat' => 'correct', 'err' => 0],
            ['id' => 'ANM-003', 'item' => 'Karton B4 Lot 311', 'pred' => 'Normal (Var: 1.2%)', 'act' => 'Normal', 'stat' => 'correct', 'err' => 0],
            ['id' => 'ANM-004', 'item' => 'Paper Roll Lot 109', 'pred' => 'Anomaly Detected (Var: 6.2%)', 'act' => 'Anomaly Detected', 'stat' => 'correct', 'err' => 0],
            ['id' => 'ANM-005', 'item' => 'Karton Corrugated C2', 'pred' => 'Normal (Var: 1.9%)', 'act' => 'Anomaly Detected', 'stat' => 'incorrect', 'err' => 1],
            ['id' => 'ANM-006', 'item' => 'Paper Roll Kraft B2', 'pred' => 'Anomaly Detected (Var: 3.1%)', 'act' => null, 'stat' => 'pending', 'err' => null],
        ];

        foreach ($samplesAnomaly as $s) {
            AiEvaluationDetail::create([
                'evaluation_run_id' => $run2->id,
                'sample_id' => $s['id'],
                'input_data' => ['sku' => $s['id'], 'product_name' => $s['item']],
                'predicted_result' => $s['pred'],
                'actual_result' => $s['act'],
                'error_value' => $s['err'],
                'evaluation_status' => $s['stat'],
                'notes' => $s['stat'] === 'pending' ? 'Menunggu verifikasi fisik recount dari tim audit' : 'Terverifikasi audit',
            ]);
        }

        // Run 3: Stock Recommendation AI — 20 Sampel Rekomendasi Pembelian PO
        $run3 = AiEvaluationRun::create([
            'model_id' => $reorderModel->id,
            'dataset_name' => 'Data Historis Pembelian PO Vendor 60 Hari Terakhir',
            'test_type' => 'historical',
            'total_samples' => 20,
            'correct_results' => 18,
            'incorrect_results' => 2,
            'failed_results' => 0,
            'pending_results' => 1,
            'accuracy' => 90.00,
            'mae' => 12.50,
            'mape' => 3.45,
            'precision' => null,
            'recall' => null,
            'f1_score' => null,
            'processing_time' => 0.390,
            'evaluation_date' => Carbon::now()->subDays(3),
            'tested_by' => optional($manager)->id,
            'status' => 'completed',
            'notes' => 'Rekomendasi ROP dibandingkan dengan realisasi penerbitan PO manajer.',
        ]);

        $samplesReorder = [
            ['id' => 'REC-001', 'item' => 'KRT-A3-001', 'pred' => 'Beli 2.500 Lembar', 'act' => 'Beli 2.500 Lembar (Disetujui)', 'stat' => 'correct', 'err' => 0],
            ['id' => 'REC-002', 'item' => 'PPR-ROLL-50', 'pred' => 'Beli 60 Roll', 'act' => 'Beli 60 Roll (Disetujui)', 'stat' => 'correct', 'err' => 0],
            ['id' => 'REC-003', 'item' => 'KRT-B4-002', 'pred' => 'Beli 1.800 Lembar', 'act' => 'Beli 1.500 Lembar (Disesuaikan)', 'stat' => 'incorrect', 'err' => 300],
            ['id' => 'REC-004', 'item' => 'BBP-INKA-001', 'pred' => 'Beli 25 Kg', 'act' => 'Beli 25 Kg (Disetujui)', 'stat' => 'correct', 'err' => 0],
        ];

        foreach ($samplesReorder as $s) {
            AiEvaluationDetail::create([
                'evaluation_run_id' => $run3->id,
                'sample_id' => $s['id'],
                'input_data' => ['sku' => $s['id'], 'product_name' => $s['item']],
                'predicted_result' => $s['pred'],
                'actual_result' => $s['act'],
                'error_value' => $s['err'],
                'evaluation_status' => $s['stat'],
                'notes' => 'Rekomendasi disetujui Manajer Gudang',
            ]);
        }

        // Run 4: Expiry Detection AI — 25 Sampel Batch Simpan
        $run4 = AiEvaluationRun::create([
            'model_id' => $expiryModel->id,
            'dataset_name' => 'Data Uji Masa Simpan Gudang & Kondisi Fisik',
            'test_type' => 'historical',
            'total_samples' => 25,
            'correct_results' => 24,
            'incorrect_results' => 1,
            'failed_results' => 0,
            'pending_results' => 0,
            'accuracy' => 96.00,
            'mae' => null,
            'mape' => null,
            'precision' => 95.80,
            'recall' => 96.00,
            'f1_score' => 95.90,
            'processing_time' => 0.295,
            'evaluation_date' => Carbon::now()->subDays(4),
            'tested_by' => optional($manager)->id,
            'status' => 'completed',
            'notes' => 'Akurasi deteksi aging batas 730 hari untuk roll dan 180 hari untuk box.',
        ]);

        $samplesExpiry = [
            ['id' => 'EXP-001', 'item' => 'Roll Kertas Lot R-09', 'pred' => 'Active (Umur: 120 Hari)', 'act' => 'Active', 'stat' => 'correct'],
            ['id' => 'EXP-002', 'item' => 'Box Karton Lot B-88', 'pred' => 'Aging_Warning (Umur: 165 Hari)', 'act' => 'Aging_Warning', 'stat' => 'correct'],
            ['id' => 'EXP-003', 'item' => 'Box Karton Lot B-41', 'pred' => 'Expired (Umur: 185 Hari)', 'act' => 'Expired', 'stat' => 'correct'],
            ['id' => 'EXP-004', 'item' => 'Paper Roll Lot R-12', 'pred' => 'Aging_Warning (Umur: 710 Hari)', 'act' => 'Aging_Warning', 'stat' => 'correct'],
            ['id' => 'EXP-005', 'item' => 'Karton Corrugated Lot K-01', 'pred' => 'Aging_Warning (Umur: 155 Hari)', 'act' => 'Active', 'stat' => 'incorrect'],
        ];

        foreach ($samplesExpiry as $s) {
            AiEvaluationDetail::create([
                'evaluation_run_id' => $run4->id,
                'sample_id' => $s['id'],
                'input_data' => ['sku' => $s['id'], 'product_name' => $s['item']],
                'predicted_result' => $s['pred'],
                'actual_result' => $s['act'],
                'error_value' => $s['stat'] === 'correct' ? 0 : 1,
                'evaluation_status' => $s['stat'],
                'notes' => 'Status batch simpan',
            ]);
        }
    }
}
