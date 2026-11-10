import React, { useEffect, useState } from 'react';
import { Warehouse, AlertTriangle } from 'lucide-react';
import { Card, Badge, ProgressBar, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatQty, capacityColor, clsx } from '@/utils';

const MOCK_ZONES = [
  { id:1, warehouse:'Gudang Utama Cikarang', code:'ZON-A', name:'Zona A — Karton Masuk',  capacity_value:500, used:420, unit:'Slot', status:'warning' },
  { id:2, warehouse:'Gudang Utama Cikarang', code:'ZON-B', name:'Zona B — Paper Roll',    capacity_value:200, used:80,  unit:'Slot', status:'normal'  },
  { id:3, warehouse:'Gudang Surabaya',        code:'ZON-C', name:'Zona C — Ekspor Karton', capacity_value:300, used:295, unit:'Slot', status:'critical' },
];

export default function CapacityPage() {
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCapacityReport()
      .then(r => setZones(r.data.data))
      .catch(() => setZones(MOCK_ZONES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const critical = zones.filter(z => z.status === 'critical');
  const warning  = zones.filter(z => z.status === 'warning');

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Kapasitas Gudang</h1>
        <p className="text-sm text-gray-500">Pantau penggunaan kapasitas per zona dan rak.</p>
      </div>

      {/* Alert banners */}
      {critical.length > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {critical.length} zona telah melewati 90% kapasitas. Segera tinjau rekomendasi AI.
          </p>
        </div>
      )}
      {warning.length > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-700 font-medium">
            {warning.length} zona mendekati ambang kapasitas (75–90%).
          </p>
        </div>
      )}

      {/* Zone cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map(z => {
          const pct = Math.round((z.used / z.capacity_value) * 100);
          const barColor = capacityColor(pct);
          const badgeColor = z.status === 'critical' ? 'badge-red' : z.status === 'warning' ? 'badge-yellow' : 'badge-green';
          return (
            <Card key={z.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{z.warehouse}</p>
                  <p className="font-semibold text-gray-900">{z.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{z.code}</p>
                </div>
                <Badge color={badgeColor} className="capitalize">{z.status === 'critical' ? 'Kritis' : z.status === 'warning' ? 'Peringatan' : 'Normal'}</Badge>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-gray-900">{pct}%</span>
                  <span className="text-xs text-gray-500">{formatQty(z.used)} / {formatQty(z.capacity_value)} {z.unit}</span>
                </div>
                <ProgressBar value={z.used} max={z.capacity_value} colorClass={barColor} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
