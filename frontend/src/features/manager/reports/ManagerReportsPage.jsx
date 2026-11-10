import React, { useState, useEffect } from 'react';
import {
  Sun, FileText, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Warehouse, Calendar, Download, RefreshCw, Filter, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Card, Button, Badge, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime, formatDate } from '@/utils';
import toast from 'react-hot-toast';

export default function ManagerReportsPage() {
  const [activeTab, setActiveTab] = useState('morning'); // morning, transactions, aging, capacity, audit
  const [morningDate, setMorningDate] = useState(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().split('T')[0];
  });
  const [morningReport, setMorningReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [agingData, setAgingData] = useState([]);
  const [capacityData, setCapacityData] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load Morning Report
  const loadMorningReport = (date) => {
    setLoading(true);
    api.getMorningReport({ date })
      .then(r => setMorningReport(r.data.data))
      .catch(() => toast.error('Gagal memuat laporan pagi'))
      .finally(() => setLoading(false));
  };

  // Load other reports based on tab
  useEffect(() => {
    if (activeTab === 'morning') {
      loadMorningReport(morningDate);
    } else if (activeTab === 'transactions') {
      setLoading(true);
      api.getTransactionReport({ per_page: 30 })
        .then(r => setTransactions(r.data.data))
        .catch(() => toast.error('Gagal memuat transaksi'))
        .finally(() => setLoading(false));
    } else if (activeTab === 'aging') {
      setLoading(true);
      api.getAgingReport()
        .then(r => setAgingData(r.data.data))
        .catch(() => toast.error('Gagal memuat laporan FIFO'))
        .finally(() => setLoading(false));
    } else if (activeTab === 'capacity') {
      setLoading(true);
      api.getCapacityReport()
        .then(r => setCapacityData(r.data.data))
        .catch(() => toast.error('Gagal memuat kapasitas'))
        .finally(() => setLoading(false));
    } else if (activeTab === 'audit') {
      setLoading(true);
      api.getAuditLogs({ per_page: 30 })
        .then(r => setAuditLogs(r.data.data))
        .catch(() => toast.error('Gagal memuat audit log'))
        .finally(() => setLoading(false));
    }
  }, [activeTab]);

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Laporan & Audit Gudang</h1>
          <p className="text-xs text-gray-500 mt-1">
            Laporan harian, laporan pagi pencatatan barang masuk/keluar, dan penelusuran audit log.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-gray-200/80 shadow-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('morning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'morning' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sun size={14} /> Laporan Pagi
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'transactions' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={14} /> Transaksi
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'aging' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheck size={14} /> FIFO & Umur
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'capacity' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Warehouse size={14} /> Kapasitas
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'audit' ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Memproses data laporan..." />
      ) : activeTab === 'morning' ? (
        /* ── PRD 4.3: LAPORAN PENCATATAN SETIAP PAGI ── */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                <Sun size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Laporan Pencatatan Pagi (Daily Morning Summary)</h2>
                <p className="text-xs text-gray-500">
                  Ringkasan resmi mutasi stok 24 jam periode: <strong className="text-gray-800">{morningDate}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={morningDate}
                onChange={(e) => {
                  setMorningDate(e.target.value);
                  loadMorningReport(e.target.value);
                }}
                className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs text-gray-700 font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Button size="sm" variant="secondary" onClick={() => loadMorningReport(morningDate)}>
                <RefreshCw size={14} /> Muat Ulang
              </Button>
            </div>
          </div>

          {/* Morning Report Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase">Barang Masuk Kemarin</span>
                <ArrowDownLeft size={18} className="text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mt-2">
                {Number(morningReport?.total_receipts_qty || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1">
                {morningReport?.total_receipts_tx || 0} Bukti Penerimaan Tercatat
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase">Barang Keluar Kemarin</span>
                <ArrowUpRight size={18} className="text-amber-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mt-2">
                {Number(morningReport?.total_issues_qty || 0).toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-amber-700 font-medium mt-1">
                {morningReport?.total_issues_tx || 0} Pengeluaran Sesuai FIFO
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase">Perpindahan Slot / Rak</span>
                <ArrowLeftRight size={18} className="text-blue-600" />
              </div>
              <div className="text-3xl font-black text-gray-900 mt-2">
                {morningReport?.total_transfers_tx || 0}
              </div>
              <div className="text-xs text-blue-700 font-medium mt-1">
                Relokasi Fisik yang Dikonfirmasi
              </div>
            </div>
          </div>

          {/* Breakdown Per SKU Table */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Rincian Per SKU Karton & Paper Roll</h3>
            {morningReport?.sku_breakdown?.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl">
                Tidak ada mutasi barang tercatat pada tanggal {morningDate}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-4 py-3 rounded-l-xl">SKU / Nama Barang</th>
                      <th className="px-4 py-3">Satuan</th>
                      <th className="px-4 py-3 text-right">Kuantitas Masuk</th>
                      <th className="px-4 py-3 text-right">Kuantitas Keluar</th>
                      <th className="px-4 py-3 text-center rounded-r-xl">Relokasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {morningReport?.sku_breakdown?.map((item) => (
                      <tr key={item.sku} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <span className="font-bold text-gray-900">{item.sku}</span>
                          <span className="text-gray-500 block text-[11px]">{item.name}</span>
                        </td>
                        <td className="px-4 py-3 font-medium">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {item.in_qty > 0 ? `+${Number(item.in_qty).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700">
                          {item.out_qty > 0 ? `-${Number(item.out_qty).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">{item.transfer_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'transactions' ? (
        /* ── TRANSAKSI LEDGER TAB ── */
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Histori Transaksi Gudang Terakhir</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Waktu</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">SKU & Barang</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3">Lokasi (Dari → Ke)</th>
                  <th className="px-4 py-3 rounded-r-xl">Pelaksana</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-gray-400 font-mono text-[11px]">{formatDatetime(tx.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.transaction_type === 'receipt' ? 'bg-emerald-100 text-emerald-800' :
                        tx.transaction_type === 'issue' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {tx.transaction_type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {tx.product?.sku || 'SKU'} <span className="text-gray-400 font-normal">({tx.product?.name})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-gray-900">
                      {Number(tx.quantity).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tx.from_location?.code || '-'} → {tx.to_location?.code || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{tx.performer?.name || 'Operator'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'aging' ? (
        /* ── AGING & FIFO TAB ── */
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Laporan Umur Stok & Prioritas FIFO</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Lot Code</th>
                  <th className="px-4 py-3">SKU Barang</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3 text-right">Saldo Stok</th>
                  <th className="px-4 py-3 text-center">Umur Simpan</th>
                  <th className="px-4 py-3 rounded-r-xl">Kondisi Fisik</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {agingData.map((lot) => (
                  <tr key={lot.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{lot.lot}</td>
                    <td className="px-4 py-3 font-semibold">{lot.sku} ({lot.name})</td>
                    <td className="px-4 py-3">{lot.location}</td>
                    <td className="px-4 py-3 text-right font-bold">{Number(lot.qty).toLocaleString('id-ID')} {lot.unit}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        lot.days_old > 90 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {lot.days_old} hari
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{lot.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'capacity' ? (
        /* ── KAPASITAS GUDANG TAB ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {capacityData.map((zone) => (
            <div key={zone.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{zone.code} — {zone.name}</h4>
                  <p className="text-xs text-gray-400">{zone.warehouse}</p>
                </div>
                <Badge variant={zone.status === 'critical' ? 'danger' : zone.status === 'warning' ? 'warning' : 'success'}>
                  {zone.status?.toUpperCase()}
                </Badge>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                  <span>Keterisian</span>
                  <span>{zone.used} / {zone.capacity_value} {zone.unit}</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      zone.status === 'critical' ? 'bg-rose-500' : zone.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((zone.used / zone.capacity_value) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── AUDIT LOG TAB ── */
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Jejak Audit Aktivitas Gudang (Audit Trail)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Waktu</th>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3 rounded-r-xl">Keterangan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-400">{formatDatetime(log.created_at)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{log.user?.name || 'Sistem'}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
