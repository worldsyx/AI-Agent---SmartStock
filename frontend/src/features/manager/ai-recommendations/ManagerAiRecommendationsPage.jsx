import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, ShoppingCart, AlertTriangle, ShieldCheck, MapPin,
  Warehouse, RefreshCw, CheckCircle2, XCircle, Eye, Info, Clock, Activity
} from 'lucide-react';
import { Card, Button, Badge, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function ManagerAiRecommendationsPage() {
  const navigate = useNavigate();
  const [findings, setFindings] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all'); // all, reorder, stock_accuracy, aging_fifo, slotting, capacity
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadFindings = () => {
    setLoading(true);
    const params = selectedAgent !== 'all' ? { agent_type: selectedAgent } : {};
    api.getAiFindings(params)
      .then(r => setFindings(r.data.data))
      .catch(() => toast.error('Gagal memuat rekomendasi AI'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFindings();
  }, [selectedAgent]);

  const handleRunAgent = async (type) => {
    setActionLoading(true);
    try {
      const res = await api.runAgent(type);
      toast.success(res.data.message || 'Analisis AI selesai diproses');
      loadFindings();
    } catch (err) {
      toast.error('Gagal menjalankan agent AI');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(true);
    try {
      if (action === 'review') await api.reviewAiFinding(id, { notes: 'Ditinjau oleh Manajer' });
      else if (action === 'approve') await api.approveAiFinding(id, { notes: 'Disetujui oleh Manajer' });
      else if (action === 'reject') await api.rejectAiFinding(id, { notes: 'Ditolak oleh Manajer' });
      else if (action === 'resolve') await api.resolveAiFinding(id, { notes: 'Selesai ditindaklanjuti secara operasional' });
      
      toast.success(`Status rekomendasi berhasil diperbarui`);
      if (selectedFinding?.id === id) setSelectedFinding(null);
      loadFindings();
    } catch (err) {
      toast.error('Gagal memperbarui status');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Sistem Analisis Terpadu
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Rekomendasi AI Assistant</h1>
          <p className="text-xs text-gray-500 mt-1">
            Analisis data pergudangan karton, saran pembelian stok, peringatan FIFO, dan optimasi tata letak.
          </p>
        </div>

        {/* Trigger Run AI Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/manager/ai-performance')}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Activity size={14} /> AI Performance & Analytics
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => handleRunAgent('reorder')}
            className="text-xs"
          >
            <ShoppingCart size={14} /> Analisis Pembelian
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={actionLoading}
            onClick={() => handleRunAgent('aging_fifo')}
            className="text-xs"
          >
            <ShieldCheck size={14} /> Analisis FIFO
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={loadFindings}
            className="text-xs"
          >
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* PRD 5.1: Agent Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'Semua Rekomendasi' },
          { key: 'reorder', label: 'Saran Pembelian (Reorder)', icon: ShoppingCart },
          { key: 'aging_fifo', label: 'Umur Stok & FIFO', icon: ShieldCheck },
          { key: 'stock_accuracy', label: 'Akurasi Stok Opname', icon: AlertTriangle },
          { key: 'slotting', label: 'Optimasi Slotting', icon: MapPin },
          { key: 'capacity', label: 'Kapasitas & Overstock', icon: Warehouse },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedAgent(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                selectedAgent === tab.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/80'
              }`}
            >
              {Icon && <Icon size={14} />}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Grid */}
      {loading ? (
        <LoadingState text="Menganalisis temuan AI..." />
      ) : findings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
          <Brain size={36} className="mx-auto text-gray-300" />
          <h3 className="text-base font-bold text-gray-700">Tidak Ada Temuan AI Baru</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Semua parameter stok aman atau seluruh rekomendasi sebelumnya telah selesai ditinjau. Anda dapat menjalankan analisis ulang menggunakan tombol di kanan atas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Daftar Kartu Temuan */}
          <div className="lg:col-span-2 space-y-3">
            {findings.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedFinding(item)}
                className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer shadow-xs hover:border-emerald-300 ${
                  selectedFinding?.id === item.id ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.severity === 'high' ? 'bg-rose-100 text-rose-700' :
                      item.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.severity}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {item.agent_type?.toUpperCase()}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    item.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                    item.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                    item.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                    item.status === 'resolved' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.status?.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.explanation}</p>

                <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-100/60 text-xs text-emerald-950 font-medium">
                  <strong className="text-emerald-800">Saran Tindakan:</strong> {item.recommendation}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-400 mt-3 pt-2 border-t border-gray-50">
                  <span>Dibuat: {formatDatetime(item.generated_at || item.created_at)}</span>
                  <span className="text-emerald-700 font-bold">Lihat Detail & Keputusan →</span>
                </div>
              </div>
            ))}
          </div>

          {/* Kolom Kanan: Detail & Eksekusi Keputusan Manager */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5 h-fit sticky top-20">
            {selectedFinding ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-base font-bold text-gray-900">Detail Rekomendasi</h3>
                  <button onClick={() => setSelectedFinding(null)} className="text-xs text-gray-400 hover:text-gray-600">
                    Tutup
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Judul Temuan</div>
                  <div className="text-sm font-bold text-gray-900 mt-0.5">{selectedFinding.title}</div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Penjelasan Berbasis Data</div>
                  <div className="text-xs text-gray-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {selectedFinding.explanation}
                  </div>
                </div>

                {/* Evidence JSON */}
                {selectedFinding.evidence_json && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Bukti & Parameter Analisis</div>
                    <div className="bg-gray-900 text-emerald-400 p-3 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-48">
                      {JSON.stringify(selectedFinding.evidence_json, null, 2)}
                    </div>
                  </div>
                )}

                {/* PRD 5.1: Batasan AI Notice */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900 flex items-start gap-2">
                  <Info size={15} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Batasan AI (PRD 5.2):</strong> Rekomendasi ini adalah estimasi berbasis histori. AI tidak membuat PO dan tidak mengubah saldo inventaris. Keputusan final berada pada Manajer.
                  </div>
                </div>

                {/* Keputusan Action Buttons */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="text-xs font-bold text-gray-700">Tindak Lanjut Manager:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={actionLoading || selectedFinding.status === 'approved'}
                      onClick={() => handleAction(selectedFinding.id, 'approve')}
                      className="text-xs"
                    >
                      <CheckCircle2 size={14} /> Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedFinding.status === 'reviewed'}
                      onClick={() => handleAction(selectedFinding.id, 'review')}
                      className="text-xs"
                    >
                      <Eye size={14} /> Tandai Ditinjau
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={actionLoading || selectedFinding.status === 'resolved'}
                      onClick={() => handleAction(selectedFinding.id, 'resolve')}
                      className="text-xs"
                    >
                      Selesai
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading || selectedFinding.status === 'rejected'}
                      onClick={() => handleAction(selectedFinding.id, 'reject')}
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <XCircle size={14} /> Tolak
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs space-y-2">
                <Brain size={32} className="mx-auto text-gray-300" />
                <p>Pilih salah satu kartu rekomendasi di sebelah kiri untuk melihat rincian bukti data dan mengambil keputusan tindak lanjut.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
