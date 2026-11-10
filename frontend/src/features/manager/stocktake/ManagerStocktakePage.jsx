import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, CheckCircle2, XCircle, Plus, Eye, AlertCircle } from 'lucide-react';
import { Button, LoadingState, Badge } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function ManagerStocktakePage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    api.getStocktakes()
      .then(r => setSessions(r.data.data))
      .catch(() => toast.error('Gagal memuat sesi stock opname'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const viewSessionDetail = (id) => {
    setActionLoading(true);
    api.getStocktake(id)
      .then(r => setSelectedSession(r.data.data))
      .catch(() => toast.error('Gagal memuat detail sesi'))
      .finally(() => setActionLoading(false));
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menyetujui penyesuaian saldo hasil opname ini?')) return;
    setActionLoading(true);
    try {
      await api.approveStocktake(id, { notes: 'Disetujui oleh Manajer Gudang' });
      toast.success('Hasil stock opname disetujui & saldo stok disesuaikan secara atomik.');
      fetchSessions();
      viewSessionDetail(id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui stock opname');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Masukkan alasan penolakan hasil opname:');
    if (!reason) return;
    setActionLoading(true);
    try {
      await api.rejectStocktake(id, { reason });
      toast.success('Hasil stock opname ditolak.');
      fetchSessions();
      viewSessionDetail(id);
    } catch {
      toast.error('Gagal menolak sesi');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Otorisasi Stock Opname (SO)</h1>
          <p className="text-xs text-gray-500 mt-1">
            Peninjauan selisih fisik vs sistem dan persetujuan penyesuaian saldo inventaris karton.
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingState text="Memuat sesi stock opname..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Sesi Opname */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daftar Sesi Opname</h3>
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => viewSessionDetail(s.id)}
                className={`bg-white rounded-3xl p-4 border transition-all cursor-pointer shadow-xs hover:border-emerald-300 ${
                  selectedSession?.id === s.id ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-gray-900 text-xs">{s.code}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    s.status === 'reviewed' ? 'bg-emerald-100 text-emerald-800' :
                    s.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                    s.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {s.status}
                  </span>
                </div>

                <div className="text-xs text-gray-700 font-semibold">{s.scope}</div>
                <div className="text-[11px] text-gray-400 mt-1">Dibuat: {formatDatetime(s.created_at)}</div>
              </div>
            ))}
          </div>

          {/* Kolom Detail & Approval */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{selectedSession.code} — {selectedSession.scope}</h2>
                    <p className="text-xs text-gray-400">Status: {selectedSession.status?.toUpperCase()}</p>
                  </div>

                  {selectedSession.status === 'submitted' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleApprove(selectedSession.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      >
                        <CheckCircle2 size={14} /> Setujui Penyesuaian
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => handleReject(selectedSession.id)}
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <XCircle size={14} /> Tolak
                      </Button>
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Hasil Hitungan Fisik Operator vs Sistem</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-4 py-3 rounded-l-xl">SKU Barang</th>
                          <th className="px-4 py-3">Lokasi</th>
                          <th className="px-4 py-3 text-right">Stok Sistem</th>
                          <th className="px-4 py-3 text-right">Hitungan Fisik</th>
                          <th className="px-4 py-3 text-right rounded-r-xl">Selisih</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedSession.items?.map((it) => (
                          <tr key={it.id} className="hover:bg-gray-50/80">
                            <td className="px-4 py-3 font-semibold">{it.product?.sku}</td>
                            <td className="px-4 py-3">{it.location?.code}</td>
                            <td className="px-4 py-3 text-right font-medium">{Number(it.system_quantity).toLocaleString('id-ID')}</td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">{Number(it.counted_quantity).toLocaleString('id-ID')}</td>
                            <td className={`px-4 py-3 text-right font-black ${
                              Number(it.variance) !== 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {Number(it.variance) > 0 ? `+${it.variance}` : it.variance}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-xs text-gray-400 border border-gray-100">
                Pilih salah satu sesi opname untuk melihat rincian selisih stok dan memberikan persetujuan.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
