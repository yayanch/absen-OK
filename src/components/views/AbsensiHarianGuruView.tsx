import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Sun,
  Sunset,
  Calendar,
  Clock,
  UserCheck,
  Users,
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
  Printer,
  RotateCcw,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Send,
  Check,
  Loader2,
  FileText,
  X,
  Building
} from 'lucide-react';
import {
  AppData,
  UserSession,
  GuruPresensiItem,
  SyncResult
} from '../../types';
import {
  getTodayString,
  formatDateIndo,
  getIndonesianDayName,
  determineKelasKelompok,
  cleanMapelName
} from '../../utils/helpers';
import { PageHeader } from '../common/UIComponents';

export type ShiftOptionId = 'pagi_k1' | 'siang_k1' | 'pagi_k2' | 'siang_k2';

export interface ShiftOption {
  id: ShiftOptionId;
  label: string;
  shift: 'Pagi' | 'Siang';
  kelompok: 1 | 2;
  kelompokLabel: string;
  tingkatLabel: string;
  icon: typeof Sun;
  activeBg: string;
}

export const SHIFT_OPTIONS: ShiftOption[] = [
  {
    id: 'pagi_k1',
    label: 'Shift Pagi Kelas X & XI',
    shift: 'Pagi',
    kelompok: 1,
    kelompokLabel: 'Kelas X & XI',
    tingkatLabel: 'Kelas X & XI',
    icon: Sun,
    activeBg: 'bg-amber-500 text-white shadow-xs',
  },
  {
    id: 'siang_k1',
    label: 'Shift Siang Kelas X & XI',
    shift: 'Siang',
    kelompok: 1,
    kelompokLabel: 'Kelas X & XI',
    tingkatLabel: 'Kelas X & XI',
    icon: Sunset,
    activeBg: 'bg-indigo-600 text-white shadow-xs',
  },
  {
    id: 'pagi_k2',
    label: 'Shift Pagi Kelas XII',
    shift: 'Pagi',
    kelompok: 2,
    kelompokLabel: 'Kelas XII',
    tingkatLabel: 'Kelas XII',
    icon: Sun,
    activeBg: 'bg-amber-500 text-white shadow-xs',
  },
  {
    id: 'siang_k2',
    label: 'Shift Siang Kelas XII',
    shift: 'Siang',
    kelompok: 2,
    kelompokLabel: 'Kelas XII',
    tingkatLabel: 'Kelas XII',
    icon: Sunset,
    activeBg: 'bg-indigo-600 text-white shadow-xs',
  },
];

export const HARI_KERJA_TABS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
export type HariKerja = (typeof HARI_KERJA_TABS)[number];

const HARI_MAP: Record<number, HariKerja> = {
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
};

// Helper: Calculate date string (YYYY-MM-DD) for a specific weekday in the same week as reference date
function getDateForWeekdayInWeek(refDateStr: string, targetDay: HariKerja): string {
  const parts = refDateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const cur = new Date(y, m, d);

  // JavaScript: 0 is Sunday, 1 is Monday ... 6 is Saturday
  const currentDayOfWeek = cur.getDay(); // 0-6
  const normalizedCurrent = currentDayOfWeek === 0 ? 7 : currentDayOfWeek; // 1-7 (Mon=1, Sun=7)

  const dayTargetMap: Record<HariKerja, number> = {
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
  };
  const targetDayNum = dayTargetMap[targetDay] || 1;
  const diff = targetDayNum - normalizedCurrent;

  const targetDate = new Date(cur);
  targetDate.setDate(cur.getDate() + diff);

  const tY = targetDate.getFullYear();
  const tM = String(targetDate.getMonth() + 1).padStart(2, '0');
  const tD = String(targetDate.getDate()).padStart(2, '0');
  return `${tY}-${tM}-${tD}`;
}

interface ScheduledTeacherItem {
  guruKey: string;
  guruId: string;
  guruUsername: string;
  guruNama: string;
  guruNip: string;
  guruFoto?: string;
  guruNoHp?: string;
  jadwalItems: {
    id: string;
    kelasNama: string;
    mataPelajaran: string;
    jamKe?: string;
    jamKeList?: number[];
    jumlahJp?: number;
    jamMulai?: string;
    jamSelesai?: string;
  }[];
  classesList: string[];
  subjectsList: string[];
  totalJp: number;
}

