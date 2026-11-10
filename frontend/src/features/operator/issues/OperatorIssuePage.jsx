import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowUpFromLine, CheckCircle2, ArrowLeft, ShieldCheck,
  AlertTriangle, Package, Calendar
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import { generateIdempotencyKey } from '@/utils';
import toast from 'react-hot-toast';

export default function OperatorIssuePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successTx, setSuccessTx] = useState(null);

  // Form State
  const [selectedSku, setSelectedSku] = useState(searchParams.get('sku') || '');
  const [selectedLotCode, setSelectedLotCode] = useState(searchParams.get('lot') || '');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Pengeluaran pengiriman produksi');

  useEffect(() => {
    Promise.all([
      api.getProducts().then(r => setProducts(r.data.data || [])).catch(() => []),
      api.getAgingReport().then(r => setLots(r.data.data || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, []);

  // Filter lots that match selected SKU
  const availableLots = lots.filter(l => !selectedSku || l.sku === selectedSku);
  const currentLot = lots.find(l => l.lot === selectedLotCode);

  // Suggested FIFO Lot (the oldest available lot)
  const fifoLot = availableLots.length > 0 ? availableLots[0] : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLotCode) { toast.error('Pilih lot barang yang akan dikeluarkan'); return; }
    if (!quantity || Number(quantity) <= 0) { toast.error('Jumlah pengeluaran harus lebih dari 0'); return; }

    if (currentLot && Number(quantity) > Number(currentLot.qty)) {
      toast.error(`Jumlah melebihi saldo lot (${currentLot.qty} ${currentLot.unit}). Saldo tidak boleh negatif.`);
      return;
    }

    setSubmitting(true);
    try {
      const refCode = generateIdempotencyKey('ISS');
      const payload = {
        lot_id: selectedLotCode,
        quantity: Number(quantity),
        reference_code: refCode,
        reason,
      };

      const res = await api.createIssue(payload);
      setSuccessTx(res.data.data || { reference_code: refCode, quantity, lot_code: selectedLotCode });
      toast.success('Pengeluaran barang FIFO berhasil dicatat!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mencatat pengeluaran barang');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState text="Menyiapkan data saldo FIFO..." />;

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
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Pencatatan Barang Keluar</h1>
          <p className="text-xs text-gray-500">Pengambilan stok karton mematuhi prinsip FIFO.</p>
        </div>
      </div>

      {successTx ? (
        /* ── Success Screen ── */
        <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-md text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
              Pengeluaran Selesai Diposting
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-1">
              {successTx.reference_code || 'ISS-SUCCESS'}
            </h2>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Kode Lot Diambil:</span>
              <span className="font-mono font-bold text-gray-800">{selectedLotCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Jumlah Dikeluarkan:</span>
              <span className="font-black text-amber-700">{quantity} Unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Prinsip:</span>
              <span className="font-bold text-emerald-700">FIFO Validated</span>
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
              Catat Pengeluaran Lain
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
        /* ── Form Keluar (Mobile-First) ── */
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* 1. Filter SKU */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Filter Barang / SKU
            </label>
            <select
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setSelectedLotCode('');
              }}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Semua Barang --</option>
              {products.map(p => (
                <option key={p.id} value={p.sku}>{p.sku} — {p.name}</option>
              ))}
            </select>
          </div>

          {/* FIFO Recommendation Pill */}
          {fifoLot && (
            <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                  <ShieldCheck size={12} /> Rekomendasi FIFO Teratas
                </span>
                <span className="font-mono font-bold text-emerald-950 block">{fifoLot.lot} ({fifoLot.days_old} hari di {fifoLot.location})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLotCode(fifoLot.lot)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl transition"
              >
                Pilih Lot Ini
              </button>
            </div>
          )}

          {/* 2. Pilih Lot Pengambilan */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Pilih Lot Pengambilan (Sesuai Rak Fisik)
            </label>
            <select
              value={selectedLotCode}
              onChange={(e) => setSelectedLotCode(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            >
              <option value="">-- Pilih Lot --</option>
              {availableLots.map(l => (
                <option key={l.id} value={l.lot}>
                  {l.lot} (Saldo: {l.qty} {l.unit} di {l.location} — Umur: {l.days_old} hari)
                </option>
              ))}
            </select>
          </div>

          {/* 3. Kuantitas */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-gray-700">Jumlah Keluar</label>
              {currentLot && (
                <span className="text-[10px] font-bold text-gray-400">
                  Tersedia: {currentLot.qty} {currentLot.unit}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Masukkan jumlah yang diambil..."
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs font-black text-gray-900 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* 4. Keterangan */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Keterangan Pengeluaran
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3.5 py-2 text-xs text-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="w-full rounded-2xl font-black text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-md"
          >
            <ArrowUpFromLine size={18} /> Simpan Pengeluaran FIFO
          </Button>
        </form>
      )}
    </div>
  );
}
