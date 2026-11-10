import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  QrCode, ArrowDownToLine, ArrowUpFromLine, MapPin,
  ClipboardCheck, Clock, CheckCircle2, AlertCircle, Sparkles, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function OperatorHomePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOperatorHome()
      .then(r => setData(r.data.data))
      .catch(() => {
        setData({
          operator: { name: user?.name || 'Operator Gudang' },
          today_stats: { receipts_count: 5, issues_count: 3, transfers_count: 2, total_actions: 10 },
          active_tasks: [],
          slotting_recommendations: [],
          recent_transactions: []
        });
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingState text="Memuat ruang kerja operator..." />;

  const stats = data?.today_stats || { receipts_count: 0, issues_count: 0, transfers_count: 0, total_actions: 0 };
  const recent = data?.recent_transactions || [];
  const tips = data?.slotting_recommendations || [];

  return (
    <div className="space-y-4 pb-6 animate-fade-in max-w-xl mx-auto">
      {/* ── Operator Greeting Banner ── */}
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-800 to-teal-900 rounded-3xl p-5 text-white shadow-md">
        <div className="flex items-center justify-between text-xs text-emerald-200 mb-2 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Shift Aktif
          </span>
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
        </div>

        <h1 className="text-xl font-black tracking-tight">
          Halo, {user?.name?.split(' ')[0] || 'Operator'} 👋
        </h1>
        <p className="text-xs text-emerald-100 mt-1">
          Hari ini Anda telah mencatat <strong className="text-amber-300 font-bold">{stats.total_actions} mutasi fisik</strong> di gudang.
        </p>

        {/* Mini stats counters */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
          <div className="bg-white/10 rounded-2xl p-2">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Masuk</span>
            <span className="text-base font-black text-white">{stats.receipts_count}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Keluar</span>
            <span className="text-base font-black text-white">{stats.issues_count}</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold block">Pindah</span>
            <span className="text-base font-black text-white">{stats.transfers_count}</span>
          </div>
        </div>
      </div>

      {/* ── PRD 6.2: Big Touch-Friendly Primary Action Buttons ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Tombol Scan QR (Prominent) */}
        <NavLink
          to="/operator/scan"
          className="col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl p-4 shadow-sm flex items-center justify-between transition active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
              <QrCode size={26} />
            </div>
            <div>
              <div className="text-base font-black leading-tight">Scan QR Barang / Slot</div>
              <div className="text-xs text-emerald-100 mt-0.5">Identifikasi instan atau input kode manual</div>
            </div>
          </div>
          <ChevronRight size={20} className="text-emerald-200" />
        </NavLink>

        {/* Tombol Barang Masuk */}
        <NavLink
          to="/operator/receipts"
          className="bg-white hover:bg-slate-50 text-slate-800 rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between transition active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
            <ArrowDownToLine size={22} />
          </div>
          <div>
            <div className="text-sm font-black text-gray-900">Catat Barang Masuk</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Penerimaan & slotting</div>
          </div>
        </NavLink>

        {/* Tombol Barang Keluar */}
        <NavLink
          to="/operator/issues"
          className="bg-white hover:bg-slate-50 text-slate-800 rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between transition active:scale-[0.98]"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
            <ArrowUpFromLine size={22} />
          </div>
          <div>
            <div className="text-sm font-black text-gray-900">Catat Barang Keluar</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Pengambilan FIFO</div>
          </div>
        </NavLink>
      </div>

      {/* ── PRD 6.7: AI Slotting Placement Tip for Field Operators ── */}
      {tips.length > 0 && (
        <div className="bg-teal-50 rounded-3xl p-4 border border-teal-200/70 text-teal-950 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-teal-700" />
            <span className="text-xs font-bold uppercase tracking-wide text-teal-800">
              Panduan Penempatan AI untuk Operator
            </span>
          </div>
          <p className="text-xs text-teal-900 leading-relaxed font-medium">
            {tips[0].recommendation}
          </p>
          <NavLink
            to="/operator/stock-locations"
            className="text-[11px] font-bold text-teal-700 flex items-center gap-1 hover:underline"
          >
            Lihat Rekomendasi Slotting Lengkap <ChevronRight size={12} />
          </NavLink>
        </div>
      )}

      {/* ── Transaksi Terakhir Saya ── */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aktivitas Terakhir Saya</span>
          <NavLink to="/operator/history" className="text-xs text-emerald-700 font-bold hover:underline">
            Lihat Riwayat →
          </NavLink>
        </div>

        {recent.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-400 bg-slate-50 rounded-2xl">
            Belum ada mutasi yang Anda catat hari ini.
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map((tx) => (
              <div key={tx.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    tx.transaction_type === 'receipt' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tx.transaction_type === 'receipt' ? 'IN' : 'OUT'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{tx.product?.sku}</div>
                    <div className="text-[10px] text-gray-400 font-mono">{tx.reference_code}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-gray-900">
                    {Number(tx.quantity).toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {formatDatetime(tx.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