interface AbsensiHarianGuruViewProps {
  appData: AppData;
  currentUser: UserSession;
  onSavePresensi?: (nextAppData: AppData) => Promise<SyncResult>;
  onUpdateAppData?: (updated: AppData | ((prev: AppData) => AppData)) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (title: string, message: string, variant: string, onConfirm: () => void) => void;
  onNavigateView?: (view: any) => void;
}

export const AbsensiHarianGuruView: React.FC<AbsensiHarianGuruViewProps> = ({
  appData,
  currentUser,
  onSavePresensi,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
  onNavigateView
}) => {
  // 1. STATE: Selected Date
  const todayStr = useMemo(() => getTodayString(), []);
  const [selectedTanggal, setSelectedTanggal] = useState<string>(todayStr);

  // 2. STATE: Active Shift (defaults to Shift Pagi Kelas X & XI)
  const [activeShiftId, setActiveShiftId] = useState<ShiftOptionId>('pagi_k1');
  const activeShift = useMemo(() => {
    return SHIFT_OPTIONS.find((s) => s.id === activeShiftId) || SHIFT_OPTIONS[0];
  }, [activeShiftId]);

  // 3. STATE: Active Day Tab (defaults to today's weekday if Mon-Fri, else 'Senin')
  const initialDayName = useMemo<HariKerja>(() => {
    const raw = getIndonesianDayName(todayStr);
    if (HARI_KERJA_TABS.includes(raw as HariKerja)) {
      return raw as HariKerja;
    }
    return 'Senin';
  }, [todayStr]);

  const [activeDay, setActiveDay] = useState<HariKerja>(initialDayName);

  // Sync activeDay if selectedTanggal changes to a valid weekday
  useEffect(() => {
    const dayName = getIndonesianDayName(selectedTanggal);
    if (HARI_KERJA_TABS.includes(dayName as HariKerja)) {
      setActiveDay(dayName as HariKerja);
    }
  }, [selectedTanggal]);

  // 4. Local Attendance Draft for current selectedTanggal
  // Map of teacherKey -> GuruPresensiItem
  const [recordsMap, setRecordsMap] = useState<Record<string, GuruPresensiItem>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Initialize recordsMap from appData.presensiGuru whenever selectedTanggal changes
  useEffect(() => {
    const savedList: GuruPresensiItem[] = appData.presensiGuru?.[selectedTanggal] || [];
    const map: Record<string, GuruPresensiItem> = {};
    savedList.forEach((item) => {
      const key = item.guruUsername || item.guruId || item.guruNama;
      map[key] = item;
    });
    setRecordsMap(map);
    setIsDirty(false);
  }, [selectedTanggal, appData.presensiGuru]);

  // Helper lookup for teachers profile in appData.waliKelas
  const teachersProfileMap = useMemo(() => {
    const map = new Map<string, any>();
    (appData.waliKelas || []).forEach((w) => {
      if (w.id) map.set(w.id.toLowerCase(), w);
      if (w.username) map.set(w.username.toLowerCase(), w);
      if (w.nip) map.set(w.nip.toLowerCase(), w);
      if (w.nama) map.set(w.nama.toLowerCase(), w);
    });
    return map;
  }, [appData.waliKelas]);

  // 5. EXTRACT SCHEDULED TEACHERS FROM #jadwal_mengajar FOR EACH DAY & SHIFT
  // Calculate counts for all 5 days for the active shift
  const dayScheduleStats = useMemo(() => {
    const allJadwal = appData.jadwalMengajar || [];
    const stats: Record<HariKerja, { teacherCount: number; jadwalCount: number }> = {
      Senin: { teacherCount: 0, jadwalCount: 0 },
      Selasa: { teacherCount: 0, jadwalCount: 0 },
      Rabu: { teacherCount: 0, jadwalCount: 0 },
      Kamis: { teacherCount: 0, jadwalCount: 0 },
      Jumat: { teacherCount: 0, jadwalCount: 0 },
    };

    HARI_KERJA_TABS.forEach((day) => {
      const matched = allJadwal.filter((j: any) => {
        if ((j.hari || '').toLowerCase() !== day.toLowerCase()) return false;

        const targetKelas = (appData.kelas || []).find((k) => k.id === j.kelasId || k.nama === j.kelasNama);
        const kelasNama = targetKelas?.nama || j.kelasNama || '';
        const kelompok = determineKelasKelompok(kelasNama);
        if (kelompok !== activeShift.kelompok) return false;

        const itemShift = (j.shift || 'Pagi').toLowerCase();
        return itemShift === activeShift.shift.toLowerCase();
      });

      const uniqueTeachers = new Set<string>();
      matched.forEach((m) => {
        const key = m.guruUsername || m.guruId || m.guruNama;
        if (key) uniqueTeachers.add(key);
      });

      stats[day] = {
        teacherCount: uniqueTeachers.size,
        jadwalCount: matched.length,
      };
    });

    return stats;
  }, [appData.jadwalMengajar, appData.kelas, activeShift]);

  // List of teachers teaching on activeShift and activeDay
  const scheduledTeachers = useMemo<ScheduledTeacherItem[]>(() => {
    const allJadwal = appData.jadwalMengajar || [];

    const matchedJadwal = allJadwal.filter((j: any) => {
      // 1. Day match
      if ((j.hari || '').toLowerCase() !== activeDay.toLowerCase()) return false;

      // 2. Class Kelompok match (1 = Kelas X & XI, 2 = Kelas XII)
      const targetKelas = (appData.kelas || []).find((k) => k.id === j.kelasId || k.nama === j.kelasNama);
      const kelasNama = targetKelas?.nama || j.kelasNama || '';
      const kelompok = determineKelasKelompok(kelasNama);
      if (kelompok !== activeShift.kelompok) return false;

      // 3. Shift match ('Pagi' vs 'Siang')
      const itemShift = (j.shift || 'Pagi').toLowerCase();
      if (itemShift !== activeShift.shift.toLowerCase()) return false;

      return true;
    });

    // Group by teacher
    const teacherMap = new Map<string, ScheduledTeacherItem>();

    matchedJadwal.forEach((j: any) => {
      const guruKey = j.guruUsername || j.guruId || j.guruNama || 'unknown';
      const existing = teacherMap.get(guruKey);

      // Lookup profile
      const prof =
        teachersProfileMap.get((j.guruUsername || '').toLowerCase()) ||
        teachersProfileMap.get((j.guruId || '').toLowerCase()) ||
        teachersProfileMap.get((j.guruNama || '').toLowerCase());

      const rawJp = j.jamKeList?.length || j.jumlahJp || 1;
      const cleanMapel = cleanMapelName(j.mataPelajaran);

      if (existing) {
        existing.jadwalItems.push({
          id: j.id,
          kelasNama: j.kelasNama || '-',
          mataPelajaran: cleanMapel,
          jamKe: j.jamKe,
          jamKeList: j.jamKeList,
          jumlahJp: rawJp,
          jamMulai: j.jamMulai,
          jamSelesai: j.jamSelesai,
        });
        if (j.kelasNama && !existing.classesList.includes(j.kelasNama)) {
          existing.classesList.push(j.kelasNama);
        }
        if (cleanMapel && !existing.subjectsList.includes(cleanMapel)) {
          existing.subjectsList.push(cleanMapel);
        }
        existing.totalJp += rawJp;
      } else {
        teacherMap.set(guruKey, {
          guruKey,
          guruId: j.guruId || prof?.id || guruKey,
          guruUsername: j.guruUsername || prof?.username || guruKey,
          guruNama: prof?.nama || j.guruNama || 'Guru Pengajar',
          guruNip: prof?.nip || j.guruNip || '-',
          guruFoto: prof?.foto || '',
          guruNoHp: prof?.noHp || '',
          jadwalItems: [
            {
              id: j.id,
              kelasNama: j.kelasNama || '-',
              mataPelajaran: cleanMapel,
              jamKe: j.jamKe,
              jamKeList: j.jamKeList,
              jumlahJp: rawJp,
              jamMulai: j.jamMulai,
              jamSelesai: j.jamSelesai,
            },
          ],
          classesList: j.kelasNama ? [j.kelasNama] : [],
          subjectsList: cleanMapel ? [cleanMapel] : [],
          totalJp: rawJp,
        });
      }
    });

    // Sort alphabetically by teacher name
    return Array.from(teacherMap.values()).sort((a, b) => a.guruNama.localeCompare(b.guruNama, 'id-ID'));
  }, [appData.jadwalMengajar, appData.kelas, activeDay, activeShift, teachersProfileMap]);

  // Filtered teachers by search query and status filter
  const filteredTeachers = useMemo(() => {
    return scheduledTeachers.filter((t) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = t.guruNama.toLowerCase().includes(q);
        const matchNip = t.guruNip.toLowerCase().includes(q);
        const matchMapel = t.subjectsList.some((s) => s.toLowerCase().includes(q));
        const matchKelas = t.classesList.some((c) => c.toLowerCase().includes(q));
        if (!matchName && !matchNip && !matchMapel && !matchKelas) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        const record = recordsMap[t.guruKey];
        const curStatus = record?.status || '';
        if (statusFilter === 'UNSET' && curStatus !== '') return false;
        if (statusFilter !== 'UNSET' && curStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [scheduledTeachers, searchQuery, statusFilter, recordsMap]);

  // Aggregate attendance statistics for currently scheduled teachers
  const statsSummary = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let dinasLuar = 0;
    let alpa = 0;
    let unset = 0;

    scheduledTeachers.forEach((t) => {
      const rec = recordsMap[t.guruKey];
      const s = rec?.status || '';
      if (s === 'H') hadir++;
      else if (s === 'T') terlambat++;
      else if (s === 'I') izin++;
      else if (s === 'S') sakit++;
      else if (s === 'D') dinasLuar++;
      else if (s === 'A') alpa++;
      else unset++;
    });

    const total = scheduledTeachers.length;
    const sudahDiisi = total - unset;
    const percentage = total > 0 ? Math.round((sudahDiisi / total) * 100) : 0;

    return {
      total,
      hadir,
      terlambat,
      izin,
      sakit,
      dinasLuar,
      alpa,
      unset,
      sudahDiisi,
      percentage,
    };
  }, [scheduledTeachers, recordsMap]);

  // 6. ACTION HANDLERS
  const handleDayTabClick = (day: HariKerja) => {
    setActiveDay(day);
    // Align selectedTanggal to that weekday in the current week
    const targetDate = getDateForWeekdayInWeek(selectedTanggal, day);
    setSelectedTanggal(targetDate);
  };

  const handleUpdateRecord = (guruKey: string, updates: Partial<GuruPresensiItem>) => {
    setRecordsMap((prev) => {
      const existing = prev[guruKey];
      const teacher = scheduledTeachers.find((t) => t.guruKey === guruKey);

      const defaultJamMasuk = activeShift.shift === 'Pagi' ? '06:45' : '12:45';
      const defaultJamPulang = activeShift.shift === 'Pagi' ? '12:00' : '16:50';

      const updatedItem: GuruPresensiItem = {
        id: existing?.id || `GPR-${selectedTanggal}-${guruKey}`,
        guruId: teacher?.guruId || guruKey,
        guruUsername: teacher?.guruUsername || guruKey,
        guruNama: teacher?.guruNama || 'Guru',
        guruNip: teacher?.guruNip || '-',
        tanggal: selectedTanggal,
        hari: activeDay,
        status: updates.status !== undefined ? updates.status : existing?.status || '',
        jamMasuk: updates.jamMasuk !== undefined ? updates.jamMasuk : existing?.jamMasuk || defaultJamMasuk,
        jamPulang: updates.jamPulang !== undefined ? updates.jamPulang : existing?.jamPulang || defaultJamPulang,
        catatan: updates.catatan !== undefined ? updates.catatan : existing?.catatan || '',
        jadwalHariIni: teacher
          ? `${teacher.subjectsList.join(', ')} (${teacher.classesList.join(', ')})`
          : existing?.jadwalHariIni || '',
        sumberPresensi: 'Manual',
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.data?.nama || currentUser.data?.username || 'Admin',
        ...updates,
      };

      return {
        ...prev,
        [guruKey]: updatedItem,
      };
    });
    setIsDirty(true);
  };

  // Batch action: Set All Hadir
  const handleSetAllHadir = () => {
    if (scheduledTeachers.length === 0) return;
    const defaultJamMasuk = activeShift.shift === 'Pagi' ? '06:45' : '12:45';
    const defaultJamPulang = activeShift.shift === 'Pagi' ? '12:00' : '16:50';

    setRecordsMap((prev) => {
      const next = { ...prev };
      scheduledTeachers.forEach((t) => {
        const existing = next[t.guruKey];
        next[t.guruKey] = {
          id: existing?.id || `GPR-${selectedTanggal}-${t.guruKey}`,
          guruId: t.guruId,
          guruUsername: t.guruUsername,
          guruNama: t.guruNama,
          guruNip: t.guruNip,
          tanggal: selectedTanggal,
          hari: activeDay,
          status: 'H',
          jamMasuk: existing?.jamMasuk || defaultJamMasuk,
          jamPulang: existing?.jamPulang || defaultJamPulang,
          catatan: existing?.catatan || '',
          jadwalHariIni: `${t.subjectsList.join(', ')} (${t.classesList.join(', ')})`,
          sumberPresensi: 'Manual',
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.data?.nama || currentUser.data?.username || 'Admin',
        };
      });
      return next;
    });
    setIsDirty(true);
    onShowToast?.(`Seluruh ${scheduledTeachers.length} guru di ${activeShift.label} hari ${activeDay} ditandai Hadir.`, 'info');
  };

  // Batch action: Reset Status
  const handleResetAll = () => {
    if (onConfirmModal) {
      onConfirmModal(
        'Reset Presensi Guru',
        `Kosongkan seluruh status presensi untuk ${scheduledTeachers.length} guru pada ${activeShift.label} hari ${activeDay}?`,
        'warning',
        () => {
          setRecordsMap((prev) => {
            const next = { ...prev };
            scheduledTeachers.forEach((t) => {
              if (next[t.guruKey]) {
                next[t.guruKey] = {
                  ...next[t.guruKey],
                  status: '',
                  catatan: '',
                };
              }
            });
            return next;
          });
          setIsDirty(true);
          onShowToast?.('Status presensi guru berhasil dikosongkan.', 'info');
        }
      );
    }
  };

  // Save to AppData and Server
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentList: GuruPresensiItem[] = Object.values(recordsMap).filter(
        (item) => item && (item.status || item.jamMasuk || item.catatan)
      );

      const nextPresensiGuru: Record<string, GuruPresensiItem[]> = {
        ...(appData.presensiGuru || {}),
        [selectedTanggal]: currentList,
      };

      const updatedAppData: AppData = {
        ...appData,
        presensiGuru: nextPresensiGuru,
      };

      if (onSavePresensi) {
        const res = await onSavePresensi(updatedAppData);
        if (res.success) {
          setIsDirty(false);
          onShowToast?.(`Presensi guru untuk tanggal ${formatDateIndo(selectedTanggal)} berhasil disimpan!`, 'success');
        } else {
          onShowToast?.(`Gagal menyimpan: ${res.message || 'Terjadi kesalahan sistem'}`, 'error');
        }
      } else if (onUpdateAppData) {
        onUpdateAppData(updatedAppData);
        setIsDirty(false);
        onShowToast?.(`Presensi guru berhasil diperbarui!`, 'success');
      }
    } catch (err: any) {
      onShowToast?.(`Terjadi kesalahan saat menyimpan presensi guru: ${err?.message || err}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick navigation days
  const handleStepDay = (step: number) => {
    const parts = selectedTanggal.split('-');
    const cur = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    cur.setDate(cur.getDate() + step);
    const nY = cur.getFullYear();
    const nM = String(cur.getMonth() + 1).padStart(2, '0');
    const nD = String(cur.getDate()).padStart(2, '0');
    setSelectedTanggal(`${nY}-${nM}-${nD}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-12">
      {/* 1. PAGE HEADER */}
      <PageHeader
        title="Absensi Harian Guru"
        description="Presensi kehadiran harian guru mengajar berdasarkan shift dan jadwal pelajaran KBM (Senin - Jumat)"
        icon={UserCheck}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 cursor-pointer border border-white/20 shadow-xs"
              title="Cetak Rekap Presensi Shift Ini"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                isDirty
                  ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              } disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isDirty ? 'Simpan Perubahan' : 'Tersimpan'}</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* 2. DATE SELECTOR & CALENDAR CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-theme-primary/10 text-theme-primary flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Tanggal Presensi Terpilih
            </div>
            <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span>{formatDateIndo(selectedTanggal)}</span>
              {selectedTanggal === todayStr && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Hari Ini
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleStepDay(-1)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => e.target.value && setSelectedTanggal(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 dark:text-white px-2 py-1 focus:outline-none cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleStepDay(1)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-lg transition cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedTanggal(todayStr)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {/* 3. SHIFT SWITCHER (UI SHIFT SEPERTI PADA GAMBAR) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5 flex items-center justify-between">
            <span>Pilih Shift Pembelajaran</span>
            <span className="text-[10px] font-semibold text-slate-500">
              Shift Aktif: <strong className="text-slate-800 dark:text-white">{activeShift.label}</strong>
            </span>
          </div>

          {/* 4 Shift Pills (Exact styling matching provided UI image) */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs">
            {SHIFT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = activeShiftId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveShiftId(opt.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isActive
                      ? opt.activeBg
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. TAB HARI SENIN - JUMAT */}
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Pilih Hari Mengajar (Senin - Jumat)
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {HARI_KERJA_TABS.map((day) => {
              const isActive = activeDay === day;
              const stats = dayScheduleStats[day] || { teacherCount: 0, jadwalCount: 0 };
              const isToday = getIndonesianDayName(todayStr) === day;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayTabClick(day)}
                  className={`p-3 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                    isActive
                      ? 'bg-theme-primary/10 border-theme-primary text-theme-primary shadow-xs ring-2 ring-theme-primary/20'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm sm:text-base">{day}</span>
                    {isToday && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className={isActive ? 'font-bold' : 'text-slate-400 dark:text-slate-500'}>
                      {stats.teacherCount} Guru Mengajar
                    </span>
                    <span className="opacity-60 text-[10px]">
                      {stats.jadwalCount} KBM
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. SUMMARY STATS BADGES FOR ACTIVE SHIFT & DAY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Guru</div>
          <div className="text-xl font-black text-slate-800 dark:text-white mt-1">{statsSummary.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Jadwal Shift</div>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Hadir (H)</div>
          <div className="text-xl font-black text-emerald-800 dark:text-emerald-200 mt-1">{statsSummary.hadir}</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Tepat Waktu</div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Terlambat (T)</div>
          <div className="text-xl font-black text-amber-800 dark:text-amber-200 mt-1">{statsSummary.terlambat}</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Kesiangan</div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-200 dark:border-blue-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Izin (I)</div>
          <div className="text-xl font-black text-blue-800 dark:text-blue-200 mt-1">{statsSummary.izin}</div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Ada Surat</div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">Sakit (S)</div>
          <div className="text-xl font-black text-purple-800 dark:text-purple-200 mt-1">{statsSummary.sakit}</div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">Surat Dokter</div>
        </div>

        <div className="bg-sky-50 dark:bg-sky-950/30 p-3 rounded-2xl border border-sky-200 dark:border-sky-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">Dinas Luar (D)</div>
          <div className="text-xl font-black text-sky-800 dark:text-sky-200 mt-1">{statsSummary.dinasLuar}</div>
          <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-0.5">Tugas Sekolah</div>
        </div>

        <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-200 dark:border-rose-800/50 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Alpa (A)</div>
          <div className="text-xl font-black text-rose-800 dark:text-rose-200 mt-1">{statsSummary.alpa}</div>
          <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">Tanpa Berita</div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-2xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Belum Diisi</div>
          <div className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">{statsSummary.unset}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{statsSummary.percentage}% Lengkap</div>
        </div>
      </div>

      {/* 6. SEARCH & QUICK BATCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru, NIP, mapel, atau kelas..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/20 focus:border-theme-primary transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Batch Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status ({scheduledTeachers.length})</option>
            <option value="H">Hadir ({statsSummary.hadir})</option>
            <option value="T">Terlambat ({statsSummary.terlambat})</option>
            <option value="I">Izin ({statsSummary.izin})</option>
            <option value="S">Sakit ({statsSummary.sakit})</option>
            <option value="D">Dinas Luar ({statsSummary.dinasLuar})</option>
            <option value="A">Alpa ({statsSummary.alpa})</option>
            <option value="UNSET">Belum Diisi ({statsSummary.unset})</option>
          </select>

          <button
            type="button"
            onClick={handleSetAllHadir}
            disabled={scheduledTeachers.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Tandai seluruh guru yang mengajar hari ini sebagai Hadir"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Set Semua Hadir</span>
          </button>

          <button
            type="button"
            onClick={handleResetAll}
            disabled={scheduledTeachers.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-40"
            title="Kosongkan status presensi"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 7. TEACHERS LIST (TAKEN FROM #jadwal_mengajar) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
              <span>Daftar Guru Mengajar</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-theme-primary/10 text-theme-primary border border-theme-primary/20">
                {activeShift.label} • {activeDay}
              </span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Data guru diambil otomatis dari jadwal mengajar KBM aktif ({filteredTeachers.length} dari {scheduledTeachers.length} guru)
            </p>
          </div>

          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kelola Jadwal Mengajar</span>
            </button>
          )}
        </div>

        {scheduledTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <UserCheck className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Tidak ada jadwal mengajar pada {activeShift.label} hari {activeDay}.
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Tidak ditemukan data guru yang terjadwal mengajar untuk kombinasi shift dan hari ini pada database jadwal pelajaran.
            </p>
            {onNavigateView && (
              <button
                type="button"
                onClick={() => onNavigateView('jadwal_mengajar')}
                className="mt-4 px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs inline-flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Buka Menu Jadwal Mengajar</span>
              </button>
            )}
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-700 dark:text-slate-300">Tidak ada guru yang sesuai dengan filter.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg transition cursor-pointer"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTeachers.map((t, idx) => {
              const record = recordsMap[t.guruKey];
              const curStatus = record?.status || '';
              const jamMasuk = record?.jamMasuk || '';
              const jamPulang = record?.jamPulang || '';
              const catatan = record?.catatan || '';

              return (
                <div
                  key={t.guruKey}
                  className={`p-4 sm:p-5 transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    curStatus === 'H'
                      ? 'border-l-4 border-l-emerald-500'
                      : curStatus === 'T'
                      ? 'border-l-4 border-l-amber-500'
                      : curStatus === 'I'
                      ? 'border-l-4 border-l-blue-500'
                      : curStatus === 'S'
                      ? 'border-l-4 border-l-purple-500'
                      : curStatus === 'D'
                      ? 'border-l-4 border-l-sky-500'
                      : curStatus === 'A'
                      ? 'border-l-4 border-l-rose-500'
                      : 'border-l-4 border-l-slate-200 dark:border-l-slate-700'
                  }`}
                >
                  {/* Left: Teacher Info & Teaching Sessions */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-white">
                          {t.guruNama}
                        </span>
                        {t.guruNip && t.guruNip !== '-' && (
                          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            NIP. {t.guruNip}
                          </span>
                        )}
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-theme-primary/10 text-theme-primary">
                          Total {t.totalJp} JP
                        </span>
                      </div>

                      {/* Scheduled Classes & Subjects Badges */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {t.jadwalItems.map((jItem, jIdx) => (
                          <div
                            key={jItem.id || jIdx}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                          >
                            <span className="font-black text-theme-primary">{jItem.kelasNama}</span>
                            <span className="opacity-50">•</span>
                            <span className="truncate max-w-[160px] sm:max-w-[220px]">{jItem.mataPelajaran}</span>
                            {jItem.jamKe && (
                              <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                                ({jItem.jamKe})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Notes / Remarks Input for this teacher */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <input
                          type="text"
                          value={catatan}
                          onChange={(e) => handleUpdateRecord(t.guruKey, { catatan: e.target.value })}
                          placeholder="Catatan / keterangan (alasan izin, surat dokter, dinas luar, dll)..."
                          className="w-full max-w-md px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-theme-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Selector & Time Input */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                    {/* Time Input (Jam Masuk & Pulang) */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Jam:</span>
                      </div>
                      <input
                        type="time"
                        value={jamMasuk}
                        onChange={(e) => handleUpdateRecord(t.guruKey, { jamMasuk: e.target.value })}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                        title="Jam Masuk"
                      />
                      <span className="text-slate-400 text-xs">-</span>
                      <input
                        type="time"
                        value={jamPulang}
                        onChange={(e) => handleUpdateRecord(t.guruKey, { jamPulang: e.target.value })}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-1.5 py-0.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                        title="Jam Pulang"
                      />
                    </div>

                    {/* Status Button Grid (H, T, I, S, D, A) */}
                    <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 gap-1">
                      {/* HADIR */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'H' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'H'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:text-emerald-700'
                        }`}
                        title="Hadir"
                      >
                        H
                      </button>

                      {/* TERLAMBAT */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'T' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'T'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:text-amber-700'
                        }`}
                        title="Terlambat / Kesiangan"
                      >
                        T
                      </button>

                      {/* IZIN */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'I' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'I'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-950/40 hover:text-blue-700'
                        }`}
                        title="Izin"
                      >
                        I
                      </button>

                      {/* SAKIT */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'S' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'S'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-purple-100 dark:hover:bg-purple-950/40 hover:text-purple-700'
                        }`}
                        title="Sakit"
                      >
                        S
                      </button>

                      {/* DINAS LUAR */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'D' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'D'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-sky-100 dark:hover:bg-sky-950/40 hover:text-sky-700'
                        }`}
                        title="Dinas Luar"
                      >
                        D
                      </button>

                      {/* ALPA */}
                      <button
                        type="button"
                        onClick={() => handleUpdateRecord(t.guruKey, { status: 'A' })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                          curStatus === 'A'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 hover:text-rose-700'
                        }`}
                        title="Alpa / Tanpa Keterangan"
                      >
                        A
                      </button>

                      {/* CLEAR */}
                      {curStatus && (
                        <button
                          type="button"
                          onClick={() => handleUpdateRecord(t.guruKey, { status: '' })}
                          className="px-2 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="Kosongkan Status"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. PRINT / REKAP MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl w-full overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  Cetak Rekap Presensi Guru
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeShift.label} • {activeDay}, {formatDateIndo(selectedTanggal)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-800 text-center space-y-1">
                <h4 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">
                  {appData.sekolah?.nama || 'SMK NEGERI CONTOH'}
                </h4>
                <p className="text-slate-500">{appData.sekolah?.alamat || 'Jl. Pendidikan No. 1'}</p>
                <div className="font-bold text-theme-primary pt-2 border-t border-slate-200 dark:border-slate-700">
                  REKAPITULASI PRESENSI GURU MENGAJAR
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300">
                  {activeShift.label} — {activeDay}, {formatDateIndo(selectedTanggal)}
                </div>
              </div>

              {/* Stats Table */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-center">
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold">
                  Total: {statsSummary.total}
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  Hadir: {statsSummary.hadir}
                </div>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 font-bold">
                  Terlambat: {statsSummary.terlambat}
                </div>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800 font-bold">
                  Izin: {statsSummary.izin}
                </div>
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800 font-bold">
                  Sakit: {statsSummary.sakit}
                </div>
                <div className="p-2 rounded-xl bg-sky-100 text-sky-800 font-bold">
                  Dinas: {statsSummary.dinasLuar}
                </div>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-800 font-bold">
                  Alpa: {statsSummary.alpa}
                </div>
              </div>

              {/* Table of Teachers */}
              <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-left">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-[11px]">
                    <th className="border border-slate-300 dark:border-slate-700 p-2 w-8 text-center">No</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2">Nama Guru & NIP</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2">Kelas & Mapel</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2 w-16 text-center">Status</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2 w-24 text-center">Jam</th>
                    <th className="border border-slate-300 dark:border-slate-700 p-2">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledTeachers.map((t, idx) => {
                    const rec = recordsMap[t.guruKey];
                    const s = rec?.status || '-';
                    return (
                      <tr key={t.guruKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2">
                          <div className="font-bold text-slate-800 dark:text-white">{t.guruNama}</div>
                          <div className="text-[10px] text-slate-400">NIP. {t.guruNip}</div>
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-[11px]">
                          <div>{t.classesList.join(', ')}</div>
                          <div className="text-[10px] text-slate-500">{t.subjectsList.join(', ')}</div>
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-center font-black">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              s === 'H'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s === 'T'
                                ? 'bg-amber-100 text-amber-800'
                                : s === 'I'
                                ? 'bg-blue-100 text-blue-800'
                                : s === 'S'
                                ? 'bg-purple-100 text-purple-800'
                                : s === 'D'
                                ? 'bg-sky-100 text-sky-800'
                                : s === 'A'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {s === 'H'
                              ? 'Hadir'
                              : s === 'T'
                              ? 'Terlambat'
                              : s === 'I'
                              ? 'Izin'
                              : s === 'S'
                              ? 'Sakit'
                              : s === 'D'
                              ? 'Dinas'
                              : s === 'A'
                              ? 'Alpa'
                              : '-'}
                          </span>
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-center text-[10px] font-mono">
                          {rec?.jamMasuk || '-'}
                        </td>
                        <td className="border border-slate-300 dark:border-slate-700 p-2 text-[11px] text-slate-600 dark:text-slate-300">
                          {rec?.catatan || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-900 shrink-0">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-300 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-theme-primary hover:bg-theme-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Rekap</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
