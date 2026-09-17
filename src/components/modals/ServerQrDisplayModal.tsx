import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  RefreshCw,
  X,
  Maximize,
  Minimize,
  CheckCircle2,
  Users,
  Camera,
  ShieldCheck,
  Clock,
  Radio,
  Sparkles,
  Zap,
  School,
  Search,
  MessageSquare,
  RotateCcw,
  Copy,
  Check,
  Sliders,
  Settings2,
  CheckCheck
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { AppData } from '../../types';
import { getIndonesianTimeString, getTodayString, getShiftTimingForStudent } from '../../utils/helpers';

interface ServerQrDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  onUpdateAppData: (updatedData: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface QrLogItem {
  id: string;
  siswaId: string;
  nisn: string;
  namaSiswa: string;
  namaKelas: string;
  tanggal: string;
  status: string;
  time: string;
  method: string;
  isServerVerified: boolean;
}

export const ServerQrDisplayModal: React.FC<ServerQrDisplayModalProps> = ({
  isOpen,
  onClose,
  appData,
  onUpdateAppData,
  onShowToast,
}) => {
  const [token, setToken] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [isLoadingToken, setIsLoadingToken] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Auto-Reset Token Configuration State
  const [isAutoResetEnabled, setIsAutoResetEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('qr_auto_reset_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const [autoResetDuration, setAutoResetDuration] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('qr_auto_reset_duration');
      return saved ? parseInt(saved, 10) : 60;
    } catch (e) {
      return 60;
    }
  });

  const [justAutoRefreshed, setJustAutoRefreshed] = useState<boolean>(false);
  const [isCopiedToken, setIsCopiedToken] = useState<boolean>(false);

  const isFetchingTokenRef = useRef<boolean>(false);
  const expiresAtRef = useRef<number>(0);

  // Scanner & Logs state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<'auto' | 'masuk' | 'pulang'>('auto');
  const [qrLogs, setQrLogs] = useState<QrLogItem[]>([]);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastScannedStudent, setLastScannedStudent] = useState<string | null>(null);
  const [wibTime, setWibTime] = useState<string>('');

  // Center popup modal notification state
  const [scannedResultModal, setScannedResultModal] = useState<{
    isOpen: boolean;
    namaSiswa: string;
    namaKelas: string;
    nisn: string;
    status: string;
    time: string;
    tanggal: string;
    isUpdate?: boolean;
    noWaOrangTua?: string;
    namaOrangTua?: string;
    notifWaText?: string;
    notifWaUrl?: string | null;
  } | null>(null);

  // Auto-dismiss notification popup after 3.5 seconds to keep kiosk flow smooth
  useEffect(() => {
    if (!scannedResultModal?.isOpen) return;
    const timer = setTimeout(() => {
      setScannedResultModal(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [scannedResultModal]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fetch Token from Server API (with duration and force flags)
  const fetchServerToken = async (force: boolean = false) => {
    if (isFetchingTokenRef.current) return;
    isFetchingTokenRef.current = true;
    if (force) setIsLoadingToken(true);

    try {
      const url = force
        ? `/api/qr/generate-new?interval=${autoResetDuration}`
        : `/api/qr/token?interval=${autoResetDuration}`;
      const res = await fetch(url, { method: force ? 'POST' : 'GET' });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        if (data.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
        }
        const exp = Number(data.expiresAt) || (Date.now() + autoResetDuration * 1000);
        setExpiresAt(exp);
        expiresAtRef.current = exp;
        const remaining = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
        setTimeRemaining(remaining);

        if (force) {
          setJustAutoRefreshed(true);
          setTimeout(() => setJustAutoRefreshed(false), 3000);
        }
      }
    } catch (err) {
      console.error('Error fetching server QR token:', err);
    } finally {
      setIsLoadingToken(false);
      isFetchingTokenRef.current = false;
    }
  };

  // Generate Fresh Token manually
  const handleForceGenerateNewToken = async () => {
    setIsLoadingToken(true);
    try {
      await fetchServerToken(true);
      onShowToast('Token QR Presensi Server berhasil diperbarui!', 'success');
    } catch (err) {
      onShowToast('Gagal memperbarui token QR Server', 'error');
    } finally {
      setIsLoadingToken(false);
    }
  };

  // Toggle Auto-Reset
  const handleToggleAutoReset = () => {
    const nextVal = !isAutoResetEnabled;
    setIsAutoResetEnabled(nextVal);
    try {
      localStorage.setItem('qr_auto_reset_enabled', String(nextVal));
    } catch (e) {}
    onShowToast(
      nextVal
        ? `Reset Token Otomatis DIAKTIFKAN (Tiap ${autoResetDuration} detik)`
        : 'Reset Token Otomatis DINONAKTIFKAN (Token tetap/statis)',
      nextVal ? 'success' : 'info'
    );
  };

  // Change Interval Duration
  const handleChangeDuration = (sec: number) => {
    setAutoResetDuration(sec);
    try {
      localStorage.setItem('qr_auto_reset_duration', String(sec));
    } catch (e) {}
    onShowToast(`Durasi Reset Token diatur: ${sec >= 60 ? `${sec / 60} Menit` : `${sec} Detik`}`, 'info');
    // Immediately regenerate with new interval
    setTimeout(() => {
      fetchServerToken(true);
    }, 50);
  };

  // Copy Token Helper
  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
      setIsCopiedToken(true);
      onShowToast(`Token ${token} disalin ke clipboard!`, 'success');
      setTimeout(() => setIsCopiedToken(false), 2500);
    }).catch(() => {
      onShowToast(`Token: ${token}`, 'info');
    });
  };

  // Fetch Live Server Logs
  const fetchServerLogs = async () => {
    try {
      const today = getTodayString();
      const res = await fetch(`/api/qr/logs?date=${today}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setQrLogs(data.logs);
      }
    } catch (err) {
      console.error('Error fetching server logs:', err);
    }
  };

  const handleResetFeed = () => {
    if (!window.confirm("Apakah Anda yakin ingin mengosongkan tampilan feed presensi QR saat ini?")) return;
    setQrLogs([]);
    setLastScannedStudent(null);
    onShowToast("Tampilan feed presensi QR berhasil dikosongkan.", "success");
  };

  // Accurate Auto-fetch token & precise countdown timer loop
  useEffect(() => {
    if (!isOpen) return;

    fetchServerToken(false);
    fetchServerLogs();
    setWibTime(getIndonesianTimeString(new Date(), true));

    // Poll logs periodically
    const logsInterval = setInterval(fetchServerLogs, 4000);

    // Precise 1-second countdown & Auto-Reset trigger
    const countdownInterval = setInterval(() => {
      setWibTime(getIndonesianTimeString(new Date(), true));

      const now = Date.now();
      const targetExp = expiresAtRef.current;

      if (targetExp > 0) {
        const remaining = Math.max(0, Math.ceil((targetExp - now) / 1000));
        setTimeRemaining(remaining);

        // When countdown expires and auto reset is active, trigger new dynamic token
        if (remaining <= 0 && isAutoResetEnabled && !isFetchingTokenRef.current) {
          fetchServerToken(true);
        }
      }
    }, 1000);

    return () => {
      clearInterval(logsInterval);
      clearInterval(countdownInterval);
    };
  }, [isOpen, isAutoResetEnabled, autoResetDuration]);

  const lastScannedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const playSuccessBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  // Setup HTML5 Scanner when camera is activated
  useEffect(() => {
    if (!isOpen || !isCameraActive) return;

    let scanner: Html5QrcodeScanner | null = null;
    const timer = setTimeout(() => {
      try {
        scanner = new Html5QrcodeScanner(
          'server-qr-scanner-box',
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Expanded scanning target area for scanning student cards easily
              const width = Math.min(Math.floor(viewfinderWidth * 0.90), 500);
              const height = Math.min(Math.floor(viewfinderHeight * 0.80), 380);
              return {
                width: Math.max(width, 280),
                height: Math.max(height, 220),
              };
            },
            aspectRatio: 1.25,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            handleProcessServerAbsen(decodedText);
          },
          () => {}
        );
      } catch (e) {
        console.error('Failed to init scanner:', e);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [isOpen, isCameraActive]);

  // Process Attendance via Server API with Client Fallback
  const handleProcessServerAbsen = async (codeToSubmit: string) => {
    const rawClean = codeToSubmit.trim();
    if (!rawClean || isSubmitting) return;

    // Prevent rapid repeated camera scans of the exact same code within 3.5s
    const now = Date.now();
    if (lastScannedRef.current.code === rawClean && now - lastScannedRef.current.time < 3500) {
      return;
    }
    lastScannedRef.current = { code: rawClean, time: now };

    setIsSubmitting(true);

    const tryClientFallback = (errorMessage?: string) => {
      // Unquote raw code if needed
      let codeStr = rawClean;
      if ((codeStr.startsWith('"') && codeStr.endsWith('"')) || (codeStr.startsWith("'") && codeStr.endsWith("'"))) {
        codeStr = codeStr.slice(1, -1).trim();
      }

      let parsedPayload: any = null;
      try {
        parsedPayload = JSON.parse(codeStr);
      } catch (e) {}

      let targetSiswa = appData.siswa.find((s) => {
        if (parsedPayload) {
          const pId = parsedPayload.id || parsedPayload.siswaId;
          const pNisn = parsedPayload.nisn;
          const pNama = parsedPayload.nama;
          if (pId && String(s.id).toLowerCase() === String(pId).toLowerCase()) return true;
          if (pNisn && s.nisn && String(s.nisn).trim() === String(pNisn).trim()) return true;
          if (pNama && s.nama && String(s.nama).trim().toLowerCase() === String(pNama).trim().toLowerCase()) return true;
        }

        const cleanStr = codeStr.toUpperCase();
        if (s.nisn && String(s.nisn).trim().toUpperCase() === cleanStr) return true;
        if (s.id && String(s.id).trim().toUpperCase() === cleanStr) return true;
        if (s.nama && String(s.nama).trim().toUpperCase() === cleanStr) return true;
        return false;
      });

      if (!targetSiswa) {
        onShowToast(errorMessage || `Siswa dengan Kartu QR / NISN '${codeStr.slice(0, 25)}' tidak ditemukan.`, 'error');
        return;
      }

      // Process local presence update
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
      const nowTimeStr = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date()).replace(/\./g, ':');

      const timing = getShiftTimingForStudent(appData, targetSiswa, todayStr);
      const isJamMasukActive = timing.isJamMasukActive;
      const jamMasukSelesai = timing.jamMasukSelesai;
      const scanHHmm = nowTimeStr.trim().slice(0, 5);
      const cutoffHHmm = jamMasukSelesai.trim().slice(0, 5);
      const assignedStatus: 'H' | 'K' = (!isJamMasukActive || scanHHmm <= cutoffHHmm) ? 'H' : 'K';

      // Determine scan mode (masuk vs pulang)
      let effectiveScanMode = scanMode;
      if (effectiveScanMode === 'auto') {
        const [nowH, nowM] = nowTimeStr.split(':').map(Number);
        const nowTotalMins = nowH * 60 + nowM;
        const [pulangH, pulangM] = timing.jamPulang.split(':').map(Number);
        const pulangTotalMins = pulangH * 60 + pulangM;
        if (nowTotalMins >= pulangTotalMins - 30 || nowTotalMins > pulangTotalMins) {
          effectiveScanMode = 'pulang';
        } else {
          effectiveScanMode = 'masuk';
        }
      }

      const kelasObj = appData.kelas.find((k) => k.id === targetSiswa!.kelasId);
      const namaKelas = kelasObj ? kelasObj.nama : 'Tanpa Kelas';

      const key = `${todayStr}_${targetSiswa.kelasId}`;
      const currentList = (appData.presensi || {})[key] ? [...((appData.presensi || {})[key])] : [];
      const existingIndex = currentList.findIndex((i) => i.siswaId === targetSiswa!.id);

      let isAlreadyRecorded = false;
      if (effectiveScanMode === 'pulang') {
        if (existingIndex >= 0) {
          if (currentList[existingIndex].pulangTime) isAlreadyRecorded = true;
          currentList[existingIndex] = {
            ...currentList[existingIndex],
            pulangTime: nowTimeStr,
            pulangStatus: 'H'
          };
        } else {
          currentList.push({
            siswaId: targetSiswa.id,
            status: 'H',
            time: '',
            pulangTime: nowTimeStr,
            pulangStatus: 'H'
          });
        }
      } else {
        if (existingIndex >= 0) {
          if (currentList[existingIndex].status === assignedStatus) isAlreadyRecorded = true;
          currentList[existingIndex] = {
            ...currentList[existingIndex],
            status: assignedStatus,
            time: nowTimeStr
          };
        } else {
          currentList.push({
            siswaId: targetSiswa.id,
            status: assignedStatus,
            time: nowTimeStr
          });
        }
      }

      const updatedData = { ...appData, presensi: { ...(appData.presensi || {}), [key]: currentList } };
      onUpdateAppData(updatedData);

      playSuccessBeep();
      setLastScannedStudent(`${targetSiswa.nama} (${namaKelas})`);
      onShowToast(`Presensi Berhasil (Local fallback)! ${targetSiswa.nama} - ${effectiveScanMode === 'pulang' ? 'Pulang' : assignedStatus === 'K' ? 'Kesiangan' : 'Hadir'}`, 'success');

      setScannedResultModal({
        isOpen: true,
        namaSiswa: targetSiswa.nama,
        namaKelas,
        nisn: targetSiswa.nisn || '-',
        status: effectiveScanMode === 'pulang' ? 'H' : assignedStatus,
        time: nowTimeStr,
        tanggal: todayStr,
        isUpdate: isAlreadyRecorded,
        noWaOrangTua: targetSiswa.noWaOrangTua || '',
        namaOrangTua: targetSiswa.namaOrangTua || '',
        notifWaText: effectiveScanMode === 'pulang'
          ? `Halo ${targetSiswa.namaOrangTua || 'Orang Tua'}, Ananda ${targetSiswa.nama} telah presensi PULANG pada ${todayStr} pukul ${nowTimeStr} WIB.`
          : `Halo ${targetSiswa.namaOrangTua || 'Orang Tua'}, Ananda ${targetSiswa.nama} telah presensi pada ${todayStr} pukul ${nowTimeStr} WIB (${assignedStatus === 'K' ? 'Kesiangan' : 'Hadir'}).`,
        notifWaUrl: targetSiswa.noWaOrangTua ? `https://wa.me/${targetSiswa.noWaOrangTua}` : undefined
      });

      setManualCodeInput('');
    };

    try {
      const res = await fetch('/api/qr/absen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedCode: rawClean,
          scanMode: scanMode,
          clientAppData: appData
        })
      });
      const data = await res.json();

      if (data.success) {
        playSuccessBeep();
        onShowToast(data.message, 'success');
        setLastScannedStudent(`${data.siswa?.nama} (${data.siswa?.namaKelas})`);

        setScannedResultModal({
          isOpen: true,
          namaSiswa: data.siswa?.nama || 'Siswa',
          namaKelas: data.siswa?.namaKelas || '-',
          nisn: data.siswa?.nisn || '-',
          status: data.status || 'H',
          time: data.time || new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          tanggal: data.tanggal || new Date().toLocaleDateString('id-ID'),
          isUpdate: Boolean(data.isAlreadyRecorded),
          noWaOrangTua: data.noWaOrangTua || data.siswa?.noWaOrangTua || '',
          namaOrangTua: data.namaOrangTua || data.siswa?.namaOrangTua || '',
          notifWaText: data.notifWaText,
          notifWaUrl: data.notifWaUrl
        });

        if (data.item && data.presensiKey) {
          const currentList = (appData.presensi || {})[data.presensiKey] ? [...((appData.presensi || {})[data.presensiKey])] : [];
          const idx = currentList.findIndex((item) => item.siswaId === data.siswa?.id);
          if (idx >= 0) {
            currentList[idx] = data.item;
          } else {
            currentList.push(data.item);
          }
          onUpdateAppData({ ...appData, presensi: { ...(appData.presensi || {}), [data.presensiKey]: currentList } });
        } else if (data.updatedAppData) {
          onUpdateAppData(data.updatedAppData);
        }
        setManualCodeInput('');
        fetchServerLogs();
      } else {
        // Server returned error message (e.g. past pulang time, missing check-in, etc.)
        onShowToast(data.message || 'Presensi gagal.', 'error');
        setScannedResultModal({
          isOpen: true,
          namaSiswa: 'Gagal',
          namaKelas: '-',
          nisn: '-',
          status: 'ERROR',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          tanggal: new Date().toLocaleDateString('id-CA'),
          isUpdate: false,
          noWaOrangTua: '',
          namaOrangTua: '',
          notifWaText: data.message,
          notifWaUrl: undefined
        });
        setManualCodeInput('');
      }
    } catch (err) {
      // Fallback to client state on network error
      tryClientFallback('Presensi diproses secara lokal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div
        ref={containerRef}
        className={`w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden ${
          isFullscreen ? 'fixed inset-0 max-w-none max-h-none rounded-none z-50' : ''
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  Server QR Code Presensi
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  <Radio className="w-3 h-3" /> Live Server API
                </span>
                {wibTime && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Clock className="w-3 h-3 text-indigo-400" /> {wibTime} WIB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {appData.sekolah.nama || 'Absensi Siswa'} — Portal Presensi Otomatis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (Proyektor)'}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Live QR Code Server Display */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 sm:p-6 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Info & Countdown Timer */}
            <div className="w-full mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Pindai dengan Kamera Murid
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-200">
                  QR Code Presensi Harian Server
                </h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                {/* Auto-Reset Countdown Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono transition-all ${
                  isAutoResetEnabled
                    ? timeRemaining <= 10
                      ? 'bg-amber-950/70 border-amber-500/80 text-amber-300 animate-pulse'
                      : 'bg-slate-800 border-slate-700/80 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/40 text-slate-400'
                }`}>
                  <Clock className={`w-3.5 h-3.5 ${isAutoResetEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>
                    {isAutoResetEnabled ? `Auto Reset: ${timeRemaining}s` : 'Reset Manual'}
                  </span>
                </div>

                {/* Auto-Reset Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggleAutoReset}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                    isAutoResetEnabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                  }`}
                  title="Klik untuk aktifkan / matikan pergantian token otomatis"
                >
                  <span className={`w-2 h-2 rounded-full ${isAutoResetEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span>{isAutoResetEnabled ? 'Auto ON' : 'Auto OFF'}</span>
                </button>
              </div>
            </div>

            {/* Countdown Progress Bar (when Auto-Reset is Active) */}
            {isAutoResetEnabled && (
              <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-3 border border-slate-700/50">
                <div
                  className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                    timeRemaining <= 10 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (timeRemaining / autoResetDuration) * 100))}%`
                  }}
                />
              </div>
            )}

            {/* Notification Banner when Auto Reset Happens */}
            {justAutoRefreshed && (
              <div className="w-full mb-3 py-1.5 px-3 rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-2 animate-bounce">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Token QR Baru Berhasil Dihasilkan Otomatis!</span>
              </div>
            )}

            {/* Main QR Code Box */}
            <div className="relative my-2 p-4 bg-white rounded-2xl shadow-2xl border-4 border-indigo-500/30 flex items-center justify-center group">
              {isLoadingToken ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 text-slate-600">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold">Memuat QR Code Server...</span>
                </div>
              ) : qrDataUrl ? (
                <div className="relative">
                  <img src={qrDataUrl} alt="QR Code Server Presensi" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                    <School className="w-16 h-16 text-indigo-900" />
                  </div>
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-500 text-xs">
                  Gagal memuat gambar QR
                </div>
              )}
            </div>

            {/* Auto-Reset Interval Selector Toolbar */}
            <div className="w-full mt-2 flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 py-2 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Sliders className="w-3 h-3 text-indigo-400" /> Interval Reset:
              </span>
              <div className="flex items-center gap-1">
                {[
                  { label: '30s', val: 30 },
                  { label: '60s', val: 60 },
                  { label: '2m', val: 120 },
                  { label: '5m', val: 300 }
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => handleChangeDuration(opt.val)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
                      autoResetDuration === opt.val
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Text & Action Buttons (Copy & Refresh) */}
            <div className="mt-3 w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left w-full sm:w-auto">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kode Token Presensi Hari Ini:</p>
                <div className="flex items-center gap-2">
                  <p className="text-base sm:text-lg font-mono font-black text-indigo-300 tracking-wider">
                    {token || 'LOADING...'}
                  </p>
                  {token && (
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Salin Token"
                    >
                      {isCopiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  disabled={!token}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-98 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 border border-slate-700"
                >
                  {isCopiedToken ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedToken ? 'Disalin' : 'Salin Token'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleForceGenerateNewToken}
                  disabled={isLoadingToken}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-600/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingToken ? 'animate-spin' : ''}`} />
                  <span>Perbarui Sekarang</span>
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Siswa dapat membuka menu <span className="text-indigo-300 font-semibold">Portal Murid &gt; Absen QR Code</span> untuk memindai QR ini atau memasukkan token.
            </p>

            {/* School Entry Hours Info Badge */}
            <div className="mt-2.5 w-full bg-indigo-950/40 border border-indigo-800/60 rounded-xl p-2.5 flex items-center justify-between text-xs text-indigo-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Jam Masuk: <strong className="text-white font-mono">{appData.sekolah?.jamMasukMulai || '06:30'} - {appData.sekolah?.jamMasukSelesai || '06:45'} WIB</strong>
                </span>
              </div>
              {appData.sekolah?.isJamMasukActive !== false ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                  &gt; {appData.sekolah?.jamMasukSelesai || '06:45'} = Kesiangan (K)
                </span>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                  Aturan Jam Masuk: NONAKTIF (Semua Scan = HADIR)
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: Teacher Camera Scanner & Server Real-time Feed */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Mode Presensi Server Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 shadow-sm">
              <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">Mode Presensi Server</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                {(['auto', 'masuk', 'pulang'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setScanMode(m)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                      scanMode === m
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{m === 'auto' ? '⏱️ Auto' : m === 'masuk' ? '☀️ Masuk' : '🌙 Pulang'}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                {scanMode === 'auto' && 'Sistem otomatis mendeteksi pulang 30 menit sebelum jam shift berakhir.'}
                {scanMode === 'masuk' && 'Paksa mode scan untuk kehadiran jam masuk sekolah (Hadir/Kesiangan).'}
                {scanMode === 'pulang' && 'Paksa mode scan untuk kepulangan sekolah.'}
              </p>
            </div>

            {/* Quick Scanner Mode Toggle */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Scanner Kartu Pelajar Siswa</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraActive(!isCameraActive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                    isCameraActive
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isCameraActive ? 'Matikan Kamera' : 'Aktifkan Kamera'}
                </button>
              </div>

              {isCameraActive ? (
                <div id="server-qr-scanner-box" className="overflow-hidden rounded-xl bg-black min-h-[200px]" />
              ) : (
                <p className="text-xs text-slate-400">
                  Aktifkan kamera untuk memindai QR Code Kartu Pelajar siswa secara langsung oleh petugas/guru.
                </p>
              )}

              {/* Manual Input / Barcode Scanner Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessServerAbsen(manualCodeInput);
                }}
                className="mt-3 flex gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="NISN / Kode QR / Identitas Siswa..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !manualCodeInput.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {isSubmitting ? '...' : 'Proses'}
                </button>
              </form>
            </div>

            {/* Real-time Server Attendance Logs */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Feed Presensi Masuk Server</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full font-semibold border border-indigo-500/30">
                    {qrLogs.length} Siswa Hadir
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFeed}
                    title="Reset Feed Presensi"
                    className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {lastScannedStudent && (
                <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Berhasil Scan: {lastScannedStudent}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[260px] pr-1">
                {qrLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Belum ada presensi QR tercatat di server hari ini.
                  </div>
                ) : (
                  qrLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold text-slate-200 truncate">{log.namaSiswa}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          NISN: {log.nisn} &bull; <span className="text-indigo-300">{log.namaKelas}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          HADIR ({log.time})
                        </span>
                        <p className="text-[9px] text-slate-500 mt-0.5">Verified Server API</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Notifikasi Presensi Di Tengah Layar */}
        {scannedResultModal?.isOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-700 animate-in zoom-in-95 duration-200 overflow-hidden">
              {/* Background Accent */}
              <div
                className={`absolute -top-12 -left-12 -right-12 h-32 rounded-b-full opacity-30 ${
                  scannedResultModal.status === 'K'
                    ? 'bg-gradient-to-b from-orange-500 to-transparent'
                    : 'bg-gradient-to-b from-emerald-500 to-transparent'
                }`}
              />

              {/* Header Badge */}
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-3 border-4 ${
                    scannedResultModal.status === 'K'
                      ? 'bg-orange-950 text-orange-400 border-orange-500/30'
                      : 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {scannedResultModal.status === 'K' ? (
                    <Clock className="w-10 h-10 animate-bounce" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 animate-bounce" />
                  )}
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>NOTIFIKASI PRESENSI</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white">
                  {scannedResultModal.isUpdate ? 'Presensi Diperbarui!' : 'Presensi Berhasil!'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Telah terverifikasi oleh Server Presensi
                </p>
              </div>

              {/* Student Info Box */}
              <div className="relative z-10 bg-slate-800/90 rounded-2xl p-4 my-4 border border-slate-700 text-center space-y-2.5">
                <div>
                  <h4 className="text-base sm:text-lg font-black text-white leading-tight">
                    {scannedResultModal.namaSiswa}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    NISN: {scannedResultModal.nisn} &bull; Kelas: {scannedResultModal.namaKelas}
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-sm border ${
                      scannedResultModal.status === 'K'
                        ? 'bg-orange-950 text-orange-200 border-orange-800'
                        : 'bg-emerald-950 text-emerald-200 border-emerald-800'
                    }`}
                  >
                    {scannedResultModal.status === 'K' ? (
                      <>
                        <Clock className="w-4 h-4 text-orange-400" />
                        <span>STATUS: KESIANGAN (K)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>STATUS: HADIR (H)</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-400 pt-1.5 border-t border-slate-700/60 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{scannedResultModal.tanggal} &bull; Jam {scannedResultModal.time} WIB</span>
                </div>
              </div>

              {/* WhatsApp Notification Button */}
              {scannedResultModal.notifWaUrl && (
                <a
                  href={scannedResultModal.notifWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 w-full mb-2.5 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span>Kirim Notif WA ke Orang Tua ({scannedResultModal.noWaOrangTua || 'Ortu'})</span>
                </a>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setScannedResultModal(null)}
                className="relative z-10 w-full py-3.5 px-6 bg-white text-slate-900 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg hover:bg-slate-100 transition cursor-pointer active:scale-95"
              >
                Tutup Notification
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
