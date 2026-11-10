import React, { useState, useEffect } from 'react';
import {
  Settings, User, Lock, Camera, Sliders, Bell, Shield, Save,
  Sparkles, CheckCircle2, Warehouse
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const role = user?.role?.name || 'operator';
  const isManagerOrAdmin = role === 'manager' || role === 'admin';
  const isOperator = role === 'operator';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Manager Settings
  const [maxStockAge, setMaxStockAge] = useState(90);
  const [tolerancePct, setTolerancePct] = useState(1.0);
  const [criticalCapacity, setCriticalCapacity] = useState(90);
  const [aiServiceUrl, setAiServiceUrl] = useState('http://localhost:5000');

  // Operator Settings
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [scanSound, setScanSound] = useState(true);
  const [vibrateOnScan, setVibrateOnScan] = useState(true);

  useEffect(() => {
    api.getSettings()
      .then(r => {
        const d = r.data.data;
        if (d.user) setName(d.user.name);
        if (d.ai_settings) {
          setMaxStockAge(d.ai_settings.max_stock_age_days || 90);
          setTolerancePct(d.ai_settings.stocktake_tolerance_pct || 1.0);
          setCriticalCapacity(d.ai_settings.critical_capacity_threshold || 90);
          setAiServiceUrl(d.ai_settings.ai_service_url || 'http://localhost:5000');
        }
        if (d.operator_settings) {
          setCameraFacing(d.operator_settings.camera_facing || 'environment');
          setScanSound(d.operator_settings.scan_sound ?? true);
          setVibrateOnScan(d.operator_settings.vibrate_on_scan ?? true);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile({
        name,
        current_password: currentPassword || undefined,
        new_password: newPassword || undefined,
      });
      toast.success('Profil akun berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAiConfig = async () => {
    setSaving(true);
    try {
      await api.updateAiConfig({
        max_stock_age_days: Number(maxStockAge),
        stocktake_tolerance_pct: Number(tolerancePct),
        critical_capacity_threshold: Number(criticalCapacity),
      });
      toast.success('Konfigurasi parameter AI & ambang batas berhasil disimpan!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOperatorPreferences = async () => {
    setSaving(true);
    try {
      await api.updatePreferences({
        preferences: {
          camera_facing: cameraFacing,
          scan_sound: scanSound,
          vibrate_on_scan: vibrateOnScan,
        }
      });
      toast.success('Preferensi perangkat scanner berhasil disimpan!');
    } catch {
      toast.error('Gagal menyimpan preferensi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState text="Memuat preferensi pengaturan..." />;

  return (
    <div className="space-y-6 pt-2 pb-12 max-w-3xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pengaturan Akun & Sistem</h1>
        <p className="text-xs text-gray-500 mt-1">
          Halaman pengaturan tunggal disesuaikan untuk hak akses <strong>{role.toUpperCase()}</strong>.
        </p>
      </div>

      {/* ── 1. PROFIL PENGGUNA (UNTUK SEMUA ROLE) ── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <User size={18} className="text-emerald-700" />
          <h2 className="text-sm font-bold text-gray-900">Profil Pengguna & Keamanan Akun</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-gray-700 block mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Password Saat Ini</label>
              <input
                type="password"
                placeholder="Isi jika ingin ganti password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Password Baru</label>
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <Button type="submit" size="sm" disabled={saving} className="font-bold text-xs mt-2">
            <Save size={14} /> Simpan Profil
          </Button>
        </form>
      </div>

      {/* ── 2. KONTEN KHUSUS MANAGER / ADMIN (PRD 3.3) ── */}
      {isManagerOrAdmin && (
        <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Sliders size={18} className="text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Preferensi Analisis AI & Ambang Batas Stok (Khusus Manager)</h2>
              <p className="text-[11px] text-gray-400">Atur batas pemicu alert dan rekomendasi otomatis.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Batas Umur Maksimal Stok (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  value={maxStockAge}
                  onChange={(e) => setMaxStockAge(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Lot karton &gt; batas ini akan memicu peringatan FIFO.</span>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Toleransi Selisih Stock Opname (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={tolerancePct}
                  onChange={(e) => setTolerancePct(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">Batas toleransi deviasi hitungan fisik sebelum dianggap anomali.</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">
                Ambang Peringatan Kritis Kapasitas Zona (%)
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={criticalCapacity}
                onChange={(e) => setCriticalCapacity(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <Button onClick={handleSaveAiConfig} size="sm" disabled={saving} className="font-bold text-xs">
              <Save size={14} /> Simpan Konfigurasi AI Manager
            </Button>
          </div>
        </div>
      )}

      {/* ── 3. KONTEN KHUSUS OPERATOR (PRD 3.3) ── */}
      {isOperator && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Camera size={18} className="text-emerald-700" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Pengaturan Kamera & Scanner Lapangan (Khusus Operator)</h2>
              <p className="text-[11px] text-gray-400">Pengaturan scanner QR untuk kenyamanan kerja di area gudang.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Kamera Utama Default</label>
              <select
                value={cameraFacing}
                onChange={(e) => setCameraFacing(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="environment">Kamera Belakang (Environment - Direkomendasikan)</option>
                <option value="user">Kamera Depan (User)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scanSound}
                  onChange={(e) => setScanSound(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-gray-800">Bunyikan Beep saat QR Berhasil Dikenali</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vibrateOnScan}
                  onChange={(e) => setVibrateOnScan(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-semibold text-gray-800">Getar Perangkat Saat Scan Berhasil</span>
              </label>
            </div>

            <Button onClick={handleSaveOperatorPreferences} size="sm" disabled={saving} className="font-bold text-xs">
              <Save size={14} /> Simpan Pengaturan Scanner
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
