import React, { useEffect, useState } from 'react';
import { Users, Plus, Shield } from 'lucide-react';
import { Card, Badge, Button, Modal, Input, Select, LoadingState, EmptyState } from '@/components/ui';
import api from '@/services/api';
import { formatDate, getStatus, initials, clsx } from '@/utils';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value:'operator', label:'Operator Gudang' },
  { value:'manager',  label:'Manajer / Kepala Gudang' },
  { value:'admin',    label:'Admin' },
];

const MOCK_USERS = [
  { id:1, name:'Admin Sistem',    email:'admin@smartstock.id',    role:{ name:'admin' },    is_active:true, created_at:'2025-01-01' },
  { id:2, name:'Budi Santoso',    email:'manager@smartstock.id',  role:{ name:'manager' },  is_active:true, created_at:'2025-01-05' },
  { id:3, name:'Andi Saputra',    email:'operator@smartstock.id', role:{ name:'operator' }, is_active:true, created_at:'2025-02-10' },
];

const ROLE_COLORS = { admin:'badge-red', manager:'badge-blue', operator:'badge-green' };

export default function UsersPage() {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name:'', email:'', role:'operator', password:'' });

  const fetchUsers = () => {
    setLoading(true);
    api.getUsers()
      .then(r => setUsers(r.data.data))
      .catch(() => setUsers(MOCK_USERS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.email || !form.password) { toast.error('Semua field wajib diisi'); return; }
    setSaving(true);
    try {
      await api.createUser(form);
      toast.success('Pengguna berhasil dibuat');
      setAddModal(false);
      setForm({ name:'', email:'', role:'operator', password:'' });
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal membuat pengguna');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500">Kelola akun, role, dan hak akses pengguna sistem.</p>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={16} /> Tambah Pengguna
        </Button>
      </div>

      <Card padding={false}>
        {loading ? <LoadingState /> : users.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada pengguna" />
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left table-header px-6 py-3">Pengguna</th>
                <th className="text-left table-header px-4 py-3">Email</th>
                <th className="text-left table-header px-4 py-3">Role</th>
                <th className="text-left table-header px-4 py-3">Bergabung</th>
                <th className="text-left table-header px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="table-cell px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials(u.name)}
                      </div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    </div>
                  </td>
                  <td className="table-cell px-4 py-4 text-xs text-gray-500">{u.email}</td>
                  <td className="table-cell px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Shield size={12} className="text-gray-400" />
                      <Badge color={ROLE_COLORS[u.role?.name] || 'badge-gray'} className="capitalize">
                        {u.role?.name}
                      </Badge>
                    </div>
                  </td>
                  <td className="table-cell px-4 py-4 text-xs text-gray-500">{formatDate(u.created_at)}</td>
                  <td className="table-cell px-4 py-4">
                    <Badge color={u.is_active ? 'badge-green' : 'badge-gray'}>
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Tambah Pengguna Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={saving}>Simpan Pengguna</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nama Lengkap *" placeholder="Budi Santoso" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <Input label="Email *" type="email" placeholder="budi@perusahaan.com" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          <Select label="Role *" options={ROLE_OPTIONS} value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} />
          <Input label="Password Awal *" type="password" placeholder="Min. 8 karakter" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
