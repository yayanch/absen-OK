import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpenCheck,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit,
  Printer,
  Download,
  Sparkles,
  Filter,
  Check,
  X,
  ChevronRight,
  Info,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  UserCheck,
  RefreshCw,
  Send,
  Table2,
  FileText,
  Sun,
  Sunset,
  User,
  Save,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Award,
  ChevronDown,
  History
} from 'lucide-react';
import {
  AppData,
  UserSession,
  AbsensiMengajarGuruItem,
  SiswaPresensiSesiGuru,
  JadwalMengajarGuru,
  ViewType,
  Siswa,
  Kelas,
  WaliKelas
} from '../../types';
import { PageHeader, StatCard } from '../common/UIComponents';
import { Pagination } from '../Pagination';
import {
  getTodayString,
  formatDateIndo,
  getIndonesianDayName,
  cleanMapelName,
  addAuditLog,
  normalizeWeeklyShiftPeriods,
  determineKelasKelompok
} from '../../utils/helpers';

// Helper to calculate weekly date range (Monday - Saturday)
function getWeekRangeForDate(dStr: string) {
  const parts = dStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2] || 1);
  const day = d.getDay(); // 0 Sun, 1 Mon ... 6 Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMon);
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const formatIso = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayN = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayN}`;
  };

  const start = formatIso(monday);
  const end = formatIso(saturday);
  const label = `${formatDateIndo(start)} - ${formatDateIndo(end)}`;
  return { start, end, label };
}

interface PresensiKbmGuruViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onOpenModal: (title: string, content: React.ReactNode) => void;
  onCloseModal: () => void;
  onConfirmModal: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
}

export const PresensiKbmGuruView: React.FC<PresensiKbmGuruViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onOpenModal,
  onCloseModal,
  onConfirmModal,
  onShowToast,
  onNavigateView
}) => {
  // Navigation tabs:
  // 1. 'mengabsen': Form Presensi Mandiri Guru per Sesi Jadwal Kelas (Default)
  // 2. 'riwayat_mandiri_guru': Rekap Absensi per Guru dengan Pilihan Guru
  // 3. 'rekap_semua_guru': Monitoring Rekap Semua Guru (Admin / Kurikulum)
  const [activeTab, setActiveTab] = useState<'mengabsen' | 'riwayat_mandiri_guru' | 'rekap_semua_guru'>('mengabsen');

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedGuruUsername, setSelectedGuruUsername] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterKelasId, setFilterKelasId] = useState<string>('all');
  
  // Filter Rekap Periode: 'semua' (Semua dari Awal), 'minggu' (Per Minggu), 'bulan' (Per Bulan)
  const [rekapPeriodMode, setRekapPeriodMode] = useState<'semua' | 'minggu' | 'bulan'>('semua');
  const [selectedWeekRange, setSelectedWeekRange] = useState<string>(''); // 'YYYY-MM-DD_YYYY-MM-DD'
  const [filterMonth, setFilterMonth] = useState<string>(getTodayString().slice(0, 7)); // 'YYYY-MM'
  const [filterShiftRotation, setFilterShiftRotation] = useState<'aktif' | 'semua'>('aktif');

  // Rekap Absensi Sub-view: 'siswa' (Format Rekap Siswa Umum) vs 'sesi' (Log Rincian Sesi Mengajar)
  const [rekapSubView, setRekapSubView] = useState<'siswa' | 'sesi'>('siswa');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('all');
  const [studentPage, setStudentPage] = useState<number>(1);
  const [studentPageSize, setStudentPageSize] = useState<number>(25);

  // Modal & Interactive states
  const [activeSession, setActiveSession] = useState<{
    jadwal: JadwalMengajarGuru;
    existingLog?: AbsensiMengajarGuruItem;
  } | null>(null);

  const [materiAjar, setMateriAjar] = useState<string>('');
  const [catatanGuru, setCatatanGuru] = useState<string>('');
  const [searchSiswaModal, setSearchSiswaModal] = useState<string>('');
  const [presensiSiswaMap, setPresensiSiswaMap] = useState<
    Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }>
  >({});

  const [detailLog, setDetailLog] = useState<AbsensiMengajarGuruItem | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<{
    siswa: Siswa;
    kelasNama: string;
    sessions: {
      logId: string;
      tanggal: string;
      hari: string;
      jamPelajaran: string;
      mataPelajaran: string;
      materiAjar: string;
      status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | '-';
      catatan: string;
    }[];
  } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printSubView, setPrintSubView] = useState<'siswa' | 'sesi'>('siswa');
  const [isAdminManualModalOpen, setIsAdminManualModalOpen] = useState<boolean>(false);

  // Admin Manual Entry Form State
  const [adminManualForm, setAdminManualForm] = useState({
    guruUsername: '',
    guruNama: '',
    tanggal: getTodayString(),
    kelasId: '',
    mataPelajaran: '',
    jamPelajaran: 'Jam ke-1 & 2 (07:30 - 09:00)',
    materiAjar: '',
    catatanGuru: ''
  });

  // User details & Roles
  const loggedUsername = (currentUser.data as any)?.username || (currentUser.data as any)?.nama || '';
  const loggedNama = (currentUser.data as any)?.nama || '';

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  const isKurikulum = currentUser.role === 'kurikulum' || (currentUser.roles || []).includes('kurikulum');
  const isPiket = currentUser.role === 'guru_piket' || (currentUser.roles || []).includes('guru_piket');
  const isAdminOrStaff = isAdmin || isKurikulum || isPiket;
  const isTeacher = currentUser.role === 'guru';

  // List of all teachers
  const listGuru = useMemo(() => {
    return (appData.waliKelas || []).filter((w) => w.nama);
  }, [appData.waliKelas]);

  // Determine current active teacher
  useEffect(() => {
    if (selectedGuruUsername) return;

    // If logged in user is a teacher
    const loggedTeacher = listGuru.find(
      (g) => g.username?.toLowerCase() === loggedUsername?.toLowerCase() || g.nama === loggedNama
    );

    if (loggedTeacher) {
      setSelectedGuruUsername(loggedTeacher.username || loggedTeacher.nama);
    } else if (listGuru.length > 0) {
      setSelectedGuruUsername(listGuru[0].username || listGuru[0].nama);
    }
  }, [currentUser, listGuru, selectedGuruUsername, loggedUsername, loggedNama]);

  // Selected teacher object
  const currentGuru = useMemo(() => {
    return (
      listGuru.find(
        (g) =>
          g.username?.toLowerCase() === selectedGuruUsername?.toLowerCase() ||
          g.nama === selectedGuruUsername
      ) || listGuru[0]
    );
  }, [listGuru, selectedGuruUsername]);

  // Selected Day Name (e.g. 'Senin')
  const selectedDayName = useMemo(() => {
    return getIndonesianDayName(selectedDate);
  }, [selectedDate]);

  // Normalize weekly shift rotation periods from shiftConfig
  const shiftPeriods = useMemo(() => {
    return normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
  }, [appData.shiftConfig?.periods]);

  const targetDateStr = selectedDate ? selectedDate.slice(0, 10) : getTodayString();

  const currentPeriod = useMemo(() => {
    return (
      shiftPeriods.find((p) => {
        const sStr = p.startDate.slice(0, 10);
        const eStr = p.endDate.slice(0, 10);
        return targetDateStr >= sStr && targetDateStr <= eStr;
      }) || shiftPeriods[0]
    );
  }, [shiftPeriods, targetDateStr]);

  const k1Type = (currentPeriod?.kelompok1Type || 'pagi').toLowerCase() as 'pagi' | 'siang';
  const k2Type = (currentPeriod?.kelompok2Type || 'siang').toLowerCase() as 'pagi' | 'siang';

  // Helper to determine shift rotation metadata for a schedule
  const getScheduleShiftInfo = (j: JadwalMengajarGuru) => {
    const targetK = (appData.kelas || []).find(
      (k) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
    );
    const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || 'Kelas';
    const kelompok = determineKelasKelompok(kelasNamaDisplay);
    const activeShiftForKelompok = (kelompok === 1 ? k1Type : k2Type).toLowerCase().trim();
    const itemShift = String(j.shift || 'Pagi').toLowerCase().trim();
    const isActiveRotation = itemShift === activeShiftForKelompok;

    return {
      kelompok,
      activeShiftForKelompok,
      itemShift,
      isActiveRotation,
      kelasNamaDisplay
    };
  };

  // All Teacher's Schedules for the selected day (raw)
  const allTeacherSchedulesForDay = useMemo(() => {
    if (!currentGuru) return [];

    const allJadwal = appData.jadwalMengajar || [];
    const matched = allJadwal.filter((j) => {
      const matchTeacher =
        (j.guruUsername && j.guruUsername.toLowerCase() === currentGuru.username?.toLowerCase()) ||
        (j.guruNama && j.guruNama.toLowerCase() === currentGuru.nama?.toLowerCase()) ||
        (j.guruId && j.guruId === currentGuru.id);

      const matchHari = j.hari?.toLowerCase() === selectedDayName?.toLowerCase();
      return matchTeacher && matchHari;
    });

    // Sort by shift (Pagi first, then Siang) and then jam ke
    return matched.sort((a, b) => {
      const shiftA = (a.shift || 'Pagi').toLowerCase() === 'siang' ? 2 : 1;
      const shiftB = (b.shift || 'Pagi').toLowerCase() === 'siang' ? 2 : 1;
      if (shiftA !== shiftB) return shiftA - shiftB;
      const jamA = Array.isArray(a.jamKe) ? a.jamKe[0] : Number(a.jamKe || 0);
      const jamB = Array.isArray(b.jamKe) ? b.jamKe[0] : Number(b.jamKe || 0);
      return jamA - jamB;
    });
  }, [appData.jadwalMengajar, currentGuru, selectedDayName]);

  // Teacher's Schedule for the selected day (filtered by active weekly shift rotation by default)
  const teacherSchedules = useMemo(() => {
    if (filterShiftRotation === 'semua') {
      return allTeacherSchedulesForDay;
    }

    // Default 'aktif': only show schedules matching the weekly shift rotation for this class
    return allTeacherSchedulesForDay.filter((j) => {
      const info = getScheduleShiftInfo(j);
      return info.isActiveRotation;
    });
  }, [allTeacherSchedulesForDay, filterShiftRotation, k1Type, k2Type, appData.kelas]);

  // Saved Logs for selected date
  const logsForSelectedDate = useMemo(() => {
    const allLogs = appData.presensiMengajarGuru || [];
    return allLogs.filter((l) => l.tanggal === selectedDate);
  }, [appData.presensiMengajarGuru, selectedDate]);

  // Check existing log for a specific schedule
  const getLogForSchedule = (jadwal: JadwalMengajarGuru) => {
    return logsForSelectedDate.find((l) => {
      if (l.jadwalId && l.jadwalId === jadwal.id) return true;
      return (
        l.kelasId === jadwal.kelasId &&
        (l.mataPelajaran === jadwal.mataPelajaran || cleanMapelName(l.mataPelajaran) === cleanMapelName(jadwal.mataPelajaran))
      );
    });
  };

  // ----------------------------------------------------
  // DEDICATED PER-TEACHER LOGS & STATISTICS (FOR TAB 2)
  // ----------------------------------------------------
  const teacherSpecificLogs = useMemo(() => {
    if (!currentGuru) return [];
    const allLogs = appData.presensiMengajarGuru || [];

    return allLogs.filter((l) => {
      const matchUsername =
        currentGuru.username &&
        l.guruUsername &&
        l.guruUsername.toLowerCase() === currentGuru.username.toLowerCase();
      const matchNama =
        currentGuru.nama &&
        l.guruNama &&
        l.guruNama.toLowerCase() === currentGuru.nama.toLowerCase();

      return matchUsername || matchNama;
    });
  }, [appData.presensiMengajarGuru, currentGuru]);

  // Available weeks calculated from logs and current date
  const availableWeeks = useMemo(() => {
    const weeksMap = new Map<string, { start: string; end: string; label: string }>();

    // Current week
    const curW = getWeekRangeForDate(getTodayString());
    weeksMap.set(`${curW.start}_${curW.end}`, {
      start: curW.start,
      end: curW.end,
      label: `Minggu Ini (${curW.label})`
    });

    const allLogs = appData.presensiMengajarGuru || [];
    allLogs.forEach((l) => {
      if (l.tanggal) {
        const w = getWeekRangeForDate(l.tanggal);
        const key = `${w.start}_${w.end}`;
        if (!weeksMap.has(key)) {
          weeksMap.set(key, {
            start: w.start,
            end: w.end,
            label: `Minggu ${w.label}`
          });
        }
      }
    });

    return Array.from(weeksMap.entries())
      .map(([key, item]) => ({ key, ...item }))
      .sort((a, b) => b.start.localeCompare(a.start));
  }, [appData.presensiMengajarGuru]);

  // Set default selectedWeekRange if empty
  useEffect(() => {
    if (!selectedWeekRange && availableWeeks.length > 0) {
      setSelectedWeekRange(availableWeeks[0].key);
    }
  }, [availableWeeks, selectedWeekRange]);

  // Available months calculated from logs and current date
  const availableMonths = useMemo(() => {
    const setMonths = new Set<string>();
    setMonths.add(getTodayString().slice(0, 7));

    const allLogs = appData.presensiMengajarGuru || [];
    allLogs.forEach((l) => {
      if (l.tanggal && l.tanggal.length >= 7) {
        setMonths.add(l.tanggal.slice(0, 7));
      }
    });

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    return Array.from(setMonths)
      .sort()
      .reverse()
      .map((m) => {
        const [y, mNum] = m.split('-').map(Number);
        return {
          value: m,
          label: `${monthNames[mNum - 1] || m} ${y}`
        };
      });
  }, [appData.presensiMengajarGuru]);

  // Helper to test if a date matches the active period filter mode
  const matchesPeriodFilter = (tanggal: string) => {
    if (!tanggal) return false;
    if (rekapPeriodMode === 'semua') return true;

    if (rekapPeriodMode === 'bulan') {
      return tanggal.startsWith(filterMonth);
    }

    if (rekapPeriodMode === 'minggu') {
      const activeW = availableWeeks.find((w) => w.key === selectedWeekRange) || availableWeeks[0];
      if (activeW) {
        return tanggal >= activeW.start && tanggal <= activeW.end;
      }
      return true;
    }

    return true;
  };

  // Active Period Display Label
  const activePeriodLabel = useMemo(() => {
    if (rekapPeriodMode === 'semua') return 'Semua dari Awal';
    if (rekapPeriodMode === 'minggu') {
      const activeW = availableWeeks.find((w) => w.key === selectedWeekRange) || availableWeeks[0];
      return activeW ? activeW.label : 'Per Minggu';
    }
    if (rekapPeriodMode === 'bulan') {
      const activeM = availableMonths.find((m) => m.value === filterMonth);
      return activeM ? activeM.label : `Bulan ${filterMonth}`;
    }
    return 'Semua';
  }, [rekapPeriodMode, selectedWeekRange, availableWeeks, filterMonth, availableMonths]);

  // Filtered dedicated teacher logs by search, kelas, and period
  const filteredTeacherLogs = useMemo(() => {
    let list = [...teacherSpecificLogs];

    if (filterKelasId !== 'all') {
      list = list.filter((l) => l.kelasId === filterKelasId);
    }

    list = list.filter((l) => matchesPeriodFilter(l.tanggal));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.kelasNama?.toLowerCase().includes(q) ||
          l.mataPelajaran?.toLowerCase().includes(q) ||
          l.materiAjar?.toLowerCase().includes(q) ||
          l.tanggal?.includes(q) ||
          l.hari?.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt || b.tanggal).getTime() - new Date(a.createdAt || a.tanggal).getTime());
  }, [teacherSpecificLogs, filterKelasId, rekapPeriodMode, filterMonth, selectedWeekRange, availableWeeks, searchQuery]);

  // List of all classes taught by this teacher (or all classes if none specific)
  const teacherClasses = useMemo(() => {
    const classIdSet = new Set<string>();
    (appData.jadwalMengajar || []).forEach((j) => {
      const u = (j.guruUsername || j.guruNama || '').toLowerCase();
      const curr = (currentGuru?.username || currentGuru?.nama || '').toLowerCase();
      if (u === curr) {
        classIdSet.add(j.kelasId);
      }
    });
    filteredTeacherLogs.forEach((l) => {
      if (l.kelasId) classIdSet.add(l.kelasId);
    });

    if (classIdSet.size === 0) {
      return appData.kelas || [];
    }

    return (appData.kelas || []).filter((k) => classIdSet.has(k.id));
  }, [appData.jadwalMengajar, appData.kelas, currentGuru, filteredTeacherLogs]);

  // Summary statistics for the teacher's filtered logs in the active period
  const teacherPeriodStats = useMemo(() => {
    const totalSesi = filteredTeacherLogs.length;
    let totalJp = 0;
    let totalSiswa = 0;
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;
    let totalTerlambat = 0;
    let totalDispensasi = 0;

    filteredTeacherLogs.forEach((l) => {
      const match = l.jamPelajaran?.match(/\d+/g);
      if (match && match.length >= 2 && l.jamPelajaran?.includes('&')) {
        totalJp += 2;
      } else if (match && match.length > 0) {
        totalJp += 2;
      } else {
        totalJp += 2;
      }

      (l.presensiSiswa || []).forEach((ps) => {
        totalSiswa++;
        if (ps.status === 'H') totalHadir++;
        else if (ps.status === 'S') totalSakit++;
        else if (ps.status === 'I') totalIzin++;
        else if (ps.status === 'A') totalAlpha++;
        else if (ps.status === 'T' || ps.status === 'K') totalTerlambat++;
        else if (ps.status === 'D') totalDispensasi++;
      });
    });

    const pctHadir = totalSiswa > 0 ? Math.round((totalHadir / totalSiswa) * 100) : 100;
    return {
      totalSesi,
      totalJp,
      totalSiswa,
      pctHadir,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpha,
      totalTerlambat,
      totalDispensasi
    };
  }, [filteredTeacherLogs]);

  // Cumulative student attendance in sessions taught by this teacher (Format Rekap Sekolah)
  const teacherStudentStats = useMemo(() => {
    let baseStudents: Siswa[] = [];
    if (filterKelasId !== 'all') {
      baseStudents = (appData.siswa || []).filter(
        (s) => s.kelasId === filterKelasId && s.status !== 'tidak_aktif'
      );
    } else {
      const targetClassIds = new Set(teacherClasses.map((k) => k.id));
      if (targetClassIds.size > 0) {
        baseStudents = (appData.siswa || []).filter(
          (s) => targetClassIds.has(s.kelasId) && s.status !== 'tidak_aktif'
        );
      } else {
        baseStudents = (appData.siswa || []).filter((s) => s.status !== 'tidak_aktif');
      }
    }

    const map = new Map<
      string,
      {
        siswa: Siswa;
        kelasNama: string;
        totalSesi: number;
        hadir: number;
        sakit: number;
        izin: number;
        alfa: number;
        terlambat: number;
        dispensasi: number;
        totalTidakHadir: number;
        rate: number;
      }
    >();

    baseStudents.forEach((s) => {
      const k = (appData.kelas || []).find((c) => c.id === s.kelasId);
      map.set(s.id, {
        siswa: s,
        kelasNama: k?.nama || '-',
        totalSesi: 0,
        hadir: 0,
        sakit: 0,
        izin: 0,
        alfa: 0,
        terlambat: 0,
        dispensasi: 0,
        totalTidakHadir: 0,
        rate: 100
      });
    });

    filteredTeacherLogs.forEach((log) => {
      if (!Array.isArray(log.presensiSiswa)) return;
      log.presensiSiswa.forEach((ps) => {
        let item = map.get(ps.siswaId);
        if (!item) {
          const sObj = (appData.siswa || []).find((s) => s.id === ps.siswaId);
          if (sObj) {
            const k = (appData.kelas || []).find((c) => c.id === sObj.kelasId);
            item = {
              siswa: sObj,
              kelasNama: log.kelasNama || k?.nama || '-',
              totalSesi: 0,
              hadir: 0,
              sakit: 0,
              izin: 0,
              alfa: 0,
              terlambat: 0,
              dispensasi: 0,
              totalTidakHadir: 0,
              rate: 100
            };
            map.set(ps.siswaId, item);
          } else {
            return;
          }
        }

        item.totalSesi += 1;
        const st = ps.status;
        if (st === 'H') item.hadir += 1;
        else if (st === 'S') item.sakit += 1;
        else if (st === 'I') item.izin += 1;
        else if (st === 'A') item.alfa += 1;
        else if (st === 'T' || st === 'K') item.terlambat += 1;
        else if (st === 'D') item.dispensasi += 1;
      });
    });

    const result = Array.from(map.values()).map((entry) => {
      const totalTidakHadir = entry.sakit + entry.izin + entry.alfa;
      const rate = entry.totalSesi > 0 ? Math.round((entry.hadir / entry.totalSesi) * 100) : 100;
      return {
        ...entry,
        totalTidakHadir,
        rate
      };
    });

    return result.sort((a, b) => {
      const kCompare = a.kelasNama.localeCompare(b.kelasNama);
      if (kCompare !== 0) return kCompare;
      return a.siswa.nama.localeCompare(b.siswa.nama);
    });
  }, [appData.siswa, appData.kelas, filterKelasId, teacherClasses, filteredTeacherLogs]);

  // Filtered students by status filter and search query
  const filteredStudentStats = useMemo(() => {
    let list = [...teacherStudentStats];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.siswa.nama.toLowerCase().includes(q) ||
          (item.siswa.nisn || '').includes(q) ||
          item.kelasNama.toLowerCase().includes(q)
      );
    }

    if (studentStatusFilter === 'absent_only') {
      list = list.filter((item) => item.totalTidakHadir > 0);
    } else if (studentStatusFilter === 'S') {
      list = list.filter((item) => item.sakit > 0);
    } else if (studentStatusFilter === 'I') {
      list = list.filter((item) => item.izin > 0);
    } else if (studentStatusFilter === 'A') {
      list = list.filter((item) => item.alfa > 0);
    } else if (studentStatusFilter === 'K') {
      list = list.filter((item) => item.terlambat > 0);
    } else if (studentStatusFilter === 'D') {
      list = list.filter((item) => item.dispensasi > 0);
    }

    return list;
  }, [teacherStudentStats, searchQuery, studentStatusFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setStudentPage(1);
  }, [filterKelasId, rekapPeriodMode, selectedWeekRange, filterMonth, searchQuery, studentStatusFilter, selectedGuruUsername]);

  const totalStudentPages = Math.max(1, Math.ceil(filteredStudentStats.length / studentPageSize));
  const paginatedStudentStats = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudentStats.slice(start, start + studentPageSize);
  }, [filteredStudentStats, studentPage, studentPageSize]);

  // Filter counts for student status pills
  const studentFilterCounts = useMemo(() => {
    let total = teacherStudentStats.length;
    let absent = 0;
    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let terlambat = 0;

    teacherStudentStats.forEach((s) => {
      if (s.totalTidakHadir > 0) absent++;
      if (s.sakit > 0) sakit++;
      if (s.izin > 0) izin++;
      if (s.alfa > 0) alfa++;
      if (s.terlambat > 0) terlambat++;
    });

    return { total, absent, sakit, izin, alfa, terlambat };
  }, [teacherStudentStats]);

  // Average student attendance rate for currently filtered students
  const averageStudentAttendanceRate = useMemo(() => {
    if (filteredStudentStats.length === 0) return 100;
    const sum = filteredStudentStats.reduce((acc, curr) => acc + curr.rate, 0);
    return Math.round(sum / filteredStudentStats.length);
  }, [filteredStudentStats]);

  // Handler to open student session attendance history modal
  const handleOpenStudentHistory = (siswa: Siswa, kelasNama: string) => {
    const studentLogs = filteredTeacherLogs
      .filter((log) => log.kelasId === siswa.kelasId || log.kelasNama === kelasNama)
      .map((log) => {
        const ps = (log.presensiSiswa || []).find((p) => p.siswaId === siswa.id);
        return {
          logId: log.id,
          tanggal: log.tanggal,
          hari: log.hari,
          jamPelajaran: log.jamPelajaran || '-',
          mataPelajaran: log.mataPelajaran,
          materiAjar: log.materiAjar || '-',
          status: (ps?.status || '-') as any,
          catatan: ps?.catatan || log.catatanGuru || '-'
        };
      })
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    setSelectedStudentDetail({
      siswa,
      kelasNama,
      sessions: studentLogs
    });
  };

  // ----------------------------------------------------
  // GLOBAL LOGS FOR ADMIN MONITORING (TAB 3)
  // ----------------------------------------------------
  const filteredGlobalLogs = useMemo(() => {
    let list = appData.presensiMengajarGuru || [];

    if (filterKelasId !== 'all') {
      list = list.filter((l) => l.kelasId === filterKelasId);
    }

    list = list.filter((l) => matchesPeriodFilter(l.tanggal));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.guruNama?.toLowerCase().includes(q) ||
          l.kelasNama?.toLowerCase().includes(q) ||
          l.mataPelajaran?.toLowerCase().includes(q) ||
          l.materiAjar?.toLowerCase().includes(q) ||
          l.tanggal?.includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt || b.tanggal).getTime() - new Date(a.createdAt || a.tanggal).getTime());
  }, [appData.presensiMengajarGuru, filterKelasId, rekapPeriodMode, filterMonth, selectedWeekRange, availableWeeks, searchQuery]);

  // Open Presensi KBM Form for a schedule
  const handleOpenAbsenSession = (jadwal: JadwalMengajarGuru) => {
    const existing = getLogForSchedule(jadwal);
    setActiveSession({ jadwal, existingLog: existing });

    // Find students for this class
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === jadwal.kelasId && s.status !== 'tidak_aktif');

    // Key in main school attendance map: YYYY-MM-DD_kelasId
    const mainPresensiKey = `${selectedDate}_${jadwal.kelasId}`;
    const mainPresensiList = appData.presensi?.[mainPresensiKey] || [];

    const initialMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }> = {};

    siswaInKelas.forEach((s) => {
      // If there is an existing KBM log
      const existingStudentLog = existing?.presensiSiswa?.find((ps) => ps.siswaId === s.id);
      if (existingStudentLog) {
        initialMap[s.id] = {
          status: existingStudentLog.status || '',
          catatan: existingStudentLog.catatan || ''
        };
      } else {
        // Fallback to main daily attendance if present
        const mainItem = mainPresensiList.find((p) => p.siswaId === s.id);
        let defaultStatus: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | '' = '';

        if (mainItem?.status) {
          if (['H', 'S', 'I', 'A', 'T', 'K', 'D'].includes(mainItem.status)) {
            defaultStatus = mainItem.status as any;
          }
        }

        initialMap[s.id] = {
          status: defaultStatus,
          catatan: mainItem?.catatan || ''
        };
      }
    });

    setPresensiSiswaMap(initialMap);
    setMateriAjar(existing?.materiAjar || '');
    setCatatanGuru(existing?.catatanGuru || '');
    setSearchSiswaModal('');
  };

  // Filtered siswa di dalam modal absen sesi KBM berdasarkan pencarian
  const filteredModalSiswa = useMemo(() => {
    if (!activeSession) return [];
    const list = (appData.siswa || []).filter(
      (s) => s.kelasId === activeSession.jadwal.kelasId && s.status !== 'tidak_aktif'
    );
    if (!searchSiswaModal.trim()) return list;
    const q = searchSiswaModal.toLowerCase().trim();
    return list.filter(
      (s) => s.nama.toLowerCase().includes(q) || (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [appData.siswa, activeSession, searchSiswaModal]);

  // Bulk action: Set all students status in form
  const handleSetAllStatus = (status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D') => {
    setPresensiSiswaMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        next[sId] = { ...next[sId], status };
      });
      return next;
    });
  };

  // Bulk action: Match daily main attendance
  const handleSyncWithMainDailyPresensi = () => {
    if (!activeSession) return;

    const mainPresensiKey = `${selectedDate}_${activeSession.jadwal.kelasId}`;
    const mainPresensiList = appData.presensi?.[mainPresensiKey] || [];

    setPresensiSiswaMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((sId) => {
        const mainItem = mainPresensiList.find((p) => p.siswaId === sId);
        if (mainItem?.status && ['H', 'S', 'I', 'A', 'T', 'K', 'D'].includes(mainItem.status)) {
          next[sId] = {
            ...next[sId],
            status: mainItem.status as any,
            catatan: mainItem.catatan || next[sId]?.catatan || ''
          };
        }
      });
      return next;
    });

    onShowToast('Presensi KBM disesuaikan dengan Presensi Harian Sekolah!', 'info');
  };

  // Save Presensi KBM Kelas
  const handleSavePresensiKbm = () => {
    if (!activeSession || !currentGuru) return;

    const { jadwal, existingLog } = activeSession;
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === jadwal.kelasId && s.status !== 'tidak_aktif');

    const presensiSiswaList: SiswaPresensiSesiGuru[] = siswaInKelas.map((s) => ({
      siswaId: s.id,
      siswaNama: s.nama,
      status: (presensiSiswaMap[s.id]?.status || '') as any,
      catatan: presensiSiswaMap[s.id]?.catatan || ''
    }));

    const jamPelajaranStr = Array.isArray(jadwal.jamKe)
      ? `Jam ke-${jadwal.jamKe.join(', ')} (${jadwal.jamMulai || ''} - ${jadwal.jamSelesai || ''})`
      : `Jam ke-${jadwal.jamKe || 1} (${jadwal.jamMulai || ''} - ${jadwal.jamSelesai || ''})`;

    const newLogItem: AbsensiMengajarGuruItem = {
      id: existingLog?.id || `pmg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      jadwalId: jadwal.id,
      guruUsername: currentGuru.username || currentGuru.nama,
      guruNama: currentGuru.nama,
      tanggal: selectedDate,
      hari: selectedDayName,
      kelasId: jadwal.kelasId,
      kelasNama: jadwal.kelasNama,
      mataPelajaran: jadwal.mataPelajaran,
      materiAjar: materiAjar.trim(),
      jamPelajaran: jamPelajaranStr,
      presensiSiswa: presensiSiswaList,
      catatanGuru: catatanGuru.trim(),
      createdAt: existingLog?.createdAt || new Date().toISOString()
    };

    const currentPmg = appData.presensiMengajarGuru || [];
    const filteredPmg = currentPmg.filter((l) => l.id !== newLogItem.id);
    const updatedPmg = [newLogItem, ...filteredPmg];

    let updatedAppData: AppData = {
      ...appData,
      presensiMengajarGuru: updatedPmg
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Absen KBM Guru',
      `Menyimpan presensi KBM kelas ${jadwal.kelasNama} - ${jadwal.mataPelajaran} (${formatDateIndo(selectedDate)})`
    );

    onUpdateAppData(updatedAppData);
    setActiveSession(null);
    onShowToast(`Presensi KBM Kelas ${jadwal.kelasNama} berhasil disimpan ke tabel mandiri guru!`, 'success');
  };

  // Open Admin Manual Entry Form
  const handleOpenAdminManualModal = () => {
    const firstGuru = currentGuru || listGuru[0];
    const firstKelas = (appData.kelas || [])[0];

    setAdminManualForm({
      guruUsername: firstGuru?.username || firstGuru?.nama || '',
      guruNama: firstGuru?.nama || '',
      tanggal: getTodayString(),
      kelasId: firstKelas?.id || '',
      mataPelajaran: firstGuru?.mataPelajaran || 'Mata Pelajaran',
      jamPelajaran: 'Jam ke-1 & 2 (07:30 - 09:00)',
      materiAjar: '',
      catatanGuru: ''
    });

    // Populate students for first class
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === firstKelas?.id && s.status !== 'tidak_aktif');
    const initialMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }> = {};
    siswaInKelas.forEach((s) => {
      initialMap[s.id] = { status: '', catatan: '' };
    });
    setPresensiSiswaMap(initialMap);

    setIsAdminManualModalOpen(true);
  };

  // Admin Manual Class Change handler
  const handleAdminClassChange = (newKelasId: string) => {
    setAdminManualForm((prev) => ({ ...prev, kelasId: newKelasId }));
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === newKelasId && s.status !== 'tidak_aktif');
    const initialMap: Record<string, { status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; catatan: string }> = {};
    siswaInKelas.forEach((s) => {
      initialMap[s.id] = { status: '', catatan: '' };
    });
    setPresensiSiswaMap(initialMap);
  };

  // Save Admin Manual Entry
  const handleSaveAdminManualEntry = () => {
    if (!adminManualForm.guruNama || !adminManualForm.kelasId) {
      onShowToast('Mohon lengkapi guru dan kelas terlebih dahulu!', 'warning');
      return;
    }

    const selectedTargetGuru = listGuru.find(
      (g) => g.username === adminManualForm.guruUsername || g.nama === adminManualForm.guruNama
    );
    const targetKelas = (appData.kelas || []).find((k) => k.id === adminManualForm.kelasId);
    const siswaInKelas = (appData.siswa || []).filter((s) => s.kelasId === adminManualForm.kelasId && s.status !== 'tidak_aktif');

    const presensiSiswaList: SiswaPresensiSesiGuru[] = siswaInKelas.map((s) => ({
      siswaId: s.id,
      siswaNama: s.nama,
      status: (presensiSiswaMap[s.id]?.status || '') as any,
      catatan: presensiSiswaMap[s.id]?.catatan || ''
    }));

    const dayName = getIndonesianDayName(adminManualForm.tanggal);

    const newLogItem: AbsensiMengajarGuruItem = {
      id: `pmg-adm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      jadwalId: `manual-${Date.now()}`,
      guruUsername: selectedTargetGuru?.username || adminManualForm.guruUsername,
      guruNama: selectedTargetGuru?.nama || adminManualForm.guruNama,
      tanggal: adminManualForm.tanggal,
      hari: dayName,
      kelasId: adminManualForm.kelasId,
      kelasNama: targetKelas?.nama || adminManualForm.kelasId,
      mataPelajaran: adminManualForm.mataPelajaran || 'Mata Pelajaran',
      materiAjar: adminManualForm.materiAjar.trim() || 'Pembelajaran tatap muka / KBM mandiri',
      jamPelajaran: adminManualForm.jamPelajaran || 'Jam ke-1 & 2',
      presensiSiswa: presensiSiswaList,
      catatanGuru: `${adminManualForm.catatanGuru.trim()} (Diinput oleh Admin: ${loggedUsername || 'Admin'})`,
      createdAt: new Date().toISOString()
    };

    const currentPmg = appData.presensiMengajarGuru || [];
    const updatedPmg = [newLogItem, ...currentPmg];

    let updatedAppData: AppData = {
      ...appData,
      presensiMengajarGuru: updatedPmg
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Input Manual Absen Guru (Admin)',
      `Admin ${loggedUsername || 'Admin'} menginput sesi mengajar untuk ${newLogItem.guruNama} di kelas ${newLogItem.kelasNama}`
    );

    onUpdateAppData(updatedAppData);
    setIsAdminManualModalOpen(false);
    onShowToast(`Sesi presensi guru ${newLogItem.guruNama} berhasil dicatat oleh Admin!`, 'success');
  };

  // Delete a KBM Log
  const handleDeleteLog = (logId: string) => {
    onConfirmModal(
      'Hapus Log KBM Guru',
      'Apakah Anda yakin ingin menghapus data presensi KBM ini? Tindakan ini tidak dapat dibatalkan.',
      'danger',
      () => {
        const currentPmg = appData.presensiMengajarGuru || [];
        const updatedPmg = currentPmg.filter((l) => l.id !== logId);

        let updatedAppData: AppData = {
          ...appData,
          presensiMengajarGuru: updatedPmg
        };

        updatedAppData = addAuditLog(
          updatedAppData,
          'Hapus Log KBM Guru',
          `Menghapus data presensi KBM ID ${logId}`
        );

        onUpdateAppData(updatedAppData);
        onShowToast('Data log presensi KBM berhasil dihapus.', 'info');
      }
    );
  };

  // Export Dedicated Single Teacher Records to Excel (Rekap Siswa & Log Sesi)
  const handleExportTeacherExcel = () => {
    if (filteredTeacherLogs.length === 0 && teacherStudentStats.length === 0) {
      onShowToast('Tidak ada data rekap untuk diexport!', 'warning');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Rekap Akumulasi Siswa (Format Rekap Sekolah)
    if (teacherStudentStats.length > 0) {
      const studentRows = teacherStudentStats.map((item, index) => ({
        No: index + 1,
        NISN: item.siswa.nisn || '-',
        'Nama Siswa': item.siswa.nama,
        Kelas: item.kelasNama,
        'Total Pertemuan': item.totalSesi,
        Hadir: item.hadir,
        Izin: item.izin,
        Sakit: item.sakit,
        Alpa: item.alfa,
        Kesiangan: item.terlambat,
        Dispensasi: item.dispensasi,
        'Total Tidak Hadir': item.totalTidakHadir,
        '% Kehadiran': `${item.rate}%`
      }));
      const worksheetSiswa = XLSX.utils.json_to_sheet(studentRows);
      XLSX.utils.book_append_sheet(workbook, worksheetSiswa, 'Rekap Siswa');
    }

    // Sheet 2: Log Sesi Mengajar
    if (filteredTeacherLogs.length > 0) {
      const sessionRows = filteredTeacherLogs.map((l, index) => {
        const totalSiswa = l.presensiSiswa?.length || 0;
        const hadirCount = l.presensiSiswa?.filter((ps) => ps.status === 'H').length || 0;
        const sakitCount = l.presensiSiswa?.filter((ps) => ps.status === 'S').length || 0;
        const izinCount = l.presensiSiswa?.filter((ps) => ps.status === 'I').length || 0;
        const alphaCount = l.presensiSiswa?.filter((ps) => ps.status === 'A').length || 0;
        const terlambatCount = l.presensiSiswa?.filter((ps) => ps.status === 'T' || ps.status === 'K').length || 0;
        const dispensasiCount = l.presensiSiswa?.filter((ps) => ps.status === 'D').length || 0;
        const pctHadir = totalSiswa > 0 ? `${Math.round((hadirCount / totalSiswa) * 100)}%` : '100%';

        return {
          No: index + 1,
          Tanggal: l.tanggal,
          Hari: l.hari,
          'Jam Pelajaran': l.jamPelajaran || '-',
          Guru: l.guruNama,
          Kelas: l.kelasNama,
          'Mata Pelajaran': l.mataPelajaran,
          'Total Siswa': totalSiswa,
          Hadir: hadirCount,
          Sakit: sakitCount,
          Izin: izinCount,
          Alpa: alphaCount,
          Terlambat: terlambatCount,
          Dispensasi: dispensasiCount,
          '% Kehadiran': pctHadir,
          'Catatan Guru': l.catatanGuru || '-'
        };
      });
      const worksheetSesi = XLSX.utils.json_to_sheet(sessionRows);
      XLSX.utils.book_append_sheet(workbook, worksheetSesi, 'Log Sesi Mengajar');
    }

    const periodSlug = activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(
      workbook,
      `Rekap_Absensi_${(currentGuru?.nama || 'Guru').replace(/\s+/g, '_')}_${periodSlug}_${getTodayString()}.xlsx`
    );

    onShowToast(`File Excel Rekap Absensi (${activePeriodLabel}) ${currentGuru?.nama} berhasil didownload!`, 'success');
  };

  // Export Global Riwayat to Excel (All Teachers)
  const handleExportGlobalExcel = () => {
    if (filteredGlobalLogs.length === 0) {
      onShowToast('Tidak ada data untuk diexport!', 'warning');
      return;
    }

    const exportRows = filteredGlobalLogs.map((l, index) => {
      const totalSiswa = l.presensiSiswa?.length || 0;
      const hadirCount = l.presensiSiswa?.filter((ps) => ps.status === 'H').length || 0;
      const sakitCount = l.presensiSiswa?.filter((ps) => ps.status === 'S').length || 0;
      const izinCount = l.presensiSiswa?.filter((ps) => ps.status === 'I').length || 0;
      const alphaCount = l.presensiSiswa?.filter((ps) => ps.status === 'A').length || 0;
      const terlambatCount = l.presensiSiswa?.filter((ps) => ps.status === 'T' || ps.status === 'K').length || 0;

      return {
        No: index + 1,
        Tanggal: l.tanggal,
        Hari: l.hari,
        Jam: l.jamPelajaran || '-',
        Guru: l.guruNama,
        Kelas: l.kelasNama,
        'Mata Pelajaran': l.mataPelajaran,
        'Total Siswa': totalSiswa,
        Hadir: hadirCount,
        Sakit: sakitCount,
        Izin: izinCount,
        Alpha: alphaCount,
        Terlambat: terlambatCount,
        'Catatan Guru': l.catatanGuru || '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Semua Log Presensi KBM');
    const periodSlug = activePeriodLabel.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `Log_Presensi_KBM_Semua_Guru_${periodSlug}_${getTodayString()}.xlsx`);

    onShowToast(`File Excel rekap (${activePeriodLabel}) berhasil didownload!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <PageHeader
        icon={BookOpenCheck}
        title="Presensi Mengajar Guru (KBM)"
        description="Pencatatan kehadiran mengajar per jam pelajaran di kelas, terpisah dari absensi utama, dengan rekap absensi lengkap untuk masing-masing guru."
      />

      {/* Navigation Tabs & Main Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
          {/* Tab 1: Form Absen Kelas Guru */}
          <button
            type="button"
            onClick={() => setActiveTab('mengabsen')}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'mengabsen'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <UserCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Absen Sesi<span className="hidden md:inline"> Kelas</span>
            </span>
          </button>

          {/* Tab 2: Rincian Sesi Mengajar */}
          <button
            type="button"
            onClick={() => setActiveTab('riwayat_mandiri_guru')}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'riwayat_mandiri_guru'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Rincian Sesi<span className="hidden md:inline"> Mengajar</span>
            </span>
            {teacherSpecificLogs.length > 0 && (
              <span
                className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  activeTab === 'riwayat_mandiri_guru'
                    ? 'bg-white/20 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {teacherSpecificLogs.length}
              </span>
            )}
          </button>

          {/* Tab 3: Rekap Semua Guru (Admin / Kurikulum) */}
          {isAdminOrStaff && (
            <button
              type="button"
              onClick={() => setActiveTab('rekap_semua_guru')}
              className={`col-span-2 sm:col-span-1 w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'rekap_semua_guru'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span className="truncate">Monitoring Rekap Semua Guru</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  activeTab === 'rekap_semua_guru'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {(appData.presensiMengajarGuru || []).length}
              </span>
            </button>
          )}
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {isAdminOrStaff && (
            <button
              type="button"
              onClick={handleOpenAdminManualModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Input Manual</span>
            </button>
          )}

          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Jadwal Mengajar</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 2: REKAP ABSENSI GURU (FORMAT SEPERTI REKAP PRESENSI SEKOLAH / UMUM)    */}
      {/* ========================================================================= */}
      {activeTab === 'riwayat_mandiri_guru' && (
        <div className="space-y-6">
          {/* 1. KPI Metric Summary Cards - Format Standar Rekap Presensi Sekolah */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              label="Total Sesi KBM"
              value={teacherPeriodStats.totalSesi}
              subtitle={`${teacherPeriodStats.totalJp} Jam Pelajaran`}
              icon={BookOpenCheck}
              variant="primary"
            />
            <StatCard
              label="% Kehadiran"
              value={`${teacherPeriodStats.pctHadir}%`}
              subtitle={`${teacherPeriodStats.totalHadir} Siswa Hadir`}
              icon={CheckCircle2}
              variant="success"
            />
            <StatCard
              label="Sakit (S)"
              value={teacherPeriodStats.totalSakit}
              subtitle="Surat / Ket. Sakit"
              icon={Users}
              variant="info"
            />
            <StatCard
              label="Izin (I)"
              value={teacherPeriodStats.totalIzin}
              subtitle="Izin Terkonfirmasi"
              icon={Clock}
              variant="warning"
            />
            <StatCard
              label="Alpa (A)"
              value={teacherPeriodStats.totalAlpha}
              subtitle="Tanpa Keterangan"
              icon={AlertCircle}
              variant="danger"
            />
            <StatCard
              label="Kesiangan / Disp."
              value={teacherPeriodStats.totalTerlambat + teacherPeriodStats.totalDispensasi}
              subtitle="Terlambat / Disp."
              icon={Award}
              variant="neutral"
            />
          </div>

          {/* 2. Filter Card - Format Rekap Presensi Sekolah / Umum */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            {/* Main Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Teacher Selector */}
              {currentUser.role !== 'guru' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Pilih Guru Mengajar
                  </label>
                  <select
                    value={selectedGuruUsername}
                    onChange={(e) => setSelectedGuruUsername(e.target.value)}
                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    {listGuru.map((g) => (
                      <option key={g.id || g.username || g.nama} value={g.username || g.nama}>
                        {g.nama} {g.nip ? `(NIP: ${g.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Guru Pengajar
                  </label>
                  <div className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {currentGuru?.nama || loggedNama}
                  </div>
                </div>
              )}

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Pilih Kelas
                </label>
                <select
                  value={filterKelasId}
                  onChange={(e) => setFilterKelasId(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">Semua Kelas ({teacherClasses.length} Rombel)</option>
                  {teacherClasses.map((k) => (
                    <option key={k.id} value={k.id}>
                      Kelas {k.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toolbar: Search and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kelas, mapel, materi, atau tanggal..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" />
                  <span>Cetak</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportTeacherExcel}
                  className="flex items-center justify-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Export Excel</span>
                </button>
              </div>
            </div>

            {/* Proportional Search Result Banner */}
            {searchQuery.trim() && (
              <div className="flex items-center justify-between gap-2.5 p-2.5 sm:p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <span className="truncate">
                    Hasil pencarian: <strong className="font-black text-blue-700 dark:text-blue-300">"{searchQuery}"</strong>
                    <span className="ml-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                      ({rekapSubView === 'siswa' ? filteredStudentStats.length : filteredTeacherLogs.length} data ditemukan)
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2.5 py-1 rounded-xl bg-blue-100 dark:bg-blue-900/60 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-200 font-bold text-[11px] shrink-0 transition cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Hapus filter pencarian"
                >
                  <X className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* Sub-View Navigation Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRekapSubView('siswa')}
                className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  rekapSubView === 'siswa'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="truncate">Rekap Siswa per Kelas</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    rekapSubView === 'siswa'
                      ? 'bg-white/20 text-white'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  }`}
                >
                  {filteredStudentStats.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRekapSubView('sesi')}
                className={`w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  rekapSubView === 'sesi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">Log Sesi Mengajar</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    rekapSubView === 'sesi'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {filteredTeacherLogs.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 px-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="truncate">
                {rekapSubView === 'siswa'
                  ? `Rekap absensi siswa terakumulasi per kelas (${activePeriodLabel})`
                  : `Log catatan KBM dan presensi per jam pelajaran (${activePeriodLabel})`}
              </span>
            </div>
          </div>

          {/* VIEW A: REKAP ABSENSI SISWA PER KELAS */}
          {rekapSubView === 'siswa' && (
            <div className="space-y-4">
              {/* Status Filter Chips & Summary Banner */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                      Filter Status:
                    </span>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'all'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      Semua Siswa ({studentFilterCounts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('absent_only')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'absent_only'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      Ada Ketidakhadiran ({studentFilterCounts.absent})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('S')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'S'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                      }`}
                    >
                      Sakit ({studentFilterCounts.sakit})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('I')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'I'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      Izin ({studentFilterCounts.izin})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('A')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'A'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                      }`}
                    >
                      Alpa ({studentFilterCounts.alfa})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentStatusFilter('K')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        studentStatusFilter === 'K'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                      }`}
                    >
                      Terlambat ({studentFilterCounts.terlambat})
                    </button>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="text-slate-500">Rata-rata Kehadiran:</span>
                    <span className={`px-2.5 py-1 rounded-lg font-black ${
                      averageStudentAttendanceRate >= 90
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : averageStudentAttendanceRate >= 75
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {averageStudentAttendanceRate}%
                    </span>
                  </div>
                </div>

                {/* Table of Students (Desktop: Table View, Mobile: Card View) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3 w-28">NISN / NIS</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3 text-center">Kelas</th>
                        <th className="p-3 text-center" title="Total pertemuan KBM yang diikuti di kelas ini">
                          Total Sesi
                        </th>
                        <th className="p-3 text-center" title="Hadir">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black">
                            H
                          </span>
                        </th>
                        <th className="p-3 text-center" title="Sakit">
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black">
                            S
                          </span>
                        </th>
                        <th className="p-3 text-center" title="Izin">
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black">
                            I
                          </span>
                        </th>
                        <th className="p-3 text-center" title="Alpa / Tanpa Keterangan">
                          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black">
                            A
                          </span>
                        </th>
                        <th className="p-3 text-center" title="Terlambat / Kesiangan">
                          <span className="px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-black">
                            T
                          </span>
                        </th>
                        <th className="p-3 text-center" title="Dispensasi">
                          <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black">
                            D
                          </span>
                        </th>
                        <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-400">
                          Tidak Hadir
                        </th>
                        <th className="p-3 text-center min-w-[130px]">% Kehadiran</th>
                        <th className="p-3 text-center w-24">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {paginatedStudentStats.length === 0 ? (
                        <tr>
                          <td colSpan={14} className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                              <Users className="w-6 h-6" />
                            </div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              Tidak ada siswa yang sesuai dengan filter pencarian
                            </p>
                            <p className="text-xs text-slate-500">
                              Coba ubah filter status atau kata kunci pencarian kelas / nama siswa.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        paginatedStudentStats.map((item, idx) => {
                          const indexNum = (studentPage - 1) * studentPageSize + idx + 1;
                          const isWarning = item.rate < 75 || item.alfa >= 3;
                          const isGood = item.rate >= 90;

                          return (
                            <tr
                              key={item.siswa.id}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                            >
                              <td className="p-3 text-center font-bold text-slate-500">
                                {indexNum}
                              </td>
                              <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                                {item.siswa.nisn || '-'}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                                    {item.siswa.nama.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {item.siswa.nama}
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      {item.siswa.gender === 'L' ? 'Laki-laki' : item.siswa.gender === 'P' ? 'Perempuan' : '-'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                                  {item.kelasNama}
                                </span>
                              </td>
                              <td className="p-3 text-center font-extrabold text-slate-700 dark:text-slate-300">
                                {item.totalSesi}
                              </td>
                              <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400">
                                {item.hadir}
                              </td>
                              <td className="p-3 text-center font-bold text-blue-700 dark:text-blue-400">
                                {item.sakit > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950">
                                    {item.sakit}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-amber-700 dark:text-amber-400">
                                {item.izin > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950">
                                    {item.izin}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-rose-700 dark:text-rose-400">
                                {item.alfa > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 font-black">
                                    {item.alfa}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-purple-700 dark:text-purple-400">
                                {item.terlambat > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950">
                                    {item.terlambat}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center font-bold text-slate-600 dark:text-slate-400">
                                {item.dispensasi > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
                                    {item.dispensasi}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center font-extrabold text-slate-800 dark:text-slate-200">
                                {item.totalTidakHadir > 0 ? (
                                  <span className="text-rose-600 dark:text-rose-400">
                                    {item.totalTidakHadir}
                                  </span>
                                ) : (
                                  '0'
                                )}
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center justify-center gap-1">
                                  <div className="flex items-center gap-2 w-full max-w-[100px]">
                                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          item.rate >= 90
                                            ? 'bg-emerald-500'
                                            : item.rate >= 75
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${item.rate}%` }}
                                      />
                                    </div>
                                    <span className="text-[11px] font-black">{item.rate}%</span>
                                  </div>
                                  {isWarning && (
                                    <span className="px-2 py-0.2 rounded text-[9px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                      Perlu Perhatian
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentHistory(item.siswa, item.kelasNama)}
                                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition shadow-2xs cursor-pointer inline-flex items-center justify-center"
                                  title="Lihat Riwayat Kehadiran Siswa ini"
                                >
                                  <History className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (Opsi 1: Card View) */}
                <div className="block md:hidden space-y-3">
                  {paginatedStudentStats.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Tidak ada siswa yang sesuai dengan filter pencarian
                      </p>
                      <p className="text-xs text-slate-500">
                        Coba ubah filter status atau kata kunci pencarian kelas / nama siswa.
                      </p>
                    </div>
                  ) : (
                    paginatedStudentStats.map((item, idx) => {
                      const indexNum = (studentPage - 1) * studentPageSize + idx + 1;
                      const isWarning = item.rate < 75 || item.alfa >= 3;

                      return (
                        <div
                          key={item.siswa.id}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3"
                        >
                          {/* Card Header: Avatar, Name, NISN, Kelas */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center text-xs shrink-0">
                                {item.siswa.nama.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {item.siswa.nama}
                                </h5>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  NISN: {item.siswa.nisn || '-'} • No. {indexNum}
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shrink-0">
                              {item.kelasNama}
                            </span>
                          </div>

                          {/* Attendance percentage & progress bar */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-slate-500">Kehadiran:</span>
                              <div className="flex items-center gap-2">
                                {isWarning && (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                    Perlu Perhatian
                                  </span>
                                )}
                                <span className={`font-black ${
                                  item.rate >= 90
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : item.rate >= 75
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }`}>
                                  {item.rate}%
                                </span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  item.rate >= 90
                                    ? 'bg-emerald-500'
                                    : item.rate >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${item.rate}%` }}
                              />
                            </div>
                          </div>

                          {/* Attendance Breakdown Counters */}
                          <div className="grid grid-cols-6 gap-1 text-center text-[10px]">
                            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200/50 dark:border-slate-700/50">
                              <span className="block text-slate-500 text-[9px]">Sesi</span>
                              <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.totalSesi}</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                              <span className="block text-[9px] font-bold">H</span>
                              <span className="font-black">{item.hadir}</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                              <span className="block text-[9px] font-bold">S</span>
                              <span className="font-black">{item.sakit}</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                              <span className="block text-[9px] font-bold">I</span>
                              <span className="font-black">{item.izin}</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                              <span className="block text-[9px] font-bold">A</span>
                              <span className="font-black">{item.alfa}</span>
                            </div>
                            <div className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                              <span className="block text-[9px] font-bold">T</span>
                              <span className="font-black">{item.terlambat}</span>
                            </div>
                          </div>

                          {/* Footer Action */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-500">
                              Tidak Hadir: <span className="font-bold text-rose-600 dark:text-rose-400">{item.totalTidakHadir}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenStudentHistory(item.siswa, item.kelasNama)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900 transition cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Riwayat Kehadiran</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination */}
                {filteredStudentStats.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Pagination
                      currentPage={studentPage}
                      totalPages={totalStudentPages}
                      pageSize={studentPageSize}
                      totalItems={filteredStudentStats.length}
                      onPageChange={setStudentPage}
                      onPageSizeChange={setStudentPageSize}
                      pageSizeOptions={[10, 25, 50, 100]}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: DAFTAR LOG SESI MENGAJAR */}
          {rekapSubView === 'sesi' && (
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Daftar Log Sesi Pembelajaran: {currentGuru?.nama}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Catatan presensi per pertemuan jam pelajaran di kelas ({activePeriodLabel}).
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                  {filteredTeacherLogs.length} Pertemuan
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5 w-12 text-center">No</th>
                      <th className="p-3.5">Tanggal & Jam</th>
                      <th className="p-3.5">Kelas & Mapel</th>
                      <th className="p-3.5 text-center">Kehadiran Siswa</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTeacherLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                            <BookOpen className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200">
                              Belum ada catatan mengajar untuk {currentGuru?.nama}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Guru dapat mengabsen kelas langsung dari tab "Form Absen Sesi Kelas" saat mengajar.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab('mengabsen')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>Buka Form Absen Sesi Kelas</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      filteredTeacherLogs.map((log, index) => {
                        const totalSiswa = log.presensiSiswa?.length || 0;
                        const hadirCount = log.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                        const sakitCount = log.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                        const izinCount = log.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                        const alphaCount = log.presensiSiswa?.filter((p) => p.status === 'A').length || 0;
                        const pctHadir = totalSiswa > 0 ? Math.round((hadirCount / totalSiswa) * 100) : 100;

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="p-3.5 text-center font-bold text-slate-500">{index + 1}</td>
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {formatDateIndo(log.tanggal)}
                              </div>
                              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                <span>{log.jamPelajaran || '-'}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="font-extrabold text-slate-900 dark:text-white">
                                Kelas {log.kelasNama}
                              </span>
                              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                                {log.mataPelajaran}
                              </div>
                              {log.catatanGuru && (
                                <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-1">
                                  Catatan: {log.catatanGuru}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className="inline-flex items-center gap-1 text-[10px] font-extrabold">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                    H: {hadirCount}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                    S: {sakitCount}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    I: {izinCount}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                    A: {alphaCount}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500">
                                  {pctHadir}% Kehadiran ({totalSiswa} Siswa)
                                </span>
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Terlaksana</span>
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailLog(log)}
                                  className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition shadow-xs cursor-pointer"
                                  title="Lihat Rincian Presensi Siswa"
                                >
                                  <Info className="w-4 h-4" />
                                </button>
                                {(isAdminOrStaff || isTeacher) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLog(log.id)}
                                    className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shadow-xs cursor-pointer"
                                    title="Hapus Log KBM ini"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Opsi 1: Card View) */}
              <div className="block md:hidden p-3 space-y-3">
                {filteredTeacherLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400 space-y-3 bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                      {searchQuery.trim() ? <Search className="w-6 h-6 text-blue-500" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {searchQuery.trim()
                          ? `Tidak ditemukan sesi mengajar untuk "${searchQuery}"`
                          : `Belum ada catatan mengajar untuk ${currentGuru?.nama}`}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {searchQuery.trim()
                          ? 'Periksa kembali kata kunci pencarian kelas atau mata pelajaran.'
                          : 'Guru dapat mengabsen kelas langsung dari tab "Absen Sesi Kelas" saat mengajar.'}
                      </p>
                    </div>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer mt-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset Pencarian</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTeacherLogs.map((log, index) => {
                    const totalSiswa = log.presensiSiswa?.length || 0;
                    const hadirCount = log.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                    const sakitCount = log.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                    const izinCount = log.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                    const alphaCount = log.presensiSiswa?.filter((p) => p.status === 'A').length || 0;
                    const pctHadir = totalSiswa > 0 ? Math.round((hadirCount / totalSiswa) * 100) : 100;

                    return (
                      <div
                        key={log.id}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3"
                      >
                        {/* Header: Number, Date, Time & Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold flex items-center justify-center">
                                #{index + 1}
                              </span>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {formatDateIndo(log.tanggal)}
                              </span>
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              <span>{log.jamPelajaran || '-'}</span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Terlaksana</span>
                          </span>
                        </div>

                        {/* Class & Subject */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              Kelas {log.kelasNama}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                              {log.mataPelajaran}
                            </span>
                          </div>
                          {log.catatanGuru && (
                            <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              Catatan: {log.catatanGuru}
                            </p>
                          )}
                        </div>

                        {/* Student Attendance Stats Grid */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">Kehadiran Siswa:</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-black">
                              {pctHadir}% ({totalSiswa} Siswa)
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-extrabold">
                            <div className="py-1 px-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              H: {hadirCount}
                            </div>
                            <div className="py-1 px-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                              S: {sakitCount}
                            </div>
                            <div className="py-1 px-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              I: {izinCount}
                            </div>
                            <div className="py-1 px-1 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                              A: {alphaCount}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                          <button
                            type="button"
                            onClick={() => setDetailLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>Rincian Siswa</span>
                          </button>
                          {(isAdminOrStaff || isTeacher) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(log.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: FORM ABSEN SESI KELAS (SELF-SERVICE GURU & JADWAL HARI INI)        */}
      {/* ========================================================================= */}
      {activeTab === 'mengabsen' && (
        <div className="space-y-6">
          {/* Top Filter Bar: Select Teacher & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Teacher Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Pilih Guru Mengajar</span>
              </label>
              <select
                value={selectedGuruUsername}
                onChange={(e) => setSelectedGuruUsername(e.target.value)}
                disabled={currentUser.role === 'guru'}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 disabled:opacity-80 cursor-pointer"
              >
                {listGuru.map((g) => (
                  <option key={g.id || g.username || g.nama} value={g.username || g.nama}>
                    {g.nama} {g.nip ? `(NIP: ${g.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tanggal Mengajar</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTodayString())}
                  className="px-3 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0 transition"
                >
                  Hari Ini
                </button>
              </div>
            </div>

            {/* Information Banner */}
            <div className="sm:col-span-2 lg:col-span-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-blue-950 dark:text-blue-100 truncate">
                  {selectedDayName}, {formatDateIndo(selectedDate)}
                </p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300">
                  {teacherSchedules.length} Sesi Terjadwal untuk {currentGuru?.nama?.split(' ')[0] || 'Guru'}
                </p>
              </div>
            </div>
          </div>

          {/* List of Scheduled Classes for Teacher on Selected Day */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Jadwal Mengajar {currentGuru?.nama} (Hari {selectedDayName})</span>
              </h3>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>Total: <strong>{teacherSchedules.length}</strong> Sesi Kelas</span>
              </div>
            </div>

            {teacherSchedules.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {allTeacherSchedulesForDay.length > 0 && filterShiftRotation === 'aktif'
                      ? `Tidak Ada Sesi Mengajar di Shift Rotasi Aktif (${selectedDayName})`
                      : `Tidak ada jadwal mengajar pada hari ${selectedDayName}`}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    {allTeacherSchedulesForDay.length > 0 && filterShiftRotation === 'aktif'
                      ? `Terdapat ${allTeacherSchedulesForDay.length} sesi mengajar pada hari ${selectedDayName}, namun dijadwalkan di shift rotasi lain (tidak aktif minggu ini). Anda dapat mengganti filter ke "Semua Shift" untuk melihat seluruh sesi.`
                      : `Guru ${currentGuru?.nama} tidak memiliki alokasi jam mengajar di sistem pada hari ${selectedDayName}.`}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {allTeacherSchedulesForDay.length > 0 && filterShiftRotation === 'aktif' && (
                    <button
                      type="button"
                      onClick={() => setFilterShiftRotation('semua')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Tampilkan Semua Shift ({allTeacherSchedulesForDay.length} Sesi)</span>
                    </button>
                  )}
                  {isAdminOrStaff && (
                    <button
                      type="button"
                      onClick={handleOpenAdminManualModal}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Input Sesi Manual (Admin/Piket)</span>
                    </button>
                  )}
                  {onNavigateView && (
                    <button
                      type="button"
                      onClick={() => onNavigateView('jadwal_mengajar')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold rounded-xl hover:bg-slate-300 transition"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Kelola Jadwal Mengajar</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teacherSchedules.map((jadwal) => {
                  const existingLog = getLogForSchedule(jadwal);
                  const isCompleted = Boolean(existingLog);
                  const shiftInfo = getScheduleShiftInfo(jadwal);



                  // Format jam string cleanly without repetition
                  let jamDisplay = 'Jam 1';
                  if (Array.isArray(jadwal.jamKe) && jadwal.jamKe.length > 0) {
                    if (jadwal.jamKe.length === 1) {
                      jamDisplay = `Jam ${jadwal.jamKe[0]}`;
                    } else {
                      jamDisplay = `Jam ${jadwal.jamKe[0]} - ${jadwal.jamKe[jadwal.jamKe.length - 1]} (${jadwal.jamKe.length} JP)`;
                    }
                  } else if (typeof jadwal.jamKe === 'string' && jadwal.jamKe.trim()) {
                    const clean = jadwal.jamKe.replace(/^Jam\s*ke[-:\s]*/i, '').trim();
                    jamDisplay = clean ? `Jam ${clean}` : 'Jam KBM';
                  } else {
                    jamDisplay = `Jam ${jadwal.jamKe || 1}`;
                  }

                  return (
                    <div
                      key={jadwal.id}
                      className={`relative bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                        isCompleted
                          ? 'border-emerald-200 dark:border-emerald-900/60'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2.5">
                        {/* Minimalist Top Row */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                            <span>{jamDisplay}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-500 font-semibold">Shift {shiftInfo.itemShift === 'siang' ? 'Siang' : 'Pagi'}</span>
                          </div>

                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Sudah Diabsen</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>Belum Diabsen</span>
                            </span>
                          )}
                        </div>

                        {/* Class & Subject Info */}
                        <div className="pt-0.5">
                          <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                            Kelas {jadwal.kelasNama}
                          </h4>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 truncate">
                            {jadwal.mataPelajaran}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Waktu: {jadwal.jamMulai || (shiftInfo.itemShift === 'siang' ? '13.00' : '06.30')} - {jadwal.jamSelesai || (shiftInfo.itemShift === 'siang' ? '16.50' : '12.00')}</span>
                          </p>
                        </div>


                      </div>

                      {/* Action Button */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAbsenSession(jadwal)}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition cursor-pointer shadow-2xs ${
                            isCompleted
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <BookOpenCheck className="w-4 h-4" />
                          <span>{isCompleted ? 'Edit Absen KBM Kelas' : 'Mulai Absen KBM Kelas'}</span>
                        </button>

                        {isCompleted && existingLog && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLog(existingLog.id)}
                            className="p-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                            title="Hapus Log KBM ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONITORING REKAP SEMUA GURU (ADMIN ONLY)                           */}
      {/* ========================================================================= */}
      {activeTab === 'rekap_semua_guru' && isAdminOrStaff && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Table2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Sesi KBM ({activePeriodLabel})
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {filteredGlobalLogs.length}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  KBM Hari Ini
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {logsForSelectedDate.length}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Kelas Terdata
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {new Set(filteredGlobalLogs.map((l) => l.kelasId)).size}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Guru Aktif Mengajar
                </p>
                <h4 className="text-2xl font-black text-slate-900 dark:text-white">
                  {new Set(filteredGlobalLogs.map((l) => l.guruUsername || l.guruNama)).size}
                </h4>
              </div>
            </div>
          </div>

          {/* Search, Period Mode & Global Export */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari berdasarkan Guru, Kelas, Mapel, atau Materi..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterKelasId}
                onChange={(e) => setFilterKelasId(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100"
              >
                <option value="all">Semua Kelas</option>
                {(appData.kelas || []).map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama}
                  </option>
                ))}
              </select>

            </div>

            <button
              type="button"
              onClick={handleExportGlobalExcel}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Rekap ({activePeriodLabel})</span>
            </button>
          </div>

          {/* Global Database Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5 w-12 text-center">No</th>
                    <th className="p-3.5">Tanggal & Jam</th>
                    <th className="p-3.5">Guru Mengajar</th>
                    <th className="p-3.5">Kelas & Mapel</th>
                    <th className="p-3.5 text-center">Kehadiran Siswa</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredGlobalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        Belum ada data log presensi KBM guru di database.
                      </td>
                    </tr>
                  ) : (
                    filteredGlobalLogs.map((log, index) => {
                      const hadirCount = log.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                      const sakitCount = log.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                      const izinCount = log.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                      const alphaCount = log.presensiSiswa?.filter((p) => p.status === 'A').length || 0;
                      const terlambatCount = log.presensiSiswa?.filter((p) => p.status === 'T' || p.status === 'K').length || 0;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                          <td className="p-3.5 text-center font-bold text-slate-500">{index + 1}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {formatDateIndo(log.tanggal)}
                            </div>
                            <div className="text-[11px] text-slate-500">{log.jamPelajaran || '-'}</div>
                          </td>
                          <td className="p-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedGuruUsername(log.guruUsername || log.guruNama);
                                setActiveTab('riwayat_mandiri_guru');
                              }}
                              className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline text-left cursor-pointer"
                              title="Buka tabel mandiri guru ini"
                            >
                              {log.guruNama}
                            </button>
                          </td>
                          <td className="p-3.5">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              Kelas {log.kelasNama}
                            </span>
                            <div className="text-[11px] text-slate-500">{log.mataPelajaran}</div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="inline-flex items-center gap-1 text-[10px] font-extrabold">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">H: {hadirCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">S: {sakitCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">I: {izinCount}</span>
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">A: {alphaCount}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailLog(log)}
                                className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                                title="Lihat Rincian Presensi"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition"
                                title="Hapus Log KBM"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM MODAL: MENGABSEN KELAS KBM (TEACHER / SELF-SERVICE SESSION)           */}
      {/* ========================================================================= */}
      {activeSession && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                  Presensi Sesi KBM - Kelas {activeSession.jadwal.kelasNama}
                </span>
                <h3 className="text-lg font-black tracking-tight">
                  {activeSession.jadwal.mataPelajaran}
                </h3>
                <p className="text-xs text-blue-100">
                  Guru: {currentGuru?.nama} • Tanggal: {formatDateIndo(selectedDate)} ({selectedDayName})
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              {/* Session Notes Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Catatan Sesi Mengajar / Kelas (Opsional)
                </label>
                <input
                  type="text"
                  value={catatanGuru}
                  onChange={(e) => setCatatanGuru(e.target.value)}
                  placeholder="Catatan kelas, keterangan tambahan, dsb. (opsional)"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Quick Action Toolbar */}
              <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-4">
                {/* Header row on mobile / Left group on desktop */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                    <span>Set Massal:</span>
                  </span>

                  {/* Total Siswa count - on mobile displayed nicely in top right corner */}
                  <div className="sm:hidden text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
                    Total: {(appData.siswa || []).filter((s) => s.kelasId === activeSession.jadwal.kelasId && s.status !== 'tidak_aktif').length} Siswa
                  </div>
                </div>

                {/* Action Buttons: 2 balanced equal-width columns on mobile, flex row on desktop */}
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('H')}
                    className="px-3 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-center"
                    title="Set seluruh siswa sebagai Hadir (H)"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Semua Hadir (H)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncWithMainDailyPresensi}
                    className="px-3 py-2 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 text-center"
                    title="Salin status presensi sesuai catatan presensi harian sekolah"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span>Presensi Harian</span>
                  </button>
                </div>

                {/* Total Siswa count on desktop */}
                <div className="hidden sm:block text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  Total Siswa: {(appData.siswa || []).filter((s) => s.kelasId === activeSession.jadwal.kelasId && s.status !== 'tidak_aktif').length} Orang
                </div>
              </div>

              {/* Search Bar Siswa Sesi */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchSiswaModal}
                    onChange={(e) => setSearchSiswaModal(e.target.value)}
                    placeholder="Cari nama atau NISN siswa di kelas ini..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {searchSiswaModal && (
                    <button
                      type="button"
                      onClick={() => setSearchSiswaModal('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {searchSiswaModal.trim() && (
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                    <span className="truncate">
                      Hasil: <strong>"{searchSiswaModal}"</strong> ({filteredModalSiswa.length} siswa ditemukan)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSearchSiswaModal('')}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Student Attendance Table (Desktop: Table View, Mobile: Card View) */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs bg-slate-50/50 dark:bg-slate-900/50">
                {/* Desktop Table View */}
                <div className="hidden md:block max-h-[45vh] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3">Nama Siswa</th>
                        <th className="p-3 text-center">Status Kehadiran</th>
                        <th className="p-3">Catatan / Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredModalSiswa.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            {searchSiswaModal.trim()
                              ? `Tidak ditemukan siswa yang cocok dengan "${searchSiswaModal}".`
                              : 'Tidak ada data siswa di kelas ini.'}
                          </td>
                        </tr>
                      ) : (
                        filteredModalSiswa.map((siswa, idx) => {
                          const status = presensiSiswaMap[siswa.id]?.status || '';
                          const catatan = presensiSiswaMap[siswa.id]?.catatan || '';

                          return (
                            <tr key={siswa.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                              <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 dark:text-white">{siswa.nama}</div>
                                <div className="text-[10px] text-slate-500">NISN: {siswa.nisn || '-'}</div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  {(['H', 'S', 'I', 'A', 'T'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        setPresensiSiswaMap((prev) => ({
                                          ...prev,
                                          [siswa.id]: {
                                            ...prev[siswa.id],
                                            status: prev[siswa.id]?.status === st ? '' : st
                                          }
                                        }))
                                      }
                                      className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${
                                        status === st
                                          ? st === 'H'
                                            ? 'bg-emerald-600 text-white'
                                            : st === 'S'
                                            ? 'bg-blue-600 text-white'
                                            : st === 'I'
                                            ? 'bg-amber-500 text-white'
                                            : st === 'A'
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-purple-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  value={catatan}
                                  onChange={(e) =>
                                    setPresensiSiswaMap((prev) => ({
                                      ...prev,
                                      [siswa.id]: { ...prev[siswa.id], catatan: e.target.value }
                                    }))
                                  }
                                  placeholder="Catatan..."
                                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View (Opsi 1: Card View) */}
                <div className="block md:hidden max-h-[48vh] overflow-y-auto p-2.5 space-y-2.5">
                  {filteredModalSiswa.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                      <p>
                        {searchSiswaModal.trim()
                          ? `Tidak ditemukan siswa yang cocok dengan "${searchSiswaModal}".`
                          : 'Tidak ada data siswa di kelas ini.'}
                      </p>
                      {searchSiswaModal.trim() && (
                        <button
                          type="button"
                          onClick={() => setSearchSiswaModal('')}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Reset Pencarian
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredModalSiswa.map((siswa, idx) => {
                      const status = presensiSiswaMap[siswa.id]?.status || '';
                      const catatan = presensiSiswaMap[siswa.id]?.catatan || '';

                      return (
                        <div
                          key={siswa.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            status === 'H'
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-2xs'
                              : status === 'S'
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 shadow-2xs'
                              : status === 'I'
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-2xs'
                              : status === 'A'
                              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-2xs'
                              : status === 'T'
                              ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-300 dark:border-purple-800 shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
                          }`}
                        >
                          {/* Card Header: Student Name & Status Badge */}
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {siswa.nama}
                                </h5>
                                {siswa.nisn && (
                                  <p className="text-[10px] text-slate-400 font-mono">
                                    NISN: {siswa.nisn}
                                  </p>
                                )}
                              </div>
                            </div>

                            {status ? (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${
                                  status === 'H'
                                    ? 'bg-emerald-600 text-white'
                                    : status === 'S'
                                    ? 'bg-blue-600 text-white'
                                    : status === 'I'
                                    ? 'bg-amber-500 text-white'
                                    : status === 'A'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-purple-600 text-white'
                                }`}
                              >
                                {status === 'H'
                                  ? 'Hadir'
                                  : status === 'S'
                                  ? 'Sakit'
                                  : status === 'I'
                                  ? 'Izin'
                                  : status === 'A'
                                  ? 'Alpha'
                                  : 'Terlambat'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                                Belum Diisi
                              </span>
                            )}
                          </div>

                          {/* Touch Buttons for Status */}
                          <div className="grid grid-cols-5 gap-1.5 mb-2">
                            {(
                              [
                                { key: 'H', label: 'Hadir', activeClass: 'bg-emerald-600 text-white shadow-xs' },
                                { key: 'S', label: 'Sakit', activeClass: 'bg-blue-600 text-white shadow-xs' },
                                { key: 'I', label: 'Izin', activeClass: 'bg-amber-500 text-white shadow-xs' },
                                { key: 'A', label: 'Alpha', activeClass: 'bg-rose-600 text-white shadow-xs' },
                                { key: 'T', label: 'Telat', activeClass: 'bg-purple-600 text-white shadow-xs' },
                              ] as const
                            ).map((st) => (
                              <button
                                key={st.key}
                                type="button"
                                onClick={() =>
                                  setPresensiSiswaMap((prev) => ({
                                    ...prev,
                                    [siswa.id]: {
                                      ...prev[siswa.id],
                                      status: prev[siswa.id]?.status === st.key ? '' : st.key
                                    }
                                  }))
                                }
                                className={`py-1.5 px-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1 ${
                                  status === st.key
                                    ? st.activeClass
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                <span>{st.key}</span>
                              </button>
                            ))}
                          </div>

                          {/* Notes */}
                          <input
                            type="text"
                            value={catatan}
                            onChange={(e) =>
                              setPresensiSiswaMap((prev) => ({
                                ...prev,
                                [siswa.id]: { ...prev[siswa.id], catatan: e.target.value }
                              }))
                            }
                            placeholder="Catatan siswa (opsional)..."
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center text-center"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSavePresensiKbm}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-extrabold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INPUT PRESENSI MANUAL OLEH ADMIN / KURIKULUM                       */}
      {/* ========================================================================= */}
      {isAdminManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white uppercase tracking-wider">
                  Admin / Kurikulum Override
                </span>
                <h3 className="text-lg font-black tracking-tight mt-1">
                  Input Presensi Mengajar Guru Manual
                </h3>
                <p className="text-xs text-indigo-100">
                  Digunakan untuk mencatat kehadiran mengajar guru pengganti, jam tambahan, atau koreksi piket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdminManualModalOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Target Teacher */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Pilih Guru <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adminManualForm.guruUsername}
                    onChange={(e) => {
                      const u = e.target.value;
                      const g = listGuru.find((x) => x.username === u || x.nama === u);
                      setAdminManualForm((prev) => ({
                        ...prev,
                        guruUsername: u,
                        guruNama: g?.nama || u,
                        mataPelajaran: g?.mataPelajaran || prev.mataPelajaran
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    {listGuru.map((g) => (
                      <option key={g.id || g.username || g.nama} value={g.username || g.nama}>
                        {g.nama} {g.nip ? `(${g.nip})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Tanggal Mengajar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={adminManualForm.tanggal}
                    onChange={(e) => setAdminManualForm((prev) => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Class */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adminManualForm.kelasId}
                    onChange={(e) => handleAdminClassChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    {(appData.kelas || []).map((k) => (
                      <option key={k.id} value={k.id}>
                        Kelas {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={adminManualForm.mataPelajaran}
                    onChange={(e) => setAdminManualForm((prev) => ({ ...prev, mataPelajaran: e.target.value }))}
                    placeholder="Contoh: Matematika, Bahasa Inggris, dll."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>

                {/* Time / Jam Ke */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Jam Pelajaran
                  </label>
                  <input
                    type="text"
                    value={adminManualForm.jamPelajaran}
                    onChange={(e) => setAdminManualForm((prev) => ({ ...prev, jamPelajaran: e.target.value }))}
                    placeholder="Jam ke-1 & 2 (07:30 - 09:00)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Student Attendance List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                    Daftar Siswa di Kelas Terpilih
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSetAllStatus('H')}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                  >
                    Set Semua Hadir (H)
                  </button>
                </div>

                <div className="max-h-[35vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5 w-10 text-center">No</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(appData.siswa || [])
                        .filter((s) => s.kelasId === adminManualForm.kelasId && s.status !== 'tidak_aktif')
                        .map((siswa, idx) => {
                          const status = presensiSiswaMap[siswa.id]?.status || '';
                          return (
                            <tr key={siswa.id}>
                              <td className="p-2.5 text-center font-bold">{idx + 1}</td>
                              <td className="p-2.5 font-bold">{siswa.nama}</td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex gap-1">
                                  {(['H', 'S', 'I', 'A', 'T'] as const).map((st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() =>
                                        setPresensiSiswaMap((prev) => ({
                                          ...prev,
                                          [siswa.id]: {
                                            ...prev[siswa.id],
                                            status: prev[siswa.id]?.status === st ? '' : st
                                          }
                                        }))
                                      }
                                      className={`w-6 h-6 rounded text-[11px] font-bold ${
                                        status === st ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={presensiSiswaMap[siswa.id]?.catatan || ''}
                                  onChange={(e) =>
                                    setPresensiSiswaMap((prev) => ({
                                      ...prev,
                                      [siswa.id]: { ...prev[siswa.id], catatan: e.target.value }
                                    }))
                                  }
                                  placeholder="Catatan..."
                                  className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAdminManualModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center justify-center text-center"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleSaveAdminManualEntry}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL RINCIAN SISWA                                              */}
      {/* ========================================================================= */}
      {detailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="p-5 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Detail Sesi KBM Kelas {detailLog.kelasNama}</h3>
                <p className="text-xs text-blue-100">
                  {detailLog.mataPelajaran} • {formatDateIndo(detailLog.tanggal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">Guru Pengajar</p>
                <p className="text-sm font-extrabold text-slate-900 dark:text-white">{detailLog.guruNama}</p>
                {detailLog.catatanGuru && (
                  <>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-2">Catatan Guru</p>
                    <p className="text-xs text-slate-800 dark:text-slate-200 italic">{detailLog.catatanGuru}</p>
                  </>
                )}
              </div>

              {/* Detail Log Table (Desktop: Table, Mobile: Cards) */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="p-2.5 w-10 text-center">No</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {(detailLog.presensiSiswa || []).map((ps, idx) => (
                        <tr key={ps.siswaId + idx}>
                          <td className="p-2.5 text-center">{idx + 1}</td>
                          <td className="p-2.5 font-bold">{ps.siswaNama}</td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                ps.status === 'H'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : ps.status === 'S'
                                  ? 'bg-blue-100 text-blue-800'
                                  : ps.status === 'I'
                                  ? 'bg-amber-100 text-amber-800'
                                  : ps.status === 'A'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}
                            >
                              {ps.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-500">{ps.catatan || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="block sm:hidden max-h-[50vh] overflow-y-auto p-2 space-y-2">
                  {(detailLog.presensiSiswa || []).map((ps, idx) => (
                    <div
                      key={ps.siswaId + idx}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {ps.siswaNama}
                          </p>
                          {ps.catatan && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-1">
                              {ps.catatan}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                          ps.status === 'H'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : ps.status === 'S'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : ps.status === 'I'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : ps.status === 'A'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                        }`}
                      >
                        {ps.status === 'H'
                          ? 'Hadir'
                          : ps.status === 'S'
                          ? 'Sakit'
                          : ps.status === 'I'
                          ? 'Izin'
                          : ps.status === 'A'
                          ? 'Alpha'
                          : ps.status || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailLog(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL RIWAYAT PRESENSI KBM SISWA                                 */}
      {/* ========================================================================= */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                  {selectedStudentDetail.siswa.nama.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">
                    {selectedStudentDetail.siswa.nama}
                  </h3>
                  <p className="text-xs text-blue-100 flex items-center gap-2 mt-0.5">
                    <span>Kelas {selectedStudentDetail.kelasNama}</span>
                    <span>•</span>
                    <span>NISN: {selectedStudentDetail.siswa.nisn || '-'}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Teacher and Subject Info */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guru Pengajar</p>
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">{currentGuru?.nama}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sesi Pertemuan</p>
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {selectedStudentDetail.sessions.length} Pertemuan
                  </p>
                </div>
              </div>

              {/* Session Timeline (Desktop: Table, Mobile: Cards) */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-300">
                      <tr>
                        <th className="p-3 w-10 text-center">No</th>
                        <th className="p-3">Tanggal & Jam</th>
                        <th className="p-3">Materi Ajar</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {selectedStudentDetail.sessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                            Belum ada catatan presensi KBM untuk siswa ini.
                          </td>
                        </tr>
                      ) : (
                        selectedStudentDetail.sessions.map((sess, idx) => {
                          const statusColors: Record<string, string> = {
                            H: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                            S: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                            I: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                            A: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                            T: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                            K: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                            D: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
                            '-': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          };

                          const statusLabels: Record<string, string> = {
                            H: 'Hadir',
                            S: 'Sakit',
                            I: 'Izin',
                            A: 'Alpa',
                            T: 'Terlambat',
                            K: 'Kesiangan',
                            D: 'Dispensasi',
                            '-': 'Belum Dicatat'
                          };

                          return (
                            <tr key={sess.logId + idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                              <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-800 dark:text-slate-200">
                                  {formatDateIndo(sess.tanggal)}
                                </div>
                                <div className="text-[10px] text-slate-500">{sess.jamPelajaran}</div>
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                                {sess.materiAjar || '-'}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold ${statusColors[sess.status] || statusColors['-']}`}>
                                  {statusLabels[sess.status] || sess.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500 italic text-[11px]">
                                {sess.catatan || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="block sm:hidden max-h-[50vh] overflow-y-auto p-2.5 space-y-2.5">
                  {selectedStudentDetail.sessions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 italic text-xs">
                      Belum ada catatan presensi KBM untuk siswa ini.
                    </div>
                  ) : (
                    selectedStudentDetail.sessions.map((sess, idx) => {
                      const statusColors: Record<string, string> = {
                        H: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                        S: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
                        I: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                        A: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
                        T: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                        K: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
                        D: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
                        '-': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      };

                      const statusLabels: Record<string, string> = {
                        H: 'Hadir',
                        S: 'Sakit',
                        I: 'Izin',
                        A: 'Alpa',
                        T: 'Terlambat',
                        K: 'Kesiangan',
                        D: 'Dispensasi',
                        '-': 'Belum Dicatat'
                      };

                      return (
                        <div
                          key={sess.logId + idx}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                            <div>
                              <div className="font-bold text-xs text-slate-900 dark:text-white">
                                {formatDateIndo(sess.tanggal)}
                              </div>
                              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                                {sess.jamPelajaran}
                              </div>
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${statusColors[sess.status] || statusColors['-']}`}>
                              {statusLabels[sess.status] || sess.status}
                            </span>
                          </div>

                          {sess.materiAjar && (
                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                              <span className="font-bold text-slate-500 text-[10px]">Materi: </span>
                              {sess.materiAjar}
                            </div>
                          )}

                          {sess.catatan && (
                            <div className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                              Catatan: {sess.catatan}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CETAK PRESENSI MENGAJAR GURU (PRINTABLE SHEET)                      */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header Toolbar */}
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold text-sm">Cetak Dokumen KBM</h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-700 p-1 rounded-xl print:hidden">
                  <button
                    type="button"
                    onClick={() => setPrintSubView('siswa')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printSubView === 'siswa' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Rekap Siswa per Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintSubView('sesi')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      printSubView === 'sesi' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Log Sesi Mengajar
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Dokumen</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1 bg-white print:p-0">
              {/* School Letterhead */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                <h2 className="text-xl font-black uppercase tracking-wide">
                  {appData.sekolah?.nama || 'SEKOLAH MENENGAH ATAS'}
                </h2>
                <p className="text-xs text-slate-600">
                  {appData.sekolah?.alamat || 'Jl. Pendidikan No. 1'} • Telp: {appData.sekolah?.telepon || '-'} • NPSN: {appData.sekolah?.npsn || '-'}
                </p>
                <h3 className="text-sm font-extrabold uppercase mt-2 tracking-wider underline">
                  {printSubView === 'siswa'
                    ? 'REKAPITULASI PRESENSI SISWA PER KELAS (KBM)'
                    : 'JURNAL & LOG SESI PRESENSI MENGAJAR GURU'}
                </h3>
              </div>

              {/* Teacher Identity Block */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div>
                  <p><span className="font-bold">Nama Guru:</span> {currentGuru?.nama}</p>
                  <p><span className="font-bold">NIP:</span> {currentGuru?.nip || '-'}</p>
                  <p><span className="font-bold">Filter Kelas:</span> {filterKelasId === 'all' ? 'Semua Kelas' : `Kelas ${teacherClasses.find(k => k.id === filterKelasId)?.nama || filterKelasId}`}</p>
                </div>
                <div className="text-right">
                  <p><span className="font-bold">Mata Pelajaran:</span> {currentGuru?.mataPelajaran || '-'}</p>
                  <p><span className="font-bold">Periode:</span> {activePeriodLabel}</p>
                  <p><span className="font-bold">Total Terdata:</span> {printSubView === 'siswa' ? `${filteredStudentStats.length} Siswa` : `${filteredTeacherLogs.length} Sesi Pertemuan`}</p>
                </div>
              </div>

              {/* Table Body depending on printSubView */}
              {printSubView === 'siswa' ? (
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300 w-8 text-center">No</th>
                      <th className="p-2 border border-slate-300 w-24">NISN</th>
                      <th className="p-2 border border-slate-300">Nama Siswa</th>
                      <th className="p-2 border border-slate-300 w-20 text-center">Kelas</th>
                      <th className="p-2 border border-slate-300 w-12 text-center">Sesi</th>
                      <th className="p-2 border border-slate-300 w-10 text-center">H</th>
                      <th className="p-2 border border-slate-300 w-10 text-center">S</th>
                      <th className="p-2 border border-slate-300 w-10 text-center">I</th>
                      <th className="p-2 border border-slate-300 w-10 text-center">A</th>
                      <th className="p-2 border border-slate-300 w-10 text-center">T</th>
                      <th className="p-2 border border-slate-300 w-16 text-center">% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudentStats.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-4 text-center text-slate-500 italic">
                          Belum ada data rekap presensi siswa untuk dicetak.
                        </td>
                      </tr>
                    ) : (
                      filteredStudentStats.map((item, idx) => (
                        <tr key={item.siswa.id} className="border-b border-slate-200">
                          <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                          <td className="p-2 border border-slate-300 font-mono text-[11px]">{item.siswa.nisn || '-'}</td>
                          <td className="p-2 border border-slate-300 font-bold">{item.siswa.nama}</td>
                          <td className="p-2 border border-slate-300 text-center">{item.kelasNama}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold">{item.totalSesi}</td>
                          <td className="p-2 border border-slate-300 text-center text-emerald-700 font-bold">{item.hadir}</td>
                          <td className="p-2 border border-slate-300 text-center">{item.sakit}</td>
                          <td className="p-2 border border-slate-300 text-center">{item.izin}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold text-rose-700">{item.alfa}</td>
                          <td className="p-2 border border-slate-300 text-center">{item.terlambat}</td>
                          <td className="p-2 border border-slate-300 text-center font-bold">{item.rate}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border border-slate-300 w-8 text-center">No</th>
                      <th className="p-2 border border-slate-300 w-28">Tanggal & Jam</th>
                      <th className="p-2 border border-slate-300 w-20">Kelas</th>
                      <th className="p-2 border border-slate-300 w-28 text-center">Kehadiran (H/S/I/A)</th>
                      <th className="p-2 border border-slate-300 w-28">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeacherLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500 italic">
                          Belum ada catatan presensi KBM untuk dicetak.
                        </td>
                      </tr>
                    ) : (
                      filteredTeacherLogs.map((log, idx) => {
                        const h = log.presensiSiswa?.filter((p) => p.status === 'H').length || 0;
                        const s = log.presensiSiswa?.filter((p) => p.status === 'S').length || 0;
                        const i = log.presensiSiswa?.filter((p) => p.status === 'I').length || 0;
                        const a = log.presensiSiswa?.filter((p) => p.status === 'A').length || 0;

                        return (
                          <tr key={log.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-300 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border border-slate-300">
                              <div>{log.tanggal}</div>
                              <div className="text-[10px] text-slate-500">{log.jamPelajaran || '-'}</div>
                            </td>
                            <td className="p-2 border border-slate-300 font-bold">{log.kelasNama}</td>
                            <td className="p-2 border border-slate-300 text-center font-bold">
                              H:{h} S:{s} I:{i} A:{a}
                            </td>
                            <td className="p-2 border border-slate-300 text-[11px] text-slate-600">
                              {log.catatanGuru || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-10 text-xs text-center">
                <div className="space-y-16">
                  <p>Mengetahui,<br />Kepala Sekolah / Waka Kurikulum</p>
                  <p className="font-bold underline uppercase">{appData.sekolah?.kepalaSekolah || '....................................'}</p>
                </div>
                <div className="space-y-16">
                  <p>{appData.sekolah?.kabupaten || 'Tempat'}, {formatDateIndo(getTodayString())}<br />Guru Mata Pelajaran</p>
                  <p className="font-bold underline uppercase">{currentGuru?.nama || '....................................'}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresensiKbmGuruView;
