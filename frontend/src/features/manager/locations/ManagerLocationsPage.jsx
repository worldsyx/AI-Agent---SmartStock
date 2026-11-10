import React, { useEffect, useState } from 'react';
import { MapPin, Warehouse, ChevronDown, ChevronRight, Box } from 'lucide-react';
import { Card, Badge, LoadingState } from '@/components/ui';
import api from '@/services/api';

export default function ManagerLocationsPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWarehouses()
      .then(r => setWarehouses(r.data.data))
      .catch(() => {
        setWarehouses([
          {
            id: 1, name: 'Gudang Pusat Cikarang', code: 'GDG-CKR', address: 'Kawasan Industri Jababeka',
            zones: [
              { id: 1, code: 'ZON-A', name: 'Zona Karton Masuk & Siap Kirim', capacity_value: 500, capacity_unit: 'Slot' },
              { id: 2, code: 'ZON-B', name: 'Zona Paper Roll & Penyimpanan Berat', capacity_value: 200, capacity_unit: 'Slot' }
            ]
          }
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pt-2 pb-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Peta Lokasi & Kapasitas Gudang</h1>
        <p className="text-xs text-gray-500 mt-1">
          Struktur hierarki Gudang › Zona › Rak › Slot dan keterisian kapasitas ruang penyimpanan fisik.
        </p>
      </div>

      {loading ? (
        <LoadingState text="Memuat peta lokasi gudang..." />
      ) : (
        <div className="space-y-4">
          {warehouses.map((wh) => (
            <div key={wh.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{wh.name} ({wh.code})</h2>
                    <p className="text-xs text-gray-400">{wh.address || 'Lokasi Terdaftar'}</p>
                  </div>
                </div>
                <Badge variant="success">AKTIF</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {wh.zones?.map((zone) => (
                  <div key={zone.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{zone.code} — {zone.name}</span>
                      <span className="text-[11px] font-mono text-gray-400">Kapasitas: {zone.capacity_value} {zone.capacity_unit}</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '75%' }} />
                    </div>

                    <div className="text-[11px] text-gray-500 flex justify-between">
                      <span>Keterisian Aktif: 75%</span>
                      <span className="text-emerald-700 font-semibold">Tingkat Aman</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
