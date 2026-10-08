import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Sun,
  Sunset,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Save,
  Download,
  Printer,
  ArrowLeft,
  Search,
  X,
  Check,
  FileSpreadsheet,
  UserCheck,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Info,
  Layers,
  Table2,
  CheckCheck
} from 'lucide-react';
import { AppData, UserSession, GuruPresensiItem } from '../../types';
import {
  getTodayString,
  formatDateIndo,
  getIndonesianDayName,
  determineKelasKelompok,
  cleanMapelName,
  addAuditLog,
  isWeekend,
  generateWeeklyShiftSchedules
} from '../../utils/helpers';
import {
  MATRIX_SHIFT_OPTIONS,
  TABLE_SHIFT_GROUPS,
  MatrixShiftOptionId,
  parseJamKeList,
  getJamPelajaranTime
} from './JadwalMengajarView';

interface AbsenHarianGuruTabProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (newData: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onBackToTable?: () => void;
  initialShiftOption?: 'semua' | 'pagi' | 'siang' | MatrixShiftOptionId;
}

interface ScheduledTeacherItem {
  key: string;
  guruUsername: string;
  guruNama: string;
  guruNip: string;
  shift: 'Pagi' | 'Siang';
  kelompok: 1 | 2;
  kelompokLabel: string;
  shiftOptionId: MatrixShiftOptionId;
  schedules: {
    kelasNama: string;
    mataPelajaran: string;
    jamKeList: number[];
    jamKeStr: string;
    timeRange: string;
    jp: number;
  }[];
  totalJp: number;
  waktuRange: string;
  mapelList: string[];
  kelasList: string[];
}

