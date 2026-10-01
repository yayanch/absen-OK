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
  ShieldAlert,
  LogOut,
  Megaphone,
  X,
  ExternalLink,
  BookOpen,
  CalendarDays,
  Search,
  ArrowLeft,
  Flag,
  Sun,
  Sunset
} from 'lucide-react';
import { AppData, SekolahConfig, Siswa, UserSession, SiswaPresensiItem, ViewType, PresensiStatus, PengumumanSekolah, JadwalMengajarGuru } from '../../types';
import { INITIAL_PENGUMUMAN } from '../../data/initialData';
import { CurrentWeeklyShiftCard } from '../dashboard/CurrentWeeklyShiftCard';
import { getTodayString, compressBase64Image, saveSessionUser, normalizePresensiStatus, determinePresensiStatusByTime, getShiftTimingForStudent, formatDateIndo, getEffectiveSchoolDays } from '../../utils/helpers';

interface PortalMuridViewProps {
  appData: AppData;
  currentUser: UserSession;
  activeTab?: 'overview' | 'absen_qr' | 'kartu_pelajar' | 'rekap_siswa' | 'home_visit' | 'pelanggaran' | 'profil' | 'jadwal_pelajaran';
  onUpdateAppData: (updated: AppData) => void;
  onUpdateCurrentUser?: (session: UserSession) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigate?: (view: ViewType) => void;
  onLogout?: () => void;
}

