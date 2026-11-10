import React, { useEffect, useState, useCallback } from 'react';
import { Brain, Play, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Card, Badge, Button, Tabs, Modal, Textarea, LoadingState, EmptyState, Pagination
} from '@/components/ui';
import api from '@/services/api';
import { formatDatetime, getSeverity, getStatus, clsx } from '@/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthContext';

const AGENT_TYPES = [
  { value:'stock_accuracy', label:'Stock Accuracy' },
  { value:'slotting',       label:'Slotting Optimization' },
  { value:'capacity',       label:'Capacity & Overstock' },
  { value:'aging_fifo',     label:'Aging & FIFO' },
];

const STATUS_TABS = [
  { value:'',         label:'Semua' },
  { value:'new',      label:'Baru' },
  { value:'reviewed', label:'Ditinjau' },
  { value:'approved', label:'Disetujui' },
  { value:'rejected', label:'Ditolak' },
  { value:'resolved', label:'Selesai' },
];

const MOCK_FINDINGS = [
  {
    id:1, agent_type:'stock_accuracy', severity:'high', status:'new',
    title:'Selisih Stok Terdeteksi — KRT-A3-001',
    explanation:'Sistem mencatat 12.450 lembar namun hasil hitungan fisik hanya 12.210 lembar. Selisih 240 unit.',
    recommendation:'Lakukan penghitungan ulang Zona A, slot A1-01. Periksa kemungkinan transaksi ganda.',
    evidence_json:{ system_qty:12450, counted_qty:12210, variance:-240, location:'A1-01' },
    generated_at:'2025-06-16T08:00:00',
  },
  {
    id:2, agent_type:'capacity', severity:'medium', status:'new',
    title:'Zona C Mendekati Kapasitas Penuh',
    explanation:'Zona C — Ekspor Karton telah mencapai 98.3% kapasitas (295/300 slot terisi). Risiko overflow.',
    recommendation:'Pertimbangkan relokasi 20 slot karton ke Zona D atau tunda penerimaan batch berikutnya.',
    evidence_json:{ zone:'ZON-C', used:295, capacity:300, pct:98.3 },
    generated_at:'2025-06-16T07:30:00',
  },
  {
    id:3, agent_type:'aging_fifo', severity:'medium', status:'reviewed',
    title:'Stok Lama Terdeteksi — PPR-ROLL-50',
    explanation:'LOT-2025-003 telah disimpan selama 101 hari dan kondisi terdeteksi lembap. Prioritas pengeluaran tinggi.',
    recommendation:'Operator segera periksa kondisi lot dan proses pengeluaran sesuai FIFO.',
    evidence_json:{ lot:'LOT-2025-003', days:101, condition:'damp', location:'B1-01' },
    generated_at:'2025-06-15T15:00:00',
  },
];

