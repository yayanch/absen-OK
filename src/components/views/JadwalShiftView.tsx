import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Sun, 
  Sunset, 
  Users, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  CheckCircle2, 
  CalendarRange, 
  Info,
  Filter,
  Edit3,
  Save,
  X,
  RotateCcw,
  Check,
  AlertTriangle,
  Zap,
  Sliders,
  Settings
} from 'lucide-react';
import { AppData, UserSession, ShiftPeriod, ShiftConfig, SekolahConfig } from '../../types';
import { formatDateIndo, generateWeeklyShiftSchedules, normalizeWeeklyShiftPeriods, getTodayString, determineKelasKelompok, extractKelasTingkat } from '../../utils/helpers';
import { Pagination } from '../Pagination';
import { PageHeader } from '../common/UIComponents';

interface JadwalShiftViewProps {
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData?: (appData: AppData) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const JadwalShiftView: React.FC<JadwalShiftViewProps> = ({
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
}) => {
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [showPastModal, setShowPastModal] = useState<boolean>(false);

  // Fallbacks for default configuration
  const activePagiTime = appData.shiftConfig?.pagiTime || "06.30 - 12.00";
  const activeSiangTime = appData.shiftConfig?.siangTime || "13.00 - 16.50";

  // Shift Timing Values
  const activeIsJamMasukPagiActive = appData.shiftConfig?.isJamMasukPagiActive ?? appData.sekolah?.isJamMasukActive ?? true;
  const activePagiJamMasukMulai = appData.shiftConfig?.pagiJamMasukMulai || appData.sekolah?.jamMasukMulai || '06:30';
  const activePagiJamMasukSelesai = appData.shiftConfig?.pagiJamMasukSelesai || appData.sekolah?.jamMasukSelesai || '06:45';
  const activePagiJamPulang = appData.shiftConfig?.pagiJamPulang || '12:00';

  const activeIsJamMasukSiangActive = appData.shiftConfig?.isJamMasukSiangActive ?? true;
  const activeSiangJamMasukMulai = appData.shiftConfig?.siangJamMasukMulai || '12:45';
  const activeSiangJamMasukSelesai = appData.shiftConfig?.siangJamMasukSelesai || '13:00';
  const activeSiangJamPulang = appData.shiftConfig?.siangJamPulang || '16:50';

  // Check if current user has permission to edit (Admin or Kesiswaan)
  const canEdit = currentUser.role === 'admin' || currentUser.role === 'kesiswaan';

  // Local state for editing form
  const [editPagiTime, setEditPagiTime] = useState<string>(activePagiTime);
  const [editSiangTime, setEditSiangTime] = useState<string>(activeSiangTime);
  const [editPeriods, setEditPeriods] = useState<ShiftPeriod[]>([]);

  // Shift timing editing states
  const [editIsJamMasukPagiActive, setEditIsJamMasukPagiActive] = useState<boolean>(activeIsJamMasukPagiActive);
  const [editPagiJamMasukMulai, setEditPagiJamMasukMulai] = useState<string>(activePagiJamMasukMulai);
  const [editPagiJamMasukSelesai, setEditPagiJamMasukSelesai] = useState<string>(activePagiJamMasukSelesai);
  const [editPagiJamPulang, setEditPagiJamPulang] = useState<string>(activePagiJamPulang);

  const [editIsJamMasukSiangActive, setEditIsJamMasukSiangActive] = useState<boolean>(activeIsJamMasukSiangActive);
  const [editSiangJamMasukMulai, setEditSiangJamMasukMulai] = useState<string>(activeSiangJamMasukMulai);
  const [editSiangJamMasukSelesai, setEditSiangJamMasukSelesai] = useState<string>(activeSiangJamMasukSelesai);
  const [editSiangJamPulang, setEditSiangJamPulang] = useState<string>(activeSiangJamPulang);

  // Synchronize state when appData changes
  useEffect(() => {
    if (!isEditing) {
      setEditPagiTime(appData.shiftConfig?.pagiTime || "06.30 - 12.00");
      setEditSiangTime(appData.shiftConfig?.siangTime || "13.00 - 16.50");
      setEditIsJamMasukPagiActive(appData.shiftConfig?.isJamMasukPagiActive ?? appData.sekolah?.isJamMasukActive ?? true);
      setEditPagiJamMasukMulai(appData.shiftConfig?.pagiJamMasukMulai || appData.sekolah?.jamMasukMulai || '06:30');
      setEditPagiJamMasukSelesai(appData.shiftConfig?.pagiJamMasukSelesai || appData.sekolah?.jamMasukSelesai || '06:45');
      setEditPagiJamPulang(appData.shiftConfig?.pagiJamPulang || '12:00');
      setEditIsJamMasukSiangActive(appData.shiftConfig?.isJamMasukSiangActive ?? true);
      setEditSiangJamMasukMulai(appData.shiftConfig?.siangJamMasukMulai || '12:45');
      setEditSiangJamMasukSelesai(appData.shiftConfig?.siangJamMasukSelesai || '13:00');
      setEditSiangJamPulang(appData.shiftConfig?.siangJamPulang || '16:50');
    }
  }, [appData, isEditing]);

  // Helper to dynamically compile shift label based on times
  const getShiftLabel = (type: 'pagi' | 'siang' | 'libur', pagiT: string, siangT: string) => {
    if (type === 'pagi') return `Pagi (${pagiT})`;
    if (type === 'siang') return `Siang (${siangT})`;
    return 'Libur (KBM Off)';
  };

  // Default baseline rotation generator (weekly breakdown, rotating every 2 weeks)
  const generateShiftSchedules = (): ShiftPeriod[] => {
    return generateWeeklyShiftSchedules();
  };

  // Compile active schedules (combines config periods with helper text descriptors)
  const shiftSchedules = useMemo(() => {
    const rawPeriods = normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
    if (rawPeriods && rawPeriods.length > 0) {
      return rawPeriods.map(p => {
        const k1Type = p.kelompok1Type || 'pagi';
        const k2Type = p.kelompok2Type || 'siang';
        return {
          id: p.id,
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          kelompok1Type: k1Type,
          kelompok1Shift: getShiftLabel(k1Type, activePagiTime, activeSiangTime),
          kelompok1Time: k1Type === 'pagi' ? activePagiTime : k1Type === 'siang' ? activeSiangTime : '-',
          kelompok2Type: k2Type,
          kelompok2Shift: getShiftLabel(k2Type, activePagiTime, activeSiangTime),
          kelompok2Time: k2Type === 'pagi' ? activePagiTime : k2Type === 'siang' ? activeSiangTime : '-',
        };
      });
    }

    // Default fallback
    const defaultPeriods = generateShiftSchedules();
    return defaultPeriods.map(p => ({
      id: p.id,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      kelompok1Type: p.kelompok1Type,
      kelompok1Shift: getShiftLabel(p.kelompok1Type, activePagiTime, activeSiangTime),
      kelompok1Time: p.kelompok1Type === 'pagi' ? activePagiTime : p.kelompok1Type === 'siang' ? activeSiangTime : '-',
      kelompok2Type: p.kelompok2Type,
      kelompok2Shift: getShiftLabel(p.kelompok2Type, activePagiTime, activeSiangTime),
      kelompok2Time: p.kelompok2Type === 'pagi' ? activePagiTime : p.kelompok2Type === 'siang' ? activeSiangTime : '-',
    }));
  }, [appData.shiftConfig, activePagiTime, activeSiangTime]);

  // Determine current active period based on today's date
  const todayStr = getTodayString();
  const currentPeriod = useMemo(() => {
    const matched = shiftSchedules.find(p => {
      const s = p.startDate.toISOString().split('T')[0];
      const e = p.endDate.toISOString().split('T')[0];
      return todayStr >= s && todayStr <= e;
    });
    return matched || shiftSchedules[0];
  }, [shiftSchedules, todayStr]);

  // Separate active & upcoming schedules vs past schedules
  // Place current active period at the VERY TOP (index 0)
  const { kelompok1Classes, kelompok2Classes } = useMemo(() => {
    const k1: typeof appData.kelas = [];
    const k2: typeof appData.kelas = [];
    (appData.kelas || []).forEach((k) => {
      if (determineKelasKelompok(k.nama) === 2) {
        k2.push(k);
      } else {
        k1.push(k);
      }
    });
    return { kelompok1Classes: k1, kelompok2Classes: k2 };
  }, [appData.kelas]);

  const { activeAndUpcomingSchedules, pastSchedules } = useMemo(() => {
    if (!shiftSchedules.length) return { activeAndUpcomingSchedules: [], pastSchedules: [] };

    const activeId = currentPeriod ? currentPeriod.id : null;
    const past: typeof shiftSchedules = [];
    const upcoming: typeof shiftSchedules = [];
    let currentItem: (typeof shiftSchedules)[0] | null = null;

    shiftSchedules.forEach(p => {
      const endStr = p.endDate.toISOString().split('T')[0];
      if (activeId !== null && p.id === activeId) {
        currentItem = p;
      } else if (endStr < todayStr) {
        past.push(p);
      } else {
        upcoming.push(p);
      }
    });

    // Active period comes FIRST, followed by upcoming weeks
    const activeAndUpcoming = currentItem ? [currentItem, ...upcoming] : upcoming;
    
    // Sort past schedules from most recent to oldest
    past.sort((a, b) => b.id - a.id);

    return { activeAndUpcomingSchedules: activeAndUpcoming, pastSchedules: past };
  }, [shiftSchedules, currentPeriod, todayStr]);

  const formatDateShort = (d: Date) => {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Pagination computations (based on active & upcoming schedules)
  const totalScheduleItems = activeAndUpcomingSchedules.length;
  const totalPages = Math.ceil(totalScheduleItems / pageSize) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSchedules = useMemo(() => {
    const start = (validCurrentPage - 1) * pageSize;
    return activeAndUpcomingSchedules.slice(start, start + pageSize);
  }, [activeAndUpcomingSchedules, validCurrentPage, pageSize]);

  // Action: Start Edit Mode
  const handleStartEditing = () => {
    const periodsDraft: ShiftPeriod[] = shiftSchedules.map(p => ({
      id: p.id,
      startDate: p.startDate.toISOString().split('T')[0],
      endDate: p.endDate.toISOString().split('T')[0],
      kelompok1Type: p.kelompok1Type,
      kelompok2Type: p.kelompok2Type,
    }));
    setEditPeriods(periodsDraft);
    setEditPagiTime(activePagiTime);
    setEditSiangTime(activeSiangTime);
    setEditIsJamMasukPagiActive(activeIsJamMasukPagiActive);
    setEditPagiJamMasukMulai(activePagiJamMasukMulai);
    setEditPagiJamMasukSelesai(activePagiJamMasukSelesai);
    setEditPagiJamPulang(activePagiJamPulang);
    setEditIsJamMasukSiangActive(activeIsJamMasukSiangActive);
    setEditSiangJamMasukMulai(activeSiangJamMasukMulai);
    setEditSiangJamMasukSelesai(activeSiangJamMasukSelesai);
    setEditSiangJamPulang(activeSiangJamPulang);
    setIsEditing(true);
    onShowToast('Mode edit jadwal & jam masuk shift diaktifkan', 'info');
  };

  // Action: Cancel Edit Mode
  const handleCancelEditing = () => {
    setIsEditing(false);
    onShowToast('Perubahan jadwal shift dibatalkan', 'info');
  };

  // Action: Reset to Standard Rotation Default
  const handleResetToDefault = () => {
    const defaultPeriods = generateShiftSchedules();
    setEditPeriods(defaultPeriods);
    setEditPagiTime("06.30 - 12.00");
    setEditSiangTime("13.00 - 16.50");
    setEditIsJamMasukPagiActive(true);
    setEditPagiJamMasukMulai("06:30");
    setEditPagiJamMasukSelesai("06:45");
    setEditPagiJamPulang("12:00");
    setEditIsJamMasukSiangActive(true);
    setEditSiangJamMasukMulai("12:45");
    setEditSiangJamMasukSelesai("13:00");
    setEditSiangJamPulang("16:50");
    onShowToast('Jadwal dan jam masuk diatur ulang ke default. Klik Simpan untuk menerapkan.', 'info');
  };

  // Action: Handle dropdown selection changes per period
  const handlePeriodTypeChange = (
    id: number, 
    target: 'kelompok1Type' | 'kelompok2Type', 
    value: 'pagi' | 'siang' | 'libur'
  ) => {
    setEditPeriods(prev => prev.map(p => p.id === id ? { ...p, [target]: value } : p));
  };

  // Action: Save Edit Changes
  const handleSaveEditing = () => {
    if (!onUpdateAppData) {
      onShowToast('Gagal menyimpan perubahan. Sistem pembaruan tidak tersedia.', 'error');
      return;
    }

    const compiledConfig: ShiftConfig = {
      pagiTime: editPagiTime.trim() || activePagiTime,
      siangTime: editSiangTime.trim() || activeSiangTime,
      periods: editPeriods.length > 0 ? editPeriods : (appData.shiftConfig?.periods || []),
      isJamMasukPagiActive: editIsJamMasukPagiActive,
      pagiJamMasukMulai: editPagiJamMasukMulai.trim() || '06:30',
      pagiJamMasukSelesai: editPagiJamMasukSelesai.trim() || '06:45',
      pagiJamPulang: editPagiJamPulang.trim() || '12:00',
      isJamMasukSiangActive: editIsJamMasukSiangActive,
      siangJamMasukMulai: editSiangJamMasukMulai.trim() || '12:45',
      siangJamMasukSelesai: editSiangJamMasukSelesai.trim() || '13:00',
      siangJamPulang: editSiangJamPulang.trim() || '16:50',
    };

    // Keep sekolah backward compatible
    const updatedSekolah: SekolahConfig = {
      ...appData.sekolah,
      isJamMasukActive: editIsJamMasukPagiActive,
      jamMasukMulai: editPagiJamMasukMulai.trim() || '06:30',
      jamMasukSelesai: editPagiJamMasukSelesai.trim() || '06:45',
      jamPulang: editPagiJamPulang.trim() || '12:00',
    };

    onUpdateAppData({
      ...appData,
      shiftConfig: compiledConfig,
      sekolah: updatedSekolah,
    });

    setIsEditing(false);
    onShowToast('Jadwal shift dan aturan jam masuk berhasil diperbarui!', 'success');
  };

  // Helper styling for dropdown selects in edit mode
  const getSelectStyle = (val: 'pagi' | 'siang' | 'libur') => {
    if (val === 'pagi') return 'border-amber-300 dark:border-amber-800/80 focus:ring-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300';
    if (val === 'siang') return 'border-indigo-300 dark:border-indigo-800/80 focus:ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300';
    return 'border-slate-300 dark:border-slate-700 focus:ring-slate-500 bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400';
  };

  const getPagiClasses = (k1Type: string, k2Type: string) => {
    if (k1Type === 'pagi' && k2Type === 'pagi') return 'Kelas X, XI & XII';
    if (k1Type === 'pagi') return 'Kelas X & XI';
    if (k2Type === 'pagi') return 'Kelas XII';
    return 'Libur (KBM Off)';
  };

  const getSiangClasses = (k1Type: string, k2Type: string) => {
    if (k1Type === 'siang' && k2Type === 'siang') return 'Kelas X, XI & XII';
    if (k1Type === 'siang') return 'Kelas X & XI';
    if (k2Type === 'siang') return 'Kelas XII';
    return 'Libur (KBM Off)';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 sm:pb-8">
      <PageHeader
        icon={Clock}
        title="Jadwal Shift Pembelajaran"
        description="Pengaturan jadwal kegiatan belajar mengajar (KBM) yang disusun per minggu dengan siklus rotasi bergantian setiap 2 minggu sekali antara Kelas X & XI dan Kelas XII."
        badge="Jadwal Mingguan • Rotasi 2 Minggu Sekali"
        actions={
          canEdit && !isEditing ? (
            <button
              onClick={handleStartEditing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white transition rounded-2xl text-xs font-bold shadow-lg cursor-pointer shrink-0"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Jadwal Shift</span>
            </button>
          ) : undefined
        }
      />

      {/* Editing Controls Sticky Bar */}
      {isEditing && (
        <div className="bg-blue-50 dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/60 rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Anda Sedang Mengedit Jadwal & Jam Masuk Shift</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Silakan sesuaikan jam operasional, batas jam masuk, kesiangan, jam pulang, dan status rotasi shift pada form di bawah.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleResetToDefault}
              className="px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="Kembalikan ke susunan rotasi bawaan sistem"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
            <button
              onClick={handleCancelEditing}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Batal</span>
            </button>
            <button
              onClick={handleSaveEditing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      )}

      {/* Unified Shift Rules, Hours & Group Settings Card (Only visible during edit mode) */}
      {isEditing && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 animate-fade-in">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Pengaturan Shift & Ketentuan Jam Presensi
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Atur waktu scan presensi Hadir (H), batas kesiangan (K), jam KBM, serta pengelompokan tingkat kelas untuk Shift Pagi dan Shift Siang.
              </p>
            </div>
          </div>

          {/* Section 1: Shift 1 (Pagi) & Shift 2 (Siang) Attendance Rules */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SHIFT 1 (PAGI) CARD */}
          <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/50 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-200/60 dark:border-amber-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Shift 1 (Pagi)</h3>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Ketentuan Presensi & Jam Masuk</p>
                </div>
              </div>

              {/* Toggle switch */}
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setEditIsJamMasukPagiActive(!editIsJamMasukPagiActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer ${
                    editIsJamMasukPagiActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${editIsJamMasukPagiActive ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
                  <span>{editIsJamMasukPagiActive ? 'AKTIF' : 'NONAKTIF'}</span>
                </button>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black ${
                  activeIsJamMasukPagiActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeIsJamMasukPagiActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{activeIsJamMasukPagiActive ? 'Aturan Aktif' : 'Aturan Nonaktif'}</span>
                </span>
              )}
            </div>

            {/* Presets & Timing Inputs */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Preset Cepat Jam Masuk Pagi:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '06:30 - 06:45', mulai: '06:30', selesai: '06:45', pulang: '12:00' },
                      { label: '06:45 - 07:00', mulai: '06:45', selesai: '07:00', pulang: '12:15' },
                      { label: '07:00 - 07:15', mulai: '07:00', selesai: '07:15', pulang: '12:30' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setEditPagiJamMasukMulai(preset.mulai);
                          setEditPagiJamMasukSelesai(preset.selesai);
                          setEditPagiJamPulang(preset.pulang);
                          setEditPagiTime(`${preset.mulai.replace(':', '.')} - ${preset.pulang.replace(':', '.')}`);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/60 text-slate-700 dark:text-slate-200 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-bold rounded-lg border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Masuk Mulai
                    </label>
                    <input
                      type="time"
                      value={editPagiJamMasukMulai}
                      onChange={(e) => setEditPagiJamMasukMulai(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Batas Kesiangan
                    </label>
                    <input
                      type="time"
                      value={editPagiJamMasukSelesai}
                      onChange={(e) => setEditPagiJamMasukSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-mono font-black text-amber-900 dark:text-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Pulang
                    </label>
                    <input
                      type="time"
                      value={editPagiJamPulang}
                      onChange={(e) => setEditPagiJamPulang(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Masuk Mulai</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                    {activePagiJamMasukMulai} WIB
                  </div>
                </div>

                <div className="p-3 bg-amber-100/60 dark:bg-amber-950/40 rounded-2xl border border-amber-300/80 dark:border-amber-800/60">
                  <div className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">Batas Kesiangan</div>
                  <div className="text-base font-black text-amber-900 dark:text-amber-200 mt-0.5 font-mono">
                    {activePagiJamMasukSelesai} WIB
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Pulang</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                    {activePagiJamPulang} WIB
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Status Logic Display */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">H</div>
                <div className="text-emerald-900 dark:text-emerald-200">
                  <strong>Status HADIR (H):</strong> Siswa scan pada pukul <strong>{isEditing ? editPagiJamMasukMulai : activePagiJamMasukMulai} - {isEditing ? editPagiJamMasukSelesai : activePagiJamMasukSelesai} WIB</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-amber-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">K</div>
                <div className="text-amber-900 dark:text-amber-200">
                  <strong>Status KESIANGAN (K):</strong> Siswa scan lewat dari jam <strong>{isEditing ? editPagiJamMasukSelesai : activePagiJamMasukSelesai} WIB</strong>
                </div>
              </div>
            </div>
          </div>

          {/* SHIFT 2 (SIANG) CARD */}
          <div className="p-5 sm:p-6 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/50 space-y-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-indigo-200/60 dark:border-indigo-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Sunset className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Shift 2 (Siang)</h3>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">Ketentuan Presensi & Jam Masuk</p>
                </div>
              </div>

              {/* Toggle switch */}
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setEditIsJamMasukSiangActive(!editIsJamMasukSiangActive)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition cursor-pointer ${
                    editIsJamMasukSiangActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${editIsJamMasukSiangActive ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
                  <span>{editIsJamMasukSiangActive ? 'AKTIF' : 'NONAKTIF'}</span>
                </button>
              ) : (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black ${
                  activeIsJamMasukSiangActive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${activeIsJamMasukSiangActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  <span>{activeIsJamMasukSiangActive ? 'Aturan Aktif' : 'Aturan Nonaktif'}</span>
                </span>
              )}
            </div>

            {/* Presets & Timing Inputs */}
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-indigo-500" />
                    <span>Preset Cepat Jam Masuk Siang:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '12:30 - 12:45', mulai: '12:30', selesai: '12:45', pulang: '16:30' },
                      { label: '12:45 - 13:00', mulai: '12:45', selesai: '13:00', pulang: '16:50' },
                      { label: '13:00 - 13:15', mulai: '13:00', selesai: '13:15', pulang: '17:00' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setEditSiangJamMasukMulai(preset.mulai);
                          setEditSiangJamMasukSelesai(preset.selesai);
                          setEditSiangJamPulang(preset.pulang);
                          setEditSiangTime(`${preset.mulai.replace(':', '.')} - ${preset.pulang.replace(':', '.')}`);
                        }}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-200 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Masuk Mulai
                    </label>
                    <input
                      type="time"
                      value={editSiangJamMasukMulai}
                      onChange={(e) => setEditSiangJamMasukMulai(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Batas Kesiangan
                    </label>
                    <input
                      type="time"
                      value={editSiangJamMasukSelesai}
                      onChange={(e) => setEditSiangJamMasukSelesai(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-mono font-black text-indigo-900 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Jam Pulang
                    </label>
                    <input
                      type="time"
                      value={editSiangJamPulang}
                      onChange={(e) => setEditSiangJamPulang(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Masuk Mulai</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                    {activeSiangJamMasukMulai} WIB
                  </div>
                </div>

                <div className="p-3 bg-indigo-100/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-300/80 dark:border-indigo-800/60">
                  <div className="text-[10px] font-bold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">Batas Kesiangan</div>
                  <div className="text-base font-black text-indigo-900 dark:text-indigo-200 mt-0.5 font-mono">
                    {activeSiangJamMasukSelesai} WIB
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Jam Pulang</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5 font-mono">
                    {activeSiangJamPulang} WIB
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Status Logic Display */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">H</div>
                <div className="text-emerald-900 dark:text-emerald-200">
                  <strong>Status HADIR (H):</strong> Siswa scan pada pukul <strong>{isEditing ? editSiangJamMasukMulai : activeSiangJamMasukMulai} - {isEditing ? editSiangJamMasukSelesai : activeSiangJamMasukSelesai} WIB</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs">
                <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center shrink-0">K</div>
                <div className="text-indigo-900 dark:text-indigo-200">
                  <strong>Status KESIANGAN (K):</strong> Siswa scan lewat dari jam <strong>{isEditing ? editSiangJamMasukSelesai : activeSiangJamMasukSelesai} WIB</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Shift Operational Hours & Group Mapping unified sub-grid */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Shift Hours Sub-Card */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Jam Operasional KBM Shift</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isEditing ? 'Tentukan jam operasional KBM baru' : 'Ketentuan jam pembelajaran di kelas'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-black text-[11px]">
                  <Sun className="w-3.5 h-3.5" />
                  <span>SHIFT 1 (PAGI)</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editPagiTime}
                    onChange={(e) => setEditPagiTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-black text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Contoh: 06.30 - 12.00"
                  />
                ) : (
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{activePagiTime} WIB</div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Masuk: <strong>{activePagiJamMasukMulai}</strong> • Pulang: <strong>{activePagiJamPulang}</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 font-black text-[11px]">
                  <Sunset className="w-3.5 h-3.5" />
                  <span>SHIFT 2 (SIANG)</span>
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editSiangTime}
                    onChange={(e) => setEditSiangTime(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-black text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Contoh: 13.00 - 16.50"
                  />
                ) : (
                  <div className="text-lg font-black text-slate-900 dark:text-white font-mono">{activeSiangTime} WIB</div>
                )}
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Masuk: <strong>{activeSiangJamMasukMulai}</strong> • Pulang: <strong>{activeSiangJamPulang}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Group Mapping Sub-Card */}
          <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Pembagian Kelompok Siswa</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Pengelompokan tingkat kelas untuk sistem shift</p>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              {/* Kelompok 1 */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">Kelompok 1 (Kelas X & XI)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tingkat X & XI ({kelompok1Classes.length} Kelas)</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-full text-[10px] font-bold shrink-0">Bergulir</span>
                </div>
                {kelompok1Classes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    {kelompok1Classes.map((k) => (
                      <span
                        key={k.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40"
                      >
                        {k.nama}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Kelompok 2 */}
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-white">Kelompok 2 (Kelas XII)</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Tingkat XII ({kelompok2Classes.length} Kelas)</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-full text-[10px] font-bold shrink-0">Bergulir</span>
                </div>
                {kelompok2Classes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                    {kelompok2Classes.map((k) => (
                      <span
                        key={k.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40"
                      >
                        {k.nama}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Current Week Status Banner */}
      {!isEditing && currentPeriod && (
        <div className="bg-gradient-to-r from-indigo-800 via-blue-800 to-slate-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-900/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Minggu Ini (Minggu #{currentPeriod.id}) • Siklus #{Math.ceil(currentPeriod.id / 2)} (Pekan {((currentPeriod.id - 1) % 2) + 1})</span>
            </div>
            <h3 className="text-xl font-black tracking-tight">
              {formatDateShort(currentPeriod.startDate)} s.d. {formatDateShort(currentPeriod.endDate)}
            </h3>
            <p className="text-xs text-blue-100/90 font-medium">
              Jadwal shift aktif pekan ini (rotasi berlaku selama 2 minggu sebelum berganti giliran).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 w-full lg:w-auto">
            <div className="bg-transparent p-2 sm:p-3 min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200">☀️ PAGI ({activePagiTime})</div>
              <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-1 capitalize whitespace-nowrap">{getPagiClasses(currentPeriod.kelompok1Type, currentPeriod.kelompok2Type)}</div>
            </div>
            <div className="bg-transparent p-2 sm:p-3 min-w-0 flex-1">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-200">🌅 SIANG ({activeSiangTime})</div>
              <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-1 capitalize whitespace-nowrap">{getSiangClasses(currentPeriod.kelompok1Type, currentPeriod.kelompok2Type)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Full Schedule Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Daftar Jadwal Mingguan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Jadwal disusun per minggu dengan rotasi shift berganti setiap 2 minggu sekali</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {pastSchedules.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPastModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer shrink-0 active:scale-95"
              >
                <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span>Riwayat Shift Selesai ({pastSchedules.length})</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Kelas</option>
                <option value="k1">Kelas X & XI</option>
                <option value="k2">Kelas XII</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table Layout (hidden on mobile) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-extrabold uppercase text-slate-400">
                <th className="pb-3 px-4">Minggu Ke-</th>
                <th className="pb-3 px-4">Siklus Rotasi (2 Pekan)</th>
                <th className="pb-3 px-4">Rentang Tanggal</th>
                <th className="pb-3 px-4 text-amber-700 dark:text-amber-400 font-bold">☀️ PAGI ({activePagiTime})</th>
                <th className="pb-3 px-4 text-sky-700 dark:text-sky-400 font-bold">🌅 SIANG ({activeSiangTime})</th>
                <th className="pb-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {paginatedSchedules.map((period) => {
                const isCurrent = currentPeriod && currentPeriod.id === period.id;
                const showRow = selectedClassFilter === 'all' || 
                  (selectedClassFilter === 'k1') || 
                  (selectedClassFilter === 'k2');

                if (!showRow) return null;

                // Load editable state for this cell if currently editing
                const currentEditPeriod = editPeriods.find(ep => ep.id === period.id);
                const cycleNum = Math.ceil(period.id / 2);
                const weekInCycle = ((period.id - 1) % 2) + 1;

                return (
                  <tr 
                    key={period.id} 
                    className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                      isCurrent && !isEditing ? 'bg-blue-50/60 dark:bg-blue-950/20 font-bold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-100">
                      Minggu #{period.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        cycleNum % 2 === 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        Siklus {cycleNum} • Pekan {weekInCycle}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                      {formatDateShort(period.startDate)} - {formatDateShort(period.endDate)}
                    </td>
                    
                    {/* Shift Pagi Column */}
                    <td className="py-3 px-4 min-w-[180px]">
                      {isEditing && currentEditPeriod ? (
                        <select
                          value={currentEditPeriod.kelompok1Type}
                          onChange={(e) => handlePeriodTypeChange(
                            period.id, 
                            'kelompok1Type', 
                            e.target.value as 'pagi' | 'siang' | 'libur'
                          )}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 transition ${getSelectStyle(currentEditPeriod.kelompok1Type)}`}
                        >
                          <option value="pagi">☀️ Pagi</option>
                          <option value="siang">🌅 Siang</option>
                          <option value="libur">❌ Libur (Off)</option>
                        </select>
                      ) : (
                        (() => {
                          const pagiTxt = getPagiClasses(period.kelompok1Type, period.kelompok2Type);
                          const isLibur = pagiTxt.includes('Libur');
                          return (
                            <span className={`inline-flex items-center justify-center gap-1.5 w-36 px-2.5 py-1 rounded-xl font-bold text-xs whitespace-nowrap shadow-xs ${
                              !isLibur 
                                ? 'bg-amber-500 text-white font-extrabold' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {!isLibur ? <Sun className="w-3.5 h-3.5 text-white fill-white shrink-0" /> : <X className="w-3.5 h-3.5 text-white shrink-0" />}
                              <span>{pagiTxt}</span>
                            </span>
                          );
                        })()
                      )}
                    </td>

                    {/* Shift Siang Column */}
                    <td className="py-3 px-4 min-w-[180px]">
                      {isEditing && currentEditPeriod ? (
                        <select
                          value={currentEditPeriod.kelompok2Type}
                          onChange={(e) => handlePeriodTypeChange(
                            period.id, 
                            'kelompok2Type', 
                            e.target.value as 'pagi' | 'siang' | 'libur'
                          )}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 transition ${getSelectStyle(currentEditPeriod.kelompok2Type)}`}
                        >
                          <option value="pagi">☀️ Pagi</option>
                          <option value="siang">🌅 Siang</option>
                          <option value="libur">❌ Libur (Off)</option>
                        </select>
                      ) : (
                        (() => {
                          const siangTxt = getSiangClasses(period.kelompok1Type, period.kelompok2Type);
                          const isLibur = siangTxt.includes('Libur');
                          return (
                            <span className={`inline-flex items-center justify-center gap-1.5 w-36 px-2.5 py-1 rounded-xl font-bold text-xs whitespace-nowrap shadow-xs ${
                              !isLibur 
                                ? 'bg-sky-600 text-white font-extrabold' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {!isLibur ? <Sunset className="w-3.5 h-3.5 text-white shrink-0" /> : <X className="w-3.5 h-3.5 text-white shrink-0" />}
                              <span>{siangTxt}</span>
                            </span>
                          );
                        })()
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium text-[11px]">Terjadwal</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Grid Layout (hidden on desktop) */}
        <div className="block md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
          {paginatedSchedules.map((period) => {
            const isCurrent = currentPeriod && currentPeriod.id === period.id;
            const showRow = selectedClassFilter === 'all' || 
              (selectedClassFilter === 'k1') || 
              (selectedClassFilter === 'k2');

            if (!showRow) return null;

            // Load editable state for this cell if currently editing
            const currentEditPeriod = editPeriods.find(ep => ep.id === period.id);
            const cycleNum = Math.ceil(period.id / 2);
            const weekInCycle = ((period.id - 1) % 2) + 1;

            return (
              <div 
                key={period.id} 
                className={`p-5 rounded-2xl border transition-all ${
                  isCurrent && !isEditing 
                    ? 'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 shadow-xs' 
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Header Info */}
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
                      Minggu #{period.id}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      cycleNum % 2 === 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-indigo-600 text-white'
                    }`}>
                      Siklus {cycleNum} • Pkn {weekInCycle}
                    </span>
                  </div>
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold uppercase tracking-wider">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Terjadwal</span>
                  )}
                </div>

                {/* Date & Shifts Grid */}
                <div className="space-y-3.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rentang Tanggal (1 Pekan)</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                      {formatDateShort(period.startDate)} - {formatDateShort(period.endDate)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Shift Pagi */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">☀️ PAGI ({activePagiTime})</div>
                      {isEditing && currentEditPeriod ? (
                        <select
                          value={currentEditPeriod.kelompok1Type}
                          onChange={(e) => handlePeriodTypeChange(
                            period.id, 
                            'kelompok1Type', 
                            e.target.value as 'pagi' | 'siang' | 'libur'
                          )}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 transition ${getSelectStyle(currentEditPeriod.kelompok1Type)}`}
                        >
                          <option value="pagi">☀️ Pagi</option>
                          <option value="siang">🌅 Siang</option>
                          <option value="libur">❌ Libur (Off)</option>
                        </select>
                      ) : (
                        (() => {
                          const pagiTxt = getPagiClasses(period.kelompok1Type, period.kelompok2Type);
                          const isLibur = pagiTxt.includes('Libur');
                          return (
                            <div className={`inline-flex items-center justify-center gap-1.5 w-36 px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-xs ${
                              !isLibur 
                                ? 'bg-amber-500 text-white font-extrabold' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {!isLibur ? <Sun className="w-3.5 h-3.5 text-white fill-white shrink-0" /> : <X className="w-3.5 h-3.5 text-white shrink-0" />}
                              <span>{pagiTxt}</span>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Shift Siang */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">🌅 SIANG ({activeSiangTime})</div>
                      {isEditing && currentEditPeriod ? (
                        <select
                          value={currentEditPeriod.kelompok2Type}
                          onChange={(e) => handlePeriodTypeChange(
                            period.id, 
                            'kelompok2Type', 
                            e.target.value as 'pagi' | 'siang' | 'libur'
                          )}
                          className={`w-full rounded-xl border px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 transition ${getSelectStyle(currentEditPeriod.kelompok2Type)}`}
                        >
                          <option value="pagi">☀️ Pagi</option>
                          <option value="siang">🌅 Siang</option>
                          <option value="libur">❌ Libur (Off)</option>
                        </select>
                      ) : (
                        (() => {
                          const siangTxt = getSiangClasses(period.kelompok1Type, period.kelompok2Type);
                          const isLibur = siangTxt.includes('Libur');
                          return (
                            <div className={`inline-flex items-center justify-center gap-1.5 w-36 px-2.5 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap shadow-xs ${
                              !isLibur 
                                ? 'bg-sky-600 text-white font-extrabold' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {!isLibur ? <Sunset className="w-3.5 h-3.5 text-white shrink-0" /> : <X className="w-3.5 h-3.5 text-white shrink-0" />}
                              <span>{siangTxt}</span>
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick jump to active week if on different page */}
        {currentPeriod && validCurrentPage !== 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs">
            <span className="text-blue-800 dark:text-blue-300 font-medium">
              💡 Minggu aktif saat ini (<strong>Minggu #{currentPeriod.id}</strong>) berada di posisi teratas pada <strong>Halaman 1</strong>.
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shrink-0 ml-3 text-[11px] cursor-pointer"
            >
              Kembali ke Minggu Aktif
            </button>
          </div>
        )}

        {/* Pagination Controls with min 5 items per page */}
        <div className="pt-2 -mx-6 -mb-6">
          <Pagination
            currentPage={validCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalScheduleItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 15, 22]}
          />
        </div>
      </div>

      {/* Modal Popup for Past Schedules (Minggu yang telah lewat) */}
      {showPastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Riwayat Shift Selesai</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Daftar jadwal rotasi shift minggu-minggu yang telah lewat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPastModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Past Schedules List */}
            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {pastSchedules.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  Belum ada riwayat shift yang telah lewat.
                </div>
              ) : (
                pastSchedules.map((period) => {
                  const cycleNum = Math.ceil(period.id / 2);
                  const weekInCycle = ((period.id - 1) % 2) + 1;
                  const pagiTxt = getPagiClasses(period.kelompok1Type, period.kelompok2Type);
                  const siangTxt = getSiangClasses(period.kelompok1Type, period.kelompok2Type);

                  return (
                    <div
                      key={period.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            Minggu #{period.id}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                            cycleNum % 2 === 1
                              ? 'bg-blue-600 text-white'
                              : 'bg-indigo-600 text-white'
                          }`}>
                            Siklus {cycleNum} • Pekan {weekInCycle}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-600 text-white">
                            Selesai
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          {formatDateShort(period.startDate)} - {formatDateShort(period.endDate)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/60">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-[11px] bg-amber-500 text-white font-extrabold">
                          <Sun className="w-3.5 h-3.5 text-white fill-white" />
                          <span>PAGI: {pagiTxt}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold text-[11px] bg-sky-600 text-white">
                          <Sunset className="w-3.5 h-3.5 text-white" />
                          <span>SIANG: {siangTxt}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400 font-medium">
                Total {pastSchedules.length} minggu selesai
              </span>
              <button
                type="button"
                onClick={() => setShowPastModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs transition cursor-pointer"
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

