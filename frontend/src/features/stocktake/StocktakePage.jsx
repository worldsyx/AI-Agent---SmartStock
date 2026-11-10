import React, { useEffect, useState, useCallback } from 'react';
import { ClipboardList, Plus, Check, X } from 'lucide-react';
import {
  Card, Badge, Button, Modal, Input, Textarea, LoadingState, EmptyState, Tabs, Pagination
} from '@/components/ui';
import api from '@/services/api';
import { formatDate, formatDatetime, getStatus, formatQty, clsx } from '@/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthContext';

const STATUS_TABS = [
  { value:'', label:'Semua' },
  { value:'draft', label:'Draf' },
  { value:'counting', label:'Menghitung' },
  { value:'submitted', label:'Diajukan' },
  { value:'reviewed', label:'Ditinjau' },
  { value:'closed', label:'Selesai' },
];

const MOCK_SESSIONS = [
  { id:1, code:'OPN-2025-001', scope:'Zona A — Karton Masuk', status:'submitted', created_by_name:'Andi Saputra', started_at:'2025-06-15T08:00:00', submitted_at:'2025-06-15T12:30:00', discrepancies:2 },
  { id:2, code:'OPN-2025-002', scope:'Zona B — Paper Roll',   status:'counting',  created_by_name:'Budi Santoso',  started_at:'2025-06-16T09:00:00', submitted_at:null,                discrepancies:0 },
  { id:3, code:'OPN-2025-003', scope:'Full Warehouse',         status:'closed',    created_by_name:'Andi Saputra', started_at:'2025-06-10T08:00:00', submitted_at:'2025-06-11T16:00:00', discrepancies:5 },
];

export default function StocktakePage() {
  const { isManager, isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('');
  const [page, setPage]         = useState(1);
  const [meta, setMeta]         = useState({ total: 0, per_page: 15, current_page: 1 });

  const [newModal, setNewModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ scope:'', notes:'' });

  const [countModal, setCountModal]   = useState(null);  // session obj
  const [approveModal, setApproveModal] = useState(null);
  const [approveNote, setApproveNote] = useState('');

  const fetchSessions = useCallback(() => {
    setLoading(true);
    api.getStocktakes({ status: tab, page, per_page: 15 })
      .then(r => { setSessions(r.data.data); setMeta(r.data.meta); })
      .catch(() => {
        const filtered = tab ? MOCK_SESSIONS.filter(s => s.status === tab) : MOCK_SESSIONS;
        setSessions(filtered);
        setMeta({ total: filtered.length, per_page: 15, current_page: 1 });
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleCreate = async () => {
    if (!form.scope) { toast.error('Scope/zona wajib diisi'); return; }
    setSaving(true);
    try {
      await api.createStocktake(form);
      toast.success('Sesi stock opname dibuat');
      setNewModal(false);
      setForm({ scope:'', notes:'' });
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat sesi');
    } finally { setSaving(false); }
  };

  const handleApprove = async () => {
    try {
      await api.approveStocktake(approveModal.id, { notes: approveNote });
      toast.success('Penyesuaian stok disetujui');
      setApproveModal(null);
      fetchSessions();
    } catch (e) {
      toast.error('Gagal menyetujui');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.rejectStocktake(id, { notes: 'Ditolak' });
      toast('Penyesuaian ditolak');
      fetchSessions();
    } catch {}
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Opname</h1>
          <p className="text-sm text-gray-500">Buat sesi, hitung stok fisik, dan setujui penyesuaian.</p>
        </div>
        <Button onClick={() => setNewModal(true)}>
          <Plus size={16} /> Buat Sesi Baru
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs tabs={STATUS_TABS} active={tab} onChange={t => { setTab(t); setPage(1); }} />

      {/* Sessions table */}
      <Card padding={false}>
        {loading ? <LoadingState /> : sessions.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Belum ada sesi opname" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left table-header px-6 py-3">Kode Sesi</th>
                    <th className="text-left table-header px-4 py-3">Scope / Zona</th>
                    <th className="text-left table-header px-4 py-3">Dibuat Oleh</th>
                    <th className="text-left table-header px-4 py-3">Dimulai</th>
                    <th className="text-left table-header px-4 py-3">Status</th>
                    <th className="text-right table-header px-4 py-3">Selisih</th>
                    {isManager && <th className="table-header px-4 py-3">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map(s => {
                    const st = getStatus(s.status);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell px-6 py-4 font-mono text-xs font-semibold text-primary">{s.code}</td>
                        <td className="table-cell px-4 py-4 text-sm text-gray-700">{s.scope}</td>
                        <td className="table-cell px-4 py-4 text-xs text-gray-600">{s.created_by_name}</td>
                        <td className="table-cell px-4 py-4 text-xs text-gray-500">{formatDate(s.started_at)}</td>
                        <td className="table-cell px-4 py-4">
                          <Badge color={st.color}>{st.label}</Badge>
                        </td>
                        <td className="table-cell px-4 py-4 text-right">
                          {s.discrepancies > 0
                            ? <Badge color="badge-red">{s.discrepancies} item</Badge>
                            : <span className="text-xs text-gray-400">—</span>
                          }
                        </td>
                        {isManager && (
                          <td className="table-cell px-4 py-4">
                            <div className="flex items-center justify-end gap-2">
                              {s.status === 'submitted' && (
                                <>
                                  <Button size="sm" onClick={() => { setApproveModal(s); setApproveNote(''); }}>
                                    <Check size={12} /> Setujui
                                  </Button>
                                  <Button size="sm" variant="danger" onClick={() => handleReject(s.id)}>
                                    <X size={12} /> Tolak
                                  </Button>
                                </>
                              )}
                              {s.status === 'counting' && (
                                <Badge color="badge-blue">Sedang berhitung</Badge>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 border-t border-gray-50">
              <Pagination current={meta.current_page} total={meta.total} perPage={meta.per_page} onChange={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Create session modal */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="Buat Sesi Stock Opname"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewModal(false)}>Batal</Button>
            <Button onClick={handleCreate} loading={saving}>Buat Sesi</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Scope / Zona *" placeholder="Zona A — Karton Masuk / Full Warehouse"
            value={form.scope} onChange={e => setForm(f => ({...f, scope: e.target.value}))} />
          <Textarea label="Catatan" placeholder="Opsional…"
            value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
        </div>
      </Modal>

      {/* Approve modal */}
      <Modal open={!!approveModal} onClose={() => setApproveModal(null)} title="Setujui Penyesuaian Stok"
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveModal(null)}>Batal</Button>
            <Button onClick={handleApprove}>Setujui & Terapkan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            ⚠ Persetujuan ini akan memperbarui saldo stok secara permanen sesuai hasil hitungan fisik.
            Tindakan ini tercatat dalam audit log.
          </div>
          <Textarea label="Catatan Persetujuan" placeholder="Alasan persetujuan…"
            value={approveNote} onChange={e => setApproveNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