export const PortalMuridView: React.FC<PortalMuridViewProps> = ({
  appData,
  currentUser,
  activeTab = 'overview',
  onUpdateAppData,
  onUpdateCurrentUser,
  onShowToast,
  onNavigate,
  onLogout,
}) => {
  const sessionSiswa = currentUser.data as Siswa;
  const siswaFromApp = (appData.siswa || []).find((s) => s.id === sessionSiswa?.id);
  const siswa = siswaFromApp || sessionSiswa;
  const today = getTodayString();
  const currentStudentTiming = React.useMemo(() => {
    return getShiftTimingForStudent(appData, siswa, today);
  }, [appData, siswa, today]);
  const [currentSubTab, setCurrentSubTab] = useState<'overview' | 'absen_qr' | 'kartu_pelajar' | 'rekap_siswa' | 'home_visit' | 'pelanggaran' | 'profil' | 'jadwal_pelajaran'>(
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

  // Announcements State & Filtering
  const [showAllPengumumanModal, setShowAllPengumumanModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifDropdownFilter, setNotifDropdownFilter] = useState<'semua' | 'unread'>('semua');
  const [selectedPengumuman, setSelectedPengumuman] = useState<PengumumanSekolah | null>(null);
  const [announcementCategoryFilter, setAnnouncementCategoryFilter] = useState<'semua' | 'penting' | 'kegiatan' | 'info' | 'peringatan'>('semua');

  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`read_announcements_${siswa?.id || 'default'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const studentAnnouncements = useMemo(() => {
    const rawList = appData.pengumuman && appData.pengumuman.length > 0 
      ? appData.pengumuman 
      : INITIAL_PENGUMUMAN;
    
    return rawList.filter((p) => p.aktif && (p.target === 'semua' || p.target === 'siswa'));
  }, [appData.pengumuman]);

  const filteredStudentAnnouncements = useMemo(() => {
    if (announcementCategoryFilter === 'semua') return studentAnnouncements;
    return studentAnnouncements.filter((p) => p.kategori === announcementCategoryFilter);
  }, [studentAnnouncements, announcementCategoryFilter]);

  const dropdownAnnouncements = useMemo(() => {
    if (notifDropdownFilter === 'unread') {
      return studentAnnouncements.filter((p) => !readAnnouncementIds.includes(p.id));
    }
    return studentAnnouncements;
  }, [studentAnnouncements, notifDropdownFilter, readAnnouncementIds]);

  const unreadAnnouncementsCount = useMemo(() => {
    return studentAnnouncements.filter((p) => !readAnnouncementIds.includes(p.id)).length;
  }, [studentAnnouncements, readAnnouncementIds]);

  const handleMarkAllAsRead = () => {
    const allIds = studentAnnouncements.map((p) => p.id);
    const updated = Array.from(new Set([...readAnnouncementIds, ...allIds]));
    setReadAnnouncementIds(updated);
    try {
      localStorage.setItem(`read_announcements_${siswa?.id || 'default'}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectNotifItem = (item: PengumumanSekolah) => {
    if (!readAnnouncementIds.includes(item.id)) {
      const updated = [...readAnnouncementIds, item.id];
      setReadAnnouncementIds(updated);
      try {
        localStorage.setItem(`read_announcements_${siswa?.id || 'default'}`, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
    }
    setSelectedPengumuman(item);
    setShowNotifDropdown(false);
  };

  const getRelativeTimeDisplay = (item: PengumumanSekolah) => {
    if (!item) return '';
    const now = new Date();
    
    if (item.createdAt) {
      const createdDate = new Date(item.createdAt);
      if (!isNaN(createdDate.getTime())) {
        const diffMs = now.getTime() - createdDate.getTime();
        if (diffMs >= 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMinutes / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffMinutes < 5) return 'Baru saja';
          if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
          if (diffHours < 24) return `${diffHours} jam lalu`;
          if (diffDays === 1) return 'Kemarin';
          if (diffDays < 7) return `${diffDays} hari lalu`;
        }
      }
    }

    if (item.tanggal) {
      return formatDateIndo(item.tanggal);
    }

    return 'Baru saja';
  };

  // Jadwal Pelajaran State & Computation
  const activeWeeklyShift: 'pagi' | 'siang' = currentStudentTiming.shiftType === 'siang' ? 'siang' : 'pagi';
  const [selectedShiftView, setSelectedShiftView] = useState<'pagi' | 'siang'>(activeWeeklyShift);
  const [selectedHariJadwal, setSelectedHariJadwal] = useState<string>('Hari Ini');
  const [searchJadwal, setSearchJadwal] = useState<string>('');

  useEffect(() => {
    setSelectedShiftView(activeWeeklyShift);
  }, [activeWeeklyShift]);

  const todayDayName = useMemo(() => {
    try {
      const d = new Date(today + 'T00:00:00');
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      return days[d.getDay()] || 'Senin';
    } catch {
      return 'Senin';
    }
  }, [today]);

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

  // Schedule for student's class, strictly filtered by selected shift view
  const studentJadwalList: JadwalMengajarGuru[] = useMemo(() => {
    const rawList = appData.jadwalMengajar || [];
    const studentKelasNama = (kelas?.nama || (siswa as any).kelas || '').trim().toLowerCase();
    const studentKelasId = (siswa.kelasId || kelas?.id || '').trim();

    // 1. Filter by class ID or name
    const classMatched = rawList.filter((j) => {
      const matchId = Boolean(studentKelasId && j.kelasId && j.kelasId === studentKelasId);
      const matchName = Boolean(
        studentKelasNama && j.kelasNama && j.kelasNama.trim().toLowerCase() === studentKelasNama
      );
      return matchId || matchName;
    });

    // 2. Filter strictly by the chosen shift ('pagi' | 'siang')
    return classMatched.filter((j) => {
      const itemShift = (j.shift || 'Pagi').toLowerCase().trim();
      return itemShift === selectedShiftView;
    });
  }, [appData.jadwalMengajar, kelas, siswa.kelasId, (siswa as any).kelas, selectedShiftView]);

  // Today's schedule for student: strictly displays schedule for the CURRENT ACTIVE SHIFT today
  const todayJadwalList = useMemo(() => {
    const rawList = appData.jadwalMengajar || [];
    const studentKelasNama = (kelas?.nama || (siswa as any).kelas || '').trim().toLowerCase();
    const studentKelasId = (siswa.kelasId || kelas?.id || '').trim();
    const activeShift = activeWeeklyShift;

    const classMatched = rawList.filter((j) => {
      const matchId = Boolean(studentKelasId && j.kelasId && j.kelasId === studentKelasId);
      const matchName = Boolean(
        studentKelasNama && j.kelasNama && j.kelasNama.trim().toLowerCase() === studentKelasNama
      );
      return matchId || matchName;
    });

    const shiftMatched = classMatched.filter((j) => {
      const itemShift = (j.shift || 'Pagi').toLowerCase().trim();
      return itemShift === activeShift;
    });

    return shiftMatched
      .filter((j) => j.hari.toLowerCase() === todayDayName.toLowerCase())
      .sort((a, b) => {
        const timeA = a.jamMulai || (a.jamKeList && a.jamKeList[0] ? `0${a.jamKeList[0]}:00` : '00:00');
        const timeB = b.jamMulai || (b.jamKeList && b.jamKeList[0] ? `0${b.jamKeList[0]}:00` : '00:00');
        return timeA.localeCompare(timeB);
      });
  }, [appData.jadwalMengajar, kelas, siswa.kelasId, (siswa as any).kelas, activeWeeklyShift, todayDayName]);

    const getSubjectStatus = (item: JadwalMengajarGuru, isToday: boolean) => {
    if (!isToday) return null;
    if (!item.jamMulai || !item.jamSelesai) return null;

    try {
      const now = new Date();
      const currentHourMin = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      if (currentHourMin >= item.jamMulai && currentHourMin <= item.jamSelesai) {
        return 'ongoing';
      }
      if (currentHourMin > item.jamSelesai) {
        return 'finished';
      }
      return 'upcoming';
    } catch {
      return null;
    }
  };

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
    <div className="animate-fade-in select-none pb-32 sm:pb-16 w-full overflow-x-hidden">
      {/* Top Banner & Profile Info Matching Reference Image - FULL AT TOP & SIDES, STRAIGHT BOTTOM CORNERS */}
      <div className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-none shadow-xl shadow-blue-950/25 relative text-white left-0 right-0">
        {/* Subtle decorative glow accents encapsulated in overflow-hidden */}
        <div className="absolute inset-0 rounded-none overflow-hidden pointer-events-none">
          <div className="absolute -top-12 -right-12 w-52 h-52 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 -left-12 w-48 h-48 bg-indigo-400/15 rounded-full blur-xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-4 sm:pt-6 pb-6 sm:pb-7 space-y-4 sm:space-y-5 relative z-10">
          {/* Top Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl p-1.5 border border-white/30 flex items-center justify-center shrink-0 shadow overflow-hidden">
                {sekolah.logo ? (
                  <img src={sekolah.logo} alt={sekolah.nama || 'Logo Sekolah'} className="w-full h-full object-contain" />
                ) : (
                  <School className="w-6 h-6 text-white stroke-[1.75]" />
                )}
              </div>
              <div>
                <div className="text-[10px] font-bold text-blue-200 uppercase tracking-wider">Aplikasi</div>
                <h2 className="text-base font-black text-white tracking-tight leading-snug">Absensi Siswa</h2>
                <div className="text-[11px] text-blue-100 font-medium">{sekolah.nama || 'SMKN 6 Garut'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Tombol Notifikasi Pengumuman dengan Popover Dropdown Facebook Style */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifDropdown((prev) => !prev)}
                  className="relative w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition cursor-pointer group"
                  title="Notifikasi & Pengumuman Sekolah"
                >
                  <Bell className="w-5 h-5 stroke-[1.75] group-hover:scale-110 transition" />
                  {unreadAnnouncementsCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-rose-500 text-white font-black text-[10px] rounded-full flex items-center justify-center border-2 border-blue-700 shadow-md animate-pulse">
                      {unreadAnnouncementsCount > 9 ? '9+' : unreadAnnouncementsCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <>
                    {/* Transparent backdrop for clicking outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifDropdown(false)} 
                    />

                    {/* Facebook Style Dropdown Card - Perfectly aligned & floating without truncation */}
                    <div className="absolute -right-12 sm:right-0 top-full mt-2.5 w-[calc(100vw-2rem)] sm:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] overflow-hidden text-slate-900 dark:text-white animate-fade-in flex flex-col max-h-[75vh]">
                      {/* Header Dropdown like FB */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">Notifikasi</h3>
                          {unreadAnnouncementsCount > 0 && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[11px] font-black rounded-full">
                              {unreadAnnouncementsCount} baru
                            </span>
                          )}
                        </div>
                        {unreadAnnouncementsCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition cursor-pointer"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>

                      {/* Filter Pills like FB (Semua / Belum Dibaca) */}
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-2 bg-slate-50/70 dark:bg-slate-900/70">
                        <button
                          type="button"
                          onClick={() => setNotifDropdownFilter('semua')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                            notifDropdownFilter === 'semua'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          Semua
                        </button>
                        <button
                          type="button"
                          onClick={() => setNotifDropdownFilter('unread')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            notifDropdownFilter === 'unread'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>Belum Dibaca</span>
                          {unreadAnnouncementsCount > 0 && (
                            <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full font-black">
                              {unreadAnnouncementsCount}
                            </span>
                          )}
                        </button>
                      </div>

                      {/* Notification Items List */}
                      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                        {dropdownAnnouncements.length > 0 ? (
                          dropdownAnnouncements.map((item) => {
                            const isUnread = !readAnnouncementIds.includes(item.id);
                            const isCategoryPenting = item.kategori === 'penting';
                            const isCategoryKegiatan = item.kategori === 'kegiatan';
                            const isCategoryPeringatan = item.kategori === 'peringatan';

                            return (
                              <div
                                key={item.id}
                                onClick={() => handleSelectNotifItem(item)}
                                className={`p-3.5 sm:p-4 flex items-start gap-3 transition cursor-pointer group relative ${
                                  isUnread
                                    ? 'bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/50'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                              >
                                {/* Left Icon / Avatar Circle with Bell Badge */}
                                <div className="relative shrink-0 mt-0.5">
                                  <div className={`w-11 h-11 rounded-full flex items-center justify-center border shadow-xs ${
                                    isCategoryPenting
                                      ? 'bg-amber-100 dark:bg-amber-950 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400'
                                      : isCategoryKegiatan
                                      ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'
                                      : isCategoryPeringatan
                                      ? 'bg-rose-100 dark:bg-rose-950 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                                      : 'bg-blue-100 dark:bg-blue-950 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                                  }`}>
                                    <Megaphone className="w-5 h-5 stroke-[1.8]" />
                                  </div>
                                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white dark:border-slate-900">
                                    <Bell className="w-2 h-2" />
                                  </div>
                                </div>

                                {/* Text Body */}
                                <div className="flex-1 min-w-0 pr-1">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider rounded ${
                                      isCategoryPenting
                                        ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                                        : isCategoryKegiatan
                                        ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200'
                                        : isCategoryPeringatan
                                        ? 'bg-rose-200/80 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                                        : 'bg-blue-200/80 text-blue-900 dark:bg-blue-900 dark:text-blue-200'
                                    }`}>
                                      {item.kategori || 'info'}
                                    </span>
                                  </div>
                                  <h5 className={`text-xs sm:text-sm leading-snug line-clamp-2 ${
                                    isUnread
                                      ? 'font-black text-slate-900 dark:text-white'
                                      : 'font-semibold text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {item.judul}
                                  </h5>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                    {item.isi}
                                  </p>
                                  <span className={`text-[10px] font-bold mt-1 block ${
                                    isUnread ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                                  }`}>
                                    {getRelativeTimeDisplay(item)}
                                  </span>
                                </div>

                                {/* Unread Indicator Blue Dot */}
                                {isUnread && (
                                  <div className="shrink-0 self-center">
                                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-xs" />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Tidak ada notifikasi {notifDropdownFilter === 'unread' ? 'belum dibaca' : ''}.
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifDropdown(false);
                            setShowAllPengumumanModal(true);
                          }}
                          className="w-full py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Lihat Semua Pengumuman
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-10 h-10 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-300/30 flex items-center justify-center text-white transition cursor-pointer"
                  title="Keluar / Logout"
                >
                  <LogOut className="w-5 h-5 text-rose-200 stroke-[1.75]" />
                </button>
              )}
            </div>
          </div>

          {/* Student Greeting Card with Glassmorphism */}
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl p-4 sm:p-5 text-slate-900 dark:text-white shadow-xl shadow-blue-950/20 flex items-center justify-between gap-4 border border-white/50 dark:border-white/10">
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{getGreeting()}</div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">{siswa.nama}</h1>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-blue-50/80 dark:bg-blue-950/60 backdrop-blur-sm text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800">
                  <span>{kelas?.nama || 'Kelas Siswa'}</span>
                </div>
                {siswa.nisn && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">NISN</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{siswa.nisn}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/40 dark:bg-blue-950/60 backdrop-blur-md rounded-2xl p-1 border-2 border-white/60 dark:border-blue-500/30 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              {siswa.foto ? (
                <img src={siswa.foto} alt={siswa.nama} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <User className="w-10 h-10 text-blue-600 dark:text-blue-400 stroke-[1.75]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 space-y-5 mt-4 sm:mt-5">
      {/* Sub-tab navigation removed as requested */}

      {/* TAB 1: OVERVIEW / DASHBOARD SISWA */}
      {currentSubTab === 'overview' && (
        <div className="space-y-5">
          {/* Card Shift Pekan Ini */}
          <CurrentWeeklyShiftCard appData={appData} siswa={siswa} onNavigateView={onNavigate} />

          {/* Status Absen Hari Ini Card with Glassmorphism */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-slate-800/80 rounded-3xl p-5 text-slate-900 dark:text-white shadow-xl shadow-blue-900/5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shrink-0 shadow-md ${
                  myPresensiToday?.pulangTime 
                    ? 'bg-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-950' 
                    : myPresensiToday 
                    ? (myPresensiToday.status === 'H' ? 'bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950' : myPresensiToday.status === 'K' ? 'bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-950' : 'bg-blue-600') 
                    : 'bg-slate-700'
                }`}>
                  {myPresensiToday?.pulangTime ? (
                    <Home className="w-7 h-7 stroke-[1.75]" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 stroke-[1.75]" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      {myPresensiToday ? (myPresensiToday.status === 'H' ? 'Hadir' : myPresensiToday.status === 'K' ? 'Kesiangan' : myPresensiToday.status === 'I' ? 'Izin' : myPresensiToday.status === 'S' ? 'Sakit' : myPresensiToday.status === 'D' ? 'Dispensasi' : 'Alpha') : 'Belum Absen'}
                    </span>
                    {myPresensiToday?.pulangTime && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-black text-[10px] rounded-full uppercase tracking-wider">
                        Sudah Pulang
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {formatDateIndo(today)}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 stroke-[1.75]" />
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
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-xs shadow-sm active:scale-95 transition cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4 stroke-[1.75]" />
                  <span>Scan QR</span>
                </button>
              </div>
            </div>

            {/* Sub Detail Info Masuk & Pulang with Glassmorphism */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 text-xs">
              <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-2xl p-3 shadow-xs">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider flex items-center gap-1">
                  <span>{currentStudentTiming.shiftType === 'siang' ? '🌅 Jam Masuk (Siang)' : '☀️ Jam Masuk (Pagi)'}</span>
                </div>
                <div className="text-sm font-black mt-0.5 text-slate-900 dark:text-white">
                  {myPresensiToday?.time ? `${myPresensiToday.time} WIB` : 'Belum Absen'}
                </div>
              </div>

              <div className="bg-white/70 dark:bg-slate-800/60 backdrop-blur-md border border-white/80 dark:border-slate-700/60 rounded-2xl p-3 shadow-xs">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider flex items-center gap-1">
                  <span>🏠 Jam Pulang</span>
                </div>
                <div className="text-sm font-black mt-0.5 text-slate-900 dark:text-white flex items-center justify-between">
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
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] rounded-lg transition active:scale-95 cursor-pointer shadow-xs"
                    >
                      Absen Pulang
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Aksi Cepat Grid with Deep Saturated (Pekat) Backgrounds */}
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
            <button
              type="button"
              onClick={() => setCurrentSubTab('absen_qr')}
              className="p-3 sm:p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-emerald-500/30"
            >
              <CalendarCheck className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Absensi</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('rekap_siswa')}
              className="p-3 sm:p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-indigo-500/30"
            >
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Riwayat</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('jadwal_pelajaran')}
              className="p-3 sm:p-4 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-violet-500/30"
            >
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Jadwal Pelajaran</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('pelanggaran')}
              className="relative p-3 sm:p-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-amber-400/30"
            >
              {myPelanggaran.length > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 py-0.5 bg-rose-600 text-white font-black text-[10px] rounded-full shadow-xs ring-2 ring-white animate-pulse">
                  {myPelanggaran.length}
                </span>
              )}
              <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Catatan Pelanggaran</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowFormIzin(true);
              }}
              className="p-3 sm:p-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-purple-500/30"
            >
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Pengajuan</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('home_visit')}
              className="relative p-3 sm:p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-rose-500/30"
            >
              {myHomeVisits.length > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 px-1.5 py-0.5 bg-amber-400 text-slate-900 font-black text-[10px] rounded-full shadow-xs ring-2 ring-white animate-pulse">
                  {myHomeVisits.length}
                </span>
              )}
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Home Visit</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('kartu_pelajar')}
              className="p-3 sm:p-4 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md shadow-cyan-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-cyan-500/30"
            >
              <CreditCard className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Kartu Pelajar</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentSubTab('profil')}
              className="p-3 sm:p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-900/10 active:scale-95 transition flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2.5 cursor-pointer group border border-blue-500/30"
            >
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-white stroke-[1.8] group-hover:scale-110 transition shrink-0" />
              <span className="text-[11px] sm:text-sm font-bold text-white leading-tight">Profil</span>
            </button>
          </div>

          {/* Jadwal Pelajaran Section on Overview */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Jadwal Pelajaran</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200/80 dark:border-violet-900/60">
                  {todayDayName}
                </span>
                <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  activeWeeklyShift === 'pagi'
                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                }`}>
                  {activeWeeklyShift === 'pagi' ? '☀️ Shift Pagi' : '🌅 Shift Siang'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedHariJadwal('Hari Ini');
                  setCurrentSubTab('jadwal_pelajaran');
                }}
                className="text-xs sm:text-sm font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 flex items-center gap-0.5 transition cursor-pointer"
              >
                <span>Lihat Jadwal Lengkap</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {todayJadwalList.length > 0 ? (
              <div className="space-y-2.5">
                {todayJadwalList.map((item) => {
                  const status = getSubjectStatus(item, true);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedHariJadwal(item.hari);
                        setCurrentSubTab('jadwal_pelajaran');
                      }}
                      className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-violet-200 dark:hover:border-violet-900/60 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/60 border border-violet-100/80 dark:border-violet-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition text-violet-600 dark:text-violet-400">
                          <BookOpen className="w-6 h-6 stroke-[1.8]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                              {item.mataPelajaran}
                            </h4>
                            {status === 'ongoing' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 animate-pulse shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Sedang KBM
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {item.guruNama} {item.catatan ? `• ${item.catatan}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-black text-violet-600 dark:text-violet-400">
                          {item.jamMulai && item.jamSelesai ? `${item.jamMulai} - ${item.jamSelesai}` : item.jamKe || 'Jam KBM'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                          {item.jamKe || `Shift ${item.shift || 'Pagi'}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-center space-y-2">
                <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Tidak ada jadwal KBM pada hari {todayDayName}.</p>
                  <p className="text-[11px] text-slate-400">Anda dapat melihat jadwal hari lain atau jadwal mingguan lengkap.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedHariJadwal('Semua');
                    setCurrentSubTab('jadwal_pelajaran');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/60 text-violet-600 dark:text-violet-400 text-xs font-bold transition cursor-pointer"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Buka Jadwal Mingguan</span>
                </button>
              </div>
            )}
          </div>

          {/* Pengumuman Terbaru Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Pengumuman Terbaru</h3>
              <button
                type="button"
                onClick={() => setShowAllPengumumanModal(true)}
                className="text-xs sm:text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-0.5 transition cursor-pointer"
              >
                <span>Lihat Semua</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {studentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {studentAnnouncements.slice(0, 1).map((item) => {
                  const isCategoryPenting = item.kategori === 'penting';
                  const isCategoryKegiatan = item.kategori === 'kegiatan';
                  const isCategoryPeringatan = item.kategori === 'peringatan';

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedPengumuman(item)}
                      className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/60 transition cursor-pointer flex items-start gap-3.5 sm:gap-4 group relative"
                    >
                      {/* Left Icon Container */}
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition mt-0.5 ${
                        isCategoryPenting
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200/80 dark:border-amber-900/60 text-amber-600 dark:text-amber-400'
                          : isCategoryKegiatan
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400'
                          : isCategoryPeringatan
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400'
                          : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'
                      }`}>
                        <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
                      </div>

                      {/* Announcement Main Content */}
                      <div className="flex-1 min-w-0">
                        {/* Meta Bar: Category Badge, Penulis, and Date */}
                        <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                              isCategoryPenting
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : isCategoryKegiatan
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : isCategoryPeringatan
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}>
                              {item.kategori || 'info'}
                            </span>
                            {item.penulis && (
                              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                                &bull; {item.penulis}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                            {getRelativeTimeDisplay(item)}
                          </span>
                        </div>

                        {/* Title - Full width without vertical squishing */}
                        <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition mb-1.5">
                          {item.judul}
                        </h4>

                        {/* Content snippet */}
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {item.isi}
                        </p>

                        {/* Footer Link Indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400">
                          <span>Baca Pengumuman Selengkapnya</span>
                          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border border-slate-100 dark:border-slate-800 text-center space-y-1 text-slate-400">
                <Megaphone className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Belum ada pengumuman terbaru saat ini.</p>
              </div>
            )}
          </div>

          {/* Rekap Kehadiran Section with Glassmorphism */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-5 border border-white/80 dark:border-slate-800/80 shadow-xl shadow-blue-900/5 space-y-4">
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
              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-white/60 dark:border-slate-800 text-center shadow-xs">
                <div className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalH}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Hadir</div>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-white/60 dark:border-slate-800 text-center shadow-xs">
                <div className="text-lg sm:text-2xl font-black text-amber-500 dark:text-amber-400">{stats.totalS}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Sakit</div>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-white/60 dark:border-slate-800 text-center shadow-xs">
                <div className="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400">{stats.totalI}</div>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Izin</div>
              </div>

              <div className="bg-white/60 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-white/60 dark:border-slate-800 text-center shadow-xs">
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
                      <span>{currentStudentTiming.shiftType === 'siang' ? '🌅 Absen Masuk (Siang)' : '☀️ Absen Masuk (Pagi)'}</span>
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

      {/* TAB JADWAL PELAJARAN SISWA */}
      {currentSubTab === 'jadwal_pelajaran' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6">
          {/* Header & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setCurrentSubTab('overview')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 transition cursor-pointer mb-1 print:hidden"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Beranda</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Jadwal Pelajaran Kelas {kelas?.nama || '-'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Jadwal kegiatan belajar mengajar (KBM) mingguan semester berjalan
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 print:hidden w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Jadwal</span>
              </button>
            </div>
          </div>

          {/* Info Meta Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Kelas</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {kelas?.nama || '-'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {kelas?.jurusanId || 'Kejuruan / Umum'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Wali Kelas</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
                {waliKelas?.nama || 'Belum Ditentukan'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {waliKelas?.nip ? `NIP: ${waliKelas.nip}` : 'Koordinator Kelas'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Sesi KBM</div>
              <div className="text-sm font-black text-violet-600 dark:text-violet-400 mt-0.5">
                {studentJadwalList.length} Mata Pelajaran
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                Shift {selectedShiftView === 'siang' ? 'Siang' : 'Pagi'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/60">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Shift KBM Ditampilkan</div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                <span>{selectedShiftView === 'siang' ? '🌅 Shift Siang' : '☀️ Shift Pagi'}</span>
                {selectedShiftView === activeWeeklyShift ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    Aktif
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    Rotasi
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {selectedShiftView === 'siang'
                  ? `${appData.shiftConfig?.siangJamMasukMulai || '12:45'} - ${appData.shiftConfig?.siangJamPulang || '16:50'} WIB`
                  : `${appData.shiftConfig?.pagiJamMasukMulai || '06:30'} - ${appData.shiftConfig?.pagiJamPulang || '12:00'} WIB`}
              </div>
            </div>
          </div>

          {/* Shift Filter Switcher Segmented Control */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-slate-50/90 dark:bg-slate-850/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">Pilih Shift:</span>
              <div className="inline-flex p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedShiftView('pagi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedShiftView === 'pagi'
                      ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Shift Pagi (06:30 - 12:00)</span>
                  {activeWeeklyShift === 'pagi' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                      Aktif Minggu Ini
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedShiftView('siang')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    selectedShiftView === 'siang'
                      ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Shift Siang (12:45 - 16:50)</span>
                  {activeWeeklyShift === 'siang' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800">
                      Aktif Minggu Ini
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Jadwal Aktif Siswa:</span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                activeWeeklyShift === 'pagi'
                  ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}>
                {activeWeeklyShift === 'pagi' ? '☀️ Shift Pagi' : '🌅 Shift Siang'}
              </span>
            </div>
          </div>

          {/* Filter Bar: Day Pills & Search */}
          <div className="space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Day Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {['Semua', 'Hari Ini', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
                  const isActive = selectedHariJadwal === day;
                  const dayCount = day === 'Semua' 
                    ? studentJadwalList.length 
                    : day === 'Hari Ini' 
                    ? todayJadwalList.length 
                    : studentJadwalList.filter((j) => j.hari.toLowerCase() === day.toLowerCase()).length;

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedHariJadwal(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/20'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span>{day}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {dayCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Box */}
              <div className="relative shrink-0 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchJadwal}
                  onChange={(e) => setSearchJadwal(e.target.value)}
                  placeholder="Cari mapel atau guru..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Schedule List Grouped by Day */}
          <div className="space-y-6">
            {(() => {
              const daysToIterate = selectedHariJadwal === 'Hari Ini'
                ? [todayDayName]
                : selectedHariJadwal !== 'Semua'
                ? [selectedHariJadwal]
                : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

              let totalShown = 0;

              const renderedDays = daysToIterate.map((day) => {
                const dayItems = studentJadwalList
                  .filter((j) => j.hari.toLowerCase() === day.toLowerCase())
                  .filter((j) => {
                    if (!searchJadwal.trim()) return true;
                    const q = searchJadwal.toLowerCase();
                    return (
                      j.mataPelajaran.toLowerCase().includes(q) ||
                      j.guruNama.toLowerCase().includes(q) ||
                      (j.catatan && j.catatan.toLowerCase().includes(q))
                    );
                  })
                  .sort((a, b) => {
                    const timeA = a.jamMulai || (a.jamKeList && a.jamKeList[0] ? `0${a.jamKeList[0]}:00` : '00:00');
                    const timeB = b.jamMulai || (b.jamKeList && b.jamKeList[0] ? `0${b.jamKeList[0]}:00` : '00:00');
                    return timeA.localeCompare(timeB);
                  });

                totalShown += dayItems.length;

                if (dayItems.length === 0) return null;

                const isToday = day.toLowerCase() === todayDayName.toLowerCase();

                return (
                  <div key={day} className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>📅</span>
                          <span>{day}</span>
                        </span>
                        {isToday && (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                            Hari Ini
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-400">
                        {dayItems.length} Sesi Pembelajaran
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {day === 'Senin' && selectedShiftView === 'pagi' && (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 md:col-span-2 shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Flag className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-2">
                                <span>Upacara Bendera (Bukan Jam Pelajaran)</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200/80 dark:bg-rose-900/70 text-rose-900 dark:text-rose-200">
                                  Jam ke-1 &amp; 2 (06.30 - 08.00 WIB)
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
                                Kegiatan rutin Upacara Bendera sekolah wajib diikuti seluruh siswa &amp; guru Shift Pagi. Pelajaran dimulai dari Jam ke-3.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {dayItems.map((item) => {
                        const status = getSubjectStatus(item, isToday);

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition ${
                              status === 'ongoing'
                                ? 'bg-violet-50/60 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 shadow-sm'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-violet-200 dark:hover:border-violet-900/60 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                                    {item.mataPelajaran}
                                  </h4>
                                  {status === 'ongoing' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                      Sedang KBM
                                    </span>
                                  )}
                                  {status === 'finished' && isToday && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                                      Selesai
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                                  <span className="text-slate-400">Guru:</span>
                                  <span className="font-semibold">{item.guruNama}</span>
                                </p>

                                {item.catatan && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-0.5">
                                    Ruangan / Materi: {item.catatan}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs ${
                                  (item.shift || selectedShiftView).toLowerCase() === 'siang'
                                    ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                }`}>
                                  {item.jamMulai && item.jamSelesai ? `${item.jamMulai} - ${item.jamSelesai}` : item.jamKe || 'Jam KBM'}
                                </span>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 flex items-center justify-end gap-1">
                                  <span>{item.jamKe || ''}</span>
                                  <span className="opacity-75">• Shift {item.shift || (selectedShiftView === 'siang' ? 'Siang' : 'Pagi')}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });

              if (totalShown === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Tidak ada jadwal pelajaran ditemukan.
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchJadwal ? 'Coba gunakan kata kunci pencarian yang lain.' : 'Pilih tab hari lain untuk melihat jadwal KBM.'}
                    </p>
                    {searchJadwal && (
                      <button
                        type="button"
                        onClick={() => setSearchJadwal('')}
                        className="px-3 py-1 bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300 text-xs font-bold rounded-lg transition"
                      >
                        Reset Pencarian
                      </button>
                    )}
                  </div>
                );
              }

              return renderedDays;
            })()}
          </div>

          {/* School Guidelines / Notes Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 print:hidden">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>💡</span>
              <span>Informasi & Tata Tertib KBM</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <li>Siswa wajib hadir di kelas 10 menit sebelum jam pelajaran pertama dimulai.</li>
              <li>Pastikan membawa perlengkapan belajar, buku paket, dan seragam sesuai jadwal harian.</li>
              <li>Jika guru mata pelajaran berhalangan hadir, lapor segera ke Guru Piket atau Wali Kelas.</li>
            </ul>
          </div>
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
      </div>

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

      {/* Detail Pengumuman Modal */}
      {selectedPengumuman && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center shrink-0">
                  <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400 stroke-[1.8]" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {selectedPengumuman.kategori || 'Pengumuman'}
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {selectedPengumuman.judul}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPengumuman(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {getRelativeTimeDisplay(selectedPengumuman)}
              </span>
              {selectedPengumuman.tanggal && (
                <span>&bull; {formatDateIndo(selectedPengumuman.tanggal)}</span>
              )}
              {selectedPengumuman.penulis && (
                <span>&bull; Oleh: <strong className="text-slate-700 dark:text-slate-300">{selectedPengumuman.penulis}</strong></span>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {selectedPengumuman.isi}
            </div>

            {selectedPengumuman.linkUrl && (
              <a
                href={selectedPengumuman.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
              >
                <span>{selectedPengumuman.linkText || 'Buka Tautan Lampiran'}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => setSelectedPengumuman(null)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Semua Pengumuman / Notifikasi Modal */}
      {showAllPengumumanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bell className="w-5 h-5 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Notifikasi & Pengumuman</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Informasi, agenda, dan edaran resmi sekolah</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllPengumumanModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {(['semua', 'penting', 'kegiatan', 'info', 'peringatan'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setAnnouncementCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-full font-bold capitalize transition shrink-0 cursor-pointer ${
                    announcementCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredStudentAnnouncements.length > 0 ? (
                filteredStudentAnnouncements.map((item) => {
                  const isCategoryPenting = item.kategori === 'penting';
                  const isCategoryKegiatan = item.kategori === 'kegiatan';
                  const isCategoryPeringatan = item.kategori === 'peringatan';

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPengumuman(item);
                      }}
                      className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition cursor-pointer flex items-start gap-3.5 group relative"
                    >
                      <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition ${
                        isCategoryPenting
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900 text-amber-600 dark:text-amber-400'
                          : isCategoryKegiatan
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'
                          : isCategoryPeringatan
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400'
                          : 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400'
                      }`}>
                        <Megaphone className="w-5 h-5 stroke-[1.8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md ${
                            isCategoryPenting
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : isCategoryKegiatan
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : isCategoryPeringatan
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {item.kategori || 'info'}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                            {getRelativeTimeDisplay(item)}
                          </span>
                          {item.penulis && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              &bull; {item.penulis}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {item.judul}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1 whitespace-pre-line line-clamp-2">
                          {item.isi}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Tidak ada pengumuman yang sesuai kategori ini.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAllPengumumanModal(false)}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Bottom Navigation Bar with Glassmorphism */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-2xl px-3 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => setCurrentSubTab('overview')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentSubTab === 'overview' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Home className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('rekap_siswa')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentSubTab === 'rekap_siswa' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <Clock className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">Riwayat</span>
        </button>

        {/* Central Prominent Scan Button */}
        <div className="relative -top-4">
          <button
            type="button"
            onClick={() => setCurrentSubTab('absen_qr')}
            className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/40 flex flex-col items-center justify-center transition active:scale-95 cursor-pointer border-4 border-white dark:border-slate-900"
          >
            <QrCode className="w-6 h-6 stroke-[1.75]" />
          </button>
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">Scan</span>
        </div>

        <button
          type="button"
          onClick={() => setCurrentSubTab('jadwal_pelajaran')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentSubTab === 'jadwal_pelajaran' ? 'text-violet-600 dark:text-violet-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">Jadwal</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentSubTab('profil')}
          className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition cursor-pointer ${
            currentSubTab === 'profil' ? 'text-blue-600 dark:text-blue-400 font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
          }`}
        >
          <User className="w-5 h-5 stroke-[1.75]" />
          <span className="text-[10px]">Profil</span>
        </button>
      </div>
    </div>
  );
};
