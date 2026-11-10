import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QrCode, Camera, CameraOff, Search, ArrowDownToLine, ArrowUpFromLine,
  ArrowLeftRight, AlertCircle, CheckCircle2, RefreshCw, X, Box,
  Upload, FlipHorizontal, ShieldAlert, Sparkles, Volume2
} from 'lucide-react';
import { Button, LoadingState } from '@/components/ui';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// Audio feedback sintetis saat QR berhasil discan (Web Audio API)
const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz (A5)
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext mungkin belum didukung atau diblokir browser sebelum interaksi
  }
};

export default function OperatorScanPage() {
  const navigate = useNavigate();
  const [manualCode, setManualCode] = useState('');
  const [resolving, setResolving] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  // Camera Scanner states
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'not-found'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [scannerError, setScannerError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastScannedCodeRef = useRef('');

  // 1. Inisialisasi & Ambil daftar kamera perangkat
  useEffect(() => {
    let isMounted = true;

    async function checkCameras() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (isMounted) {
            setCameraPermission('not-found');
            setScannerError('Browser ini tidak mendukung akses kamera langsung (getUserMedia).');
          }
          return;
        }

        const devices = await Html5Qrcode.getCameras();
        if (isMounted) {
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
            // Pilih kamera belakang jika tersedia, atau default pertama
            const backCam = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('rear') || 
              d.label.toLowerCase().includes('environment')
            );
            setSelectedCameraId(backCam ? backCam.id : devices[0].id);
          } else {
            setCameraPermission('not-found');
            setScannerError('Tidak ada perangkat kamera yang terdeteksi di perangkat Anda.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const errStr = String(err).toLowerCase();
          if (errStr.includes('permission') || errStr.includes('denied') || errStr.includes('notallowederror')) {
            setCameraPermission('denied');
            setScannerError('Izin akses kamera ditolak oleh pengguna atau browser.');
          } else {
            setCameraPermission('not-found');
            setScannerError('Gagal mendeteksi perangkat kamera: ' + (err.message || err));
          }
        }
      }
    }

    checkCameras();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, []);

  // 2. Jalankan scanner kamera saat kamera aktif & kamera terpilih
  useEffect(() => {
    if (cameraActive && selectedCameraId) {
      startScanner(selectedCameraId);
    } else {
      stopScanner();
    }
  }, [cameraActive, selectedCameraId]);

  const startScanner = async (cameraId) => {
    try {
      await stopScanner();

      const qrRegionId = 'qr-reader-container';
      const element = document.getElementById(qrRegionId);
      if (!element) return;

      const html5QrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13
        ],
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Frame error abaikan (terjadi jika frame tidak mengandung barcode)
        }
      );

      setCameraPermission('granted');
      setIsScanning(true);
      setScannerError(null);
    } catch (err) {
      const errStr = String(err).toLowerCase();
      if (errStr.includes('notallowederror') || errStr.includes('permission') || errStr.includes('denied')) {
        setCameraPermission('denied');
        setScannerError('Izin kamera ditolak. Silakan izinkan akses kamera pada ikon gembok/pengaturan situs di bilah alamat browser.');
      } else {
        setScannerError('Gagal membuka streaming kamera: ' + (err.message || err));
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      }
    } catch (err) {
      // Ignore stop errors on unmount
    } finally {
      setIsScanning(false);
    }
  };

  // 3. Callback saat QR terdeteksi
  const handleScanSuccess = (decodedText) => {
    if (!decodedText || decodedText === lastScannedCodeRef.current) return;
    
    lastScannedCodeRef.current = decodedText;
    playBeep();
    toast.success(`QR Terdeteksi: ${decodedText}`);
    handleResolveCode(decodedText);

    // Reset last scanned setelah 3 detik agar bisa scan ulang jika perlu
    setTimeout(() => {
      lastScannedCodeRef.current = '';
    }, 3000);
  };

  // 4. Resolusi Kode ke Backend
  const handleResolveCode = async (codeToTest) => {
    const code = (codeToTest || manualCode).trim();
    if (!code) {
      toast.error('Masukkan atau scan kode');
      return;
    }

    setResolving(true);
    try {
      const res = await api.resolveQr(code);
      setScanResult(res.data);
      toast.success(`Berhasil: ${res.data.entity_type?.toUpperCase()} '${code}'`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Kode tidak ditemukan dalam master data gudang';
      toast.error(msg);
      setScanResult(null);
    } finally {
      setResolving(false);
    }
  };

  // 5. Scan dari file gambar jika kamera fisik tidak tersedia
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const tempScanner = html5QrCodeRef.current || new Html5Qrcode('qr-reader-container');
      const decodedResult = await tempScanner.scanFile(file, true);
      handleScanSuccess(decodedResult);
    } catch (err) {
      toast.error('Tidak ditemukan kode QR valid pada gambar yang diunggah.');
    }
  };

  const sampleCodes = ['KRT-A3-001', 'LOT-2025-001', 'A1-01', 'PPR-ROLL-50'];

  return (
    <div className="space-y-4 pb-8 max-w-xl mx-auto animate-fade-in font-sans">
      {/* Header Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <QrCode size={18} />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Scanner QR Gudang</h1>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Scan langsung label barang, batch lot, atau lokasi rak menggunakan kamera perangkat.
          </p>
        </div>

        {/* Toggle Camera Active Button */}
        <button
          onClick={() => setCameraActive(!cameraActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition border ${
            cameraActive
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
          }`}
          title={cameraActive ? 'Nonaktifkan Kamera' : 'Aktifkan Kamera'}
        >
          {cameraActive ? <Camera size={14} /> : <CameraOff size={14} />}
          <span>{cameraActive ? 'Kamera Aktif' : 'Kamera Mati'}</span>
        </button>
      </div>

      {/* ── Real Camera Scanner Viewport ── */}
      <div className="bg-slate-950 rounded-3xl p-4 sm:p-5 text-white text-center relative overflow-hidden shadow-xl border border-slate-800 flex flex-col items-center justify-center min-h-[300px]">
        {/* Container Video HTML5 QR Code */}
        <div
          id="qr-reader-container"
          className={`w-full max-w-[320px] rounded-2xl overflow-hidden shadow-inner ${
            !cameraActive || cameraPermission === 'denied' || scannerError ? 'hidden' : 'block'
          }`}
        />

        {/* Scanning laser visual overlay when camera active */}
        {cameraActive && isScanning && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Kamera siap • Arahkan barcode / QR code ke kotak panduan</span>
          </div>
        )}

        {/* State: Camera Disabled */}
        {!cameraActive && (
          <div className="py-10 flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <CameraOff size={26} />
            </div>
            <p className="text-xs text-slate-400 max-w-xs">
              Kamera saat ini dimatikan. Anda dapat mengaktifkannya kembali atau menggunakan pencarian manual di bawah.
            </p>
            <Button
              size="sm"
              onClick={() => setCameraActive(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
            >
              <Camera size={14} /> Nyalakan Kamera
            </Button>
          </div>
        )}

        {/* State: Camera Permission Denied or Error */}
        {cameraActive && (cameraPermission === 'denied' || scannerError) && (
          <div className="py-8 px-4 flex flex-col items-center justify-center space-y-3 max-w-md">
            <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <ShieldAlert size={26} />
            </div>
            <h4 className="text-sm font-bold text-rose-300">Akses Kamera Diperlukan</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {scannerError || 'Browser belum mengizinkan akses ke kamera. Silakan klik ikon gembok / pengaturan situs di bilah alamat browser Anda dan pilih "Izinkan Kamera".'}
            </p>
            <div className="flex gap-2 flex-wrap justify-center pt-2">
              <Button
                size="sm"
                onClick={() => startScanner(selectedCameraId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
              >
                <RefreshCw size={13} /> Coba Izin Lagi
              </Button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
              >
                <Upload size={13} /> Upload Gambar QR
              </button>
            </div>
          </div>
        )}

        {/* Camera Switching Bar (if multiple cameras available) */}
        {availableCameras.length > 1 && cameraActive && isScanning && (
          <div className="mt-3 flex items-center gap-2 flex-wrap justify-center text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <FlipHorizontal size={13} /> Ganti Kamera:
            </span>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-xl px-2.5 py-1 text-[11px] outline-none"
            >
              {availableCameras.map(cam => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Kamera ${cam.id.slice(0, 5)}...`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Hidden File Input for Image Scan Fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* ── Manual Code Search Fallback (PRD 6.5) ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-gray-700 block">
            Input Kode Manual (Jika Label Rusak atau Kamera Terbatas)
          </label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition"
          >
            <Upload size={12} /> Scan dari Foto
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ketik SKU (misal: KRT-A3-001), Lot (LOT-2025-001), atau Lokasi (A1-01)..."
            className="flex-1 rounded-2xl border border-gray-200 px-3.5 py-2.5 text-xs outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition"
            onKeyDown={(e) => e.key === 'Enter' && handleResolveCode()}
          />
          <Button
            size="md"
            onClick={() => handleResolveCode()}
            disabled={resolving || !manualCode.trim()}
            className="rounded-2xl px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Search size={15} /> Cari
          </Button>
        </div>

        {/* Quick sample chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Tes Cepat:
          </span>
          {sampleCodes.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => {
                setManualCode(code);
                handleResolveCode(code);
              }}
              className="text-[10px] font-mono font-bold bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-0.5 rounded-lg border border-slate-200 transition cursor-pointer"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRD 6.5: Resolved Object Detail & Quick Action Cards ── */}
      {resolving && <LoadingState text="Memvalidasi kode melalui backend..." />}

      {scanResult && !resolving && (
        <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {scanResult.entity_type} TERIDENTIFIKASI
                </span>
                <div className="text-sm font-black text-gray-900">{scanResult.code}</div>
              </div>
            </div>
            <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
              <X size={18} />
            </button>
          </div>

          {/* Details for Product */}
          {scanResult.entity_type === 'product' && (
            <div className="space-y-3 text-xs">
              <div className="font-bold text-gray-900 text-sm">{scanResult.data?.name}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-gray-400 block">Kategori Material</span>
                  <span className="font-semibold capitalize text-gray-800">{scanResult.data?.category}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Stok Fisik Tersedia</span>
                  <span className="font-bold text-emerald-700">{scanResult.data?.current_stock} {scanResult.data?.unit}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => navigate(`/operator/receipts?sku=${scanResult.code}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                >
                  <ArrowDownToLine size={15} /> Catat Penerimaan
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/operator/issues?sku=${scanResult.code}`)}
                  className="bg-amber-600 hover:bg-amber-700 text-xs font-bold"
                >
                  <ArrowUpFromLine size={15} /> Catat Pengeluaran
                </Button>
              </div>
            </div>
          )}

          {/* Details for Lot */}
          {scanResult.entity_type === 'lot' && (
            <div className="space-y-3 text-xs">
              <div className="font-bold text-gray-900 text-sm">Batch Lot: {scanResult.data?.lot_code}</div>
              <div className="text-gray-500 text-[11px]">Material: {scanResult.data?.product?.name}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-gray-400 block">Sisa Kuantitas</span>
                  <span className="font-bold text-emerald-700">{scanResult.data?.current_quantity} {scanResult.data?.unit}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Kondisi Fisik</span>
                  <span className="font-semibold text-gray-800 capitalize">{scanResult.data?.condition_status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => navigate(`/operator/issues?lot=${scanResult.code}`)}
                  className="bg-amber-600 hover:bg-amber-700 text-xs font-bold"
                >
                  <ArrowUpFromLine size={15} /> Keluarkan Lot (FIFO)
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/operator/stock-locations?lot=${scanResult.code}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                >
                  <ArrowLeftRight size={15} /> Pindahkan Lokasi
                </Button>
              </div>
            </div>
          )}

          {/* Details for Location */}
          {scanResult.entity_type === 'location' && (
            <div className="space-y-3 text-xs">
              <div className="font-bold text-gray-900 text-sm">Slot Lokasi: {scanResult.data?.code}</div>
              <div className="text-gray-500 text-[11px]">Zona: {scanResult.data?.zone?.name}</div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px]">
                <span className="text-gray-400 block">Kapasitas Slot Rak</span>
                <span className="font-bold text-gray-800">{scanResult.data?.capacity_value} {scanResult.data?.capacity_unit}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
