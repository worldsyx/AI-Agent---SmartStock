import React, { useEffect, useState } from 'react';
import { TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { Card, Badge, Button, LoadingState, EmptyState } from '@/components/ui';
import api from '@/services/api';
import { formatDate, daysAgo, formatQty, clsx } from '@/utils';
import toast from 'react-hot-toast';

const MOCK_AGING = [
  { id:1, sku:'KRT-A3-001', name:'Karton Corrugated A3', lot:'LOT-2025-001', location:'A1-01', received_at:'2025-01-10', qty:240, unit:'Lembar', days_old:156, condition:'good',  fifo_priority:1 },
  { id:2, sku:'KRT-B4-002', name:'Karton Duplex B4',     lot:'LOT-2025-002', location:'A1-02', received_at:'2025-02-20', qty:80,  unit:'Lembar', days_old:115, condition:'good',  fifo_priority:2 },
  { id:3, sku:'PPR-ROLL-50',name:'Paper Roll 50cm',       lot:'LOT-2025-003', location:'B1-01', received_at:'2025-03-05', qty:40,  unit:'Roll',   days_old:101, condition:'damp',  fifo_priority:1 },
  { id:4, sku:'KRT-KRAFT-M',name:'Karton Kraft Medium',   lot:'LOT-2025-004', location:'A2-01', received_at:'2025-04-12', qty:100, unit:'Lembar', days_old:68,  condition:'good',  fifo_priority:3 },
];

const CONDITION_CONFIG = {
  good:   { label:'Baik',        color:'badge-green' },
  damp:   { label:'Lembap',      color:'badge-yellow' },
  torn:   { label:'Sobek',       color:'badge-orange' },
  dented: { label:'Penyok',      color:'badge-red' },
  damaged:{ label:'Rusak',       color:'badge-red' },
};

export default function FifoPage() {
  const [lots, setLots]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAgingReport()
      .then(r => setLots(r.data.data))
      .catch(() => setLots(MOCK_AGING))
      .finally(() => setLoading(false));
  }, []);

  const ageColor = (days) => {
    if (days > 120) return 'text-red-600';
    if (days > 90)  return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">FIFO & Umur Stok</h1>
        <p className="text-sm text-gray-500">Lot diurutkan berdasarkan tanggal masuk. Ambil lot dengan angka umur terbesar terlebih dahulu.</p>
      </div>

      {/* Warning for old lots */}
      {lots.filter(l => l.days_old > 120).length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {lots.filter(l => l.days_old > 120).length} lot telah melewati 120 hari — periksa kondisi sebelum digunakan.
          </p>
        </div>
      )}

      <Card padding={false}>
        {loading ? <LoadingState /> : lots.length === 0 ? (
          <EmptyState icon={TrendingUp} title="Tidak ada data aging" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left table-header px-6 py-3">Prioritas</th>
                  <th className="text-left table-header px-4 py-3">SKU / Nama</th>
                  <th className="text-left table-header px-4 py-3">Lot</th>
                  <th className="text-left table-header px-4 py-3">Lokasi</th>
                  <th className="text-left table-header px-4 py-3">Tgl Masuk</th>
                  <th className="text-right table-header px-4 py-3">Umur (Hari)</th>
                  <th className="text-right table-header px-4 py-3">Stok</th>
                  <th className="text-left table-header px-4 py-3">Kondisi</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lots
                  .sort((a, b) => b.days_old - a.days_old)
                  .map((lot, idx) => {
                    const cond = CONDITION_CONFIG[lot.condition] || { label: lot.condition, color: 'badge-gray' };
                    return (
                      <tr key={lot.id} className={clsx('hover:bg-gray-50 transition-colors', lot.days_old > 120 && 'bg-red-50/30')}>
                        <td className="table-cell px-6 py-4">
                          <div className={clsx(
                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                            idx === 0 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                          )}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="table-cell px-4 py-4">
                          <p className="text-xs font-mono font-semibold text-primary">{lot.sku}</p>
                          <p className="text-sm text-gray-700">{lot.name}</p>
                        </td>
                        <td className="table-cell px-4 py-4 text-xs font-mono text-gray-600">{lot.lot}</td>
                        <td className="table-cell px-4 py-4 text-xs text-gray-600">{lot.location}</td>
                        <td className="table-cell px-4 py-4 text-xs text-gray-500">{formatDate(lot.received_at)}</td>
                        <td className="table-cell px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock size={12} className={ageColor(lot.days_old)} />
                            <span className={clsx('font-bold text-sm', ageColor(lot.days_old))}>{lot.days_old}</span>
                          </div>
                        </td>
                        <td className="table-cell px-4 py-4 text-right font-semibold text-gray-900">
                          {formatQty(lot.qty, lot.unit)}
                        </td>
                        <td className="table-cell px-4 py-4">
                          <Badge color={cond.color}>{cond.label}</Badge>
                        </td>
                        <td className="table-cell px-4 py-4">
                          <Button size="sm" variant="secondary">Konfirmasi Keluar</Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
