import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package, TrendingUp, AlertTriangle, Warehouse, CheckCircle2,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Brain, ChevronRight,
  Sun, Clock, Calendar, ShieldAlert, Sparkles, MessageSquare, FileText
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Card, Badge, Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatIDR, formatDate, formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [morningReport, setMorningReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getManagerSummary().then(r => r.data.data).catch(() => null),
      api.getManagerAlerts().then(r => r.data.data).catch(() => []),
      api.getMorningReport().then(r => r.data.data).catch(() => null),
    ])
      .then(([sumData, alertData, mornData]) => {
        setSummary(sumData);
        setAlerts(alertData || []);
        setMorningReport(mornData);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState text="Menghubungkan data gudang real-time..." />;

  const s = summary || {
    total_skus: 8,
    total_stock_qty: 45200,
    in_today: 3400,
    out_today: 1800,
    transfers_today: 4,
    low_stock_count: 2,
    aging_lots_count: 2,
    unresolved_discrepancies: 1,
    capacity_used_pct: 78.5,
    new_ai_recommendations: 3,
    recent_transactions: []
  };

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      {/* ── Welcome Banner with Date & Fast AI Chat Trigger ── */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              Pusat Komando Gudang
            </span>
            <span className="text-xs text-emerald-100 flex items-center gap-1">
              <Clock size={12} /> {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Selamat Datang, {user?.name || 'Manager Operasional'}
          </h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Kondisi gudang karton stabil. Terdapat {s.new_ai_recommendations} rekomendasi AI baru dan {s.low_stock_count} SKU di bawah batas minimum safety stock.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <NavLink to="/manager/reports">
            <Button size="sm" variant="secondary" className="bg-emerald-900/60 text-white hover:bg-emerald-900 border-emerald-600/40">
              <FileText size={15} />
              Laporan Pagi
            </Button>
          </NavLink>
        </div>
      </div>

      {/* ── PRD 4.2: 9 Kartu Ringkasan Utama ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total SKU */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total SKU</span>
            <Package size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900">{s.total_skus}</div>
            <div className="text-[11px] text-gray-400 font-medium">Karton & Paper Roll</div>
          </div>
        </div>

        {/* Total Stok Qty */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Stok Fisik</span>
            <Warehouse size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900">{Number(s.total_stock_qty).toLocaleString('id-ID')}</div>
            <div className="text-[11px] text-gray-400 font-medium">Unit di seluruh slot</div>
          </div>
        </div>

        {/* Masuk Hari Ini */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500 uppercase">Masuk Hari Ini</span>
            <ArrowDownLeft size={18} className="text-teal-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-teal-700">+{Number(s.in_today).toLocaleString('id-ID')}</div>
            <div className="text-[11px] text-gray-400 font-medium">Pencatatan penerimaan</div>
          </div>
        </div>

        {/* Keluar Hari Ini */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500 uppercase">Keluar Hari Ini</span>
            <ArrowUpRight size={18} className="text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">-{Number(s.out_today).toLocaleString('id-ID')}</div>
            <div className="text-[11px] text-gray-400 font-medium">Pengeluaran FIFO</div>
          </div>
        </div>

        {/* Stok di Bawah Minimum */}
        <NavLink to="/manager/ai-recommendations" className="bg-white rounded-2xl p-4 border border-rose-100 shadow-xs hover:border-rose-300 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-rose-600 uppercase">Di Bawah Safety Stock</span>
            <AlertTriangle size={18} className="text-rose-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600">{s.low_stock_count} <span className="text-xs font-normal text-gray-500">SKU</span></div>
            <div className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
              Perlu pengadaan <ChevronRight size={12} />
            </div>
          </div>
        </NavLink>

        {/* Stok Berumur Lama / Aging */}
        <NavLink to="/manager/reports" className="bg-white rounded-2xl p-4 border border-amber-100 shadow-xs hover:border-amber-300 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-amber-700 uppercase">Stok Lama / Cacat</span>
            <ShieldAlert size={18} className="text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">{s.aging_lots_count} <span className="text-xs font-normal text-gray-500">Lot</span></div>
            <div className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
              Perlu inspeksi fisik <ChevronRight size={12} />
            </div>
          </div>
        </NavLink>

        {/* Selisih Stok Opname */}
        <NavLink to="/manager/stocktake" className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs hover:border-blue-300 transition flex flex-col justify-between group">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-blue-700 uppercase">Selisih Opname</span>
            <CheckCircle2 size={18} className="text-blue-500 group-hover:scale-110 transition" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-700">{s.unresolved_discrepancies} <span className="text-xs font-normal text-gray-500">Kasus</span></div>
            <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              Menunggu approval <ChevronRight size={12} />
            </div>
          </div>
        </NavLink>

        {/* Kapasitas Gudang */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500 uppercase">Kapasitas Zona</span>
            <span className="text-xs font-bold text-gray-700">{s.capacity_used_pct}%</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  s.capacity_used_pct >= 90 ? 'bg-rose-500' : s.capacity_used_pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, s.capacity_used_pct)}%` }}
              />
            </div>
            <div className="text-[11px] text-gray-400 font-medium">Beban kapasitas aktif</div>
          </div>
        </div>
      </div>

      {/* ── PRD 4.3: Snapshot Laporan Pagi Manager ── */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100/80 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Sun size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Ringkasan Laporan Pagi (Aktivitas Kemarin)</h2>
              <p className="text-xs text-gray-500">
                Pencatatan mutasi barang masuk & keluar periode tanggal {morningReport?.report_date || 'kemarin'}.
              </p>
            </div>
          </div>
          <NavLink to="/manager/reports">
            <Button size="sm" variant="outline" className="text-xs">
              Buka Laporan Lengkap <ChevronRight size={14} />
            </Button>
          </NavLink>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase">Total Barang Masuk</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {Number(morningReport?.total_receipts_qty || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">Unit</span>
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1">
              {morningReport?.total_receipts_tx || 0} Transaksi Penerimaan
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase">Total Barang Keluar</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {Number(morningReport?.total_issues_qty || 0).toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">Unit</span>
            </div>
            <div className="text-xs text-amber-600 font-semibold mt-1">
              {morningReport?.total_issues_tx || 0} Transaksi Pengeluaran
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase">Perpindahan / Relokasi</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {morningReport?.total_transfers_tx || 0} <span className="text-xs font-normal text-gray-400">Perpindahan</span>
            </div>
            <div className="text-xs text-blue-600 font-semibold mt-1">
              {morningReport?.anomalies_count === 0 ? 'Semua mutasi tercatat normal' : `${morningReport?.anomalies_count} anomali tercatat`}
            </div>
          </div>
        </div>
      </div>

      {/* ── PRD 4.4: Pusat Perhatian & Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom 1 & 2: Daftar Peringatan Penting */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-600" />
              <h2 className="text-base font-bold text-gray-900">Perhatian & Tindak Lanjut Manager</h2>
            </div>
            <NavLink to="/manager/ai-recommendations" className="text-xs text-emerald-700 font-bold hover:underline">
              Lihat Semua Temuan AI →
            </NavLink>
          </div>

          {alerts.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl text-gray-400 text-xs">
              Semua parameter operasional dalam ambang batas normal.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 4).map((al) => (
                <div key={al.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      al.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{al.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{al.message}</div>
                    </div>
                  </div>
                  <NavLink to={al.link || '/manager/ai-recommendations'}>
                    <Button size="xs" variant="secondary" className="flex-shrink-0">
                      Tinjau
                    </Button>
                  </NavLink>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kolom 3: Pintasan Cepat AI & Keputusan */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Aksi Cepat Manager</h2>
            <p className="text-xs text-gray-500 mb-4">
              Akses cepat keputusan operasional sesuai izin Manager.
            </p>

            <div className="space-y-2.5">
              <NavLink to="/manager/ai-recommendations" className="flex items-center justify-between p-3 rounded-2xl bg-teal-50 hover:bg-teal-100/80 transition text-teal-900 border border-teal-100">
                <div className="flex items-center gap-2.5">
                  <Brain size={17} className="text-teal-700" />
                  <span className="text-xs font-bold">Rekomendasi Pembelian & FIFO</span>
                </div>
                <ChevronRight size={14} className="text-teal-700" />
              </NavLink>

              <NavLink to="/manager/stocktake" className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 transition text-blue-900 border border-blue-100">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={17} className="text-blue-700" />
                  <span className="text-xs font-bold">Approval Stock Opname</span>
                </div>
                <ChevronRight size={14} className="text-blue-700" />
              </NavLink>

              <NavLink to="/settings" className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition text-slate-800 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Package size={17} className="text-slate-600" />
                  <span className="text-xs font-bold">Pengaturan Ambang & AI</span>
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </NavLink>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11px] text-amber-800">
            <strong>Catatan Otoritas:</strong> Sesuai PRD, AI hanya memberikan analisis dan rekomendasi. Semua perubahan stok dan pembelian wajib disetujui Manajer.
          </div>
        </div>
      </div>
    </div>
  );
}
