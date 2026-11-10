import React, { useEffect, useState } from 'react';
import {
  Package, TrendingUp, AlertTriangle, Warehouse, CheckCircle2,
  ArrowDownLeft, ArrowUpRight, RotateCcw, Brain, ChevronRight, Plus
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { useAuth } from '@/app/providers/AuthContext';
import { Card, StatCard, Badge, Button, LoadingState, EmptyState } from '@/components/ui';
import api from '@/services/api';
import { formatIDR, formatDate, formatDatetime, getStatus, getSeverity, clsx } from '@/utils';

// ─── Mock fallback data when backend is offline ───────────────────────────────
const MOCK_SUMMARY = {
  total_skus: 4820, total_stock_value: 1489500000, sku_optimal_pct: 98.4,
  weekly_turnover: 142850000, weekly_turnover_change: 14.2,
  capacity_used_pct: 84,
  aging_alerts: 3, discrepancy_cases: 7,
  trend: [
    { month:'Jan', qty:2100 }, { month:'Feb', qty:3100 }, { month:'Mar', qty:2700 },
    { month:'Apr', qty:4900 }, { month:'Mei', qty:3800 }, { month:'Jun', qty:4200 },
  ],
  recent_transactions: [
    { id:1, vendor:'PT Riau Pulp & Paper', description:'Paper Roll Kraft Liner 150 GSM (PO-8921)', date:'2025-06-16T10:30:00', amount:89345230, volume:'12 Roll (6.2 Ton)', status:'received', pattern:'Pola Normal' },
    { id:2, vendor:'CV Indah Packaging',  description:'Karton Box B-Flute Master Standard (TR-4019)', date:'2025-06-15T11:45:00', amount:12345890, volume:'4.200 Pcs', status:'pending', pattern:'Lonjakan Produksi' },
    { id:3, vendor:'PT Fajar Surya Box', description:'Corrugated Flute C Single Wall (PO-9912)', date:'2025-06-14T10:15:00', amount:32123670, volume:'2.500 Lembar', status:'received', pattern:'Pola Normal' },
  ],
  procurement_budget: { estimated: 326780000, remaining: 89450000, remaining_pct: 12.8 },
};

// ─── Custom bar chart tooltip ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-primary">{formatIDR(payload[0]?.value, true)} unit</p>
    </div>
  );
};

