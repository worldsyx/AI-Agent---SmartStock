import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowLeftRight, MapPin, ClipboardList,
  BarChart2, Warehouse, TrendingUp, Brain, Users, Settings,
  LogOut, Bell, Search, ChevronDown, Menu, X, Calendar, FileText,
  ShieldCheck, HelpCircle
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { clsx, initials } from '@/utils';
import toast from 'react-hot-toast';

// Left Floating Dock Icons
const DOCK_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, title: 'Dashboard Utama' },
  { to: '/inventory', icon: Package, title: 'Master Inventaris' },
  { to: '/transactions', icon: ArrowLeftRight, title: 'Scan & Transaksi' },
  { to: '/locations', icon: MapPin, title: 'Peta Lokasi Gudang' },
  { to: '/stocktake', icon: ClipboardList, title: 'Stock Opname' },
  { to: '/capacity', icon: Warehouse, title: 'Kapasitas Gudang' },
  { to: '/fifo', icon: TrendingUp, title: 'FIFO & Umur Stok' },
  { to: '/ai-findings', icon: Brain, title: 'Rekomendasi AI Agent' },
  { to: '/users', icon: Users, title: 'Manajemen Pengguna' },
  { to: '/settings', icon: Settings, title: 'Pengaturan Sistem' },
];

export default function AppLayout({ children }) {
  const { user, logout, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = user?.role?.name || 'operator';
  const userName = user?.name || 'Budi Santoso';
  const userTitle = role === 'admin' ? 'System Administrator' : role === 'manager' ? 'Ops Manager' : 'Warehouse Operator';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Berhasil keluar dari akun');
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-900 overflow-hidden font-sans">
      {/* ── Left Floating Dock Sidebar (Matching Asset Design) ── */}
      <aside className="hidden lg:flex flex-col items-center justify-between w-20 py-6 my-4 ml-4 bg-white rounded-3xl shadow-sm border border-gray-100/80 z-20">
        {/* Brand Top Mark */}
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
          <Package size={22} className="stroke-[2.2]" />
        </div>

        {/* Center Icons Navigation */}
        <nav className="flex flex-col items-center gap-3 my-auto">
          {DOCK_ITEMS.map(({ to, icon: Icon, title }) => {
            const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
            return (
              <NavLink
                key={to}
                to={to}
                title={title}
                className={clsx(
                  'w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group relative',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 shadow-xs'
                    : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon size={20} className={clsx('transition-transform group-hover:scale-110', isActive && 'text-emerald-700')} />
                {isActive && (
                  <span className="absolute -left-1 w-1.5 h-5 bg-emerald-600 rounded-r-full" />
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Actions (Settings, Help, Logout) */}
        <div className="flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            title="Pengaturan"
            className={({ isActive }) => clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center transition',
              isActive ? 'bg-emerald-50 text-emerald-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <Settings size={18} />
          </NavLink>
          <button
            onClick={handleLogout}
            title="Keluar"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── Main Area (Top Bar + Scrollable Content) ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Floating Header Bar */}
        <header className="px-4 lg:px-6 pt-4 pb-2 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-2.5 flex items-center justify-between gap-4">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>

            {/* Logo Mark + Title */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                SP
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-gray-900">SmartStock</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 tracking-wider">
                  PRO
                </span>
                <span className="hidden sm:inline-block text-xs text-gray-400 font-medium border-l border-gray-200 pl-2 ml-1">
                  Pergudangan Karton & Paper Roll
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Date Filter Pill */}
              <div className="hidden md:flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200/80 px-3.5 py-1.5 rounded-full text-xs text-gray-700 font-medium cursor-pointer transition">
                <Calendar size={13} className="text-gray-400" />
                <span>24 Okt 2025 - 24 Nov 2025</span>
                <ChevronDown size={13} className="text-gray-400" />
              </div>

              {/* Search button */}
              <button
                onClick={() => toast('Pencarian cepat global (SKU, Lot, Vendor)')}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200/60 transition"
              >
                <Search size={15} />
              </button>

              {/* Bell notification */}
              <button
                onClick={() => toast('Tidak ada notifikasi kritis baru')}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200/60 relative transition"
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
              </button>

              {/* User Profile */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 pl-2 cursor-pointer focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shadow-xs border border-white">
                    {initials(userName)}
                  </div>
                  <div className="hidden lg:block text-left text-xs">
                    <p className="font-bold text-gray-800 leading-tight">{userName}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{userTitle}</p>
                  </div>
                  <ChevronDown size={13} className="text-gray-400 hidden lg:block" />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 text-xs">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="font-bold text-gray-800">{userName}</p>
                      <p className="text-gray-400 capitalize">{role}</p>
                    </div>
                    <NavLink
                      to="/settings"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700"
                    >
                      <Settings size={14} /> Pengaturan
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-50 text-left"
                    >
                      <LogOut size={14} /> Keluar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative bg-white w-72 max-w-full h-full shadow-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
                  <span className="font-extrabold text-base text-gray-900">SmartStock PRO</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Navigasi Operasional</p>
                  {DOCK_ITEMS.map(({ to, icon: Icon, title }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) => clsx('flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition', isActive ? 'bg-emerald-50 text-emerald-800 font-bold' : 'text-gray-600 hover:bg-gray-50')}
                    >
                      <Icon size={16} />
                      {title}
                    </NavLink>
                  ))}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-rose-600 text-xs font-semibold p-2 hover:bg-rose-50 rounded-xl"
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 pb-6">
          {children}
        </main>
      </div>
    </div>
  );
}
