import React, { useEffect, useState } from 'react';
import { MapPin, ChevronRight, Box } from 'lucide-react';
import { Card, Badge, LoadingState, EmptyState, ProgressBar } from '@/components/ui';
import api from '@/services/api';
import { formatQty, capacityColor, clsx } from '@/utils';

const MOCK_WAREHOUSES = [
  {
    id:1, name:'Gudang Utama Cikarang', code:'GDG-CKR',
    zones: [
      { id:1, code:'ZON-A', name:'Zona A — Karton Masuk', capacity_value:500, used:420, unit:'Slot',
        racks: [
          { id:1, code:'RAK-A1', slots: [
            { id:1, code:'A1-01', product:'KRT-A3-001', qty:240, lot:'LOT-2025-001', capacity:100 },
            { id:2, code:'A1-02', product:'KRT-B4-002', qty:80, lot:'LOT-2025-002', capacity:100 },
          ]},
          { id:2, code:'RAK-A2', slots: [
            { id:3, code:'A2-01', product:'KRT-KRAFT-M', qty:100, lot:'LOT-2025-004', capacity:100 },
          ]},
        ],
      },
      { id:2, code:'ZON-B', name:'Zona B — Paper Roll', capacity_value:200, used:80, unit:'Slot',
        racks: [
          { id:3, code:'RAK-B1', slots: [
            { id:4, code:'B1-01', product:'PPR-ROLL-50', qty:40, lot:'LOT-2025-003', capacity:50 },
          ]},
        ],
      },
    ],
  },
];

export default function LocationsPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState({ zone: null, rack: null });

  useEffect(() => {
    api.getWarehouses()
      .then(r => setWarehouses(r.data.data))
      .catch(() => setWarehouses(MOCK_WAREHOUSES))
      .finally(() => setLoading(false));
  }, []);

  const toggleZone = (zid) => setExpanded(e => ({ ...e, zone: e.zone === zid ? null : zid }));
  const toggleRack = (rid) => setExpanded(e => ({ ...e, rack: e.rack === rid ? null : rid }));

  if (loading) return <LoadingState />;

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Peta Lokasi Gudang</h1>
        <p className="text-sm text-gray-500">Hierarki Gudang › Zona › Rak › Slot dan stok tiap lokasi.</p>
      </div>

      {warehouses.map(wh => (
        <Card key={wh.id} padding={false}>
          {/* Warehouse header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="p-2 rounded-xl bg-primary/10">
              <MapPin size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{wh.name}</p>
              <p className="text-xs text-gray-500 font-mono">{wh.code}</p>
            </div>
          </div>

          {/* Zones */}
          <div className="p-4 space-y-3">
            {(wh.zones || []).map(zone => {
              const usedPct = Math.round((zone.used / zone.capacity_value) * 100);
              const isOpen  = expanded.zone === zone.id;
              return (
                <div key={zone.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Zone header */}
                  <button
                    onClick={() => toggleZone(zone.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge color="badge-blue" className="font-mono text-xs">{zone.code}</Badge>
                      <span className="text-sm font-medium text-gray-800 truncate">{zone.name}</span>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="hidden sm:flex items-center gap-2">
                        <div className="w-24">
                          <ProgressBar value={zone.used} max={zone.capacity_value} />
                        </div>
                        <span className={clsx(
                          'text-xs font-semibold',
                          usedPct >= 90 ? 'text-red-600' : usedPct >= 75 ? 'text-yellow-600' : 'text-green-600'
                        )}>{usedPct}%</span>
                        <span className="text-xs text-gray-400">{zone.used}/{zone.capacity_value} {zone.unit}</span>
                      </div>
                      <ChevronRight size={16} className={clsx('text-gray-400 transition-transform', isOpen && 'rotate-90')} />
                    </div>
                  </button>

                  {/* Racks */}
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-2">
                      {(zone.racks || []).map(rack => {
                        const rackOpen = expanded.rack === rack.id;
                        return (
                          <div key={rack.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <button
                              onClick={() => toggleRack(rack.id)}
                              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Box size={14} className="text-gray-400" />
                                <span className="text-sm font-medium text-gray-700 font-mono">{rack.code}</span>
                                <span className="text-xs text-gray-400">({(rack.slots||[]).length} slot)</span>
                              </div>
                              <ChevronRight size={14} className={clsx('text-gray-400 transition-transform', rackOpen && 'rotate-90')} />
                            </button>

                            {/* Slots */}
                            {rackOpen && (
                              <div className="border-t border-gray-100">
                                <table className="w-full">
                                  <thead className="bg-gray-50">
                                    <tr>
                                      <th className="text-left table-header px-4 py-2 text-xs">Slot</th>
                                      <th className="text-left table-header px-4 py-2 text-xs">SKU</th>
                                      <th className="text-left table-header px-4 py-2 text-xs">Lot</th>
                                      <th className="text-right table-header px-4 py-2 text-xs">Stok</th>
                                      <th className="text-right table-header px-4 py-2 text-xs">Kapasitas</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {(rack.slots || []).map(slot => (
                                      <tr key={slot.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-xs font-mono font-semibold text-primary">{slot.code}</td>
                                        <td className="px-4 py-2 text-xs text-gray-700">{slot.product}</td>
                                        <td className="px-4 py-2 text-xs text-gray-500 font-mono">{slot.lot}</td>
                                        <td className="px-4 py-2 text-xs text-right font-semibold text-gray-900">{formatQty(slot.qty)}</td>
                                        <td className="px-4 py-2">
                                          <div className="flex items-center justify-end gap-2">
                                            <div className="w-16">
                                              <ProgressBar value={slot.qty} max={slot.capacity} />
                                            </div>
                                            <span className="text-xs text-gray-400 w-8 text-right">
                                              {Math.round((slot.qty / slot.capacity) * 100)}%
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
