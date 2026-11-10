import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Brain, Sparkles, Check, CheckCircle2,
  AlertTriangle, RefreshCw, Plus, Clock, ShieldCheck, ArrowRight
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function ManagerAiChatPage() {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmingConfig, setConfirmingConfig] = useState(false);
  const messagesEndRef = useRef(null);

  // Load existing sessions
  const loadSessions = async () => {
    try {
      const res = await api.getAiChatSessions();
      const list = res.data.data || [];
      setSessions(list);
      if (list.length > 0 && !currentSessionId) {
        openSession(list[0].id);
      } else if (list.length === 0) {
        handleNewSession();
      }
    } catch {
      // fallback session
      setMessages([
        {
          id: 1,
          role: 'assistant',
          content: 'Halo Bapak/Ibu Manager. Saya Asisten AI Smart Warehouse. Anda dapat menanyakan kondisi stok karton, umur simpan FIFO, ringkasan mutasi, atau meminta penyesuaian batas safety stock dan batas umur stok.',
        }
      ]);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const openSession = async (id) => {
    setCurrentSessionId(id);
    try {
      const res = await api.getAiChatSession(id);
      setMessages(res.data.data.messages || []);
    } catch {
      toast.error('Gagal memuat riwayat percakapan');
    }
  };

  const handleNewSession = async () => {
    try {
      const res = await api.createAiChatSession({ title: `Konsultasi Gudang ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` });
      const newSess = res.data.data;
      setSessions(prev => [newSess, ...prev]);
      setCurrentSessionId(newSess.id);
      setMessages(newSess.messages || []);
    } catch {
      toast.error('Gagal membuat sesi baru');
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || sending) return;

    const userText = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic UI for user message
    const tempUserMsg = { id: Date.now(), role: 'user', content: userText };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.sendAiChatMessage(currentSessionId, { content: userText });
      const assistantMsg = res.data.data;
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      toast.error('Gagal mengirim pesan ke AI Assistant');
    } finally {
      setSending(false);
    }
  };

  // PRD 5.5: Konfirmasi Perubahan Konfigurasi
  const handleConfirmConfig = async (toolResult) => {
    setConfirmingConfig(true);
    try {
      const res = await api.confirmAiChatConfig({
        config_key: toolResult.config_key,
        target_value: toolResult.target_value,
        entity_id: toolResult.entity_id || null,
        reason: `Dikonfirmasi oleh Manajer via AI Chat: ${toolResult.parameter_name}`,
      });

      toast.success(res.data.message || 'Konfigurasi berhasil diperbarui');

      // Append confirmation note in chat
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `✅ **Perubahan Berhasil Diterapkan & Dicatat dalam Audit Log.**\n\nParameter **${toolResult.parameter_name}** kini telah resmi aktif dengan nilai baru: **${toolResult.new_value}**.`,
        }
      ]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menerapkan konfigurasi');
    } finally {
      setConfirmingConfig(false);
    }
  };

  const quickPrompts = [
    'Barang apa yang stoknya di bawah minimum?',
    'Ubah batas kadalwarsa pada item A menjadi 60 hari',
    'Lot apa saja yang paling lama tersimpan?',
    'Apa ringkasan barang masuk dan keluar kemarin?',
    'Zona mana yang kapasitasnya hampir penuh?',
  ];

  return (
    <div className="pt-2 pb-6 animate-fade-in flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 mb-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl font-black text-gray-900 tracking-tight">AI Chat Assistant Manager</h1>
          </div>
          <p className="text-xs text-gray-500">
            Tanya jawab data gudang dan pengaturan preferensi parameter AI secara terverifikasi.
          </p>
        </div>

        <Button size="sm" onClick={handleNewSession} className="text-xs">
          <Plus size={14} /> Sesi Baru
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0">
        {/* Kolom Sesi Riwayat (Desktop) */}
        <div className="hidden lg:flex flex-col bg-white rounded-3xl p-4 border border-gray-100 shadow-xs overflow-y-auto space-y-2">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Riwayat Konsultasi</div>
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => openSession(s.id)}
              className={`w-full text-left p-3 rounded-2xl text-xs font-semibold transition truncate flex items-center gap-2 ${
                currentSessionId === s.id ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MessageSquare size={14} className="flex-shrink-0" />
              <span className="truncate">{s.title || 'Sesi AI'}</span>
            </button>
          ))}
        </div>

        {/* Kolom Utama Chat Messages */}
        <div className="lg:col-span-3 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex-1 min-h-0">
          {/* Messages Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={m.id} className={`flex items-start gap-3 ${isAssistant ? '' : 'flex-row-reverse'}`}>
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                    isAssistant ? 'bg-emerald-600 shadow-xs' : 'bg-slate-700'
                  }`}>
                    {isAssistant ? <Brain size={16} /> : 'M'}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                    isAssistant ? 'bg-slate-50 text-gray-800 border border-slate-100' : 'bg-emerald-600 text-white'
                  }`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Card Eksekusi Perintah Manajer */}
                    {isAssistant && m.tool_name === 'executed_command' && m.tool_result && (
                      <div className="mt-4 bg-emerald-50 rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3 text-slate-800">
                        <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 size={15} className="text-emerald-600" /> Perintah Berhasil Dijalankan
                          </span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                            Audit Log Aktif
                          </span>
                        </div>

                        <div className="text-xs font-bold text-gray-900">
                          {m.tool_result.parameter_name}
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-emerald-100 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px]">Nilai Sebelumnya</span>
                            <span className="font-semibold text-gray-700">{m.tool_result.old_value}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Nilai Baru Aktif</span>
                            <span className="font-bold text-emerald-700">{m.tool_result.new_value}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-600">
                          <strong>Dampak:</strong> {m.tool_result.impact}
                        </div>
                      </div>
                    )}

                    {/* PRD 5.5: Preview Card Perubahan Konfigurasi */}
                    {isAssistant && m.tool_name === 'preview_config' && m.tool_result && (
                      <div className="mt-4 bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm space-y-3 text-slate-800">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                            <Sparkles size={13} /> Pratinjau Perubahan Parameter
                          </span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                            Perlu Konfirmasi Manajer
                          </span>
                        </div>

                        <div className="text-xs font-bold text-gray-900">
                          {m.tool_result.parameter_name}
                        </div>

                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                          <div>
                            <span className="text-gray-400 block text-[10px]">Nilai Saat Ini</span>
                            <span className="font-bold text-gray-700">{m.tool_result.old_value}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Usulan Nilai Baru</span>
                            <span className="font-bold text-emerald-700">{m.tool_result.new_value}</span>
                          </div>
                        </div>

                        <div className="text-[11px] text-gray-500">
                          <strong>Dampak:</strong> {m.tool_result.impact}
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={confirmingConfig}
                            onClick={() => handleConfirmConfig(m.tool_result)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            <CheckCircle2 size={14} /> Konfirmasi & Simpan ke Sistem
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl bg-emerald-600 flex items-center justify-center text-white">
                  <Brain size={16} />
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-xs text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span>AI sedang menganalisis data pergudangan...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-4 py-2 bg-slate-50/80 border-t border-gray-100 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Contoh Pertanyaan:</span>
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => setInputText(p)}
                className="text-[11px] bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 px-3 py-1 rounded-full border border-gray-200/80 whitespace-nowrap transition"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tanyakan kondisi stok atau ketik perintah (contoh: Ubah batas umur stok menjadi 60 hari)..."
              disabled={sending}
              className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
            <Button
              type="submit"
              size="md"
              disabled={sending || !inputText.trim()}
              className="rounded-2xl px-5"
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
