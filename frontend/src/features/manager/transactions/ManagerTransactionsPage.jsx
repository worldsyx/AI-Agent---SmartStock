import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeftRight, Search, Filter, Download } from 'lucide-react';
import { LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function ManagerTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    api.getTransactionReport({ per_page: 50 })
      .then(r => setTransactions(r.data.data))
      .catch(() => toast.error('Gagal memuat log transaksi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = transactions.filter(t => {
    if (filterType && t.transaction_type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      const sku = t.product?.sku?.toLowerCase() || '';
      const ref = t.reference_code?.toLowerCase() || '';
      return sku.includes(q) || ref.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Histori Mutasi & Transaksi</h1>
          <p className="text-xs text-gray-500 mt-1">
            Buku besar mutasi barang masuk, barang keluar, perpindahan lokasi, dan penyesuaian stok gudang.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan SKU, kode referensi transaksi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Jenis Mutasi</option>
          <option value="receipt">Penerimaan (Receipt)</option>
          <option value="issue">Pengeluaran (Issue)</option>
          <option value="transfer">Perpindahan (Transfer)</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState text="Memuat riwayat transaksi..." />
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Waktu & Ref</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Barang & SKU</th>
                  <th className="px-4 py-3 text-right">Kuantitas</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3 rounded-r-xl">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-gray-400 block text-[10px]">{formatDatetime(t.created_at)}</span>
                      <span className="font-mono font-bold text-gray-900">{t.reference_code}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.transaction_type === 'receipt' ? 'bg-emerald-100 text-emerald-800' :
                        t.transaction_type === 'issue' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-gray-900 block">{t.product?.sku}</span>
                      <span className="text-gray-500 text-[11px]">{t.product?.name}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-black text-gray-900">
                      {Number(t.quantity).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {t.from_location?.code || '-'} → {t.to_location?.code || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-gray-700">{t.performer?.name || 'Operator Lapangan'}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-[11px]">{t.reason || '-'}</td>
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
