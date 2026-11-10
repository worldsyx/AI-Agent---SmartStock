import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Package, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // PRD 13.1 & 2.4: Redirect based on role if already logged in
  if (user) {
    const roleName = user.role?.name || 'operator';
    if (roleName === 'manager') return <Navigate to="/manager/dashboard" replace />;
    if (roleName === 'operator') return <Navigate to="/operator/home" replace />;
    if (roleName === 'admin') return <Navigate to="/manager/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email dan password wajib diisi'); return; }
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login(email, password);
      toast.success('Login berhasil');
      const roleName = loggedUser?.role?.name || 'operator';
      if (roleName === 'manager') {
        navigate('/manager/dashboard', { replace: true });
      } else if (roleName === 'operator') {
        navigate('/operator/home', { replace: true });
      } else {
        navigate('/manager/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Email atau password salah';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4 shadow-xl shadow-emerald-900/40">
            <Package size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">SmartStock PRO</h1>
          <p className="text-emerald-300 text-xs mt-1 font-medium">Smart Warehouse Karton & Paper Roll</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Masuk ke Sistem</h2>
            <p className="text-xs text-gray-500">Masukkan kredensial akun Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <Input
              label="Email Akun"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="off"
              autoFocus
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-700">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs outline-none transition pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-gray-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md"
            >
              Masuk
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
