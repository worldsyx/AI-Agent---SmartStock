import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Brain, Sparkles, CheckCircle2,
  X, RefreshCw, ChevronDown, Minimize2, ArrowRight, ShieldCheck,
  Package, AlertTriangle
} from 'lucide-react';
import api from '@/services/api';
import toast from 'react-hot-toast';

export default function AiChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo Bapak/Ibu Manager! 👋\nSaya Asisten AI Smart Warehouse. Saya siap menjawab seluruh pertanyaan seputar stok & gudang karton, serta langsung menjalankan perintah Anda seperti: *"Ubah batas kadalwarsa pada item A"*.',
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
      if (!currentSessionId) {
        initSession();
      }
    }
  }, [isOpen]);

  const initSession = async () => {
    try {
      const res = await api.getAiChatSessions();
      const list = res.data.data || [];
      if (list.length > 0) {
        const latest = list[0];
        setCurrentSessionId(latest.id);
        const detailRes = await api.getAiChatSession(latest.id);
        if (detailRes.data.data?.messages?.length > 0) {
          setMessages(detailRes.data.data.messages);
        }
      } else {
        await handleNewSession();
      }
    } catch {
      // Fallback local session
    }
  };

  const handleNewSession = async () => {
    try {
      const res = await api.createAiChatSession({
        title: `Chatbot Gudang ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
      });
      const newSess = res.data.data;
      setCurrentSessionId(newSess.id);
      setMessages(newSess.messages || [
        {
          id: 'new-welcome',
          role: 'assistant',
          content: 'Sesi baru dimulai. Silakan tanyakan kondisi stok gudang atau berikan perintah manajemen stok.',
        }
      ]);
      toast.success('Sesi chat baru dibuat');
    } catch {
      toast.error('Gagal membuat sesi baru');
    }
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || sending) return;

    const userText = inputText.trim();
    setInputText('');
    setSending(true);

    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      let activeSessionId = currentSessionId;
      if (!activeSessionId) {
        const sessRes = await api.createAiChatSession({ title: 'Sesi Chatbot' });
        activeSessionId = sessRes.data.data.id;
        setCurrentSessionId(activeSessionId);
      }

      const res = await api.sendAiChatMessage(activeSessionId, { content: userText });
      const assistantMsg = res.data.data;
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Maaf, terjadi gangguan saat menghubungi server AI. Silakan coba kembali.'
        }
      ]);
      toast.error('Gagal mengirim pesan');
    } finally {
      setSending(false);
    }
  };

  const quickQuestions = [
    'Barang apa yang stoknya di bawah minimum?',
    'Ubah batas kadalwarsa pada item A menjadi 60 hari',
    'Lot apa saja yang paling lama tersimpan?',
    'Ringkasan barang masuk dan keluar kemarin?',
    'Zona mana yang kapasitasnya hampir penuh?',
  ];

  return (
    <>
      {/* ── 1. Floating Dock Logo on the Right Edge (Matches Screenshot 4) ── */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center bg-[#ecfdf5] hover:bg-[#d1fae5] text-emerald-900 py-3 pl-2 pr-3 rounded-l-2xl shadow-xl border-y border-l border-emerald-300/80 transition-all duration-200 hover:-translate-x-1.5 group cursor-pointer focus:outline-none"
          title="Buka AI Chatbot Gudang"
          aria-label="Buka AI Chatbot Gudang"
        >
          {/* Green accent tab indicator matching screenshot */}
          <span className="w-2 h-7 bg-emerald-600 rounded-full mr-2.5 transition-transform group-hover:scale-y-110 shadow-xs" />
          {/* Chat Icon matching screenshot */}
          <div className="relative">
            <MessageSquare size={24} className="text-emerald-700 stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        </button>
      )}

      {/* ── 2. Floating AI Chatbot Window ── */}
      {isOpen && (
        <div className="fixed right-3 sm:right-6 bottom-4 w-[390px] sm:w-[420px] max-w-[calc(100vw-24px)] h-[590px] max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-gray-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 py-3.5 flex items-center justify-between flex-shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-xs">
                <Brain size={18} className="text-emerald-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-tight text-white leading-tight">
                    SmartStock AI Chatbot
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-emerald-100 font-medium">
                  Spesialis Stok & Operasional Gudang
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleNewSession}
                title="Mulai Sesi Baru"
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Tutup Chatbot"
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#f9fafb]">
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={m.id || idx}
                  className={`flex items-start gap-2.5 ${isAssistant ? '' : 'flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-[11px] shadow-xs ${
                      isAssistant
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {isAssistant ? <Brain size={14} /> : 'M'}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isAssistant
                        ? 'bg-white text-gray-800 border border-gray-200/70 shadow-xs rounded-tl-sm'
                        : 'bg-emerald-600 text-white rounded-tr-sm shadow-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Rich Command Execution Card */}
                    {isAssistant && m.tool_name === 'executed_command' && m.tool_result && (
                      <div className="mt-2.5 bg-emerald-50/90 rounded-xl p-2.5 border border-emerald-200/90 space-y-2 text-slate-800">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Perintah Dijalankan
                          </span>
                          <span className="text-[9px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded-full">
                            Audit Log Aktif
                          </span>
                        </div>

                        <div className="text-[11px] font-bold text-gray-900">
                          {m.tool_result.parameter_name}
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-emerald-100 text-[10px]">
                          <div>
                            <span className="text-gray-400 block text-[9px]">Sebelumnya</span>
                            <span className="font-semibold text-gray-700">{m.tool_result.old_value}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[9px]">Nilai Baru</span>
                            <span className="font-bold text-emerald-700">{m.tool_result.new_value}</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-600 leading-tight">
                          {m.tool_result.impact}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing Loader */}
            {sending && (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                  <Brain size={14} />
                </div>
                <div className="bg-white border border-gray-200/80 p-3 rounded-2xl rounded-tl-sm text-xs text-gray-500 flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-gray-500 ml-1">AI sedang memproses...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Chips */}
          <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Cepat:
            </span>
            {quickQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setInputText(q);
                  inputRef.current?.focus();
                }}
                className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200/60 whitespace-nowrap transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Tanya stok atau perintah (contoh: Ubah batas kadalwarsa pada item A)..."
                disabled={sending}
                className="flex-1 rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
              <button
                type="submit"
                disabled={sending || !inputText.trim()}
                className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white flex items-center justify-center transition shadow-xs cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Hanya menjawab stok & pergudangan. Pertanyaan lain tidak tersedia.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