export default function AiFindingsPage() {
  const { isManager } = useAuth();
  const [findings, setFindings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('');
  const [page, setPage]         = useState(1);
  const [meta, setMeta]         = useState({ total: 0, per_page: 10, current_page: 1 });
  const [expanded, setExpanded] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewNote, setReviewNote]   = useState('');
  const [running, setRunning]         = useState(null);

  const fetchFindings = useCallback(() => {
    setLoading(true);
    api.getAiFindings({ status: tab, page, per_page: 10 })
      .then(r => { setFindings(r.data.data); setMeta(r.data.meta); })
      .catch(() => {
        const filtered = tab ? MOCK_FINDINGS.filter(f => f.status === tab) : MOCK_FINDINGS;
        setFindings(filtered);
        setMeta({ total: filtered.length, per_page: 10, current_page: 1 });
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchFindings(); }, [fetchFindings]);

  const handleRunAgent = async (agentType) => {
    setRunning(agentType);
    try {
      await api.runAgent(agentType);
      toast.success(`Agent ${agentType} dijalankan. Temuan baru akan muncul setelah analisis selesai.`);
      fetchFindings();
    } catch (e) {
      toast.error('Gagal menjalankan agent. Pastikan AI service aktif.');
    } finally { setRunning(null); }
  };

  const handleApprove = async () => {
    try {
      await api.approveAiFinding(reviewModal.id, { notes: reviewNote });
      toast.success('Rekomendasi disetujui');
      setReviewModal(null);
      fetchFindings();
    } catch { toast.error('Gagal'); }
  };

  const handleReject = async () => {
    try {
      await api.rejectAiFinding(reviewModal.id, { notes: reviewNote });
      toast('Rekomendasi ditolak');
      setReviewModal(null);
      fetchFindings();
    } catch { toast.error('Gagal'); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Rekomendasi AI</h1>
          <p className="text-sm text-gray-500">Temuan dari 4 agent analisis. Semua tindakan memerlukan persetujuan manusia.</p>
        </div>
        {/* Run agents */}
        {isManager && (
          <div className="flex flex-wrap gap-2">
            {AGENT_TYPES.map(a => (
              <Button key={a.value} size="sm" variant="outline"
                loading={running === a.value}
                onClick={() => handleRunAgent(a.value)}
              >
                <Play size={12} /> {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <Tabs tabs={STATUS_TABS} active={tab} onChange={t => { setTab(t); setPage(1); }} />

      <div className="space-y-3">
        {loading ? <LoadingState /> : findings.length === 0 ? (
          <Card><EmptyState icon={Brain} title="Belum ada temuan" description="Jalankan agent analisis untuk memulai." /></Card>
        ) : (
          findings.map(f => {
            const sev = getSeverity(f.severity);
            const st  = getStatus(f.status);
            const isExpanded = expanded === f.id;
            const agentLabel = AGENT_TYPES.find(a => a.value === f.agent_type)?.label || f.agent_type;

            return (
              <Card key={f.id} padding={false}>
                <div
                  className="flex items-start justify-between gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors rounded-2xl"
                  onClick={() => setExpanded(isExpanded ? null : f.id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={clsx('w-2 h-2 rounded-full mt-2 flex-shrink-0', sev.dot)} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge color="badge-blue" className="text-xs">{agentLabel}</Badge>
                        <Badge color={sev.color}>{sev.label}</Badge>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{f.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDatetime(f.generated_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isManager && f.status === 'new' && (
                      <Button size="sm" onClick={e => { e.stopPropagation(); setReviewModal(f); setReviewNote(''); }}>
                        Tinjau
                      </Button>
                    )}
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-4 animate-fade-in">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Penjelasan</p>
                      <p className="text-sm text-gray-700">{f.explanation}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Rekomendasi</p>
                      <p className="text-sm text-primary font-medium">{f.recommendation}</p>
                    </div>
                    {f.evidence_json && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data Pemicu</p>
                        <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-x-auto font-mono text-gray-700">
                          {JSON.stringify(f.evidence_json, null, 2)}
                        </pre>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 italic">
                      ⓘ Rekomendasi AI tidak mengubah stok secara otomatis. Semua tindakan harus disetujui dan dilakukan melalui menu Transaksi.
                    </p>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {meta.total > meta.per_page && (
        <Card padding={false}>
          <Pagination current={meta.current_page} total={meta.total} perPage={meta.per_page} onChange={setPage} />
        </Card>
      )}

      {/* Review modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title="Tinjau Rekomendasi AI"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReviewModal(null)}>Batal</Button>
            <Button variant="danger" onClick={handleReject}>Tolak</Button>
            <Button onClick={handleApprove}>Setujui Rekomendasi</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-900">{reviewModal?.title}</p>
          <p className="text-sm text-gray-600">{reviewModal?.recommendation}</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
            ⚠ Menyetujui rekomendasi tidak langsung mengubah stok. Tindakan fisik tetap dilakukan oleh operator melalui menu Transaksi.
          </div>
          <Textarea label="Catatan Tinjauan" placeholder="Tuliskan alasan/keputusan Anda…"
            value={reviewNote} onChange={e => setReviewNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
