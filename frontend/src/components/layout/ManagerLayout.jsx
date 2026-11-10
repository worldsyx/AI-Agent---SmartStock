import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Brain, MessageSquare, Package,
  MapPin, ArrowLeftRight, ClipboardList, Settings,
  LogOut, Bell, Search, ChevronDown, Menu, X, Calendar, ShieldCheck, Activity
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { clsx } from '@/utils';
import toast from 'react-hot-toast';
import AiChatbotWidget from '@/features/manager/ai-chat/AiChatbotWidget';

// Manager Dock Items (PRD 3.1: Dashboard, Laporan, Rekomendasi AI, Inventaris, Lokasi Gudang, Transaksi, Stock Opname, Settings)
const MANAGER_NAV_ITEMS = [
  { to: '/manager/dashboard', icon: LayoutDashboard, title: 'Dashboard Manager' },
  { to: '/manager/reports', icon: FileText, title: 'Laporan & Audit' },
  { to: '/manager/ai-recommendations', icon: Brain, title: 'Rekomendasi AI' },
  { to: '/manager/ai-performance', icon: Activity, title: 'AI Performance & Analytics' },
  { to: '/manager/inventory', icon: Package, title: 'Monitoring Inventaris' },
  { to: '/manager/locations', icon: MapPin, title: 'Lokasi & Kapasitas' },
  { to: '/manager/transactions', icon: ArrowLeftRight, title: 'Histori Transaksi' },
  { to: '/manager/stocktake', icon: ClipboardList, title: 'Stock Opname Approval' },
];

export default function ManagerLayout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.name || 'Manager Gudang';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Berhasil keluar dari akun');
  };

  return (
    <div className="flex h-screen bg-[#f3f4f6] text-gray-900 overflow-hidden font-sans">
      {/* ── Left Floating Dock Sidebar for Manager Desktop ── */}
      <aside className="hidden lg:flex flex-col items-center justify-between w-20 py-6 my-4 ml-4 bg-white rounded-3xl shadow-sm border border-gray-100/80 z-20 flex-shrink-0">
        {/* Brand Top Mark */}
        <div className="w-11 h-11 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
          <Package size={22} className="stroke-[2.2]" />
        </div>

        {/* Center Icons Navigation */}
        <nav className="flex flex-col items-center gap-3 my-auto">
          {MANAGER_NAV_ITEMS.map(({ to, icon: Icon, title }) => {
            const isActive = location.pathname === to || (to !== '/manager/dashboard' && location.pathname.startsWith(to));
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

        {/* Bottom Actions: Settings & Logout */}
        <div className="flex flex-col items-center gap-3">
          <NavLink
            to="/settings"
            title="Pengaturan Manager"
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

      {/* ── Main Workspace Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
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
                MG
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-gray-900">SmartStock</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 tracking-wider">
                  MANAGER PORTAL
                </span>
                <span className="hidden sm:inline-block text-xs text-gray-400 font-medium border-l border-gray-200 pl-2 ml-1">
                  Pengawasan & Keputusan Gudang Karton
                </span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              {/* Notification icon */}
              <button
                onClick={() => toast('Memeriksa peringatan gudang...')}
                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200/60 relative transition"
                title="Pemberitahuan"
              >
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              </button>

              {/* User Profile Pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center">
                  {userName.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-gray-800 leading-none">{userName}</div>
                  <div className="text-[10px] font-medium text-emerald-600 mt-0.5">Manager Operasional</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 bottom-0 left-0 w-72 bg-white shadow-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      SP
                    </div>
                    <span className="font-bold text-base">Portal Manager</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                    <X size={20} />
                  </button>
                </div>

                <nav className="space-y-1">
                  {MANAGER_NAV_ITEMS.map(({ to, icon: Icon, title }) => {
                    const isActive = location.pathname.startsWith(to);
                    return (
                      <NavLink
                        key={to}
                        to={to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={clsx(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                          isActive ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        <Icon size={18} />
                        <span>{title}</span>
                      </NavLink>
                    );
                  })}
                  <NavLink
                    to="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                      location.pathname === '/settings' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Settings size={18} />
                    <span>Pengaturan</span>
                  </NavLink>
                </nav>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition w-full"
              >
                <LogOut size={18} />
                <span>Keluar Akun</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-4 lg:px-6 pb-8">
          {children}
        </main>
      </div>

      {/* Floating AI Chatbot Widget docked on the right */}
      <AiChatbotWidget />
    </div>
  );
}
