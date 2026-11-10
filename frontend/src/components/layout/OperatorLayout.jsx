import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home, QrCode, ArrowDownToLine, ArrowUpFromLine, MapPin,
  History, Settings, LogOut, Menu, X, ShieldAlert, User
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { clsx } from '@/utils';
import toast from 'react-hot-toast';

// Operator Nav items (PRD 3.2: Beranda, Scan QR, Barang Masuk, Barang Keluar, Lokasi Stok, Riwayat Saya, Settings)
const OPERATOR_NAV_ITEMS = [
  { to: '/operator/home', icon: Home, title: 'Beranda' },
  { to: '/operator/scan', icon: QrCode, title: 'Scan QR' },
  { to: '/operator/receipts', icon: ArrowDownToLine, title: 'Barang Masuk' },
  { to: '/operator/issues', icon: ArrowUpFromLine, title: 'Barang Keluar' },
  { to: '/operator/stock-locations', icon: MapPin, title: 'Lokasi Stok' },
  { to: '/operator/history', icon: History, title: 'Riwayat Saya' },
];

export default function OperatorLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const userName = user?.name || 'Operator Lapangan';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Berhasil keluar dari akun');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* ── Top Header for Mobile & Desktop ── */}
      <header className="sticky top-0 z-30 bg-emerald-700 text-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-sm">
            OP
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight">SmartStock</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-400 text-slate-950 rounded">
                OPERATOR
              </span>
            </div>
            <div className="text-[11px] text-emerald-100 font-medium truncate max-w-[180px] sm:max-w-xs">
              {userName}
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/operator/stock-locations"
            className={({ isActive }) => clsx(
              'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition',
              isActive ? 'bg-white text-emerald-800' : 'bg-white/10 hover:bg-white/20 text-white'
            )}
          >
            <MapPin size={14} />
            <span>Lokasi Stok</span>
          </NavLink>

          <NavLink
            to="/settings"
            title="Pengaturan"
            className={({ isActive }) => clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center transition',
              isActive ? 'bg-white text-emerald-800' : 'bg-white/10 hover:bg-white/20 text-white'
            )}
          >
            <Settings size={18} />
          </NavLink>

          <button
            onClick={handleLogout}
            title="Keluar"
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-rose-600 text-white flex items-center justify-center transition"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Desktop & Tablet Sidebar (if viewed on wide warehouse PC/tablet) ── */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 p-4 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Aktivitas Fisik Gudang
          </div>
          {OPERATOR_NAV_ITEMS.map(({ to, icon: Icon, title }) => {
            const isActive = location.pathname === to || (to !== '/operator/home' && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )}
              >
                <Icon size={18} className={isActive ? 'text-emerald-700' : 'text-slate-400'} />
                <span>{title}</span>
              </NavLink>
            );
          })}
          <div className="pt-4 mt-auto border-t border-slate-100">
            <NavLink
              to="/settings"
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition',
                isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'
              )}
            >
              <Settings size={18} />
              <span>Pengaturan Operator</span>
            </NavLink>
          </div>
        </aside>

        {/* ── Main Content Container (Mobile-First, padding for bottom nav) ── */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 pb-24 md:pb-6 max-w-4xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* ── PRD 6.1: Mobile Bottom Navigation Bar (Easy Thumb Reach) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {/* Beranda */}
        <NavLink
          to="/operator/home"
          className={({ isActive }) => clsx(
            'flex flex-col items-center justify-center w-14 py-1 rounded-xl text-[10px] font-bold transition',
            isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
          )}
        >
          <Home size={20} />
          <span className="mt-0.5">Beranda</span>
        </NavLink>

        {/* Barang Masuk */}
        <NavLink
          to="/operator/receipts"
          className={({ isActive }) => clsx(
            'flex flex-col items-center justify-center w-14 py-1 rounded-xl text-[10px] font-bold transition',
            isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
          )}
        >
          <ArrowDownToLine size={20} />
          <span className="mt-0.5">Masuk</span>
        </NavLink>

        {/* Scan QR — Primary prominent center button */}
        <NavLink
          to="/operator/scan"
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white shadow-lg flex items-center justify-center border-4 border-slate-100 active:scale-95 transition">
            <QrCode size={24} />
          </div>
          <span className="text-[10px] font-bold text-emerald-700 mt-0.5">Scan QR</span>
        </NavLink>

        {/* Barang Keluar */}
        <NavLink
          to="/operator/issues"
          className={({ isActive }) => clsx(
            'flex flex-col items-center justify-center w-14 py-1 rounded-xl text-[10px] font-bold transition',
            isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
          )}
        >
          <ArrowUpFromLine size={20} />
          <span className="mt-0.5">Keluar</span>
        </NavLink>

        {/* Riwayat Saya */}
        <NavLink
          to="/operator/history"
          className={({ isActive }) => clsx(
            'flex flex-col items-center justify-center w-14 py-1 rounded-xl text-[10px] font-bold transition',
            isActive ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
          )}
        >
          <History size={20} />
          <span className="mt-0.5">Riwayat</span>
        </NavLink>
      </nav>
    </div>
  );
}
