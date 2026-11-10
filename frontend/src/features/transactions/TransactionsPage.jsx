import React, { useState } from 'react';
import { ScanLine, ArrowDownLeft, ArrowUpRight, RotateCcw, CheckCircle2, XCircle } from 'lucide-react';
import { Card, Button, Input, Select, Modal, Badge, Textarea } from '@/components/ui';
import api from '@/services/api';
import { generateIdempotencyKey, clsx } from '@/utils';
import toast from 'react-hot-toast';

const TX_TYPES = [
  { value:'receipt',   label:'Penerimaan Barang',   icon: ArrowDownLeft, color:'text-green-600 bg-green-50' },
  { value:'issue',     label:'Pengeluaran Barang',   icon: ArrowUpRight,  color:'text-red-500  bg-red-50'   },
  { value:'transfer',  label:'Transfer Lokasi',      icon: RotateCcw,     color:'text-blue-600 bg-blue-50'  },
];

const emptyReceipt  = { sku:'', vendor_id:'', lot_code:'', location_id:'', quantity:'', unit:'Lembar', reason:'', reference_code:'' };
const emptyIssue    = { sku:'', lot_id:'', quantity:'', reason:'', reference_code:'' };
const emptyTransfer = { lot_id:'', from_location_id:'', to_location_id:'', quantity:'', reason:'' };

export default function TransactionsPage() {
  const [type, setType]         = useState('receipt');
  const [form, setForm]         = useState(emptyReceipt);
  const [saving, setSaving]     = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [result, setResult]     = useState(null); // success/failure

  const handleTypeChange = (t) => {
    setType(t);
    setForm(t === 'receipt' ? emptyReceipt : t === 'issue' ? emptyIssue : emptyTransfer);
    setResult(null);
  };

  const f = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (!form.quantity || Number(form.quantity) <= 0) return 'Jumlah harus lebih dari 0';
    if (type === 'receipt' && !form.sku) return 'SKU wajib diisi';
    if (type === 'issue'   && !form.lot_id)  return 'Lot wajib diisi';
    if (type === 'transfer' && !form.from_location_id) return 'Lokasi asal wajib diisi';
    if (type === 'transfer' && !form.to_location_id)   return 'Lokasi tujuan wajib diisi';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const payload = { ...form, quantity: Number(form.quantity), reference_code: generateIdempotencyKey() };
    try {
      let res;
      if (type === 'receipt')  res = await api.createReceipt(payload);
      if (type === 'issue')    res = await api.createIssue(payload);
      if (type === 'transfer') res = await api.createTransfer(payload);
      setResult({ success: true, data: res.data.data });
      setConfirm(false);
      handleTypeChange(type); // reset form
      toast.success('Transaksi berhasil dicatat');
    } catch (e) {
      const msg = e.response?.data?.message || 'Transaksi gagal';
      setResult({ success: false, message: msg });
      toast.error(msg);
      setConfirm(false);
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 lg:p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Scan & Transaksi</h1>
        <p className="text-sm text-gray-500">Catat penerimaan, pengeluaran, dan transfer lokasi barang.</p>
      </div>

      {/* Transaction type selector */}
      <div className="grid grid-cols-3 gap-3">
        {TX_TYPES.map(({ value, label, icon: Icon, color }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={clsx(
              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all',
              type === value
                ? 'border-primary bg-brand-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            )}
          >
            <span className={clsx('p-3 rounded-xl', type === value ? 'bg-primary/10' : color)}>
              <Icon size={22} className={type === value ? 'text-primary' : ''} />
            </span>
            <span className={clsx('text-xs font-semibold text-center', type === value ? 'text-primary' : 'text-gray-600')}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Form */}
      <Card>
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
          <div className="p-2 rounded-xl bg-primary/10">
            <ScanLine size={20} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">
              {TX_TYPES.find(t => t.value === type)?.label}
            </p>
            <p className="text-xs text-gray-500">Isi detail atau scan barcode/QR barang</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Receipt fields */}
          {type === 'receipt' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Kode SKU *" placeholder="KRT-A3-001" value={form.sku} onChange={f('sku')} />
                <Input label="Kode Lot" placeholder="LOT-2025-001" value={form.lot_code} onChange={f('lot_code')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jumlah *" type="number" min="1" placeholder="0" value={form.quantity} onChange={f('quantity')} suffix={form.unit} />
                <Input label="ID Lokasi Tujuan *" placeholder="LOC-A1-01" value={form.location_id} onChange={f('location_id')} />
              </div>
              <Input label="ID Vendor" placeholder="VND-001" value={form.vendor_id} onChange={f('vendor_id')} />
            </>
          )}

          {/* Issue fields */}
          {type === 'issue' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Input label="ID Lot *" placeholder="LOT-2025-001" value={form.lot_id} onChange={f('lot_id')}
                  helper="FIFO otomatis direkomendasikan di halaman FIFO" />
                <Input label="Jumlah *" type="number" min="1" placeholder="0" value={form.quantity} onChange={f('quantity')} />
              </div>
            </>
          )}

          {/* Transfer fields */}
          {type === 'transfer' && (
            <>
              <Input label="ID Lot *" placeholder="LOT-2025-001" value={form.lot_id} onChange={f('lot_id')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Lokasi Asal *" placeholder="LOC-A1-01" value={form.from_location_id} onChange={f('from_location_id')} />
                <Input label="Lokasi Tujuan *" placeholder="LOC-B2-05" value={form.to_location_id} onChange={f('to_location_id')} />
              </div>
              <Input label="Jumlah *" type="number" min="1" placeholder="0" value={form.quantity} onChange={f('quantity')} />
            </>
          )}

          <Textarea label="Alasan / Catatan" placeholder="Opsional — cantumkan alasan transaksi" value={form.reason} onChange={f('reason')} rows={2} />
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => handleTypeChange(type)} className="flex-1">Reset</Button>
          <Button className="flex-1" onClick={() => setConfirm(true)}>Konfirmasi Transaksi</Button>
        </div>
      </Card>

      {/* Result banner */}
      {result && (
        <div className={clsx(
          'flex items-center gap-3 p-4 rounded-2xl animate-fade-in',
          result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        )}>
          {result.success
            ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
            : <XCircle size={20} className="text-red-600 flex-shrink-0" />
          }
          <div>
            <p className={clsx('text-sm font-semibold', result.success ? 'text-green-800' : 'text-red-800')}>
              {result.success ? 'Transaksi Berhasil Dicatat' : 'Transaksi Gagal'}
            </p>
            {!result.success && <p className="text-xs text-red-600 mt-0.5">{result.message}</p>}
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Konfirmasi Transaksi"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Batal</Button>
            <Button onClick={handleSubmit} loading={saving}>Ya, Catat Sekarang</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Pastikan data berikut sudah benar sebelum menyimpan:</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            {Object.entries(form).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-gray-500 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-gray-900 font-medium text-right">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            ⚠ Transaksi yang sudah disimpan tidak dapat dibatalkan. Perlu persetujuan Manajer untuk penyesuaian.
          </p>
        </div>
      </Modal>
    </div>
  );
}