export const AbsenHarianGuruTab: React.FC<AbsenHarianGuruTabProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onShowToast,
  onBackToTable,
  initialShiftOption = 'semua',
}) => {
  // Selected Date state (defaults to today)
  const [selectedTanggal, setSelectedTanggal] = useState<string>(getTodayString());
  const [activeShiftOption, setActiveShiftOption] = useState<'semua' | 'pagi' | 'siang' | MatrixShiftOptionId>(initialShiftOption);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [layoutMode, setLayoutMode] = useState<'grouped' | 'flat'>('grouped');

  // Synchronize when initialShiftOption prop changes
  useEffect(() => {
    if (initialShiftOption) {
      setActiveShiftOption(initialShiftOption);
    }
  }, [initialShiftOption]);

  // Print & Detail Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [detailTeacher, setDetailTeacher] = useState<ScheduledTeacherItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Compute Indonesian day name for the selected date
  const dayName = useMemo(() => {
    return getIndonesianDayName(selectedTanggal);
  }, [selectedTanggal]);

  const isWeekendSelected = useMemo(() => {
    return isWeekend(selectedTanggal);
  }, [selectedTanggal]);

  // Active Weekly Shift Period for selectedTanggal
  const activeShiftPeriod = useMemo(() => {
    const periods = (appData.shiftConfig?.periods && appData.shiftConfig.periods.length > 0)
      ? appData.shiftConfig.periods
      : generateWeeklyShiftSchedules();

    const targetDateStr = selectedTanggal ? selectedTanggal.slice(0, 10) : getTodayString();
    const matched = periods.find((p) => {
      const sStr = p.startDate.slice(0, 10);
      const eStr = p.endDate.slice(0, 10);
      return targetDateStr >= sStr && targetDateStr <= eStr;
    });
    return matched || periods[0];
  }, [appData.shiftConfig, selectedTanggal]);

  // Active shift timings and rotation config
  const activePagiTime = appData.shiftConfig?.pagiTime || '06.30 - 12.00';
  const activeSiangTime = appData.shiftConfig?.siangTime || '13.00 - 16.50';
  const activePagiJamMasukMulai = appData.shiftConfig?.pagiJamMasukMulai || '06:30';
  const activePagiJamPulang = appData.shiftConfig?.pagiJamPulang || '12:00';
  const activeSiangJamMasukMulai = appData.shiftConfig?.siangJamMasukMulai || '12:45';
  const activeSiangJamPulang = appData.shiftConfig?.siangJamPulang || '16:50';

  const k1Type = activeShiftPeriod?.kelompok1Type || 'pagi';
  const k2Type = activeShiftPeriod?.kelompok2Type || 'siang';

  // Labels for classes assigned to each shift
  const isK1Pagi = k1Type === 'pagi';
  const isK2Pagi = k2Type === 'pagi';
  const isK1Siang = k1Type === 'siang';
  const isK2Siang = k2Type === 'siang';

  const pagiClassesLabel = isK1Pagi && isK2Pagi
    ? 'Semua Tingkat (Kelas X, XI, XII)'
    : isK1Pagi
    ? 'Kelas X & XI (Kelompok 1)'
    : isK2Pagi
    ? 'Kelas XII (Kelompok 2)'
    : 'Tidak Ada KBM';

  const siangClassesLabel = isK1Siang && isK2Siang
    ? 'Semua Tingkat (Kelas X, XI, XII)'
    : isK2Siang
    ? 'Kelas XII (Kelompok 2)'
    : isK1Siang
    ? 'Kelas X & XI (Kelompok 1)'
    : 'Tidak Ada KBM';

  // Extract all scheduled teachers on this day from appData.jadwalMengajar
  const scheduledTeachers = useMemo(() => {
    const list = appData.jadwalMengajar || [];
    const daySchedules = list.filter(
      (j) => (j.hari || '').toLowerCase() === dayName.toLowerCase()
    );

    const map = new Map<string, ScheduledTeacherItem>();

    daySchedules.forEach((j) => {
      const kelompok = determineKelasKelompok(j.kelasNama);
      
      // Determine effective shift based on active weekly rotation
      const activeKelompokShift: 'Pagi' | 'Siang' = kelompok === 2
        ? (k2Type === 'pagi' ? 'Pagi' : 'Siang')
        : (k1Type === 'siang' ? 'Siang' : 'Pagi');

      const shift: 'Pagi' | 'Siang' = activeKelompokShift;
      const shiftOptionId: MatrixShiftOptionId =
        shift === 'Pagi'
          ? (kelompok === 1 ? 'pagi_k1' : 'pagi_k2')
          : (kelompok === 1 ? 'siang_k1' : 'siang_k2');

      const teacherIdentifier = j.guruUsername || j.guruNama;
      const groupKey = `${teacherIdentifier}__${shift}__${kelompok}`;

      const jamList = parseJamKeList(j.jamKe, j.jamKeList);
      const timeRange =
        jamList.length > 0
          ? `${getJamPelajaranTime(Math.min(...jamList), shift).split(' - ')[0]} - ${getJamPelajaranTime(Math.max(...jamList), shift).split(' - ')[1]}`
          : '';

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          guruUsername: j.guruUsername || '',
          guruNama: j.guruNama || teacherIdentifier,
          guruNip: j.guruNip || '',
          shift,
          kelompok,
          kelompokLabel: kelompok === 1 ? 'Kelas X & XI' : 'Kelas XII',
          shiftOptionId,
          schedules: [],
          totalJp: 0,
          waktuRange: timeRange,
          mapelList: [],
          kelasList: [],
        });
      }

      const item = map.get(groupKey)!;
      item.schedules.push({
        kelasNama: j.kelasNama,
        mataPelajaran: cleanMapelName(j.mataPelajaran),
        jamKeList: jamList,
        jamKeStr: j.jamKe || jamList.join(','),
        timeRange,
        jp: jamList.length,
      });
      item.totalJp += jamList.length;

      const cleanedMapel = cleanMapelName(j.mataPelajaran);
      if (!item.mapelList.includes(cleanedMapel)) {
        item.mapelList.push(cleanedMapel);
      }
      if (!item.kelasList.includes(j.kelasNama)) {
        item.kelasList.push(j.kelasNama);
      }
    });

    // Sort items by Shift (Pagi then Siang) -> Kelompok (1 then 2) -> Guru Name
    return Array.from(map.values()).sort((a, b) => {
      const sA = a.shift === 'Siang' ? 2 : 1;
      const sB = b.shift === 'Siang' ? 2 : 1;
      if (sA !== sB) return sA - sB;
      if (a.kelompok !== b.kelompok) return a.kelompok - b.kelompok;
      return a.guruNama.localeCompare(b.guruNama, 'id');
    });
  }, [appData.jadwalMengajar, dayName, k1Type, k2Type]);

  // Realtime counts for shift groups for the selected date
  const groupCounts = useMemo(() => {
    const counts = {
      all: scheduledTeachers.length,
      pagi: 0,
      siang: 0,
      pagi_k1: 0,
      siang_k1: 0,
      pagi_k2: 0,
      siang_k2: 0,
    };

    scheduledTeachers.forEach((st) => {
      if (st.shift === 'Pagi') counts.pagi++;
      if (st.shift === 'Siang') counts.siang++;
      if (st.shiftOptionId === 'pagi_k1') counts.pagi_k1++;
      else if (st.shiftOptionId === 'siang_k1') counts.siang_k1++;
      else if (st.shiftOptionId === 'pagi_k2') counts.pagi_k2++;
      else if (st.shiftOptionId === 'siang_k2') counts.siang_k2++;
    });

    return counts;
  }, [scheduledTeachers]);

  // Dynamic active shift groups for grouped layout
  const dynamicActiveShiftGroups = useMemo(() => {
    const groups = [];

    // Active Pagi Group
    const pagiKelompok = k1Type === 'pagi' ? 1 : k2Type === 'pagi' ? 2 : 1;
    const pagiId: MatrixShiftOptionId = pagiKelompok === 1 ? 'pagi_k1' : 'pagi_k2';
    groups.push({
      id: pagiId,
      filterId: 'pagi',
      shift: 'Pagi' as const,
      kelompok: pagiKelompok as 1 | 2,
      kelompokTitle: pagiKelompok === 1 ? 'Kelompok 1 (Kelas X & XI)' : 'Kelompok 2 (Kelas XII)',
      kelompokTingkat: pagiKelompok === 1 ? 'Kelas X & XI' : 'Kelas XII',
      shiftTitle: 'Shift Pagi',
      shiftWaktu: `Jam Ke 1 s.d. 10 • ${activePagiTime} WIB (30 mnt/JP • Istirahat 08.30-09.00)`,
      icon: Sun,
      headerColor: 'from-amber-500/15 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-700/80',
      badgeColor: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
      accentBorder: 'border-amber-400 dark:border-amber-600',
    });

    // Active Siang Group
    const siangKelompok = k1Type === 'siang' ? 1 : k2Type === 'siang' ? 2 : 2;
    const siangId: MatrixShiftOptionId = siangKelompok === 1 ? 'siang_k1' : 'siang_k2';
    groups.push({
      id: siangId,
      filterId: 'siang',
      shift: 'Siang' as const,
      kelompok: siangKelompok as 1 | 2,
      kelompokTitle: siangKelompok === 1 ? 'Kelompok 1 (Kelas X & XI)' : 'Kelompok 2 (Kelas XII)',
      kelompokTingkat: siangKelompok === 1 ? 'Kelas X & XI' : 'Kelas XII',
      shiftTitle: 'Shift Siang',
      shiftWaktu: `Jam Ke 1 s.d. 10 • ${activeSiangTime} WIB (30 mnt/JP • Sholat 15.00-15.30)`,
      icon: Sunset,
      headerColor: 'from-sky-500/15 via-sky-500/5 to-transparent border-sky-300 dark:border-sky-700/80',
      badgeColor: 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800',
      accentBorder: 'border-sky-400 dark:border-sky-600',
    });

    return groups;
  }, [k1Type, k2Type, activePagiTime, activeSiangTime]);

  // Attendance Records state (key: groupKey -> GuruPresensiItem)
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, GuruPresensiItem>>({});

  // Sync attendanceRecords when selectedTanggal or scheduledTeachers changes
  useEffect(() => {
    const existingList: GuruPresensiItem[] = appData.presensiGuru?.[selectedTanggal] || [];
    const map: Record<string, GuruPresensiItem> = {};

    // 1. Populate from existing saved list
    existingList.forEach((rec) => {
      const shift: 'Pagi' | 'Siang' = (rec.shift || 'Pagi') === 'Siang' ? 'Siang' : 'Pagi';
      const kelompok = rec.kelompok || 1;
      const teacherIdentifier = rec.guruUsername || rec.guruNama;
      const key = `${teacherIdentifier}__${shift}__${kelompok}`;
      map[key] = { ...rec };
    });

    // 2. Initialize scheduled teachers without record
    scheduledTeachers.forEach((st) => {
      if (!map[st.key]) {
        // Fallback check by username/nama and shift
        const fallback = existingList.find(
          (e) =>
            (e.guruUsername === st.guruUsername || e.guruNama === st.guruNama) &&
            ((e.shift || 'Pagi') === st.shift)
        );

        if (fallback) {
          map[st.key] = {
            ...fallback,
            id: fallback.id || `GPRES_${Date.now()}_${Math.random()}`,
            kelompok: st.kelompok,
            kelompokLabel: st.kelompokLabel,
            totalJp: st.totalJp,
            jadwalHariIni: st.schedules.map((s) => `${s.kelasNama}: ${s.mataPelajaran} (${s.jp} JP)`).join('; '),
          };
        } else {
          map[st.key] = {
            id: `GPRES_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
            guruId: st.guruUsername || st.guruNama,
            guruUsername: st.guruUsername,
            guruNama: st.guruNama,
            guruNip: st.guruNip,
            tanggal: selectedTanggal,
            hari: dayName,
            shift: st.shift,
            kelompok: st.kelompok,
            kelompokLabel: st.kelompokLabel,
            status: '', // Belum absen
            jamMasuk: '',
            jamPulang: '',
            catatan: '',
            totalJp: st.totalJp,
            jadwalHariIni: st.schedules.map((s) => `${s.kelasNama}: ${s.mataPelajaran} (${s.jp} JP)`).join('; '),
            sumberPresensi: 'Jadwal Mengajar',
          };
        }
      }
    });

    setAttendanceRecords(map);
    setIsDirty(false);
  }, [selectedTanggal, appData.presensiGuru, scheduledTeachers, dayName]);

  // Update status for a specific teacher record
  const handleUpdateStatus = (key: string, newStatus: 'H' | 'S' | 'I' | 'A' | 'D' | 'T' | '') => {
    if (readOnly) return;
    setAttendanceRecords((prev) => {
      const current = prev[key];
      if (!current) return prev;

      let defaultJamMasuk = current.jamMasuk;
      let defaultJamPulang = current.jamPulang;

      if (newStatus === 'H' || newStatus === 'T') {
        if (!defaultJamMasuk) {
          defaultJamMasuk = current.shift === 'Siang' ? activeSiangJamMasukMulai : activePagiJamMasukMulai;
        }
        if (!defaultJamPulang) {
          defaultJamPulang = current.shift === 'Siang' ? activeSiangJamPulang : activePagiJamPulang;
        }
      } else if (newStatus === 'A') {
        defaultJamMasuk = '';
        defaultJamPulang = '';
      }

      return {
        ...prev,
        [key]: {
          ...current,
          status: newStatus,
          jamMasuk: defaultJamMasuk,
          jamPulang: defaultJamPulang,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.data?.nama || currentUser.data?.username || 'User',
        },
      };
    });
    setIsDirty(true);
  };

  // Update time or notes
  const handleUpdateField = (key: string, field: 'jamMasuk' | 'jamPulang' | 'catatan', val: string) => {
    if (readOnly) return;
    setAttendanceRecords((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: {
          ...current,
          [field]: val,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.data?.nama || currentUser.data?.username || 'User',
        },
      };
    });
    setIsDirty(true);
  };

  // Filtered teachers list based on activeShiftOption, search, and status filter
  const displayedTeachers = useMemo(() => {
    return scheduledTeachers.filter((st) => {
      // 1. Shift & Kelompok match
      if (activeShiftOption !== 'semua') {
        if (activeShiftOption === 'pagi' && st.shift !== 'Pagi') return false;
        if (activeShiftOption === 'siang' && st.shift !== 'Siang') return false;
        if (activeShiftOption !== 'pagi' && activeShiftOption !== 'siang' && st.shiftOptionId !== activeShiftOption) {
          return false;
        }
      }

      // 2. Search match
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchName = st.guruNama.toLowerCase().includes(q);
        const matchNip = st.guruNip.toLowerCase().includes(q);
        const matchMapel = st.mapelList.some((m) => m.toLowerCase().includes(q));
        const matchKelas = st.kelasList.some((k) => k.toLowerCase().includes(q));
        if (!matchName && !matchNip && !matchMapel && !matchKelas) {
          return false;
        }
      }

      // 3. Status filter match
      if (filterStatus !== 'semua') {
        const rec = attendanceRecords[st.key];
        const status = rec?.status || '';
        if (filterStatus === 'UNSET' && status !== '') return false;
        if (filterStatus !== 'UNSET' && status !== filterStatus) return false;
      }

      return true;
    });
  }, [scheduledTeachers, activeShiftOption, searchTerm, filterStatus, attendanceRecords]);

  // Overall statistics for the displayed or current shift
  const attendanceStats = useMemo(() => {
    let total = 0;
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let dinas = 0;
    let terlambat = 0;
    let belumAbsen = 0;

    displayedTeachers.forEach((st) => {
      total++;
      const rec = attendanceRecords[st.key];
      const status = rec?.status || '';
      if (status === 'H') hadir++;
      else if (status === 'S') sakit++;
      else if (status === 'I') izin++;
      else if (status === 'A') alfa++;
      else if (status === 'D') dinas++;
      else if (status === 'T') terlambat++;
      else belumAbsen++;
    });

    return { total, hadir, sakit, izin, alfa, dinas, terlambat, belumAbsen };
  }, [displayedTeachers, attendanceRecords]);

  // Fast Bulk Action: Set Semua Hadir
  const handleSetAllHadir = () => {
    if (readOnly) return;
    setAttendanceRecords((prev) => {
      const next = { ...prev };
      let changedCount = 0;
      displayedTeachers.forEach((st) => {
        const cur = next[st.key];
        if (cur && (!cur.status || (cur.status as string) === '')) {
          next[st.key] = {
            ...cur,
            status: 'H',
            jamMasuk: cur.shift === 'Siang' ? activeSiangJamMasukMulai : activePagiJamMasukMulai,
            jamPulang: cur.shift === 'Siang' ? activeSiangJamPulang : activePagiJamPulang,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.data?.nama || currentUser.data?.username || 'User',
          };
          changedCount++;
        }
      });
      return next;
    });
    setIsDirty(true);
    onShowToast(`Semua guru yang belum absen telah diset Hadir (H). Klik "Simpan Absen" untuk menyimpan.`, 'info');
  };

  // Save Attendance to appData
  const handleSaveAttendance = () => {
    if (readOnly) return;
    setIsSaving(true);
    try {
      const recordsToSave: GuruPresensiItem[] = Object.values(attendanceRecords);

      const nextPresensiGuru = {
        ...(appData.presensiGuru || {}),
        [selectedTanggal]: recordsToSave,
      };

      const updatedAppData = addAuditLog(
        { ...appData, presensiGuru: nextPresensiGuru },
        'Simpan Absensi Harian Guru',
        `Menyimpan absensi ${recordsToSave.length} guru untuk hari ${dayName}, ${formatDateIndo(selectedTanggal)}`
      );

      onUpdateAppData(updatedAppData);
      setIsDirty(false);
      onShowToast(`Absen harian guru untuk tanggal ${formatDateIndo(selectedTanggal)} berhasil disimpan!`, 'success');
    } catch (err: any) {
      onShowToast(`Gagal menyimpan presensi: ${err?.message || 'Terjadi kesalahan'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (displayedTeachers.length === 0) {
      onShowToast('Tidak ada data absen guru untuk diekspor.', 'warning');
      return;
    }

    const statusMap: Record<string, string> = {
      H: 'Hadir',
      S: 'Sakit',
      I: 'Izin',
      A: 'Alpa',
      D: 'Dinas Luar',
      T: 'Terlambat',
    };

    const rows = displayedTeachers.map((st, idx) => {
      const rec = attendanceRecords[st.key];
      return {
        No: idx + 1,
        Tanggal: selectedTanggal,
        Hari: dayName,
        'Kelompok Tingkat': st.kelompokLabel,
        Shift: st.shift === 'Siang' ? 'Shift Siang' : 'Shift Pagi',
        'Nama Guru': st.guruNama,
        NIP: st.guruNip || '-',
        'Mata Pelajaran': st.mapelList.join(', '),
        'Kelas Ajar': st.kelasList.join(', '),
        'Total JP': `${st.totalJp} JP`,
        'Waktu Mengajar': st.waktuRange || '-',
        'Status Presensi': rec?.status ? statusMap[rec.status] || rec.status : 'Belum Diisi',
        'Catatan / Keterangan': rec?.catatan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absen Harian Guru');
    XLSX.writeFile(workbook, `Absen_Harian_Guru_${selectedTanggal}.xlsx`);
    onShowToast('Data absen harian guru berhasil diekspor ke Excel!', 'success');
  };

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedTanggal);
    d.setDate(d.getDate() - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedTanggal(`${yyyy}-${mm}-${dd}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedTanggal);
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedTanggal(`${yyyy}-${mm}-${dd}`);
  };

  const handleToday = () => {
    setSelectedTanggal(getTodayString());
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & DATE CONTROLS BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {onBackToTable && (
              <button
                type="button"
                onClick={onBackToTable}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Kembali ke Daftar Tabel Jadwal"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Absen Harian Guru Mengajar</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Presensi kehadiran harian otomatis terintegrasi dari <strong>Jadwal Pelajaran Mengajar</strong> hari{' '}
            <span className="font-extrabold text-blue-600 dark:text-blue-400">{dayName}</span>.
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Date Navigator */}
          <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="px-2 py-1 text-xs font-bold text-slate-800 dark:text-white bg-transparent outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Pilih Hari Ini"
          >
            Hari Ini
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Ekspor Rekap Absen Guru ke Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Cetak Lembar Presensi Guru"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {!readOnly && (
            <button
              type="button"
              onClick={handleSaveAttendance}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                isDirty
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
              }`}
              title="Simpan data absensi guru hari ini ke server"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : isDirty ? 'Simpan Perubahan *' : 'Simpan Absen'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekend Notice */}
      {isWeekendSelected && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Peringatan Hari Libur:</strong> Tanggal yang dipilih ({formatDateIndo(selectedTanggal)}) jatuh pada akhir pekan (Sabtu / Minggu). Pastikan jadwal KBM berlangsung sebelum mencatat kehadiran.
          </span>
        </div>
      )}

      {/* 2. REKAP STATUS & STATISTIK PRESENSI CARDS */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Statistik Kehadiran Guru Hari Ini</span>
            </h3>
            {filterStatus !== 'semua' && (
              <button
                type="button"
                onClick={() => setFilterStatus('semua')}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>(Filter: {filterStatus === 'UNSET' ? 'Belum Diabsen' : filterStatus} • Tampilkan Semua)</span>
              </button>
            )}
          </div>

          {/* Quick Fast Action: Set Semua Hadir */}
          {!readOnly && displayedTeachers.length > 0 && (
            <button
              type="button"
              onClick={handleSetAllHadir}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              title="Tandai semua guru yang belum absen pada shift ini sebagai Hadir (H)"
            >
              <CheckCheck className="w-4 h-4 text-emerald-600" />
              <span>Set Semua Hadir (H)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {/* Card Total */}
          <button
            type="button"
            onClick={() => setFilterStatus('semua')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'semua'
                ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm ring-2 ring-blue-500/30'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total Guru</span>
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {attendanceStats.total}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Jadwal Mengajar</span>
          </button>

          {/* Card Hadir */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'H' ? 'semua' : 'H')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'H'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400 dark:border-emerald-600 shadow-sm ring-2 ring-emerald-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Hadir (H)</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {attendanceStats.hadir}
            </div>
            <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium mt-0.5">
              {attendanceStats.total > 0 ? `${Math.round((attendanceStats.hadir / attendanceStats.total) * 100)}% kehadiran` : '0%'}
            </span>
          </button>

          {/* Card Sakit */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'S' ? 'semua' : 'S')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'S'
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 shadow-sm ring-2 ring-amber-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Sakit (S)</span>
              <div className="w-7 h-7 rounded-xl bg-amber-100 dark:bg-amber-950/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {attendanceStats.sakit}
            </div>
            <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 font-medium mt-0.5">Surat Dokter</span>
          </button>

          {/* Card Izin */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'I' ? 'semua' : 'I')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'I'
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 shadow-sm ring-2 ring-blue-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400">Izin (I)</span>
              <div className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Info className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400">
              {attendanceStats.izin}
            </div>
            <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 font-medium mt-0.5">Surat Izin</span>
          </button>

          {/* Card Alpa */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'A' ? 'semua' : 'A')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'A'
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 shadow-sm ring-2 ring-rose-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Alpa (A)</span>
              <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <X className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
              {attendanceStats.alfa}
            </div>
            <span className="text-[10px] text-rose-600/70 dark:text-rose-400/70 font-medium mt-0.5">Tanpa Keterangan</span>
          </button>

          {/* Card Dinas */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'D' ? 'semua' : 'D')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'D'
                ? 'bg-purple-50 dark:bg-purple-950/50 border-purple-400 dark:border-purple-600 shadow-sm ring-2 ring-purple-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400">Dinas (D)</span>
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <BookOpen className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
              {attendanceStats.dinas}
            </div>
            <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 font-medium mt-0.5">Tugas Luar</span>
          </button>

          {/* Card Belum Diabsen */}
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'UNSET' ? 'semua' : 'UNSET')}
            className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              filterStatus === 'UNSET'
                ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 shadow-sm ring-2 ring-slate-500/40'
                : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Belum Diabsen</span>
              <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-700 dark:text-slate-300">
              {attendanceStats.belumAbsen}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Menunggu input</span>
          </button>
        </div>
      </div>

      {/* 3. BILAH SWITCHER CEPAT SHIFT & KELOMPOK AKTIF */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Semua Shift Aktif */}
          <button
            type="button"
            onClick={() => setActiveShiftOption('semua')}
            className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeShiftOption === 'semua'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Semua Shift Aktif</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeShiftOption === 'semua'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {groupCounts.all}
            </span>
          </button>

          {/* Shift Pagi Aktif */}
          <button
            type="button"
            onClick={() => setActiveShiftOption('pagi')}
            className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeShiftOption === 'pagi' || activeShiftOption === (k1Type === 'pagi' ? 'pagi_k1' : 'pagi_k2')
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/60'
            }`}
            title={`Shift Pagi Aktif: ${pagiClassesLabel} (${activePagiTime} WIB)`}
          >
            <Sun className="w-3.5 h-3.5 shrink-0" />
            <span>Shift Pagi • {pagiClassesLabel}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeShiftOption === 'pagi' || activeShiftOption === (k1Type === 'pagi' ? 'pagi_k1' : 'pagi_k2')
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-200/80 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
              }`}
            >
              {groupCounts.pagi}
            </span>
          </button>

          {/* Shift Siang Aktif */}
          <button
            type="button"
            onClick={() => setActiveShiftOption('siang')}
            className={`px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeShiftOption === 'siang' || activeShiftOption === (k1Type === 'siang' ? 'siang_k1' : 'siang_k2')
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50/80 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 dark:hover:bg-sky-900/60'
            }`}
            title={`Shift Siang Aktif: ${siangClassesLabel} (${activeSiangTime} WIB)`}
          >
            <Sunset className="w-3.5 h-3.5 shrink-0" />
            <span>Shift Siang • {siangClassesLabel}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeShiftOption === 'siang' || activeShiftOption === (k1Type === 'siang' ? 'siang_k1' : 'siang_k2')
                  ? 'bg-white/20 text-white'
                  : 'bg-sky-200/80 dark:bg-sky-900 text-sky-900 dark:text-sky-100'
              }`}
            >
              {groupCounts.siang}
            </span>
          </button>
        </div>

        {/* Layout Toggle (Grouped vs Flat) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setLayoutMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              layoutMode === 'grouped'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Tampilkan per kelompok kartu shift"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Per Shift &amp; Kelompok</span>
            <span className="sm:hidden">Grup</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('flat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              layoutMode === 'flat'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Tampilkan dalam satu tabel tunggal"
          >
            <Table2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tabel Tunggal</span>
            <span className="sm:hidden">Tabel</span>
          </button>
        </div>
      </div>

      {/* 4. SEARCH & STATUS FILTER BAR */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari guru, NIP, mapel, atau kelas..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer"
          >
            <option value="semua">Semua Status Kehadiran</option>
            <option value="H">Hadir (H)</option>
            <option value="S">Sakit (S)</option>
            <option value="I">Izin (I)</option>
            <option value="A">Alpa (A)</option>
            <option value="D">Dinas Luar (D)</option>
            <option value="T">Terlambat (T)</option>
            <option value="UNSET">Belum Diabsen</option>
          </select>
        </div>
      </div>

      {/* 5. MAIN CONTENT: GROUPED OR FLAT VIEW */}
      {layoutMode === 'grouped' ? (
        <div className="space-y-5">
          {dynamicActiveShiftGroups.filter((grp) => {
            if (activeShiftOption !== 'semua') {
              if (activeShiftOption === 'pagi' && grp.shift !== 'Pagi') return false;
              if (activeShiftOption === 'siang' && grp.shift !== 'Siang') return false;
              if (activeShiftOption !== 'pagi' && activeShiftOption !== 'siang' && grp.id !== activeShiftOption) return false;
            }
            return true;
          }).map((grp) => {
            const groupTeachers = displayedTeachers.filter((st) => st.shift === grp.shift);
            const Icon = grp.icon;

            return (
              <div
                key={grp.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all ${grp.accentBorder}`}
              >
                {/* Header */}
                <div
                  className={`p-4 sm:p-5 bg-gradient-to-r ${grp.headerColor} border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 shadow-xs border ${grp.badgeColor}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {grp.kelompokTitle} • {grp.shiftTitle}
                        </h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${grp.badgeColor}`}>
                          {grp.kelompokTingkat}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {grp.shift === 'Pagi' ? '☀️ Shift Pagi' : '🌤️ Shift Siang'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{grp.shiftWaktu}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {groupTeachers.length} Guru Terjadwal Hari Ini
                    </span>
                  </div>
                </div>

                {/* Subtable */}
                <div className="overflow-x-auto">
                  {groupTeachers.length === 0 ? (
                    <div className="py-10 px-4 text-center text-slate-400 dark:text-slate-500">
                      <Calendar className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                        Tidak ada guru yang terjadwal mengajar pada {grp.shiftTitle} {grp.kelompokTitle} hari {dayName}
                        {searchTerm || filterStatus !== 'semua' ? ' yang sesuai filter.' : '.'}
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
                          <th className="py-2.5 px-4 font-bold text-center w-12">No</th>
                          <th className="py-2.5 px-4 font-bold">Identitas Guru</th>
                          <th className="py-2.5 px-4 font-bold text-center">Detail Mengajar</th>
                          <th className="py-2.5 px-4 font-bold text-center">Status Kehadiran</th>
                          <th className="py-2.5 px-4 font-bold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {groupTeachers.map((st, idx) => {
                          const rec = attendanceRecords[st.key] || {
                            status: '',
                            jamMasuk: '',
                            jamPulang: '',
                            catatan: '',
                          };
                          const isCurrentUser =
                            currentUser.data?.username === st.guruUsername ||
                            (currentUser.data?.nip && currentUser.data?.nip === st.guruNip);

                          return (
                            <tr
                              key={st.key}
                              className={`transition ${
                                isCurrentUser
                                  ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/60'
                                  : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                              }`}
                            >
                              <td className="py-3 px-4 text-center text-slate-400 font-mono">
                                {idx + 1}
                              </td>

                              {/* Identitas Guru */}
                              <td className="py-3 px-4">
                                <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{st.guruNama}</span>
                                  {isCurrentUser && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                                      Akun Anda
                                    </span>
                                  )}
                                </div>
                                {st.guruNip && (
                                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    NIP: {st.guruNip}
                                  </div>
                                )}
                              </td>

                              {/* Tombol Masuk ke Detail Kelas & Mapel */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => setDetailTeacher(st)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-2xs group"
                                  title="Klik untuk melihat rincian mata pelajaran dan kelas ajar"
                                >
                                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                                  <span>Lihat Detail</span>
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                    {st.totalJp} JP
                                  </span>
                                </button>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-[200px] mx-auto font-medium">
                                  {st.mapelList.length} Mapel • {st.kelasList.length} Kelas
                                </div>
                              </td>

                              {/* Status Kehadiran Buttons */}
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                                  {/* Hadir (H) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'H')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'H'
                                        ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                        : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60'
                                    }`}
                                    title="Hadir (H)"
                                  >
                                    H
                                  </button>

                                  {/* Sakit (S) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'S')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'S'
                                        ? 'bg-amber-500 text-white shadow-xs scale-105'
                                        : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
                                    }`}
                                    title="Sakit (S)"
                                  >
                                    S
                                  </button>

                                  {/* Izin (I) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'I')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'I'
                                        ? 'bg-blue-600 text-white shadow-xs scale-105'
                                        : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60'
                                    }`}
                                    title="Izin (I)"
                                  >
                                    I
                                  </button>

                                  {/* Alpa (A) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'A')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'A'
                                        ? 'bg-rose-600 text-white shadow-xs scale-105'
                                        : 'text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60'
                                    }`}
                                    title="Alpa (A)"
                                  >
                                    A
                                  </button>

                                  {/* Dinas Luar (D) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'D')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'D'
                                        ? 'bg-purple-600 text-white shadow-xs scale-105'
                                        : 'text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/60'
                                    }`}
                                    title="Dinas Luar (D)"
                                  >
                                    D
                                  </button>

                                  {/* Terlambat (T) */}
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateStatus(st.key, 'T')}
                                    disabled={readOnly}
                                    className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                      rec.status === 'T'
                                        ? 'bg-orange-500 text-white shadow-xs scale-105'
                                        : 'text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/60'
                                    }`}
                                    title="Terlambat (T)"
                                  >
                                    T
                                  </button>
                                </div>
                              </td>

                              {/* Catatan / Keterangan */}
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  placeholder="Keterangan presensi..."
                                  value={rec.catatan || ''}
                                  onChange={(e) => handleUpdateField(st.key, 'catatan', e.target.value)}
                                  disabled={readOnly}
                                  className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT TABLE MODE */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 select-none">
                  <th className="py-3 px-4 font-bold text-center w-12">No</th>
                  <th className="py-3 px-4 font-bold">Shift &amp; Kelompok</th>
                  <th className="py-3 px-4 font-bold">Identitas Guru</th>
                  <th className="py-3 px-4 font-bold text-center">Detail Mengajar</th>
                  <th className="py-3 px-4 font-bold text-center">Status Kehadiran</th>
                  <th className="py-3 px-4 font-bold">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="font-semibold text-xs">
                        Tidak ada guru mengajar terjadwal pada filter yang dipilih.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedTeachers.map((st, idx) => {
                    const rec = attendanceRecords[st.key] || {
                      status: '',
                      jamMasuk: '',
                      jamPulang: '',
                      catatan: '',
                    };
                    const isCurrentUser =
                      currentUser.data?.username === st.guruUsername ||
                      (currentUser.data?.nip && currentUser.data?.nip === st.guruNip);

                    return (
                      <tr
                        key={st.key}
                        className={`transition ${
                          isCurrentUser
                            ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/60'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md border inline-block w-fit ${
                                st.kelompok === 1
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {st.kelompokLabel}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                              {st.shift === 'Pagi' ? '☀️ Shift Pagi' : '🌤️ Shift Siang'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{st.guruNama}</span>
                            {isCurrentUser && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                                Akun Anda
                              </span>
                            )}
                          </div>
                          {st.guruNip && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              NIP: {st.guruNip}
                            </div>
                          )}
                        </td>

                        {/* Tombol Masuk ke Detail Kelas & Mapel */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => setDetailTeacher(st)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-2xs group"
                            title="Klik untuk melihat rincian mata pelajaran dan kelas ajar"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                            <span>Lihat Detail</span>
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {st.totalJp} JP
                            </span>
                          </button>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-[200px] mx-auto font-medium">
                            {st.mapelList.length} Mapel • {st.kelasList.length} Kelas
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'H')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'H'
                                  ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                  : 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                              }`}
                              title="Hadir (H)"
                            >
                              H
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'S')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'S'
                                  ? 'bg-amber-500 text-white shadow-xs scale-105'
                                  : 'text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                              }`}
                              title="Sakit (S)"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'I')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'I'
                                  ? 'bg-blue-600 text-white shadow-xs scale-105'
                                  : 'text-blue-700 dark:text-blue-300 hover:bg-blue-100'
                              }`}
                              title="Izin (I)"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'A')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'A'
                                  ? 'bg-rose-600 text-white shadow-xs scale-105'
                                  : 'text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                              }`}
                              title="Alpa (A)"
                            >
                              A
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'D')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'D'
                                  ? 'bg-purple-600 text-white shadow-xs scale-105'
                                  : 'text-purple-700 dark:text-purple-300 hover:bg-purple-100'
                              }`}
                              title="Dinas Luar (D)"
                            >
                              D
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(st.key, 'T')}
                              disabled={readOnly}
                              className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer flex items-center justify-center ${
                                rec.status === 'T'
                                  ? 'bg-orange-500 text-white shadow-xs scale-105'
                                  : 'text-orange-700 dark:text-orange-300 hover:bg-orange-100'
                              }`}
                              title="Terlambat (T)"
                            >
                              T
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="Keterangan..."
                            value={rec.catatan || ''}
                            onChange={(e) => handleUpdateField(st.key, 'catatan', e.target.value)}
                            disabled={readOnly}
                            className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TEACHER DETAIL MODAL (KELAS, MAPEL, JADWAL & PRESENSI) */}
      {detailTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Detail Mengajar &amp; Jadwal Guru
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Hari {dayName}, {formatDateIndo(selectedTanggal)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailTeacher(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Guru Info Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identitas Guru</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    {detailTeacher.guruNama}
                  </div>
                  {detailTeacher.guruNip && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      NIP: {detailTeacher.guruNip}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs font-black px-2.5 py-1 rounded-xl border ${
                      detailTeacher.shift === 'Pagi'
                        ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-sky-50 dark:bg-sky-950 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-700'
                    }`}
                  >
                    {detailTeacher.shift === 'Pagi' ? '☀️ Shift Pagi' : '🌤️ Shift Siang'}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    {detailTeacher.kelompokLabel}
                  </span>
                </div>
              </div>

              {/* Badges Summary */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 text-center">
                  <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{detailTeacher.totalJp}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Total JP</div>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 text-center">
                  <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{detailTeacher.mapelList.length}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mata Pelajaran</div>
                </div>
                <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 text-center">
                  <div className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">{detailTeacher.kelasList.length}</div>
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kelas Ajar</div>
                </div>
              </div>

              {/* Mata Pelajaran & Kelas Pills */}
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                    <span>Mata Pelajaran yang Diajar:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailTeacher.mapelList.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      >
                        📚 {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-500" />
                    <span>Kelas yang Diajar Hari Ini:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detailTeacher.kelasList.map((k, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      >
                        🏫 {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Jadwal Mengajar Detailed Breakdown */}
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  Rincian Sesi Mengajar Hari {dayName}:
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2.5 px-3 font-bold text-center w-8">No</th>
                        <th className="py-2.5 px-3 font-bold">Kelas</th>
                        <th className="py-2.5 px-3 font-bold">Mata Pelajaran</th>
                        <th className="py-2.5 px-3 font-bold text-center">Jam Ke</th>
                        <th className="py-2.5 px-3 font-bold text-center">Durasi JP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {detailTeacher.schedules.map((sch, sIdx) => (
                        <tr key={sIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{sIdx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {sch.kelasNama}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400">
                            {sch.mataPelajaran}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                            {sch.jamKeStr || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                            {sch.jp} JP
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Attendance Controls inside Detail Modal */}
              {(() => {
                const rec = attendanceRecords[detailTeacher.key] || {
                  status: '',
                  jamMasuk: '',
                  jamPulang: '',
                  catatan: '',
                };
                return (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        Presensi Kehadiran Guru:
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        Status: {rec.status ? { H: 'Hadir (H)', S: 'Sakit (S)', I: 'Izin (I)', A: 'Alpa (A)', D: 'Dinas (D)', T: 'Terlambat (T)' }[rec.status] || rec.status : 'Belum Diabsen'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { code: 'H' as const, label: 'Hadir (H)', color: 'bg-emerald-600 text-white hover:bg-emerald-700', active: rec.status === 'H', inactive: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' },
                        { code: 'S' as const, label: 'Sakit (S)', color: 'bg-amber-500 text-white hover:bg-amber-600', active: rec.status === 'S', inactive: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800' },
                        { code: 'I' as const, label: 'Izin (I)', color: 'bg-blue-600 text-white hover:bg-blue-700', active: rec.status === 'I', inactive: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' },
                        { code: 'A' as const, label: 'Alpa (A)', color: 'bg-rose-600 text-white hover:bg-rose-700', active: rec.status === 'A', inactive: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800' },
                        { code: 'D' as const, label: 'Dinas (D)', color: 'bg-purple-600 text-white hover:bg-purple-700', active: rec.status === 'D', inactive: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800' },
                        { code: 'T' as const, label: 'Terlambat (T)', color: 'bg-orange-500 text-white hover:bg-orange-600', active: rec.status === 'T', inactive: 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800' },
                      ].map((btn) => (
                        <button
                          key={btn.code}
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleUpdateStatus(detailTeacher.key, btn.code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            btn.active ? `${btn.color} shadow-xs font-black` : btn.inactive
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Catatan / keterangan presensi guru..."
                        value={rec.catatan || ''}
                        onChange={(e) => handleUpdateField(detailTeacher.key, 'catatan', e.target.value)}
                        disabled={readOnly}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
              <span className="text-xs text-slate-500">
                Perubahan presensi langsung diperbarui di tabel.
              </span>
              <button
                type="button"
                onClick={() => setDetailTeacher(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                Selesai / Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PRINT MODAL SHEET */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Printer className="w-5 h-5 text-blue-600" />
                  <span>Pratinjau Lembar Presensi Harian Guru Mengajar</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hari {dayName}, {formatDateIndo(selectedTanggal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Preview Body */}
            <div className="p-6 overflow-y-auto space-y-4 print:p-0">
              <div className="text-center pb-4 border-b border-slate-300 dark:border-slate-700">
                <h2 className="text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  {appData.sekolah?.nama || 'SMK NEGERI'}
                </h2>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  LEMBAR PRESENSI &amp; KEHADIRAN HARIAN GURU MENGAJAR
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Hari: <strong>{dayName}</strong> | Tanggal: <strong>{formatDateIndo(selectedTanggal)}</strong>
                </p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300 dark:border-slate-700 border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-300">
                    <th className="p-2 border border-slate-300 text-center w-8">No</th>
                    <th className="p-2 border border-slate-300">Nama Guru / NIP</th>
                    <th className="p-2 border border-slate-300">Kelompok &amp; Shift</th>
                    <th className="p-2 border border-slate-300">Mapel &amp; Kelas</th>
                    <th className="p-2 border border-slate-300 text-center">Status</th>
                    <th className="p-2 border border-slate-300">Keterangan</th>
                    <th className="p-2 border border-slate-300 text-center w-24">Tanda Tangan</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedTeachers.map((st, idx) => {
                    const rec = attendanceRecords[st.key];
                    const statusText = rec?.status
                      ? { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa', D: 'Dinas', T: 'Terlambat' }[rec.status] || rec.status
                      : '-';
                    return (
                      <tr key={st.key} className="border-b border-slate-300">
                        <td className="p-2 border border-slate-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300 font-bold">
                          {st.guruNama}
                          {st.guruNip && <div className="text-[10px] text-slate-500 font-mono font-normal">NIP: {st.guruNip}</div>}
                        </td>
                        <td className="p-2 border border-slate-300">
                          {st.kelompokLabel} • {st.shift}
                        </td>
                        <td className="p-2 border border-slate-300">
                          {st.mapelList.join(', ')} ({st.kelasList.join(', ')})
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold">{statusText}</td>
                        <td className="p-2 border border-slate-300 italic">{rec?.catatan || '-'}</td>
                        <td className="p-2 border border-slate-300 h-8"></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Signature Area */}
              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div>
                  <p>Petugas Piket / Kurikulum,</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{currentUser.data?.nama || 'Petugas Kurikulum'}</p>
                </div>
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala Sekolah</p>
                  <div className="h-16"></div>
                  <p className="font-bold underline">{appData.sekolah?.namaKepalaSekolah || 'Kepala Sekolah'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Presensi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
