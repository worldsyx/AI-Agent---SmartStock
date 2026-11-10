import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight,
  ArrowLeft, Search, Filter
} from 'lucide-react';
import { LoadingState } from '@/components/ui';
import api from '@/services/api';
import { formatDatetime } from '@/utils';
import toast from 'react-hot-toast';

export default function OperatorHistoryPage() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState(''); // '', receipt, issue, transfer

  useEffect(() => {
    setLoading(true);
    const params = filterType ? { type: filterType } : {};
    api.getOperatorHistory(params)
      .then(r => setTransactions(r.data.data || []))
      .catch(() => toast.error('Gagal memuat riwayat transaksi'))
      .finally(() => setLoading(false));
  }, [filterType]);

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
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Riwayat Aktivitas Saya</h1>
          <p className="text-xs text-gray-500">Mutasi barang yang dicatat oleh akun Anda.</p>
        </div>
      </div>

      {/* Filter Tabs (Mobile-Friendly Pill) */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto shadow-xs">
        {[
          { key: '', label: 'Semua Mutasi' },
          { key: 'receipt', label: 'Barang Masuk', icon: ArrowDownToLine },
          { key: 'issue', label: 'Barang Keluar', icon: ArrowUpFromLine },
          { key: 'transfer', label: 'Perpindahan', icon: ArrowLeftRight },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              filterType === tab.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List of Transactions (Card-based for mobile, PRD 6.8 & 6.1) */}
      {loading ? (
        <LoadingState text="Memuat riwayat transaksi..." />
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center text-xs text-gray-400 border border-slate-200">
          Belum ada riwayat mutasi yang cocok dengan filter.
        </div>
      ) : (
        <div className="space-y-2.5">
          {transactions.map(tx => {
            const isReceipt = tx.transaction_type === 'receipt';
            const isIssue = tx.transaction_type === 'issue';
            return (
              <div
                key={tx.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isReceipt ? 'bg-emerald-100 text-emerald-800' :
                      isIssue ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.transaction_type}
                    </span>
                    <span className="font-mono font-bold text-gray-900">{tx.reference_code}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatDatetime(tx.created_at)}</span>
                </div>

                <div className="flex items-start justify-between pt-1">
                  <div>
                    <div className="text-sm font-bold text-gray-900">{tx.product?.sku}</div>
                    <div className="text-xs text-gray-500">{tx.product?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-base font-black ${
                      isReceipt ? 'text-emerald-700' : isIssue ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {isReceipt ? '+' : isIssue ? '-' : ''}{Number(tx.quantity).toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">
                      {tx.lot?.lot_code ? `Lot: ${tx.lot.lot_code}` : ''}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl text-[11px] text-gray-600 flex justify-between">
                  <span>Lokasi: {tx.from_location?.code || '-'} → {tx.to_location?.code || '-'}</span>
                  <span className="text-gray-400 truncate max-w-[150px]">{tx.reason || 'Reguler'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
