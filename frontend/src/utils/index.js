/**
 * Centralized utility functions — NOT to be duplicated elsewhere.
 * Import from here: import { formatIDR, formatDate, ... } from '@/utils'
 */

// ─── Currency ────────────────────────────────────────────────────────────────
export const formatIDR = (value, compact = false) => {
  const num = Number(value) || 0;
  if (compact) {
    if (num >= 1_000_000_000) return `Rp ${(num / 1_000_000_000).toFixed(1)} M`;
    if (num >= 1_000_000)     return `Rp ${(num / 1_000_000).toFixed(1)} Jt`;
    if (num >= 1_000)         return `Rp ${(num / 1_000).toFixed(0)} Rb`;
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
};

// ─── Date / Time ─────────────────────────────────────────────────────────────
export const formatDate = (iso, opts = {}) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...opts,
  }).format(d);
};

export const formatDatetime = (iso) =>
  formatDate(iso, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const formatTime = (iso) => {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(iso));
};

export const daysAgo = (iso) => {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
};

// ─── Numbers ─────────────────────────────────────────────────────────────────
export const formatQty = (n, unit = '') =>
  `${new Intl.NumberFormat('id-ID').format(Number(n) || 0)}${unit ? ' ' + unit : ''}`;

export const formatPct = (n, decimals = 1) => `${(Number(n) || 0).toFixed(decimals)}%`;

// ─── Strings ─────────────────────────────────────────────────────────────────
export const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const truncate = (str, len = 40) =>
  str && str.length > len ? str.slice(0, len) + '…' : str ?? '';

// ─── Status resolvers (single source of truth for badge colors & labels) ────
export const TRANSACTION_TYPE_LABELS = {
  receipt:    'Penerimaan',
  issue:      'Pengeluaran',
  transfer:   'Transfer',
  adjustment: 'Penyesuaian',
};

export const STATUS_CONFIG = {
  // Transaction / General
  active:      { label: 'Aktif',      color: 'badge-green' },
  inactive:    { label: 'Tidak Aktif', color: 'badge-gray' },
  // Stocktake session
  draft:       { label: 'Draf',        color: 'badge-gray' },
  counting:    { label: 'Menghitung',  color: 'badge-blue' },
  submitted:   { label: 'Diajukan',    color: 'badge-yellow' },
  reviewed:    { label: 'Ditinjau',    color: 'badge-blue' },
  closed:      { label: 'Selesai',     color: 'badge-green' },
  rejected:    { label: 'Ditolak',     color: 'badge-red' },
  // AI Finding
  new:         { label: 'Baru',        color: 'badge-yellow' },
  approved:    { label: 'Disetujui',   color: 'badge-green' },
  resolved:    { label: 'Selesai',     color: 'badge-gray' },
  // PO / Vendor
  pending:     { label: 'Menunggu',    color: 'badge-yellow' },
  in_transit:  { label: 'Dalam Perjalanan', color: 'badge-blue' },
  received:    { label: 'Diterima',    color: 'badge-green' },
  cancelled:   { label: 'Dibatalkan', color: 'badge-red' },
  // Capacity
  normal:      { label: 'Normal',      color: 'badge-green' },
  warning:     { label: 'Peringatan',  color: 'badge-yellow' },
  critical:    { label: 'Kritis',      color: 'badge-red' },
};

export const getStatus = (key) =>
  STATUS_CONFIG[key] ?? { label: key, color: 'badge-gray' };

// ─── Severity config (AI findings) ──────────────────────────────────────────
export const SEVERITY_CONFIG = {
  info:   { label: 'Info',    color: 'badge-blue',   dot: 'bg-blue-500' },
  low:    { label: 'Rendah',  color: 'badge-gray',   dot: 'bg-gray-400' },
  medium: { label: 'Sedang',  color: 'badge-yellow', dot: 'bg-yellow-500' },
  high:   { label: 'Tinggi',  color: 'badge-red',    dot: 'bg-red-500' },
};

export const getSeverity = (key) =>
  SEVERITY_CONFIG[key] ?? SEVERITY_CONFIG.info;

// ─── Capacity percentage color ───────────────────────────────────────────────
export const capacityColor = (pct) => {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 75) return 'bg-yellow-400';
  return 'bg-brand-500';
};

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const clsx = (...classes) => classes.filter(Boolean).join(' ');

export const generateIdempotencyKey = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