export default function DashboardPage() {
  const { user, isManager }   = useAuth();
  const [data, setData]       = useState(null);
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary().then(r => r.data.data),
      api.getDashboardAlerts().then(r => r.data.data),
    ])
      .then(([summary, alertData]) => { setData(summary); setAlerts(alertData); })
      .catch(() => { setData(MOCK_SUMMARY); setAlerts([]); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState text="Memuat dashboard…" />;

  const d = data || MOCK_SUMMARY;

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Selamat Datang, {user?.name?.split(' ')[0] || 'Pengguna'} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ringkasan status gudang karton dan aktivitas inventaris hari ini.
          </p>
        </div>
        {isManager && (
          <Button size="md" className="flex-shrink-0">
            <Plus size={16} />
            Buat Draf PO
          </Button>
        )}
      </div>

      {/* ── Row 1 — 3 stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1 — dark brand card */}
        <div className="rounded-2xl bg-primary text-white p-6 shadow-card flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-green-300 uppercase tracking-wide">Smart Inventory</p>
              <p className="text-xs text-green-200 mt-0.5">Total Nilai Inventaris Aktif</p>
            </div>
            <span className="text-green-300 text-xs">≈</span>
          </div>
          <p className="text-2xl font-bold leading-tight">{formatIDR(d.total_stock_value)}</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-200">SKU: {(d.total_skus || 0).toLocaleString('id-ID')} Aktif</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-green-100">{d.sku_optimal_pct}% Optimal</span>
          </div>
        </div>

        {/* Card 2 — Tren Pergerakan Barang */}
        <Card className="flex flex-col gap-3" padding={false}>
          <div className="p-5 pb-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-800">Tren Pergerakan Barang</p>
              <span className="text-xs text-gray-400">Bulanan</span>
            </div>
          </div>
          <div className="flex-1 px-2 pb-2" style={{ height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.trend || []} barSize={18} margin={{ top: 0, right: 8, bottom: 0, left: -24 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6', radius: 6 }} />
                <Bar dataKey="qty" radius={[6,6,0,0]}
                  fill="#16a34a"
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 px-5 pb-4 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-brand-500" />
            Kapasitas: {d.capacity_used_pct}% Terisi
          </div>
        </Card>

        {/* Card 3 — Procurement */}
        <Card>
          <p className="text-sm text-gray-500 mb-1">Estimasi Modal Pengadaan</p>
          <p className="text-2xl font-bold text-gray-900 mb-3">
            {formatIDR(d.procurement_budget?.estimated)}
          </p>
          <div className="h-16 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { w:1, v:220000000 }, { w:2, v:280000000 }, { w:3, v:250000000 },
                { w:4, v:326780000 }, { w:5, v:300000000 }, { w:6, v:310000000 },
              ]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="budgetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke="#16a34a" strokeWidth={2} fill="url(#budgetGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1">
              Setujui PO ↑
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              Terima Barang ↓
            </Button>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Sisa Pagu Anggaran</span>
              <span className="font-bold text-gray-900">
                {formatIDR(d.procurement_budget?.remaining)}
                <span className="text-xs text-green-600 ml-1">
                  +{d.procurement_budget?.remaining_pct}%
                </span>
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Row 2 — Quick stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total SKU Aktif"
          value={(d.total_skus || 0).toLocaleString('id-ID')}
          icon={Package}
          sub="Produk terdaftar"
        />
        <StatCard
          label="Perputaran Minggu Ini"
          value={formatIDR(d.weekly_turnover, true)}
          trend={`+${d.weekly_turnover_change}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Kapasitas Terpakai"
          value={`${d.capacity_used_pct}%`}
          icon={Warehouse}
          sub={d.capacity_used_pct >= 85 ? '⚠ Mendekati penuh' : 'Status normal'}
        />
        <StatCard
          label="Temuan AI Aktif"
          value={`${d.discrepancy_cases || 0} kasus`}
          icon={Brain}
          sub="Perlu ditinjau"
        />
      </div>

      {/* ── Row 3 — Safety stock alert + recent transactions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alert panel */}
        <Card className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 rounded-xl px-3 py-2">
            <AlertTriangle size={16} />
            <div>
              <p className="text-sm font-semibold">Audit Safety Stock</p>
              <p className="text-xs">{d.aging_alerts} SKU Mendekati ROP minimum</p>
            </div>
            <button className="ml-auto text-xs text-primary font-semibold hover:underline">
              Tinjau PO →
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Aksi Cepat</p>
            <div className="space-y-1">
              {[
                { icon: ArrowDownLeft, label: 'Catat Penerimaan', to: '/transactions?type=receipt', color: 'text-green-600 bg-green-50' },
                { icon: ArrowUpRight,  label: 'Catat Pengeluaran', to: '/transactions?type=issue',   color: 'text-red-500 bg-red-50' },
                { icon: RotateCcw,    label: 'Transfer Lokasi',   to: '/transactions?type=transfer', color: 'text-blue-600 bg-blue-50' },
              ].map(({ icon: Icon, label, to, color }) => (
                <a key={label} href={to} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <span className={clsx('p-1.5 rounded-lg', color)}>
                    <Icon size={14} />
                  </span>
                  <span className="text-sm text-gray-700">{label}</span>
                  <ChevronRight size={14} className="ml-auto text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        </Card>

        {/* Recent transactions */}
        <Card padding={false} className="lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Riwayat Pergerakan Stok & Pengadaan</p>
              <p className="text-xs text-gray-500">Aktivitas real-time dan status verifikasi</p>
            </div>
            <a href="/transactions" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight size={12} />
            </a>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-6 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-4">Vendor / Unit Logistik</div>
            <div className="col-span-2">Tanggal</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Nilai</div>
            <div className="col-span-2 text-right">Pola</div>
          </div>

          <div className="divide-y divide-gray-50">
            {(d.recent_transactions || []).map((tx) => {
              const st = getStatus(tx.status);
              return (
                <div key={tx.id} className="grid grid-cols-12 gap-2 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-4 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{tx.vendor}</p>
                    <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                  </div>
                  <div className="col-span-2 text-xs text-gray-600">
                    {formatDate(tx.date)}
                  </div>
                  <div className="col-span-2">
                    <Badge color={st.color}>{st.label}</Badge>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-gray-900">{formatIDR(tx.amount, true)}</p>
                    <p className="text-xs text-gray-400">{tx.volume}</p>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      tx.pattern === 'Lonjakan Promo' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    )}>{tx.pattern}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
