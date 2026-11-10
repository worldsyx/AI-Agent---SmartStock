import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Filter, Package, ChevronRight } from 'lucide-react';
import {
  Card, Badge, Button, Input, Select, LoadingState, EmptyState, Pagination, Modal, Textarea
} from '@/components/ui';
import api from '@/services/api';
import { formatDate, formatQty, getStatus, clsx, generateIdempotencyKey } from '@/utils';
import toast from 'react-hot-toast';
import { useAuth } from '@/app/providers/AuthContext';

const CATEGORY_OPTIONS = [
  { value: '', label: 'Semua Kategori' },
  { value: 'karton', label: 'Karton' },
  { value: 'paper_roll', label: 'Paper Roll' },
];

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_PRODUCTS = {
  data: [
    { id:1, sku:'KRT-A3-001', name:'Karton Corrugated A3', category:'karton', specification:'3-Ply, 300gsm, 420x297mm', unit:'Lembar', vendor_name:'CV Fast Logistics Hub', is_active:true, current_stock:12450 },
    { id:2, sku:'KRT-B4-002', name:'Karton Duplex B4',     category:'karton', specification:'250gsm, 250x353mm',      unit:'Lembar', vendor_name:'PT Sumber Pangan Utama', is_active:true, current_stock:8720 },
    { id:3, sku:'PPR-ROLL-50', name:'Paper Roll 50cm',     category:'paper_roll', specification:'80gsm, ⌀50cm, L100m',unit:'Roll',   vendor_name:'PT Sumber Pangan Utama', is_active:true, current_stock:340 },
    { id:4, sku:'KRT-KRAFT-M', name:'Karton Kraft Medium', category:'karton', specification:'2-Ply, 200gsm, 310x220mm',unit:'Lembar',vendor_name:'Indofood Logistics',     is_active:true, current_stock:5100 },
    { id:5, sku:'PPR-ROLL-30', name:'Paper Roll 30cm',     category:'paper_roll', specification:'60gsm, ⌀30cm, L80m', unit:'Roll',  vendor_name:'CV Fast Logistics Hub',  is_active:false, current_stock:0 },
  ],
  total: 5, current_page: 1, per_page: 15,
};

export default function InventoryPage() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [meta, setMeta]         = useState({ total: 0, current_page: 1, per_page: 15 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage]         = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ sku:'', name:'', category:'karton', specification:'', unit:'Lembar', vendor_id:'' });

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.getProducts({ search, category, page, per_page: 15 })
      .then(r => { setProducts(r.data.data); setMeta(r.data.meta); })
      .catch(() => { setProducts(MOCK_PRODUCTS.data); setMeta({ total: MOCK_PRODUCTS.total, current_page:1, per_page:15 }); })
      .finally(() => setLoading(false));
  }, [search, category, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleSave = async () => {
    if (!form.sku || !form.name) { toast.error('SKU dan nama wajib diisi'); return; }
    setSaving(true);
    try {
      await api.createProduct(form);
      toast.success('Produk berhasil ditambahkan');
      setAddModal(false);
      setForm({ sku:'', name:'', category:'karton', specification:'', unit:'Lembar', vendor_id:'' });
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan produk');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Master Inventaris</h1>
          <p className="text-sm text-gray-500">Daftar karton dan paper roll beserta stok saat ini.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddModal(true)}>
            <Plus size={16} /> Tambah Produk
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Cari SKU, nama produk…"
              className="bg-transparent text-sm outline-none w-full text-gray-700 placeholder-gray-400"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={e => { setCategory(e.target.value); setPage(1); }}
            className="min-w-[160px]"
          />
        </div>
      </Card>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <LoadingState />
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="Belum ada produk" description="Tambahkan produk karton atau paper roll pertama." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left table-header px-6 py-3">SKU</th>
                    <th className="text-left table-header px-4 py-3">Nama / Spesifikasi</th>
                    <th className="text-left table-header px-4 py-3">Kategori</th>
                    <th className="text-left table-header px-4 py-3">Vendor</th>
                    <th className="text-right table-header px-4 py-3">Stok Saat Ini</th>
                    <th className="text-left table-header px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => {
                    const st = getStatus(p.is_active ? 'active' : 'inactive');
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-cell px-6 py-4 font-mono text-xs font-semibold text-primary">{p.sku}</td>
                        <td className="table-cell px-4 py-4">
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.specification}</p>
                        </td>
                        <td className="table-cell px-4 py-4">
                          <Badge color={p.category === 'karton' ? 'badge-blue' : 'badge-green'}>
                            {p.category === 'karton' ? 'Karton' : 'Paper Roll'}
                          </Badge>
                        </td>
                        <td className="table-cell px-4 py-4 text-xs text-gray-600">{p.vendor_name || '-'}</td>
                        <td className="table-cell px-4 py-4 text-right">
                          <span className="font-semibold text-gray-900">
                            {formatQty(p.current_stock, p.unit)}
                          </span>
                        </td>
                        <td className="table-cell px-4 py-4">
                          <Badge color={st.color}>{st.label}</Badge>
                        </td>
                        <td className="table-cell px-4 py-4">
                          <button className="text-gray-400 hover:text-primary transition-colors">
                            <ChevronRight size={16} />
                          </button>
                        </td>
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

      {/* Add Product Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title="Tambah Produk Baru"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddModal(false)}>Batal</Button>
            <Button onClick={handleSave} loading={saving}>Simpan Produk</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Kode SKU *" placeholder="KRT-A3-001" value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} />
            <Select label="Kategori" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
              options={[{ value:'karton', label:'Karton' }, { value:'paper_roll', label:'Paper Roll' }]} />
          </div>
          <Input label="Nama Produk *" placeholder="Karton Corrugated A3" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          <Input label="Spesifikasi" placeholder="3-Ply, 300gsm, 420x297mm" value={form.specification} onChange={e => setForm(f => ({...f, specification: e.target.value}))} />
          <Input label="Satuan" placeholder="Lembar / Roll / Dus" value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))} />
        </div>
      </Modal>
    </div>
  );
}
