import React, { useState, useEffect } from 'react';
import {
  Activity, CheckCircle2, XCircle, Clock, AlertTriangle, Play,
  Download, RefreshCw, Filter, Search, ArrowUpRight, ArrowDownRight,
  BarChart3, LineChart as LineChartIcon, FileText, Database, ShieldAlert,
  ChevronRight, Check, Sparkles, Layers, Sliders, Calendar, Info
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import api from '@/services/api';
import { clsx, formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function AiPerformancePage() {
  // State data
  const [overview, setOverview] = useState(null);
  const [stats, setStats] = useState(null);
  const [models, setModels] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendPeriod, setTrendPeriod] = useState('monthly'); // daily, weekly, monthly, yearly
  const [trendModelId, setTrendModelId] = useState('all');
  const [errorData, setErrorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedRunDetail, setSelectedRunDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Testing Studio Modal State
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testingRunning, setTestingRunning] = useState(false);
  const [selectedModelForTest, setSelectedModelForTest] = useState(1);
  const [datasetSource, setDatasetSource] = useState('preset_prd'); // preset_prd, historical, custom_sample
  const [sampleSize, setSampleSize] = useState(10);
  const [testResult, setTestResult] = useState(null);

  // Table filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyModelFilter, setHistoryModelFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);

  // Active Tab: overview vs testing vs history vs error
  const [activeTab, setActiveTab] = useState('overview');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [ovRes, stRes, mdRes, trRes, erRes, hiRes] = await Promise.all([
        api.getAiPerformanceOverview(),
        api.getAiPerformanceStatistics(),
        api.getAiPerformanceModels(),
        api.getAiPerformanceTrends({ period: trendPeriod, model_id: trendModelId }),
        api.getAiPerformanceErrors(),
        api.getAiPerformanceHistory({ page: historyPage, search: historySearch, model_id: historyModelFilter }),
      ]);

      setOverview(ovRes.data.data);
      setStats(stRes.data.data);
      setModels(mdRes.data.data);
      setTrends(trRes.data.data);
      setErrorData(erRes.data.data);
      setHistory(hiRes.data.data);

      if (mdRes.data.data.length > 0 && !selectedModelForTest) {
        setSelectedModelForTest(mdRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data evaluasi performa AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [trendPeriod, trendModelId]);

  const handleTrendPeriodChange = (p) => {
    setTrendPeriod(p);
  };

  const handleRunTest = async () => {
    setTestingRunning(true);
    setTestResult(null);
    try {
      const modelObj = models.find(m => m.id === selectedModelForTest);
      const datasetLabel = datasetSource === 'preset_prd'
        ? `Dataset Uji PRD (${modelObj?.model_name || 'Benchmark'})`
        : `Data Historis Riil (${sampleSize} Sampel)`;

      const payload = {
        model_id: selectedModelForTest,
        dataset_source: datasetSource,
        dataset_name: datasetLabel,
        sample_size: sampleSize,
      };

      const res = await api.runAiPerformanceTest(payload);
      toast.success('Pengujian AI berhasil diselesaikan!');
      setTestResult(res.data.data);
      // Refresh overview, models, and history
      api.getAiPerformanceOverview().then(r => setOverview(r.data.data));
      api.getAiPerformanceModels().then(r => setModels(r.data.data));
      api.getAiPerformanceHistory({ page: 1 }).then(r => setHistory(r.data.data));
    } catch (err) {
      console.error(err);
      const errMsg = err?.response?.data?.message || 'Gagal menjalankan pengujian performa AI';
      toast.error(errMsg);
    } finally {
      setTestingRunning(false);
    }
  };

  const handleViewDetail = async (runId) => {
    try {
      const res = await api.getAiPerformanceHistoryDetail(runId);
      setSelectedRunDetail(res.data.data);
    } catch (err) {
      toast.error('Gagal membuka rincian pengujian');
    }
  };

  const handleExport = () => {
    const url = `/api/v1/manager/ai-performance/export?model_id=${trendModelId}`;
    window.open(url, '_blank');
  };

  if (loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <span className="text-sm font-semibold text-gray-600">Memuat AI Performance & Analytics Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-[1600px] mx-auto">
      {/* ── Page Header & Action Bar ── */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit mb-2">
            <Activity size={14} className="stroke-[2.5]" />
            <span>AI Monitoring & Quality Evaluation Engine</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            AI Performance & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pusat pemantauan, verifikasi *ground-truth*, pengujian sampel data, dan evaluasi ketepatan model AI SmartStock.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => { setTestModalOpen(true); setTestResult(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Play size={15} className="stroke-[2.5]" />
            <span>Uji Sampel AI Baru</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 shadow-2xs transition cursor-pointer"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={loadAllData}
            title="Muat Ulang"
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-gray-200/70 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Ringkasan & Model', icon: BarChart3 },
          { id: 'trends', label: 'Tren Akurasi & Waktu', icon: LineChartIcon },
          { id: 'prediction_vs_actual', label: 'Prediksi vs Aktual', icon: Layers },
          { id: 'errors', label: 'Analisis Kesalahan (Error)', icon: ShieldAlert },
          { id: 'history', label: 'Riwayat Pengujian', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            )}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── PRD 4.A: AI Performance Overview (Top Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Accuracy */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Accuracy</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-700 tracking-tight">
                {overview?.overall_accuracy ?? 0}%
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center">
                <ArrowUpRight size={14} /> +2.4%
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Formula: (Benar / Ter-evaluasi) × 100%
            </p>
          </div>
        </div>

        {/* Total Processed Data */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Data Diproses</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Database size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-gray-900 tracking-tight">
              {(overview?.total_processed_data ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">
              Semua transaksi & data log inventaris
            </p>
          </div>
        </div>

        {/* Correct Results */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hasil Benar (Correct)</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Check size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700 tracking-tight">
              {(overview?.correct_results ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">
              Sesuai 100% dengan kondisi aktual
            </p>
          </div>
        </div>

        {/* Incorrect Results */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hasil Salah (Incorrect)</span>
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <XCircle size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-600 tracking-tight">
              {(overview?.incorrect_results ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-rose-500 mt-1 font-medium">
              Selisih prediksi / anomali terlewat
            </p>
          </div>
        </div>

        {/* Pending Evaluation */}
        <div className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Evaluation</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Clock size={18} />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-600 tracking-tight">
              {(overview?.pending_evaluation ?? 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">
              Menunggu pembanding fisik (Ground Truth)
            </p>
          </div>
        </div>
      </div>

      {/* ── PRD 4.B: AI Processing Statistics Bar ── */}
      {stats && (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 shadow-md border border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-700/60">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Pipeline Monitoring & Processing Stats
              </span>
              <h3 className="text-lg font-black tracking-tight text-white mt-0.5">
                Statistik Pemrosesan & Keandalan Analisis AI
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-gray-300">Success Rate: <strong className="text-white">{stats.success_rate}%</strong></span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="text-gray-300">Rata-rata Durasi: <strong className="text-white">{stats.avg_processing_duration}s</strong></div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-5">
            <div>
              <span className="text-[11px] text-gray-400 font-medium">Data Diterima</span>
              <div className="text-xl font-extrabold text-white mt-0.5">{stats.total_received.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[11px] text-emerald-400 font-medium">Berhasil Diproses</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{stats.total_processed.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[11px] text-rose-400 font-medium">Gagal Diproses</span>
              <div className="text-xl font-extrabold text-rose-400 mt-0.5">{stats.total_failed.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[11px] text-blue-400 font-medium">Lolos Validasi</span>
              <div className="text-xl font-extrabold text-blue-400 mt-0.5">{stats.passed_validation.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[11px] text-amber-400 font-medium">Ditolak / Invalid</span>
              <div className="text-xl font-extrabold text-amber-400 mt-0.5">{stats.rejected_validation.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-[11px] text-purple-400 font-medium">Analisis Selesai</span>
              <div className="text-xl font-extrabold text-purple-400 mt-0.5">{stats.analyses_completed.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 1: OVERVIEW & 4 AI MODELS ACCURACY (PRD 4.C) ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                AI Model Accuracy & Specialized Metrics
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluasi performa 4 model AI terpisah dengan metrik kuantitatif sesuai karakteristik pekerjaannya.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {models.map(m => (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between hover:border-emerald-200 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                          {m.model_version}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {m.status.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-gray-900 mt-2">
                        {m.model_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-2xl font-black text-emerald-700">
                        {m.accuracy}%
                      </span>
                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">
                        Akurasi
                      </span>
                    </div>
                  </div>

                  {/* Specialized Metric Cards */}
                  <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {m.model_name === 'Stock Prediction AI' && (
                      <>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">MAE (Unit Error)</span>
                          <span className="text-base font-extrabold text-gray-900">{m.metrics?.mae ?? '-'} unit</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">MAPE (%)</span>
                          <span className="text-base font-extrabold text-emerald-700">{m.metrics?.mape ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Exact Match</span>
                          <span className="text-base font-extrabold text-gray-900">{m.metrics?.exact_match_pct ?? '-'}%</span>
                        </div>
                      </>
                    )}

                    {m.model_name === 'Anomaly Detection AI' && (
                      <>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Precision</span>
                          <span className="text-base font-extrabold text-emerald-700">{m.metrics?.precision ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Recall</span>
                          <span className="text-base font-extrabold text-emerald-700">{m.metrics?.recall ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">F1-Score</span>
                          <span className="text-base font-extrabold text-purple-700">{m.metrics?.f1_score ?? '-'}%</span>
                        </div>
                      </>
                    )}

                    {m.model_name === 'Stock Recommendation AI' && (
                      <>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Acceptance Rate</span>
                          <span className="text-base font-extrabold text-emerald-700">{m.metrics?.acceptance_rate ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Disetujui</span>
                          <span className="text-base font-extrabold text-gray-900">{m.metrics?.accepted_count ?? '-'} Rekomendasi</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Ditolak</span>
                          <span className="text-base font-extrabold text-rose-600">{m.metrics?.rejected_count ?? '-'}</span>
                        </div>
                      </>
                    )}

                    {m.model_name === 'Expiry Detection AI' && (
                      <>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Kepatuhan Simpan</span>
                          <span className="text-base font-extrabold text-emerald-700">{m.metrics?.shelf_life_accuracy ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">Presisi H-30 Warning</span>
                          <span className="text-base font-extrabold text-gray-900">{m.metrics?.early_warning_precision ?? '-'}%</span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-3">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">False Alarms</span>
                          <span className="text-base font-extrabold text-rose-600">{m.metrics?.false_alarms ?? '-'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-xs text-gray-400 border-t border-gray-100">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Info size={13} /> Target: {m.metrics?.comparison_target ?? 'Data Riil'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedModelForTest(m.id);
                      setTestModalOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Uji Model Ini</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: AI ACCURACY TREND (PRD 4.D) ── */}
      {activeTab === 'trends' && (
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Tren Perkembangan Akurasi AI
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Memantau kestabilan performa prediksi terhadap data waktu berkala.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                {[
                  { id: 'daily', label: 'Harian' },
                  { id: 'weekly', label: 'Mingguan' },
                  { id: 'monthly', label: 'Bulanan' },
                  { id: 'yearly', label: 'Tahunan' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleTrendPeriodChange(p.id)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer',
                      trendPeriod === p.id ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <select
                value={trendModelId}
                onChange={e => setTrendModelId(e.target.value)}
                className="bg-gray-100 text-xs font-bold px-3 py-1.5 rounded-xl border-none outline-none text-gray-700"
              >
                <option value="all">Semua Model AI</option>
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.model_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="period_label" tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" />
                <YAxis domain={[70, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} stroke="#e5e7eb" unit="%" />
                <Tooltip
                  formatter={(val, name) => [`${val}%`, 'Akurasi']}
                  labelFormatter={(lbl) => `Periode: ${lbl}`}
                  contentStyle={{ borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="accuracy" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#accuracyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            {trends.slice(-4).map((t, idx) => (
              <div key={idx} className="bg-gray-50 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-gray-500 block">{t.period_label}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-extrabold text-gray-900">{t.accuracy}%</span>
                  <span className={clsx(
                    'text-xs font-bold flex items-center',
                    t.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  )}>
                    {t.delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {t.delta > 0 ? `+${t.delta}%` : `${t.delta}%`}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">Sampel: {t.samples.toLocaleString()} item</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: PREDICTION VS ACTUAL DATA TABLE (PRD 4.F) ── */}
      {activeTab === 'prediction_vs_actual' && (
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  Perbandingan Langsung: Prediksi AI vs Data Aktual
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  Ground Truth Verification
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Menilai akurasi numerik dengan MAE & MAPE serta kesesuaian klasifikasi status inventaris.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-xs font-bold text-gray-700">
                Benchmark MAE: <strong className="text-gray-900">4.0 Unit</strong>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-xs font-bold text-emerald-800">
                Benchmark MAPE: <strong className="text-emerald-900">2.11%</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Sample ID & Item</th>
                  <th className="py-3 px-4">Prediksi AI</th>
                  <th className="py-3 px-4">Kondisi Aktual</th>
                  <th className="py-3 px-4">Selisih (Error)</th>
                  <th className="py-3 px-4">Status Evaluasi</th>
                  <th className="py-3 px-4">Catatan Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { id: 'SMP-STK-001', item: 'Karton Corrugated A3', pred: '100', act: '100', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-002', item: 'Karton Box B4 Duplex', pred: '200', act: '200', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-003', item: 'Paper Roll Kraft 50cm', pred: '150', act: '150', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-004', item: 'Karton Corrugated A1', pred: '300', act: '320', err: 20, status: 'incorrect', note: 'Selisih 20 unit (Deviasi 6.25%)' },
                  { id: 'SMP-STK-005', item: 'Paper Roll Medium 60cm', pred: '250', act: '250', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-006', item: 'Karton Box C5 Heavy', pred: '400', act: '400', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-007', item: 'Sheet Kraft Single Wall', pred: '180', act: '180', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-008', item: 'Karton Box Master D1', pred: '220', act: '200', err: 20, status: 'incorrect', note: 'Selisih 20 unit (Deviasi 10.0%)' },
                  { id: 'SMP-STK-009', item: 'Paper Roll Liner 40cm', pred: '350', act: '350', err: 0, status: 'correct', note: 'Presisi 100%' },
                  { id: 'SMP-STK-010', item: 'Karton Corrugated A4 Pack', pred: '500', act: '500', err: 0, status: 'correct', note: 'Presisi 100%' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <div>{row.item}</div>
                      <span className="text-[10px] font-normal text-gray-400">{row.id}</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">{row.pred}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-800">{row.act}</td>
                    <td className="py-3 px-4 font-mono">
                      {row.err > 0 ? (
                        <span className="text-rose-600 font-bold">+{row.err} Unit</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">0 Unit (Tepat)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {row.status === 'correct' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <Check size={12} /> Benar
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle size={12} /> Selisih
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: ERROR ANALYSIS (PRD 4.G) ── */}
      {activeTab === 'errors' && errorData && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  Analisis Kesalahan & Pola Deviasi AI
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Mendiagnosis kelemahan inferensi untuk penyempurnaan parameter heuristik & algoritma.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500">Tingkat Kesalahan Sistem:</span>
                <span className="text-xl font-black text-rose-600">{errorData.error_rate}%</span>
              </div>
            </div>

            {/* Error Type Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6">
              {errorData.error_types.map((errItem, idx) => (
                <div key={idx} className="bg-gray-50 rounded-2xl p-4.5 border border-gray-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-gray-900">{errItem.type}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        {errItem.percentage}% ({errItem.count} kasus)
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{errItem.description}</p>
                    <div className="mt-2 text-[11px] text-gray-500">
                      <strong>Dampak:</strong> {errItem.impact}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200/60 text-[11px] text-emerald-800 font-semibold bg-emerald-50/70 p-2.5 rounded-xl">
                    💡 <strong>Rekomendasi Evaluasi:</strong> {errItem.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model with declining performance */}
          {errorData.declining_model && (
            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200/80">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-white">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-amber-900">
                    Peringatan Model: {errorData.declining_model.model_name}
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    {errorData.declining_model.reason}
                  </p>
                  <p className="text-xs text-amber-900 font-bold mt-2">
                    Action Plan: {errorData.declining_model.action_plan}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 5: AI EVALUATION HISTORY (PRD 4.H) ── */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                Riwayat Pengujian & Evaluasi AI
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Arsip audit komprehensif seluruh pengujian sampel historis dan kustom.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari pengujian..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-gray-100 text-xs font-medium text-gray-800 outline-none w-48"
                />
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <Download size={13} />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">ID Pengujian</th>
                  <th className="py-3 px-4">Nama Model AI</th>
                  <th className="py-3 px-4">Versi</th>
                  <th className="py-3 px-4">Tanggal Uji</th>
                  <th className="py-3 px-4">Jumlah Sampel</th>
                  <th className="py-3 px-4">Hasil Akurasi</th>
                  <th className="py-3 px-4">Kesalahan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map(run => (
                  <tr key={run.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-gray-800">
                      EVL-{String(run.id).padStart(4, '0')}
                    </td>
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {run.model?.model_name ?? 'AI Model'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                        {run.model?.model_version ?? 'v1.0.0'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {formatDatetime(run.evaluation_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">
                      {run.total_samples} Sampel
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-emerald-700">
                        {run.accuracy !== null ? `${run.accuracy}%` : '-'}
                      </span>
                      {run.mae !== null && (
                        <span className="block text-[10px] text-gray-400 font-mono">MAE: {run.mae}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-rose-600 font-bold">
                      {run.incorrect_results} Item
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                        {run.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleViewDetail(run.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                      >
                        Lihat Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: SAMPLE DATA TESTING STUDIO (PRD 4.E & SECTION 6) ── */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Sample Data Testing Studio
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-1">
                  Uji Kemampuan & Ketepatan AI
                </h3>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  1. Pilih Model AI yang Akan Diuji
                </label>
                <select
                  value={selectedModelForTest}
                  onChange={e => setSelectedModelForTest(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-600"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.model_name} ({m.model_version})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  2. Sumber Dataset Pengujian
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDatasetSource('preset_prd')}
                    className={clsx(
                      'p-3.5 rounded-2xl border text-left text-xs transition cursor-pointer',
                      datasetSource === 'preset_prd'
                        ? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-900'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <div className="font-extrabold">Dataset Uji PRD (10 Sampel)</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">Benchmark standar sesuai PRD Bagian 6</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDatasetSource('historical')}
                    className={clsx(
                      'p-3.5 rounded-2xl border text-left text-xs transition cursor-pointer',
                      datasetSource === 'historical'
                        ? 'border-emerald-600 bg-emerald-50/60 font-bold text-emerald-900'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    )}
                  >
                    <div className="font-extrabold">Data Historis Riil</div>
                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">Mengambil transaksi inventaris nyata</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  3. Jumlah Sampel yang Diuji
                </label>
                <div className="flex gap-2">
                  {[10, 25, 50].map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSampleSize(sz)}
                      className={clsx(
                        'px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer',
                        sampleSize === sz ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-700 border-gray-200'
                      )}
                    >
                      {sz} Sampel
                    </button>
                  ))}
                </div>
              </div>

              {testResult && (
                <div className="mt-4 p-4.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span>Pengujian Berhasil: Akurasi {testResult.accuracy}%</span>
                      </div>
                      <div className="text-[11px] text-emerald-800 mt-0.5">
                        Model: <strong>{testResult.model?.model_name}</strong> | Waktu Proses: <strong>{testResult.processing_time}s</strong>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTestModalOpen(false);
                        setActiveTab('history');
                      }}
                      className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                    >
                      Buka di Tab Riwayat →
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Sampel</span>
                      <strong className="text-sm font-black text-gray-800">{testResult.total_samples}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-emerald-700">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Hasil Benar</span>
                      <strong className="text-sm font-black text-emerald-700">{testResult.correct_results}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-rose-600">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Hasil Salah</span>
                      <strong className="text-sm font-black text-rose-600">{testResult.incorrect_results}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-100 text-gray-900">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">
                        {testResult.mae !== null ? 'MAE' : 'Precision'}
                      </span>
                      <strong className="text-sm font-black text-gray-900">
                        {testResult.mae !== null ? `${testResult.mae} unit` : (testResult.precision !== null ? `${testResult.precision}%` : '-')}
                      </strong>
                    </div>
                  </div>

                  {/* Sample Details Table inside Modal */}
                  {testResult.details && testResult.details.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                      <span className="text-[11px] font-extrabold text-emerald-950 block">
                        Rincian Hasil Per Sampel Data:
                      </span>
                      <div className="max-h-52 overflow-y-auto rounded-xl border border-emerald-200 bg-white">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-emerald-50 text-emerald-900 font-bold uppercase text-[9px] sticky top-0 border-b border-emerald-100">
                            <tr>
                              <th className="py-2 px-3">Sampel & Item</th>
                              <th className="py-2 px-3">Prediksi AI</th>
                              <th className="py-2 px-3">Data Aktual</th>
                              <th className="py-2 px-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {testResult.details.map((d, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50">
                                <td className="py-2 px-3 font-semibold text-gray-900">
                                  {d.input_data?.item || d.input_data?.sku || d.sample_id}
                                </td>
                                <td className="py-2 px-3 font-mono text-gray-700">{d.predicted_result}</td>
                                <td className="py-2 px-3 font-mono text-gray-700">{d.actual_result ?? '-'}</td>
                                <td className="py-2 px-3">
                                  <span className={clsx(
                                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                                    d.evaluation_status === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  )}>
                                    {d.evaluation_status === 'correct' ? 'Benar' : 'Salah'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={testingRunning}
                onClick={handleRunTest}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                {testingRunning ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Mengevaluasi Model...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Jalankan Pengujian Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RUN DETAIL DRILL-DOWN (PRD 4.H) ── */}
      {selectedRunDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-4xl w-full shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-gray-900">
                    Rincian Pengujian: EVL-{String(selectedRunDetail.id).padStart(4, '0')}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {selectedRunDetail.accuracy}% AKURASI
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Model: <strong>{selectedRunDetail.model?.model_name}</strong> ({selectedRunDetail.model?.model_version}) | Dataset: {selectedRunDetail.dataset_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedRunDetail(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Sampel</th>
                    <th className="py-2.5 px-3">Prediksi AI</th>
                    <th className="py-2.5 px-3">Data Aktual</th>
                    <th className="py-2.5 px-3">Selisih</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedRunDetail.details?.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-bold text-gray-800">{d.sample_id}</td>
                      <td className="py-2.5 px-3 font-mono">{d.predicted_result}</td>
                      <td className="py-2.5 px-3 font-mono">{d.actual_result ?? '-'}</td>
                      <td className="py-2.5 px-3 font-mono">{d.error_value !== null ? d.error_value : '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          d.evaluation_status === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        )}>
                          {d.evaluation_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 text-[11px]">{d.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                onClick={() => setSelectedRunDetail(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
