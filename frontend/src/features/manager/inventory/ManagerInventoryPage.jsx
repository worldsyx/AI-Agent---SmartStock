import React, { useEffect, useState, useCallback } from 'react';
import { Search, Package, AlertTriangle, ShieldCheck, Warehouse, Filter } from 'lucide-react';
import { Card, Badge, Button, Input, LoadingState, Pagination } from '@/components/ui';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function ManagerInventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const fetchProducts = useCallback(() => {
    setLoading(true);
    api.getProducts({ search, category })
      .then(r => setProducts(r.data.data))
      .catch(() => toast.error('Gagal memuat inventaris'))
      .finally(() => setLoading(false));
  }, [search, category]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Monitoring Master Inventaris</h1>
          <p className="text-xs text-gray-500 mt-1">
            Pengawasan saldo stok per SKU karton & paper roll, perbandingan safety stock, dan vendor pemasok.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan SKU, nama barang, atau spesifikasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Kategori</option>
          <option value="karton">Karton Corrugated</option>
          <option value="paper_roll">Paper Roll</option>
        </select>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <LoadingState text="Memuat saldo inventaris..." />
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">SKU / Nama Barang</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Pemasok / Vendor</th>
                  <th className="px-4 py-3 text-right">Saldo Stok Fisik</th>
                  <th className="px-4 py-3 text-right">Safety Stock</th>
                  <th className="px-4 py-3 text-center rounded-r-xl">Status Buffer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => {
                  const stock = Number(p.current_stock || 0);
                  const safety = Number(p.safety_stock || 0);
                  const isLow = stock <= safety;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80">
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-gray-900 block">{p.sku}</span>
                        <span className="text-gray-500 text-[11px]">{p.name}</span>
                      </td>
                      <td className="px-4 py-3.5 capitalize font-medium">{p.category?.replace('_', ' ')}</td>
                      <td className="px-4 py-3.5 text-gray-600">{p.vendor?.name || p.vendor_name || '-'}</td>
                      <td className="px-4 py-3.5 text-right font-black text-gray-900">
                        {stock.toLocaleString('id-ID')} <span className="font-normal text-gray-400">{p.unit}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-gray-500">
                        {safety.toLocaleString('id-ID')} {p.unit}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isLow ? 'Di Bawah Buffer' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
