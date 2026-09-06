import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Camera,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Users,
  Search,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  Check,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';
import { AppData, Siswa, UserSession, PresensiStatus } from '../../types';
import {
  getIndonesianTimeString,
  formatDateIndo,
  getTodayString,
  getShiftTimingForStudent,
  normalizePresensiStatus,
} from '../../utils/helpers';

export type ScannerStatusState =
  | 'idle'
  | 'camera-loading'
  | 'ready'
  | 'processing'
  | 'success'
  | 'duplicate'
  | 'invalid'
  | 'not-found'
  | 'wrong-class'
  | 'permission-denied'
  | 'error';

export interface RecentScanItem {
  id: string;
  siswaId: string;
  nama: string;
  nisn: string;
  kelas: string;
  status: PresensiStatus;
  time: string;
  isDuplicate?: boolean;
}

interface StudentQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  selectedKelasId: string;
  selectedTanggal: string;
  studentStatus: Record<string, PresensiStatus>;
  studentTime: Record<string, string>;
  studentPulangStatus?: Record<string, 'H' | 'TAP' | ''>;
  studentPulangTime?: Record<string, string>;
  onScanSuccess: (siswaId: string, status: PresensiStatus, time: string, isPulang?: boolean) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  currentUser: UserSession;
}

export const StudentQrScannerModal: React.FC<StudentQrScannerModalProps> = ({
  isOpen,
  onClose,
  appData,
  selectedKelasId,
  selectedTanggal,
  studentStatus,
  studentTime,
  studentPulangStatus = {},
  studentPulangTime = {},
  onScanSuccess,
  onShowToast,
  currentUser,
}) => {
  const [scannerState, setScannerState] = useState<ScannerStatusState>('idle');
  const [scanMode, setScanMode] = useState<'masuk' | 'pulang'>('masuk');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qr_scanner_muted') === 'true';
    } catch {
      return false;
    }
  });

  // Recent scans in current session
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);

  // Last scanned student for result display card
  const [lastScannedResult, setLastScannedResult] = useState<{
    siswa: Siswa;
    status: PresensiStatus;
    time: string;
    kelasNama: string;
    isDuplicate: boolean;
    existingTime?: string;
  } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const lastScannedTimestampRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const autoResetTimerRef = useRef<any>(null);

  // Active Class Object
  const currentKelas = useMemo(() => {
    return appData.kelas.find((k) => k.id === selectedKelasId);
  }, [appData.kelas, selectedKelasId]);

  // Audio Beep
  const playBeep = (type: 'success' | 'duplicate' | 'error') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'duplicate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Vibration feedback
  const triggerVibration = (type: 'success' | 'error') => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        if (type === 'success') {
          navigator.vibrate(80);
        } else {
          navigator.vibrate([100, 50, 100]);
        }
      }
    } catch {
      // silent
    }
  };

  const handleToggleMute = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    try {
      localStorage.setItem('qr_scanner_muted', String(nextVal));
    } catch {
      // silent
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Decode & Process Scanned Payload
  const processScannedCode = (rawCode: string) => {
    const cleanRaw = rawCode.trim();
    if (!cleanRaw || isProcessing) return;

    // Cooldown check: prevent multi-frame reads of identical QR within 3 seconds
    const now = Date.now();
    if (lastScannedTimestampRef.current.code === cleanRaw && now - lastScannedTimestampRef.current.time < 3000) {
      return;
    }
    lastScannedTimestampRef.current = { code: cleanRaw, time: now };

    setIsProcessing(true);
    setScannerState('processing');

    // Parse payload (could be JSON or raw string)
    let parsedPayload: any = null;
    let codeStr = cleanRaw;
    if ((codeStr.startsWith('"') && codeStr.endsWith('"')) || (codeStr.startsWith("'") && codeStr.endsWith("'"))) {
      codeStr = codeStr.slice(1, -1).trim();
    }

    try {
      parsedPayload = JSON.parse(codeStr);
    } catch {
      // Raw string format
    }

    // Student Lookup
    const targetSiswa = appData.siswa.find((s) => {
      if (parsedPayload) {
        const pId = parsedPayload.id || parsedPayload.siswaId;
        const pNisn = parsedPayload.nisn;
        const pNama = parsedPayload.nama;
        if (pId && String(s.id).toLowerCase() === String(pId).toLowerCase()) return true;
        if (pNisn && s.nisn && String(s.nisn).trim() === String(pNisn).trim()) return true;
        if (pNama && s.nama && String(s.nama).trim().toLowerCase() === String(pNama).trim().toLowerCase()) return true;
      }

      const upperStr = codeStr.toUpperCase();
      if (s.nisn && String(s.nisn).trim().toUpperCase() === upperStr) return true;
      if (s.id && String(s.id).trim().toUpperCase() === upperStr) return true;
      if (s.nama && String(s.nama).trim().toUpperCase() === upperStr) return true;
      return false;
    });

    if (!targetSiswa) {
      setScannerState('not-found');
      setErrorMessage(`Data siswa tidak ditemukan untuk kode: ${codeStr.slice(0, 25)}`);
      playBeep('error');
      triggerVibration('error');
      setIsProcessing(false);
      return;
    }

    // Check Inactive status
    if (targetSiswa.status === 'tidak_aktif') {
      setScannerState('invalid');
      setErrorMessage(`Siswa ${targetSiswa.nama} berstatus TIDAK AKTIF di sistem.`);
      playBeep('error');
      triggerVibration('error');
      setIsProcessing(false);
      return;
    }

    // Class Scope Validation
    const studentKelas = appData.kelas.find((k) => k.id === targetSiswa.kelasId);
    const studentKelasNama = studentKelas?.nama || 'Tanpa Kelas';

    if (selectedKelasId && targetSiswa.kelasId !== selectedKelasId) {
      setScannerState('wrong-class');
      setErrorMessage(
        `Siswa ${targetSiswa.nama} terdaftar di kelas ${studentKelasNama}, bukan kelas aktif (${currentKelas?.nama || selectedKelasId}).`
      );
      playBeep('error');
      triggerVibration('error');
      setIsProcessing(false);
      return;
    }

    // Current Time
    const nowTimeStr = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(/\./g, ':');

    if (scanMode === 'pulang') {
      const existingStatus = studentStatus[targetSiswa.id];
      const existingPulangStatus = studentPulangStatus[targetSiswa.id];
      const existingPulangTime = studentPulangTime[targetSiswa.id];

      // Check if student has checked in
      if (!existingStatus || !['H', 'K'].includes(existingStatus)) {
        setScannerState('invalid');
        setErrorMessage(`Siswa ${targetSiswa.nama} belum tercatat hadir/masuk hari ini.`);
        playBeep('error');
        triggerVibration('error');
        setIsProcessing(false);
        return;
      }

      // Check duplicate pulang
      if (existingPulangStatus === 'H') {
        setScannerState('duplicate');
        setLastScannedResult({
          siswa: targetSiswa,
          status: 'H',
          time: existingPulangTime || nowTimeStr,
          kelasNama: studentKelasNama,
          isDuplicate: true,
          existingTime: existingPulangTime || nowTimeStr,
        });
        playBeep('duplicate');
        triggerVibration('error');

        setRecentScans((prev) => [
          {
            id: 'SCAN_' + Date.now(),
            siswaId: targetSiswa.id,
            nama: targetSiswa.nama,
            nisn: targetSiswa.nisn || '-',
            kelas: studentKelasNama,
            status: 'H',
            time: (existingPulangTime || nowTimeStr) + ' (Pulang)',
            isDuplicate: true,
          },
          ...prev.slice(0, 7),
        ]);

        if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
        autoResetTimerRef.current = setTimeout(() => {
          setScannerState('ready');
          setIsProcessing(false);
        }, 2500);
        return;
      }

      // Apply Pulang
      onScanSuccess(targetSiswa.id, existingStatus, nowTimeStr, true);

      setScannerState('success');
      setLastScannedResult({
        siswa: targetSiswa,
        status: 'H',
        time: nowTimeStr,
        kelasNama: studentKelasNama,
        isDuplicate: false,
      });

      playBeep('success');
      triggerVibration('success');

      setRecentScans((prev) => [
        {
          id: 'SCAN_' + Date.now(),
          siswaId: targetSiswa.id,
          nama: targetSiswa.nama,
          nisn: targetSiswa.nisn || '-',
          kelas: studentKelasNama,
          status: 'H',
          time: nowTimeStr + ' (Pulang)',
          isDuplicate: false,
        },
        ...prev.slice(0, 7),
      ]);

      setManualCodeInput('');

      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = setTimeout(() => {
        setScannerState('ready');
        setIsProcessing(false);
      }, 1800);
      return;
    }

    // MASUK MODE
    // Calculate Status (Hadir vs Kesiangan) based on student shift timing
    const timing = getShiftTimingForStudent(appData, targetSiswa, selectedTanggal);
    const isJamMasukActive = timing.isJamMasukActive;
    const jamMasukSelesai = timing.jamMasukSelesai;
    const scanHHmm = nowTimeStr.trim().slice(0, 5);
    const cutoffHHmm = jamMasukSelesai.trim().slice(0, 5);

    const calculatedStatus: PresensiStatus =
      !isJamMasukActive || scanHHmm <= cutoffHHmm ? 'H' : 'K';

    // Duplicate Attendance Check
    const existingStatus = studentStatus[targetSiswa.id];
    const existingTime = studentTime[targetSiswa.id];

    if (existingStatus && existingStatus === calculatedStatus) {
      // Duplicate
      setScannerState('duplicate');
      setLastScannedResult({
        siswa: targetSiswa,
        status: existingStatus,
        time: existingTime || nowTimeStr,
        kelasNama: studentKelasNama,
        isDuplicate: true,
        existingTime: existingTime || nowTimeStr,
      });

      playBeep('duplicate');
      triggerVibration('error');

      setRecentScans((prev) => [
        {
          id: 'SCAN_' + Date.now(),
          siswaId: targetSiswa.id,
          nama: targetSiswa.nama,
          nisn: targetSiswa.nisn || '-',
          kelas: studentKelasNama,
          status: existingStatus,
          time: existingTime || nowTimeStr,
          isDuplicate: true,
        },
        ...prev.slice(0, 7),
      ]);

      // Auto-reset state to ready after 2.5 seconds
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      autoResetTimerRef.current = setTimeout(() => {
        setScannerState('ready');
        setIsProcessing(false);
      }, 2500);

      return;
    }

    // SUCCESS: Apply Attendance Status
    onScanSuccess(targetSiswa.id, calculatedStatus, nowTimeStr, false);

    setScannerState('success');
    setLastScannedResult({
      siswa: targetSiswa,
      status: calculatedStatus,
      time: nowTimeStr,
      kelasNama: studentKelasNama,
      isDuplicate: false,
    });

    playBeep('success');
    triggerVibration('success');

    setRecentScans((prev) => [
      {
        id: 'SCAN_' + Date.now(),
        siswaId: targetSiswa.id,
        nama: targetSiswa.nama,
        nisn: targetSiswa.nisn || '-',
        kelas: studentKelasNama,
        status: calculatedStatus,
        time: nowTimeStr,
        isDuplicate: false,
      },
      ...prev.slice(0, 7),
    ]);

    setManualCodeInput('');

    // Fast continuous workflow: auto-reset scanner back to READY after 1.8 seconds
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    autoResetTimerRef.current = setTimeout(() => {
      setScannerState('ready');
      setIsProcessing(false);
    }, 1800);
  };

  // Mount Html5QrcodeScanner
  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    setScannerState('camera-loading');
    setIsProcessing(false);

    const initTimer = setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'class-qr-scanner-viewport',
          {
            fps: 12,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText) => {
            processScannedCode(decodedText);
          },
          (error) => {
            // Internal frame decode errors are standard in continuous video scan
          }
        );

        setScannerState('ready');
      } catch (err: any) {
        console.error('Failed to initialize Html5QrcodeScanner:', err);
        setScannerState('error');
        setErrorMessage(
          err?.message || 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser.'
        );
      }
    }, 300);

    return () => {
      clearTimeout(initTimer);
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="scanner-modal-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Scan QR Presensi Siswa
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-primary/15 text-theme-primary border border-theme-primary/30">
                  <Zap className="w-3 h-3" /> Quick Scan
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                <span>Kelas: <strong className="text-slate-700 dark:text-slate-200">{currentKelas?.nama || 'Semua Kelas'}</strong></span>
                <span>&bull;</span>
                <span>Tanggal: <strong className="text-slate-700 dark:text-slate-200">{formatDateIndo(selectedTanggal)}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Aktifkan Suara Beep' : 'Bisukan Suara Beep'}
              title={isMuted ? 'Aktifkan Suara' : 'Bisukan Suara'}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Scanner"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* LEFT: CAMERA SCANNER VIEWPORT */}
          <div className="md:col-span-7 flex flex-col gap-3">
            {/* Mode Switcher: Absen Masuk vs Absen Pulang */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setScanMode('masuk')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  scanMode === 'masuk'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mode Absen Masuk</span>
              </button>
              <button
                type="button"
                onClick={() => setScanMode('pulang')}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                  scanMode === 'pulang'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Mode Absen Pulang</span>
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px]">
              
              {/* HTML5 QR Code Mount Point */}
              <div id="class-qr-scanner-viewport" className="w-full overflow-hidden" />

              {/* Dynamic State Overlay when Processing or Loading */}
              {scannerState === 'camera-loading' && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-10">
                  <RefreshCw className="w-8 h-8 animate-spin text-theme-primary" />
                  <p className="text-xs font-bold">Menyiapkan kamera...</p>
                </div>
              )}

              {scannerState === 'processing' && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-10 animate-fadeIn">
                  <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                  <p className="text-xs font-bold">Memproses QR Siswa...</p>
                </div>
              )}
            </div>

            {/* Instruction Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />
                Arahkan Kartu Pelajar / QR Siswa ke dalam kotak scan.
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-bold hidden sm:inline">
                Auto Next Scan
              </span>
            </div>

            {/* Manual Code Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processScannedCode(manualCodeInput);
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value)}
                  placeholder="Ketik NISN / ID Siswa manual..."
                  className="w-full pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              </div>
              <button
                type="submit"
                disabled={isProcessing || !manualCodeInput.trim()}
                className="px-4 py-2.5 bg-theme-primary hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Proses</span>
              </button>
            </form>
          </div>

          {/* RIGHT: REAL-TIME RESULT & RECENT SCANS */}
          <div className="md:col-span-5 flex flex-col gap-4">
            
            {/* 1. REAL-TIME RESULT FEEDBACK CARD */}
            {lastScannedResult ? (
              <div
                className={`p-4 rounded-2xl border transition-all animate-fadeIn ${
                  lastScannedResult.isDuplicate
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      lastScannedResult.isDuplicate
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {lastScannedResult.isDuplicate ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">
                      {lastScannedResult.isDuplicate ? 'Presensi Sudah Tercatat' : 'Presensi Berhasil!'}
                    </h4>
                    <p className="text-[10px] opacity-80 font-medium">
                      {lastScannedResult.isDuplicate
                        ? 'Data kehadiran siswa sudah ada'
                        : 'Tercatat ke lembar presensi'}
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs text-slate-800 dark:text-slate-200">
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {lastScannedResult.siswa.nama}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>NISN: {lastScannedResult.siswa.nisn || '-'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{lastScannedResult.kelasNama}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        lastScannedResult.status === 'K'
                          ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800'
                          : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      }`}
                    >
                      {lastScannedResult.status === 'K' ? 'KESIANGAN (K)' : 'HADIR (H)'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                      {lastScannedResult.time} WIB
                    </span>
                  </div>
                </div>
              </div>
            ) : scannerState === 'wrong-class' || scannerState === 'not-found' || scannerState === 'invalid' || scannerState === 'error' ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>Scan Gagal</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                  {errorMessage || 'QR tidak valid atau data siswa tidak cocok.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setScannerState('ready');
                    setIsProcessing(false);
                    setErrorMessage('');
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold transition cursor-pointer"
                >
                  Coba Scan Lagi
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center py-6">
                <QrCode className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2 opacity-60" />
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Siap Memindai</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hasil scan kehadiran siswa akan muncul langsung di sini.
                </p>
              </div>
            )}

            {/* 2. RECENT SCANS LOGS IN SESSION */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex-1 flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-theme-primary" /> Riwayat Scan Sesi Ini ({recentScans.length})
                </span>
                {recentScans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecentScans([])}
                    className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition cursor-pointer"
                  >
                    Bersihkan
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 max-h-[170px] pr-1">
                {recentScans.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-[11px]">
                    Belum ada siswa yang discan pada sesi ini.
                  </div>
                ) : (
                  recentScans.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px]">
                          {item.nama}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          NISN: {item.nisn} &bull; {item.kelas}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            item.isDuplicate
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : item.status === 'K'
                              ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.isDuplicate ? 'SUDAH ADA' : item.status === 'K' ? 'KESIANGAN' : 'HADIR'}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Tekan <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-mono font-bold">Esc</kbd> untuk menutup
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Selesai & Tutup Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
