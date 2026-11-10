import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowDownToLine, CheckCircle2, QrCode, AlertCircle, ArrowLeft,
  Sparkles, Package, MapPin
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { generateIdempotencyKey } from '@/utils';
import toast from 'react-hot-toast';

export default function OperatorReceiptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);

  // Form State
  const [sku, setSku] = useState(searchParams.get('sku') || '');
  const [quantity, setQuantity] = useState('');
  const [locationId, setLocationId] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [reason, setReason] = useState('Penerimaan karton reguler');

  useEffect(() => {
    Promise.all([
      api.getProducts().then(r => setProducts(r.data.data || [])).catch(() => []),
      api.getLocations().then(r => setLocations(r.data.data || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  // Pre-generate Lot code if empty
  useEffect(() => {
    if (!lotCode) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rnd = Math.floor(100 + Math.random() * 900);
      setLotCode(`LOT-${today}-${rnd}`);
    }
  }, [lotCode]);

  const selectedProduct = products.find(p => p.sku === sku);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku) { toast.error('Pilih SKU Barang'); return; }
    if (!quantity || Number(quantity) <= 0) { toast.error('Kuantitas harus lebih dari 0'); return; }
    if (!locationId) { toast.error('Pilih lokasi rak tujuan'); return; }

    setSubmitting(true);
    try {
      const refCode = generateIdempotencyKey('RCV');
      const payload = {
        sku,
        quantity: Number(quantity),
        location_id: locationId,
        lot_code: lotCode,
        reference_code: refCode,
        reason,
        unit: selectedProduct?.unit || 'Lembar'
      };

      const res = await api.createReceipt(payload);
      setSuccessTx(res.data.data || { reference_code: refCode, quantity, sku, location_id: locationId });
      toast.success('Penerimaan barang berhasil dicatat!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan penerimaan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Menyiapkan formulir penerimaan..." />;

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
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Pencatatan Barang Masuk</h1>
          <p className="text-xs text-gray-500">Penerimaan fisik karton & paper roll ke rak gudang.</p>
        </div>
      </div>

      {successTx ? (
        /* ── Success Confirmation Screen ── */
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Transaksi Berhasil Disimpan
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-1">
              {successTx.reference_code || 'RCV-SUCCESS'}
            </h2>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">SKU Barang:</span>
              <span className="font-bold text-gray-800">{sku}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Jumlah Diterima:</span>
              <span className="font-black text-emerald-700">{quantity} {selectedProduct?.unit || 'Unit'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Kode Lot:</span>
              <span className="font-mono font-bold text-gray-800">{lotCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Lokasi Slot Tujuan:</span>
              <span className="font-bold text-gray-800">{locationId}</span>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              size="md"
              className="flex-1 font-bold text-xs"
              onClick={() => {
                setSuccessTx(null);
                setQuantity('');
                setLotCode('');
              }}
            >
              Catat Penerimaan Lain
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
        /* ── Form Masuk (Mobile-First) ── */
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* 1. Pilih SKU */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              SKU Karton / Paper Roll
            </label>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Pilih SKU Barang --</option>
              {products.map(p => (
                <option key={p.id} value={p.sku}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Lot Code & Jumlah */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Kode Lot Masuk
              </label>
              <input
                type="text"
                value={lotCode}
                onChange={(e) => setLotCode(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-mono font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Jumlah ({selectedProduct?.unit || 'Unit'})
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Contoh: 500"
                className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 3. Lokasi Tujuan */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700">
                Lokasi Slot Rak Tujuan
              </label>
              <button
                type="button"
                onClick={() => setLocationId('A1-01')}
                className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} /> Rekomendasi AI: A1-01
              </button>
            </div>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Pilih Slot Lokasi --</option>
              {locations.length > 0 ? (
                locations.map(l => (
                  <option key={l.id} value={l.code}>
                    {l.code} ({l.location_type?.toUpperCase()} — Kapasitas {l.capacity_value})
                  </option>
                ))
              ) : (
                <>
                  <option value="A1-01">A1-01 (Zona A / Rak A1)</option>
                  <option value="A1-02">A1-02 (Zona A / Rak A1)</option>
                  <option value="B1-01">B1-01 (Zona B / Rak B1)</option>
                </>
              )}
            </select>
          </div>

          {/* 4. Keterangan */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Keterangan Penerimaan
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Verification Box */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] text-gray-500 space-y-1">
            <strong>Verifikasi Operator:</strong> Pastikan kuantitas fisik dan slot tujuan telah sesuai sebelum menekan tombol simpan.
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full rounded-2xl font-black text-sm shadow-md"
          >
            <ArrowDownToLine size={18} /> Simpan Penerimaan Barang
          </Button>
        </form>
      )}
    </div>
  );
}
