import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Sparkles, CheckCircle2, ArrowLeftRight, ArrowLeft,
  Warehouse, QrCode
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { generateIdempotencyKey } from '@/utils';
import toast from 'react-hot-toast';

export default function OperatorStockLocationsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [lots, setLots] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);

  // Form State
  const [selectedLotCode, setSelectedLotCode] = useState(searchParams.get('lot') || '');
  const [destLocation, setDestLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Relokasi penataan ruang rak');

  useEffect(() => {
    Promise.all([
      api.getAgingReport().then(r => setLots(r.data.data || [])).catch(() => []),
      api.getLocations().then(r => setLocations(r.data.data || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  const currentLot = lots.find(l => l.lot === selectedLotCode);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLotCode) { toast.error('Pilih lot barang'); return; }
    if (!destLocation) { toast.error('Pilih lokasi tujuan baru'); return; }
    if (!quantity || Number(quantity) <= 0) { toast.error('Kuantitas perpindahan harus > 0'); return; }

    setSubmitting(true);
    try {
      const refCode = generateIdempotencyKey('TRF');
      const payload = {
        lot_id: selectedLotCode,
        to_location_id: destLocation,
        quantity: Number(quantity),
        reference_code: refCode,
        reason,
      };

      const res = await api.createTransfer(payload);
      setSuccessTx(res.data.data || { reference_code: refCode, to_location: destLocation, quantity });
      toast.success('Perpindahan lokasi berhasil disimpan!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan perpindahan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Menyiapkan data penempatan lokasi..." />;

  return (
    <div className="space-y-4 pb-8 max-w-xl mx-auto animate-fade-in">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/operator/home')}
          className="p-2 rounded-xl bg-white text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Lokasi Stok & Penempatan AI</h1>
          <p className="text-xs text-gray-500">Pencatatan relokasi fisik dan saran slotting AI.</p>
        </div>
      </div>

      {successTx ? (
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Relokasi Berhasil Dikonfirmasi
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-1">
              {successTx.reference_code || 'TRF-SUCCESS'}
            </h2>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Lot:</span>
              <span className="font-mono font-bold text-gray-800">{selectedLotCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lokasi Asal:</span>
              <span className="font-bold text-gray-600">{currentLot?.location || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lokasi Tujuan Baru:</span>
              <span className="font-bold text-emerald-700">{destLocation}</span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              size="md"
              className="flex-1 font-bold text-xs"
              onClick={() => {
                setSuccessTx(null);
                setQuantity('');
              }}
            >
              Pindahkan Barang Lain
            </Button>
            <Button
              size="md"
              variant="secondary"
              className="font-bold text-xs"
              onClick={() => navigate('/operator/home')}
            >
              Ke Beranda
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* 1. Pilih Lot Barang */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Pilih Lot Barang yang Akan Dipindahkan
            </label>
            <select
              value={selectedLotCode}
              onChange={(e) => setSelectedLotCode(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="">-- Pilih Lot --</option>
              {lots.map(l => (
                <option key={l.id} value={l.lot}>
                  {l.lot} ({l.sku} — Saldo: {l.qty} {l.unit} di {l.location})
                </option>
              ))}
            </select>
          </div>

          {/* PRD 6.7: AI Slotting Placement Tip */}
          <div className="bg-teal-50 rounded-2xl p-3 border border-teal-200/80 text-xs text-teal-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-700 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-bold text-teal-800 uppercase block">Saran AI Slotting</span>
                <span>Pindahkan barang cepat keluar (fast moving) ke slot tingkat bawah (A1-01 / A1-02).</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDestLocation('A1-01')}
              className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-xl transition flex-shrink-0 ml-2"
            >
              Terapkan A1-01
            </button>
          </div>

          {/* 2. Lokasi Tujuan Baru */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Lokasi Slot Tujuan Baru
            </label>
            <select
              value={destLocation}
              onChange={(e) => setDestLocation(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Slot Lokasi Tujuan --</option>
              {locations.length > 0 ? (
                locations.map(loc => (
                  <option key={loc.id} value={loc.code}>{loc.code} ({loc.location_type?.toUpperCase()})</option>
                ))
              ) : (
                <>
                  <option value="A1-01">A1-01 (Tingkat Bawah - Cepat Dijangkau)</option>
                  <option value="A1-02">A1-02 (Tingkat Bawah - Cepat Dijangkau)</option>
                  <option value="B1-01">B1-01 (Zona Paper Roll)</option>
                </>
              )}
            </select>
          </div>

          {/* 3. Jumlah Kuantitas */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-700">Jumlah yang Dipindahkan</label>
              {currentLot && (
                <span className="text-[10px] font-bold text-gray-400">
                  Maksimal: {currentLot.qty} {currentLot.unit}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Masukkan kuantitas..."
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 4. Alasan */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Alasan Perpindahan
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full rounded-2xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md"
          >
            <ArrowLeftRight size={18} /> Konfirmasi Perpindahan Lokasi
          </Button>
        </form>
      )}
    </div>
  );
}
