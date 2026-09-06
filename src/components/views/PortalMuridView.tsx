import React, { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import {
  GraduationCap,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  CreditCard,
  FileText,
  User,
  UserCog,
  School,
  Phone,
  ShieldCheck,
  Camera,
  Upload,
  AlertCircle,
  Download,
  Share2,
  Sparkles,
  Send,
  ChevronRight,
  Info,
  Edit,
  Save,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Key,
  Trash2,
  MessageSquare,
  Menu,
  Bell,
  BarChart3,
  CalendarCheck,
  Home,
  Printer,
  ShieldAlert
} from 'lucide-react';
import { AppData, SekolahConfig, Siswa, UserSession, SiswaPresensiItem, ViewType, PresensiStatus } from '../../types';
import { getTodayString, compressBase64Image, saveSessionUser, normalizePresensiStatus, determinePresensiStatusByTime, getShiftTimingForStudent, formatDateIndo, getEffectiveSchoolDays } from '../../utils/helpers';

interface PortalMuridViewProps {
  appData: AppData;
  currentUser: UserSession;
  activeTab?: 'overview' | 'absen_qr' | 'kartu_pelajar' | 'rekap_siswa' | 'home_visit' | 'pelanggaran' | 'profil';
  onUpdateAppData: (updated: AppData) => void;
  onUpdateCurrentUser?: (session: UserSession) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate?: (view: ViewType) => void;
}

export const PortalMuridView: React.FC<PortalMuridViewProps> = ({
  appData,
  currentUser,
  activeTab = 'overview',
  onUpdateAppData,
  onUpdateCurrentUser,
  onShowToast,
  onNavigate,
}) => {
  const sessionSiswa = currentUser.data as Siswa;
  const siswaFromApp = (appData.siswa || []).find((s) => s.id === sessionSiswa?.id);
  const siswa = siswaFromApp || sessionSiswa;
  const today = getTodayString();
  const [currentSubTab, setCurrentSubTab] = useState<'overview' | 'absen_qr' | 'kartu_pelajar' | 'rekap_siswa' | 'home_visit' | 'pelanggaran' | 'profil'>(
    activeTab
  );

  const myHomeVisits = React.useMemo(() => {
    return (appData.homeVisits || []).filter(
      (hv) => hv.siswaId === siswa.id || hv.siswaId === siswa.nisn
    );
  }, [appData.homeVisits, siswa]);

  const myPelanggaran = React.useMemo(() => {
    return (appData.pelanggaran || []).filter(
      (p) => p.siswaId === siswa.id || p.siswaId === siswa.nisn
    );
  }, [appData.pelanggaran, siswa]);

  const totalPoinPelanggaran = React.useMemo(() => {
    return myPelanggaran.reduce((sum, p) => sum + (p.poin || 0), 0);
  }, [myPelanggaran]);

  useEffect(() => {
    setCurrentSubTab(activeTab);
  }, [activeTab]);

  // Edit Biodata State
  const [showEditBiodataModal, setShowEditBiodataModal] = useState(false);
  const [editNama, setEditNama] = useState(siswa.nama || '');
  const [editGender, setEditGender] = useState<'L' | 'P'>(siswa.gender || 'L');
  const [editNoWa, setEditNoWa] = useState(siswa.noWa || '');
  const [editNamaOrangTua, setEditNamaOrangTua] = useState(siswa.namaOrangTua || '');
  const [editNoWaOrangTua, setEditNoWaOrangTua] = useState(siswa.noWaOrangTua || '');
  const [editAlamat, setEditAlamat] = useState(siswa.alamat || '');
  const [editTempatLahir, setEditTempatLahir] = useState(siswa.tempatLahir || '');
  const [editTanggalLahir, setEditTanggalLahir] = useState(siswa.tanggalLahir || '');
  const [editPassword, setEditPassword] = useState(siswa.password || '');
  const [showPasswordState, setShowPasswordState] = useState(false);
  const [editFoto, setEditFoto] = useState(siswa.foto || '');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  // Presensi Result Modal State (Center Popup)
  const [studentScanMode, setStudentScanMode] = useState<'auto' | 'masuk' | 'pulang'>('auto');
  const [presensiResultModal, setPresensiResultModal] = useState<{
    isOpen: boolean;
    namaSiswa: string;
    namaKelas: string;
    nisn: string;
    status: PresensiStatus | 'PULANG';
    time: string;
    tanggal: string;
    isUpdate?: boolean;
    noWaOrangTua?: string;
    namaOrangTua?: string;
    notifWaText?: string;
    notifWaUrl?: string | null;
    isPulang?: boolean;
  } | null>(null);

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

  const handleOpenEditModal = () => {
    setEditNama(siswa.nama || '');
    setEditGender(siswa.gender || 'L');
    setEditNoWa(siswa.noWa || '');
    setEditNamaOrangTua(siswa.namaOrangTua || '');
    setEditNoWaOrangTua(siswa.noWaOrangTua || '');
    setEditAlamat(siswa.alamat || '');
    setEditTempatLahir(siswa.tempatLahir || '');
    setEditTanggalLahir(siswa.tanggalLahir || '');
    setEditPassword(siswa.password || '');
    setEditFoto(siswa.foto || '');
    setShowEditBiodataModal(true);
  };

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Ukuran berkas foto terlalu besar (Maksimal 5MB)!', 'warning');
      return;
    }

    setIsUploadingFoto(true);
    try {
      const compressed = await compressBase64Image(file, 400, 0.75);
      setEditFoto(compressed);
      onShowToast('Foto profil berhasil diunggah!', 'success');
    } catch (err) {
      console.error('Photo upload failed:', err);
      onShowToast('Gagal memproses unggahan foto.', 'error');
    } finally {
      setIsUploadingFoto(false);
    }
  };

  const handleSaveBiodataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNama.trim()) {
      onShowToast('Nama lengkap siswa wajib diisi!', 'warning');
      return;
    }

    const newPassword = editPassword.trim() ? editPassword.trim() : (siswa.password || siswa.nisn || '');

    const updatedSiswaObj: Siswa = {
      ...siswa,
      nama: editNama.trim(),
      gender: editGender,
      noWa: editNoWa.trim(),
      namaOrangTua: editNamaOrangTua.trim(),
      noWaOrangTua: editNoWaOrangTua.trim(),
      alamat: editAlamat.trim(),
      tempatLahir: editTempatLahir.trim(),
      tanggalLahir: editTanggalLahir.trim(),
      password: newPassword,
      foto: editFoto,
    };

    // 1. Update in appData.siswa list matching both id and nisn
    const updatedSiswaList = (appData.siswa || []).map((s) =>
      s.id === siswa.id || (siswa.nisn && s.nisn === siswa.nisn) ? updatedSiswaObj : s
    );

    const updatedAppData: AppData = {
      ...appData,
      siswa: updatedSiswaList,
    };

    onUpdateAppData(updatedAppData);

    // 2. Update session user
    const newSession: UserSession = {
      ...currentUser,
      data: updatedSiswaObj,
    };

    saveSessionUser(newSession);
    if (onUpdateCurrentUser) {
      onUpdateCurrentUser(newSession);
    }

    onShowToast('Biodata & profil Anda berhasil diperbarui!', 'success');
    setShowEditBiodataModal(false);
  };

  const [qrTokenInput, setQrTokenInput] = useState('');
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [qrCanvasUrl, setQrCanvasUrl] = useState<string>('');
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  // Form Pengajuan Izin/Sakit State
  const [showFormIzin, setShowFormIzin] = useState(false);
  const [jenisIzin, setJenisIzin] = useState<'I' | 'S'>('S');
  const [keteranganIzin, setKeteranganIzin] = useState('');
  const [fotoIzin, setFotoIzin] = useState<string>('');

  const kelas = (appData.kelas || []).find((k) => k.id === siswa.kelasId);
  const waliKelas = (appData.waliKelas || []).find((w) => w.id === kelas?.waliKelasId);
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};

  // Find presensi today
  const presensiTodayKey = `${today}_${siswa.kelasId}`;
  const todayItems: SiswaPresensiItem[] = (appData.presensi || {})[presensiTodayKey] || [];
  const myPresensiToday = todayItems.find((item) => item.siswaId === siswa.id);

  // Generate Digital Student Card QR Code
  useEffect(() => {
    if (siswa && siswa.nisn) {
      const qrData = JSON.stringify({
        nisn: siswa.nisn,
        nama: siswa.nama,
        id: siswa.id,
        kelas: kelas?.nama || '',
        sekolah: sekolah.nama || 'SMK'
      });

      QRCode.toDataURL(qrData, { width: 300, margin: 2 })
        .then((url) => setQrCanvasUrl(url))
        .catch((err) => console.error('Failed to generate QR:', err));
    }
  }, [siswa, kelas, sekolah]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const html5QrCode = new Html5Qrcode("qr-file-input-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleProcessQrCode(decodedText);
      onShowToast('QR Code berhasil dipindai dari galeri HP!', 'success');
    } catch (err) {
      console.error('File scan error:', err);
      onShowToast('Gagal memindai QR dari foto. Pastikan gambar QR jelas dan tidak buram.', 'error');
    }
    if (e.target) e.target.value = '';
  };

  // Setup html5-qrcode scanner when activeTab is absen_qr and scanning mode is on
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (currentSubTab === 'absen_qr' && isScanningCamera) {
      try {
        scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            rememberLastUsedCamera: true,
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            handleProcessQrCode(decodedText);
            if (scanner) {
              scanner.clear().catch(() => {});
            }
            setIsScanningCamera(false);
          },
          (error) => {
            // silent scanning frame errors
          }
        );
      } catch (err) {
        console.error('Camera scanner error:', err);
      }
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [currentSubTab, isScanningCamera]);

  // Handle Attendance Action via Scanned QR Code or Input Code
  const handleProcessQrCode = async (scannedCode: string, forcedMode?: 'auto' | 'masuk' | 'pulang') => {
    const cleaned = scannedCode.trim().toUpperCase();
    if (!cleaned) {
      onShowToast('Masukkan Kode QR atau Token Presensi!', 'warning');
      return;
    }

    const effectiveMode = forcedMode || studentScanMode;

    try {
      // Send presence request to server endpoint
      const response = await fetch('/api/qr/absen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedCode: cleaned,
          siswaId: siswa.id,
          nisn: siswa.nisn,
          dateStr: today,
          scanMode: effectiveMode,
          clientAppData: appData
        })
      });

      const res = await response.json();

      if (res.success) {
        playSuccessBeep();
        const key = res.presensiKey || `${today}_${siswa.kelasId}`;
        const currentList: SiswaPresensiItem[] = (appData.presensi || {})[key] ? [...(appData.presensi || {})[key]] : [];
        const existingIndex = currentList.findIndex((i) => i.siswaId === siswa.id);

        if (res.item) {
          if (existingIndex >= 0) {
            currentList[existingIndex] = res.item;
          } else {
            currentList.push(res.item);
          }
          onUpdateAppData({ ...appData, presensi: { ...(appData.presensi || {}), [key]: currentList } });
        } else if (res.updatedAppData) {
          onUpdateAppData(res.updatedAppData);
        } else {
          // Local fallback
          const nowWib = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }).format(new Date()).replace(/\./g, ':');
          const studentTiming = getShiftTimingForStudent(appData, siswa, today);
          const [nowH, nowM] = nowWib.split(':').map(Number);
          const nowTotalMins = nowH * 60 + nowM;
          const [pulangH, pulangM] = studentTiming.jamPulang.split(':').map(Number);
          const pulangTotalMins = pulangH * 60 + pulangM;

          const hasCheckedIn = myPresensiToday && myPresensiToday.time && myPresensiToday.status !== 'A';

          if (nowTotalMins > pulangTotalMins && !hasCheckedIn) {
            onShowToast(`Gagal Absen: Waktu Absen Masuk telah berakhir dan sudah melewati jam pulang (${studentTiming.jamPulang}). Anda tidak tercatat melakukan absen masuk hari ini. Silakan hubungi wali kelas.`, 'error');
            return;
          }
          
          let isPulangNow = effectiveMode === 'pulang';
          if (effectiveMode === 'auto') {
            if (!studentTiming.isJamMasukActive) {
              isPulangNow = false;
            } else {
              isPulangNow = nowTotalMins >= (pulangTotalMins - 30) || nowTotalMins > pulangTotalMins;
            }
          }

          if (isPulangNow) {
            if (!myPresensiToday || !myPresensiToday.time) {
              onShowToast('Gagal Absen Pulang: Anda belum melakukan Absen Masuk hari ini!', 'error');
              return;
            }
            if (existingIndex >= 0) {
              currentList[existingIndex] = {
                ...currentList[existingIndex],
                pulangTime: nowWib,
                pulangStatus: 'H'
              };
            } else {
              currentList.push({
                siswaId: siswa.id,
                status: 'H',
                time: '',
                pulangTime: nowWib,
                pulangStatus: 'H'
              });
            }
          } else {
            const statusAssigned = determinePresensiStatusByTime(nowWib, studentTiming.jamMasukSelesai, studentTiming.isJamMasukActive);
            if (existingIndex >= 0) {
              currentList[existingIndex] = { ...currentList[existingIndex], status: statusAssigned, time: nowWib };
            } else {
              currentList.push({ siswaId: siswa.id, status: statusAssigned, time: nowWib });
            }
          }
          onUpdateAppData({ ...appData, presensi: { ...(appData.presensi || {}), [key]: currentList } });
        }

        const nowWibStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date()).replace(/\./g, ':');

        const timingForModal = getShiftTimingForStudent(appData, siswa, today);
        const [nowH2, nowM2] = nowWibStr.split(':').map(Number);
        const nowTotalMins2 = nowH2 * 60 + nowM2;
        const [pulangH2, pulangM2] = timingForModal.jamPulang.split(':').map(Number);
        const pulangTotalMins2 = pulangH2 * 60 + pulangM2;
        const isPulangMode: boolean = Boolean(
          res.status === 'PULANG' ||
          (effectiveMode as string) === 'pulang' ||
          (effectiveMode === 'auto' && nowTotalMins2 >= (pulangTotalMins2 - 30)) ||
          (res.item && res.item.pulangStatus === 'H' && res.item.pulangTime && ((effectiveMode as string) === 'pulang' || res.item.pulangTime === res.time))
        );

        setPresensiResultModal({
          isOpen: true,
          namaSiswa: res.siswa?.nama || siswa.nama,
          namaKelas: res.siswa?.namaKelas || siswa.kelasId,
          nisn: res.siswa?.nisn || siswa.nisn,
          status: (res.status === 'PULANG' ? 'PULANG' : res.status || (isPulangMode ? 'PULANG' : determinePresensiStatusByTime(nowWibStr, timingForModal.jamMasukSelesai, timingForModal.isJamMasukActive))) as any,
          time: res.time || nowWibStr,
          tanggal: res.tanggal || today,
          isUpdate: Boolean(res.isAlreadyRecorded),
          noWaOrangTua: res.noWaOrangTua || siswa.noWaOrangTua || '',
          namaOrangTua: res.namaOrangTua || siswa.namaOrangTua || '',
          notifWaText: res.notifWaText,
          notifWaUrl: res.notifWaUrl,
          isPulang: isPulangMode,
        });

        if (isPulangMode) {
          onShowToast('🎉 Absen Pulang Berhasil! Hati-hati di perjalanan pulang ya.', 'success');
        } else {
          onShowToast(res.message || 'Presensi Masuk Berhasil dicatat!', 'success');
        }
        setQrTokenInput('');
        return;
      } else {
        onShowToast(res.message || 'Gagal memproses presensi QR.', 'error');
      }
    } catch (err) {
      console.error('Server QR absen error:', err);
      // Fallback local execution if offline or dev mode
      playSuccessBeep();
      const key = `${today}_${siswa.kelasId}`;
      const currentList: SiswaPresensiItem[] = (appData.presensi || {})[key] ? [...(appData.presensi || {})[key]] : [];
      const nowWib = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date()).replace(/\./g, ':');
      const fallbackTiming = getShiftTimingForStudent(appData, siswa, today);
      
      let isPulangTime = effectiveMode === 'pulang';
      if (effectiveMode === 'auto') {
        if (!fallbackTiming.isJamMasukActive) {
          isPulangTime = false;
        } else {
          const [nowH, nowM] = nowWib.split(':').map(Number);
          const nowTotalMins = nowH * 60 + nowM;
          const [pulangH, pulangM] = fallbackTiming.jamPulang.split(':').map(Number);
          const pulangTotalMins = pulangH * 60 + pulangM;
          isPulangTime = nowTotalMins >= (pulangTotalMins - 30);
        }
      }

      const existingIndex = currentList.findIndex((i) => i.siswaId === siswa.id);
      if (isPulangTime) {
        if (existingIndex < 0 || !currentList[existingIndex].time) {
          onShowToast('Gagal Absen Pulang: Anda belum melakukan Absen Masuk hari ini!', 'error');
          return;
        }
        if (existingIndex >= 0) {
          currentList[existingIndex] = {
            ...currentList[existingIndex],
            pulangTime: nowWib,
            pulangStatus: 'H'
          };
        } else {
          currentList.push({
            siswaId: siswa.id,
            status: 'H',
            time: '',
            pulangTime: nowWib,
            pulangStatus: 'H'
          });
        }
      } else {
        const statusAssigned = determinePresensiStatusByTime(nowWib, fallbackTiming.jamMasukSelesai, fallbackTiming.isJamMasukActive);
        if (existingIndex >= 0) {
          currentList[existingIndex] = { ...currentList[existingIndex], status: statusAssigned, time: nowWib };
        } else {
          currentList.push({ siswaId: siswa.id, status: statusAssigned, time: nowWib });
        }
      }
      onUpdateAppData({ ...appData, presensi: { ...(appData.presensi || {}), [key]: currentList } });

      const statusAssignedForModal = isPulangTime ? 'PULANG' : determinePresensiStatusByTime(nowWib, fallbackTiming.jamMasukSelesai, fallbackTiming.isJamMasukActive);

      setPresensiResultModal({
        isOpen: true,
        namaSiswa: siswa.nama,
        namaKelas: siswa.kelasId,
        nisn: siswa.nisn,
        status: statusAssignedForModal as any,
        time: nowWib,
        tanggal: today,
        isUpdate: false,
        isPulang: isPulangTime,
      });

      if (isPulangTime) {
        onShowToast('🎉 Absen Pulang Berhasil! Hati-hati di perjalanan pulang ya.', 'success');
      } else {
        const statusLabel = statusAssignedForModal === 'K' ? 'KESIANGAN (K)' : 'HADIR (H)';
        onShowToast(`Presensi berhasil dicatat! Status: ${statusLabel}`, 'success');
      }
      setQrTokenInput('');
    }
  };

  // Handle Upload Surat Sakit / Izin
  const handleUploadSuratIzin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('Ukuran berkas terlalu besar (Maksimal 5MB)!', 'warning');
      return;
    }

    try {
      const compressed = await compressBase64Image(file, 800, 0.8);
      setFotoIzin(compressed);
      onShowToast('Surat sakit/izin berhasil diunggah!', 'success');
    } catch (err) {
      console.error('Surat upload failed:', err);
      onShowToast('Gagal memproses berkas surat.', 'error');
    }
  };

  // Submit Absence Request (Izin / Sakit)
  const handleSubmitIzin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keteranganIzin.trim()) {
      onShowToast('Mohon isi keterangan alasan Izin / Sakit!', 'warning');
      return;
    }

    const key = `${today}_${siswa.kelasId}`;
    const currentList: SiswaPresensiItem[] = (appData.presensi || {})[key] ? [...(appData.presensi || {})[key]] : [];

    const existingIndex = currentList.findIndex((i) => i.siswaId === siswa.id);
    if (existingIndex >= 0) {
      currentList[existingIndex] = { 
        ...currentList[existingIndex], 
        status: jenisIzin,
        catatan: keteranganIzin,
        suratBukti: fotoIzin
      };
    } else {
      currentList.push({ 
        siswaId: siswa.id, 
        status: jenisIzin,
        catatan: keteranganIzin,
        suratBukti: fotoIzin
      });
    }

    const updatedPresensi = {
      ...(appData.presensi || {}),
      [key]: currentList,
    };

    const updatedAppData: AppData = {
      ...appData,
      presensi: updatedPresensi,
    };

    onUpdateAppData(updatedAppData);
    onShowToast(`Pengajuan ${jenisIzin === 'S' ? 'Sakit' : 'Izin'} berhasil dikirim ke Wali Kelas!`, 'success');
    setShowFormIzin(false);
    setKeteranganIzin('');
    setFotoIzin('');
  };

  // Calculate Personal Attendance Stats
  const stats = useMemo(() => {
    let totalH = 0;
    let totalI = 0;
    let totalS = 0;
    let totalA = 0;
    let totalK = 0;
    let totalD = 0;
    let totalDays = 0;

    const myHistory: { date: string; status: PresensiStatus }[] = [];
    const schoolStart = appData.sekolah?.tanggalMulai || '2026-07-15';
    const schoolEnd = appData.sekolah?.tanggalAkhir;
    const todayStr = getTodayString();
    const evalEnd = schoolEnd && schoolEnd < todayStr ? schoolEnd : todayStr;

    const effectiveSchoolDays = getEffectiveSchoolDays({
      startDate: schoolStart,
      endDate: evalEnd,
      appData,
      kelasId: siswa.kelasId,
    });
    const totalEffectiveDays = effectiveSchoolDays.length;

    Object.entries(appData.presensi || {}).forEach(([key, list]) => {
      const itemList = (list || []) as SiswaPresensiItem[];
      if (key.endsWith(`_${siswa.kelasId}`)) {
        const datePart = key.split('_')[0];
        // Ensure attendance date is within valid period [tanggalMulai, evalEnd]
        if (datePart >= schoolStart && datePart <= evalEnd) {
          const record = itemList.find((item) => item.siswaId === siswa.id || item.siswaId === siswa.nisn);
          if (record) {
            const st = normalizePresensiStatus(record.status);
            totalDays++;
            if (st === 'H') totalH++;
            if (st === 'I') totalI++;
            if (st === 'S') totalS++;
            if (st === 'A') totalA++;
            if (st === 'K') totalK++;
            if (st === 'D') totalD++;
            myHistory.push({ date: datePart, status: st });
          }
        }
      }
    });

    myHistory.sort((a, b) => (a.date < b.date ? 1 : -1));

    // Calculate percentage against total effective school days (or totalDays if 0)
    const baseDays = totalEffectiveDays > 0 ? totalEffectiveDays : totalDays;
    const percentage = baseDays > 0 ? Math.min(100, Math.round(((totalH + totalK + totalD) / baseDays) * 100)) : 100;

    return { totalH, totalI, totalS, totalA, totalK, totalD, totalDays, totalEffectiveDays, percentage, myHistory };
  }, [appData, siswa]);

  // Helper greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat Pagi,';
    if (hour < 15) return 'Selamat Siang,';
    if (hour < 18) return 'Selamat Sore,';
    return 'Selamat Malam,';
  };

  return (
    <div className="space-y-5 animate-fade-in select-none pb-32 sm:pb-12 max-w-4xl mx-auto px-2 sm:px-4">
      {/* Top Banner & Profile Info Matching Reference Image */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden space-y-5">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl p-1 border border-white/30 flex items-center justify-center shrink-0 shadow">
              {siswa.foto ? (
                <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <GraduationCap className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Aplikasi</div>
              <h2 className="text-base font-black text-white tracking-tight leading-snug">Absensi Siswa</h2>
              <div className="text-[11px] text-blue-100 font-medium">{sekolah.nama || 'SMKN 6 Garut'}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition cursor-pointer"
            title="Menu & Pengaturan Profil"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Student Greeting Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 text-slate-900 dark:text-white shadow-lg flex items-center justify-between gap-4 border border-white/20">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{getGreeting()}</div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">{siswa.nama}</h1>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
              <span>{kelas?.nama || 'Kelas Siswa'}</span>
            </div>
          </div>
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 dark:bg-blue-950 rounded-2xl p-1 border-2 border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
            {siswa.foto ? (
              <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </div>
      </div>

      {/* Sub-tab navigation removed as requested */}

      {/* TAB 1: OVERVIEW / DASHBOARD SISWA */}
      {currentSubTab === 'overview' && (
        <div className="space-y-5">
          {/* Status Absen Hari Ini Card (Vibrant Blue Banner matching reference) */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 rounded-3xl p-5 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg ${
                  myPresensiToday?.pulangTime 
                    ? 'bg-indigo-500 ring-4 ring-indigo-400/40' 
                    : myPresensiToday 
                    ? (myPresensiToday.status === 'H' ? 'bg-emerald-500 ring-4 ring-emerald-400/40' : myPresensiToday.status === 'K' ? 'bg-amber-500 ring-4 ring-amber-400/40' : 'bg-blue-500') 
                    : 'bg-slate-700/60'
                }`}>
                  {myPresensiToday?.pulangTime ? (
                    <Home className="w-7 h-7 stroke-[2.5]" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight">
                      {myPresensiToday ? (myPresensiToday.status === 'H' ? 'Hadir' : myPresensiToday.status === 'K' ? 'Kesiangan' : myPresensiToday.status === 'I' ? 'Izin' : myPresensiToday.status === 'S' ? 'Sakit' : myPresensiToday.status === 'D' ? 'Dispensasi' : 'Alpha') : 'Belum Absen'}
                    </span>
                    {myPresensiToday?.pulangTime && (
                      <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 font-black text-[10px] rounded-full uppercase tracking-wider">
                        Sudah Pulang
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-blue-100 font-medium">
                    {formatDateIndo(today)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-blue-100 pt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{sekolah.nama || 'SMKN 6 Garut'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setStudentScanMode('auto');
                    setCurrentSubTab('absen_qr');
                  }}
                  className="px-4 py-2.5 bg-white text-blue-600 font-black rounded-2xl text-xs shadow-md hover:bg-blue-50 active:scale-95 transition cursor-pointer shrink-0"
                >
                  Scan QR
                </button>
              </div>
            </div>

            {/* Sub Detail Info Masuk & Pulang */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/20 text-xs">
              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm">
                <div className="text-[10px] text-blue-200 uppercase font-black tracking-wider flex items-center gap-1">
                  <span>☀️ Jam Masuk</span>
                </div>
                <div className="text-sm font-black mt-0.5">
                  {myPresensiToday?.time ? `${myPresensiToday.time} WIB` : 'Belum Absen'}
                </div>
              </div>

              <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-sm">
                <div className="text-[10px] text-blue-200 uppercase font-black tracking-wider flex items-center gap-1">
                  <span>🏠 Jam Pulang</span>
                </div>
                <div className="text-sm font-black mt-0.5 flex items-center justify-between">
                  <span>{myPresensiToday?.pulangTime ? `${myPresensiToday.pulangTime} WIB` : 'Belum Pulang'}</span>
                  {!myPresensiToday?.pulangTime && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!myPresensiToday || !myPresensiToday.time) {
                          onShowToast('Anda belum melakukan Absen Masuk! Silakan absen masuk terlebih dahulu.', 'warning');
                          return;
                        }
                        setStudentScanMode('pulang');
                        setCurrentSubTab('absen_qr');
                      }}
                      className="px-2 py-0.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-[10px] rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      Absen Pulang
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Grid of 6 Feature Menu Buttons */}
          <div className="grid grid-cols-3 gap-3.5">
            <button
              type="button"
              onClick={() => setCurrentSubTab('absen_qr')}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Absensi</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('rekap_siswa')}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Riwayat</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('pelanggaran')}
              className="relative bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              {myPelanggaran.length > 0 && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-white font-black text-[10px] rounded-full shadow-sm animate-pulse">
                  {myPelanggaran.length}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Catatan Pelanggaran</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFormIzin(true);
              }}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Pengajuan</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('home_visit')}
              className="relative bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              {myHomeVisits.length > 0 && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-rose-500 text-white font-black text-[10px] rounded-full shadow-sm animate-pulse">
                  {myHomeVisits.length}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Home Visit</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('profil')}
              className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition flex flex-col items-center text-center gap-2 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
                <User className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Profil</span>
            </button>
          </div>

          {/* Rekap Kehadiran Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Rekap Kehadiran</h3>
              <div
                onClick={() => setCurrentSubTab('rekap_siswa')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 cursor-pointer hover:underline"
              >
                <span>{appData.sekolah.tahunAjaran ? `${appData.sekolah.tahunAjaran} (${appData.sekolah.semester || 'Semester 1'})` : 'Periode Aktif'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalH}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Hadir</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg sm:text-2xl font-black text-amber-500 dark:text-amber-400">{stats.totalS}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Sakit</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">{stats.totalI}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Izin</div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                <div className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-400">{stats.totalA}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Alpa</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ABSEN QR CODE */}
      {currentSubTab === 'absen_qr' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Absen Melalui QR Code Sekolah</h2>
            {(() => {
              const currentStudentTiming = getShiftTimingForStudent(appData, siswa, today);
              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>
                        Masuk: {currentStudentTiming.jamMasukMulai} - {currentStudentTiming.jamMasukSelesai} WIB &bull; Pulang: {currentStudentTiming.jamPulang} WIB
                      </span>
                    </div>
                    {currentStudentTiming.isJamMasukActive ? (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800">
                        <span>Lewat {currentStudentTiming.jamMasukSelesai} = Kesiangan (K)</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                        <span>Aturan Jam Masuk: NONAKTIF (Semua Scan = HADIR)</span>
                      </div>
                    )}
                  </div>

                  {/* Mode Pilihan: Otomatis / Masuk / Pulang */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStudentScanMode('auto')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        studentScanMode === 'auto'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mode Otomatis</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentScanMode('masuk')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        studentScanMode === 'masuk'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <span>☀️ Absen Masuk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!myPresensiToday || !myPresensiToday.time) {
                          onShowToast('Anda belum melakukan Absen Masuk! Silakan absen masuk terlebih dahulu.', 'warning');
                          return;
                        }
                        setStudentScanMode('pulang');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        studentScanMode === 'pulang'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>🏠 Absen Pulang</span>
                    </button>
                  </div>
                </div>
              );
            })()}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 pt-1">
              Pindai Kode QR yang ditampilkan oleh layar/kamera sekolah atau masukkan token presensi harian untuk mencatat kehadiran Anda.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-5">
            {/* Camera Scanner Container */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 text-center space-y-3">
              {isScanningCamera ? (
                <div>
                  <div id="qr-reader-container" className="overflow-hidden rounded-xl bg-black min-h-[260px]" />
                  <button
                    type="button"
                    onClick={() => setIsScanningCamera(false)}
                    className="mt-3 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer"
                  >
                    Tutup Kamera
                  </button>
                </div>
              ) : (
                <div className="py-6 space-y-4">
                  <Camera className="w-12 h-12 text-slate-400 mx-auto" />
                  <div className="text-xs text-slate-500 font-medium">Gunakan kamera HP atau pilih foto/screenshot QR dari galeri Anda</div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsScanningCamera(true)}
                      className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-500/20 transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Buka Kamera Scanner</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/20 transition inline-flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Foto QR / Galeri</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div id="qr-file-input-hidden" className="hidden"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              <span className="flex-shrink mx-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Atau Masukkan Token Presensi</span>
              <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            </div>

            {/* Token Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessQrCode(qrTokenInput);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  KODE TOKEN / KODE QR PRESENSI
                </label>
                <input
                  type="text"
                  value={qrTokenInput}
                  onChange={(e) => setQrTokenInput(e.target.value)}
                  placeholder="Contoh: SMK6-2026-PRESENSI"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Absen Sekarang</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: KARTU PELAJAR DIGITAL */}
      {currentSubTab === 'kartu_pelajar' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Kartu Pelajar Digital Siswa</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tunjukkan QR Code ini kepada petugas/guru untuk dipindai saat presensi sekolah.</p>
          </div>

          {/* ID CARD VISUAL */}
          <div className="max-w-md mx-auto bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* School Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {sekolah.logo ? (
                  <img src={sekolah.logo} alt="Logo" className="w-10 h-10 object-contain" />
                ) : (
                  <School className="w-8 h-8 text-blue-400" />
                )}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">{sekolah.nama || 'SMK NEGERI'}</h3>
                  <div className="text-[10px] text-blue-300 font-medium">TA {sekolah.tahunAjaran || '2026/2027'}</div>
                </div>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>

            {/* Student Info & QR Code */}
            <div className="py-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="flex-1 space-y-3 text-center sm:text-left">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Nama Siswa</div>
                  <div className="text-base font-black text-white">{siswa.nama}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">NISN</div>
                  <div className="text-sm font-mono font-bold text-blue-300">{siswa.nisn}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Kelas</div>
                  <div className="text-xs font-bold text-white">{kelas?.nama || '-'}</div>
                </div>
              </div>

              {/* QR Code Canvas */}
              <div className="bg-white p-3 rounded-2xl shadow-md shrink-0">
                {qrCanvasUrl ? (
                  <img src={qrCanvasUrl} alt="QR Code Siswa" className="w-32 h-32" />
                ) : (
                  <div className="w-32 h-32 bg-slate-200 animate-pulse rounded-xl" />
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Kartu Pelajar Resmi Terverifikasi</span>
              <span className="text-emerald-400 font-bold">STATUS: AKTIF</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <button
              onClick={() => {
                window.print();
              }}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan Kartu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: REKAP KEHADIRAN SAYA */}
      {currentSubTab === 'rekap_siswa' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Riwayat Kehadiran Siswa</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Catatan presensi harian Anda selama semester berjalan.</p>
            </div>
          </div>

          {stats.myHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">Belum ada riwayat data presensi recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Status Presensi</th>
                    <th className="py-3 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.myHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">{item.date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === 'H'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.status === 'K'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                              : item.status === 'D'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                              : item.status === 'I'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : item.status === 'S'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {item.status === 'H'
                            ? 'Hadir'
                            : item.status === 'K'
                            ? 'Kesiangan'
                            : item.status === 'D'
                            ? 'Dispensasi'
                            : item.status === 'I'
                            ? 'Izin'
                            : item.status === 'S'
                            ? 'Sakit'
                            : 'Alpha'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {item.status === 'H'
                          ? 'Tercatat Hadir'
                          : item.status === 'K'
                          ? 'Tercatat Kesiangan / Terlambat'
                          : item.status === 'D'
                          ? 'Dispensasi Kegiatan Sekolah / Lomba'
                          : 'Pengajuan Surat Keterangan / Izin'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: CATATAN PELANGGARAN SISWA */}
      {currentSubTab === 'pelanggaran' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Catatan Pelanggaran & Kedisiplinan</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Riwayat Pelanggaran Anda</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pantau akumulasi poin kedisiplinan dan catatan pelanggaran tata tertib sekolah.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-black text-xs">
                Total Poin: {totalPoinPelanggaran}
              </div>
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-700 dark:text-slate-300 font-bold text-xs">
                Kasus: {myPelanggaran.length}
              </div>
            </div>
          </div>

          {myPelanggaran.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Bersih dari Catatan Pelanggaran</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Luar biasa! Anda tidak memiliki catatan pelanggaran tata tertib sekolah. Pertahankan kedisiplinan dan prestasi Anda!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myPelanggaran.map((p, idx) => {
                const badgeKat = p.kategori === 'ringan' 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                  : p.kategori === 'sedang' 
                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' 
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
                
                return (
                  <div key={p.id || idx} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-amber-600 text-white font-black text-[11px] rounded-xl">
                          Kasus #{myPelanggaran.length - idx}
                        </span>
                        <span className={`px-2.5 py-1 font-bold text-[11px] rounded-full uppercase ${badgeKat}`}>
                          {p.kategori}
                        </span>
                        <span className="px-2.5 py-1 bg-rose-500 text-white font-black text-[11px] rounded-full">
                          +{p.poin} Poin
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Tanggal: {formatDateIndo(p.tanggal)}
                        </span>
                      </div>
                      <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[11px] rounded-full">
                        Pelapor: {p.pelapor || 'Guru Piket / Kesiswaan'}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Bentuk / Nama Pelanggaran</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{p.namaPelanggaran}</div>
                      {p.keterangan && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-400">Keterangan:</span> {p.keterangan}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="font-bold text-slate-400 uppercase text-[10px]">Tindakan / Sanksi</div>
                        <div className="text-slate-800 dark:text-slate-200 font-medium">{p.tindakan || '-'}</div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="font-bold text-slate-400 uppercase text-[10px]">Status Penanganan</div>
                        <div className="text-slate-800 dark:text-slate-200 font-medium capitalize">
                          {p.status === 'selesai' ? 'Selesai / Ditindaklanjuti' : p.status === 'proses' ? 'Sedang Diproses' : 'Perlu Tindak Lanjut'}
                        </div>
                      </div>
                    </div>

                    {p.foto && (
                      <div className="pt-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bukti Dokumentasi</div>
                        <img src={p.foto} alt="Dokumentasi Pelanggaran" className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: LAPORAN HOME VISIT SISWA */}
      {currentSubTab === 'home_visit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Kunjungan Rumah / Home Visit</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Laporan Home Visit Anda</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Riwayat kunjungan rumah yang dilakukan oleh guru atau wali kelas untuk pendampingan siswa.</p>
            </div>
            <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-black text-xs">
              Total: {myHomeVisits.length} Kunjungan
            </div>
          </div>

          {myHomeVisits.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Belum Ada Catatan Home Visit</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Puji Tuhan, saat ini belum ada laporan kunjungan rumah (home visit) yang dicatat oleh guru atau wali kelas untuk Anda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myHomeVisits.map((hv, idx) => (
                <div key={hv.id || idx} className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-rose-600 text-white font-black text-[11px] rounded-xl">
                        Kunjungan #{myHomeVisits.length - idx}
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Tanggal: {formatDateIndo(hv.tanggal)}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] rounded-full">
                      Petugas: {hv.petugas || 'Guru / Wali Kelas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-400 uppercase text-[10px]">Alasan / Permasalahan</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{hv.alasan || '-'}</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-400 uppercase text-[10px]">Catatan Kunjungan</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{hv.catatan || '-'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-400 uppercase text-[10px]">Hasil Kunjungan</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{hv.hasil || '-'}</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="font-bold text-slate-400 uppercase text-[10px]">Solusi & Tindak Lanjut</div>
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{hv.tindakLanjut || '-'}</div>
                    </div>
                  </div>

                  {hv.foto && (
                    <div className="pt-2">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dokumentasi Foto Kunjungan</div>
                      <img src={hv.foto} alt="Dokumentasi Home Visit" className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BIODATA & PROFIL SISWA */}
      {currentSubTab === 'profil' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
                <UserCog className="w-3.5 h-3.5" />
                <span>Biodata Mandiri Siswa</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">Profil & Biodata Saya</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tinjau dan perbarui informasi data diri Anda kapan saja.</p>
            </div>

            <button
              type="button"
              onClick={handleOpenEditModal}
              className="px-5 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
            >
              <UserCog className="w-4 h-4" />
              <span>Edit Biodata Saya</span>
            </button>
          </div>

          {/* Profile Overview Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Photo & Main Badge */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center text-center space-y-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 p-1 shadow-xl overflow-hidden">
                  {siswa.foto ? (
                    <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover rounded-[22px]" />
                  ) : (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-[22px] flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-slate-400" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="absolute bottom-1 right-1 p-2.5 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition cursor-pointer"
                  title="Ganti Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">{siswa.nama}</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-mono font-bold">
                  <span>NISN: {siswa.nisn}</span>
                </div>
              </div>

              <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Kelas</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{kelas?.nama || '-'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Status Siswa</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aktif</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Jenis Kelamin</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {siswa.gender === 'L' ? 'Laki-Laki (L)' : 'Perempuan (P)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2 & 3: Detailed Fields */}
            <div className="md:col-span-2 space-y-6">
              {/* Data Kontak & Pribadi */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Kontak & Data Diri</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold uppercase text-slate-400">No. WhatsApp Siswa</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span>{siswa.noWa || 'Belum Diisi'}</span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Tempat, Tanggal Lahir</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span>
                        {siswa.tempatLahir || siswa.tanggalLahir
                          ? `${siswa.tempatLahir || ''}${siswa.tempatLahir && siswa.tanggalLahir ? ', ' : ''}${
                              siswa.tanggalLahir || ''
                            }`
                          : 'Belum Diisi'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 sm:col-span-2">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Alamat Tempat Tinggal</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-1 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{siswa.alamat || 'Belum Diisi'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Orang Tua / Wali */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Data Orang Tua / Wali Siswa</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Nama Orang Tua / Wali</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-1">
                      {siswa.namaOrangTua || 'Belum Diisi'}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] font-bold uppercase text-slate-400">No. WhatsApp Orang Tua / Wali</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-white mt-1 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span>{siswa.noWaOrangTua || 'Belum Diisi'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keamanan Akun */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  <span>Akses Login & Keamanan Akun</span>
                </h4>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-400">Password Akun Siswa</div>
                    <div className="text-sm font-mono font-bold text-slate-800 dark:text-white mt-0.5">
                      ••••••••••••
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenEditModal}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700"
                  >
                    Ubah Password
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT BIODATA SISWA */}
      {showEditBiodataModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <UserCog className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Edit Biodata Siswa</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Perbarui informasi biodata pribadi Anda secara mandiri.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowEditBiodataModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBiodataSubmit} className="space-y-6">
              {/* Upload Foto Profil Section */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-0.5 shadow-md overflow-hidden">
                    {editFoto ? (
                      <img src={editFoto} alt="Foto Profil" className="w-full h-full object-cover rounded-[14px]" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 rounded-[14px] flex items-center justify-center text-slate-400">
                        <GraduationCap className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  {editFoto && (
                    <button
                      type="button"
                      onClick={() => setEditFoto('')}
                      className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:bg-rose-700 transition cursor-pointer"
                      title="Hapus Foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-800 dark:text-white">Foto Profil Siswa</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Format JPG, PNG, atau WEBP. Ukuran berkas maksimal 5MB (otomatis dikompresi).
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingFoto ? 'Memproses...' : 'Unggah Foto Baru'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFotoUpload}
                      disabled={isUploadingFoto}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NAMA LENGKAP SISWA <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    placeholder="Masukkan nama lengkap siswa..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* NISN (Read Only) */}
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>NISN (NOMOR INDUK)</span>
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Terkunci
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={siswa.nisn}
                    className="w-full px-4 py-3 bg-slate-200/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Kelas (Read Only) */}
                <div>
                  <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>KELAS</span>
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Terkunci
                    </span>
                  </label>
                  <input
                    type="text"
                    disabled
                    value={kelas?.nama || '-'}
                    className="w-full px-4 py-3 bg-slate-200/60 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>

                {/* Jenis Kelamin */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    JENIS KELAMIN
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditGender('L')}
                      className={`py-3 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                        editGender === 'L'
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Laki-Laki (L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditGender('P')}
                      className={`py-3 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                        editGender === 'P'
                          ? 'bg-pink-600 text-white border-pink-700 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Perempuan (P)
                    </button>
                  </div>
                </div>

                {/* No WhatsApp Siswa */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NO. WHATSAPP SISWA
                  </label>
                  <input
                    type="tel"
                    value={editNoWa}
                    onChange={(e) => setEditNoWa(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Nama Orang Tua / Wali */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NAMA ORANG TUA / WALI
                  </label>
                  <input
                    type="text"
                    value={editNamaOrangTua}
                    onChange={(e) => setEditNamaOrangTua(e.target.value)}
                    placeholder="Nama Orang Tua / Wali..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* No WhatsApp Orang Tua */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    NO. WHATSAPP ORANG TUA / WALI
                  </label>
                  <input
                    type="tel"
                    value={editNoWaOrangTua}
                    onChange={(e) => setEditNoWaOrangTua(e.target.value)}
                    placeholder="Contoh: 081298765432"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Tempat Lahir */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    TEMPAT LAHIR
                  </label>
                  <input
                    type="text"
                    value={editTempatLahir}
                    onChange={(e) => setEditTempatLahir(e.target.value)}
                    placeholder="Contoh: Bandung"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    TANGGAL LAHIR
                  </label>
                  <input
                    type="date"
                    value={editTanggalLahir}
                    onChange={(e) => setEditTanggalLahir(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Alamat Tempat Tinggal */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    ALAMAT TEMPAT TINGGAL
                  </label>
                  <textarea
                    rows={2}
                    value={editAlamat}
                    onChange={(e) => setEditAlamat(e.target.value)}
                    placeholder="Masukkan alamat lengkap domisili siswa..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                  />
                </div>

                {/* Password Akun Siswa */}
                <div className="sm:col-span-2 bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/80 space-y-2">
                  <label className="block text-[11px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    GANTI PASSWORD AKUN LOGIN
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordState ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Masukkan password baru akun..."
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordState((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      {showPasswordState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    Password ini digunakan saat siswa melakukan login ke aplikasi.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditBiodataModal(false)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold rounded-2xl text-xs shadow-lg shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FORM IZIN / SAKIT */}
      {showFormIzin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-black text-slate-900 dark:text-white">Form Pengajuan Izin / Sakit</h3>
              <button
                type="button"
                onClick={() => setShowFormIzin(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIzin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  JENIS PERMOHONAN
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setJenisIzin('S')}
                    className={`py-3 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                      jenisIzin === 'S'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Sakit (S)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisIzin('I')}
                    className={`py-3 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                      jenisIzin === 'I'
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Izin (I)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  ALASAN & KETERANGAN
                </label>
                <textarea
                  required
                  rows={3}
                  value={keteranganIzin}
                  onChange={(e) => setKeteranganIzin(e.target.value)}
                  placeholder="Tuliskan alasan lengkap mengapa tidak bisa hadir..."
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  UNGGAH SURAT SAKIT / IZIN (FOTO / DOKUMEN)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-750 transition text-xs font-bold text-slate-600 dark:text-slate-300">
                    <Camera className="w-4 h-4 text-blue-600" />
                    <span>{fotoIzin ? 'Ganti Surat / Foto' : 'Pilih Foto / Berkas Surat'}</span>
                    <input type="file" accept="image/*" onChange={handleUploadSuratIzin} className="hidden" />
                  </label>
                  {fotoIzin && (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      <img src={fotoIzin} alt="Bukti Surat" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFotoIzin('')}
                        className="absolute top-0 right-0 bg-rose-600 text-white w-4 h-4 rounded-bl text-[9px] flex items-center justify-center font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormIzin(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                >
                  Kirim ke Wali Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Notifikasi Presensi Di Tengah Layar */}
      {presensiResultModal?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Background Gradient Accent */}
            <div
              className={`absolute -top-12 -left-12 -right-12 h-32 rounded-b-full opacity-30 ${
                presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                  ? 'bg-gradient-to-b from-indigo-500 to-blue-500'
                  : presensiResultModal.status === 'K'
                  ? 'bg-gradient-to-b from-orange-500 to-transparent'
                  : 'bg-gradient-to-b from-emerald-500 to-transparent'
              }`}
            />

            {/* Top Header Badge / Icon */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl mb-3 border-4 ${
                  presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                    : presensiResultModal.status === 'K'
                    ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 border-orange-500/30'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {presensiResultModal.isPulang || presensiResultModal.status === 'PULANG' ? (
                  <Home className="w-10 h-10 animate-bounce" />
                ) : presensiResultModal.status === 'K' ? (
                  <Clock className="w-10 h-10 animate-bounce" />
                ) : (
                  <CheckCircle2 className="w-10 h-10 animate-bounce" />
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  {presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                    ? 'NOTIFIKASI ABSEN PULANG'
                    : 'NOTIFIKASI PRESENSI'}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                  ? (presensiResultModal.isUpdate ? 'Absen Pulang Diperbarui! 🎉' : 'Absen Pulang Berhasil! 🎉')
                  : (presensiResultModal.isUpdate ? 'Presensi Diperbarui!' : 'Presensi Berhasil!')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                  ? 'Presensi kepulangan sekolah telah berhasil dicatat. Hati-hati di jalan!'
                  : 'Kehadiran siswa telah tercatat di sistem'}
              </p>
            </div>

            {/* Student & Attendance Card Details */}
            <div className="relative z-10 bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 my-4 border border-slate-200/80 dark:border-slate-700/80 text-center space-y-2.5">
              <div>
                <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {presensiResultModal.namaSiswa}
                </h4>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  NISN: {presensiResultModal.nisn} &bull; Kelas: {presensiResultModal.namaKelas}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black text-xs sm:text-sm shadow-sm border ${
                    presensiResultModal.isPulang || presensiResultModal.status === 'PULANG'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800'
                      : presensiResultModal.status === 'K'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200 border-orange-300 dark:border-orange-800'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {presensiResultModal.isPulang || presensiResultModal.status === 'PULANG' ? (
                    <>
                      <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>STATUS: SUDAH ABSEN PULANG (HADIR)</span>
                    </>
                  ) : presensiResultModal.status === 'K' ? (
                    <>
                      <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      <span>STATUS: KESIANGAN (K)</span>
                    </>
                  ) : presensiResultModal.status === 'A' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>STATUS: ALPA (A) - MELEBIHI JAM PULANG</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>STATUS: HADIR (H)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  {presensiResultModal.tanggal} &bull; Jam {presensiResultModal.time} WIB
                </span>
              </div>
            </div>

            {/* WhatsApp Notification Button */}
            {presensiResultModal.notifWaUrl && (
              <a
                href={presensiResultModal.notifWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 w-full mb-2.5 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-4 h-4 text-white" />
                <span>Kirim Notif WA ke Orang Tua ({presensiResultModal.noWaOrangTua || 'Ortu'})</span>
              </a>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPresensiResultModal(null)}
              className="relative z-10 w-full py-3.5 px-6 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition cursor-pointer active:scale-95"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar Matching Reference Image */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-2xl px-3 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setCurrentSubTab('overview')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
            currentSubTab === 'overview' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('rekap_siswa')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
            currentSubTab === 'rekap_siswa' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px]">Riwayat</span>
        </button>

        {/* Central Prominent Scan Button */}
        <div className="relative -top-4">
          <button
            type="button"
            onClick={() => setCurrentSubTab('absen_qr')}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/40 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer border-4 border-white dark:border-slate-900"
          >
            <QrCode className="w-6 h-6" />
          </button>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">Scan</span>
        </div>

        <button
          type="button"
          onClick={() => setCurrentSubTab('rekap_siswa')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
            currentSubTab === 'rekap_siswa' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Laporan</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('profil')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition ${
            currentSubTab === 'profil' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>
    </div>
  );
};
