import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  Sun,
  Sunset,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  Sparkles,
  Flag,
  Info,
  CalendarRange,
  ChevronLeft,
  ArrowLeft,
  Layers,
  Printer,
  Search,
  Filter,
  CalendarDays,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { cleanMapelName, normalizeWeeklyShiftPeriods, getTodayString } from '../../utils/helpers';
import { HARI_SENIN_JUMAT, parseJamKeList, determineKelasKelompok, getJamPelajaranTime } from './JadwalMengajarView';
import { PageHeader } from '../common/UIComponents';

interface JadwalMengajarMingguIniViewProps {
  appData: AppData;
  currentUser: UserSession;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const JadwalMengajarMingguIniView: React.FC<JadwalMengajarMingguIniViewProps> = ({
  appData,
  currentUser,
  onNavigateToInput,
  onNavigateView,
  onShowToast,
}) => {
  // Current active day tab (Senin - Jumat)
  const [activeDay, setActiveDay] = useState<string>(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const currentDayName = days[new Date().getDay()];
    return (HARI_SENIN_JUMAT as readonly string[]).includes(currentDayName) ? currentDayName : 'Senin';
  });

  const [viewMode, setViewMode] = useState<'day' | 'all'>('day');

  // Times configuration
  const pagiTime = appData.shiftConfig?.pagiTime || '06.30 - 12.00';
  const siangTime = appData.shiftConfig?.siangTime || '13.00 - 16.50';

  // Normalize all weekly shift rotation periods from shiftConfig
  const shiftPeriods = useMemo(() => {
    return normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
  }, [appData.shiftConfig?.periods]);

  // Find period matching today's date
  const todayStr = getTodayString();
  const defaultPeriodIndex = useMemo(() => {
    if (!shiftPeriods || shiftPeriods.length === 0) return 0;
    const matchedIdx = shiftPeriods.findIndex((p) => {
      const s = p.startDate.slice(0, 10);
      const e = eDateToString(p.endDate);
      return todayStr >= s && todayStr <= e;
    });
    return matchedIdx !== -1 ? matchedIdx : 0;
  }, [shiftPeriods, todayStr]);

  function eDateToString(dStr: string) {
    return dStr.slice(0, 10);
  }

  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(defaultPeriodIndex);

  useEffect(() => {
    setSelectedPeriodIndex(defaultPeriodIndex);
  }, [defaultPeriodIndex]);

  const currentPeriod = shiftPeriods[selectedPeriodIndex] || shiftPeriods[0];

  // Resolve shift types for current selected week
  const k1Type = currentPeriod?.kelompok1Type || 'pagi';
  const k2Type = currentPeriod?.kelompok2Type || 'siang';

  const k1ShiftTitle = k1Type === 'pagi' ? 'Shift Pagi' : 'Shift Siang';
  const k1ShiftTime = k1Type === 'pagi' ? pagiTime : siangTime;

  const k2ShiftTitle = k2Type === 'pagi' ? 'Shift Pagi' : 'Shift Siang';
  const k2ShiftTime = k2Type === 'pagi' ? pagiTime : siangTime;

  // Format date range display for current period
  const formattedPeriodRange = useMemo(() => {
    if (!currentPeriod) return 'Periode Minggu Ini';
    const sDate = new Date(currentPeriod.startDate);
    const eDate = new Date(currentPeriod.endDate);
    const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    return `${fmt(sDate)} s.d. ${fmt(eDate)} ${eDate.getFullYear()}`;
  }, [currentPeriod]);

  // Check if user is admin/kurikulum/staf_jadwal to allow selecting teacher
  const isAdminOrKurikulum = currentUser.role === 'admin' || currentUser.role === 'kurikulum' || currentUser.role === 'staf_jadwal';

  // Teacher selection for admin/kurikulum/staf_jadwal
  const [selectedTeacherUsername, setSelectedTeacherUsername] = useState<string>(() => {
    if (currentUser.role === 'admin' || currentUser.role === 'kurikulum' || currentUser.role === 'staf_jadwal') {
      return 'all';
    }
    const d = (currentUser.data || {}) as any;
    return String((currentUser as any)?.username || d?.username || '').toLowerCase().trim();
  });

  // Teacher list for selector dropdown
  const teacherList = useMemo(() => {
    return (appData.waliKelas || []).map((w) => ({
      id: w.id,
      username: w.username || '',
      nama: w.nama || 'Guru',
      nip: w.nip || '',
    }));
  }, [appData.waliKelas]);

  // Find teacher profile and filter all schedules for this teacher
  const { teacherName, teacherNip, weeklySchedules, dayStats } = useMemo(() => {
    if (!appData.jadwalMengajar || !Array.isArray(appData.jadwalMengajar)) {
      return { teacherName: '', teacherNip: '', weeklySchedules: [], dayStats: {} };
    }

    const d = (currentUser.data || {}) as any;
    const currentUsername = String((currentUser as any)?.username || d?.username || '').toLowerCase().trim();
    const targetUsername = isAdminOrKurikulum && selectedTeacherUsername ? selectedTeacherUsername : currentUsername;
    const uid = String(d?.id || '').trim();
    const unip = String(d?.nip || '').toLowerCase().trim();
    const unama = String(d?.nama || '').toLowerCase().trim();

    const matchedWali = (appData.waliKelas || []).find((w) => {
      if (isAdminOrKurikulum && selectedTeacherUsername) {
        return (
          String(w.username || '').toLowerCase().trim() === selectedTeacherUsername ||
          String(w.id || '').toLowerCase().trim() === selectedTeacherUsername
        );
      }
      if (uid && w.id === uid) return true;
      if (currentUsername && w.username && String(w.username).toLowerCase().trim() === currentUsername) return true;
      if (unip && w.nip && String(w.nip).toLowerCase().trim() === unip) return true;
      if (unama && w.nama && String(w.nama).toLowerCase().trim() === unama) return true;
      return false;
    });

    const profId = (matchedWali?.id || uid).toLowerCase();
    const profUser = (matchedWali?.username || targetUsername || '').toLowerCase().trim();
    const profNip = (matchedWali?.nip || d?.nip || '').toLowerCase().trim();
    const profNama = matchedWali?.nama || d?.nama || currentUser.data.nama || 'Guru Pengajar';

    const canViewAllWithoutTeacher = isAdminOrKurikulum && (!selectedTeacherUsername || selectedTeacherUsername === 'all');

    // Filter schedules belonging to current/selected teacher
    const allTeacherJadwal = appData.jadwalMengajar.filter((j: any) => {
      if (canViewAllWithoutTeacher) return true;

      const jId = String(j.guruId || '').toLowerCase().trim();
      const jUser = String(j.guruUsername || '').toLowerCase().trim();
      const jNip = String(j.guruNip || '').toLowerCase().trim();
      const jNama = String(j.guruNama || '').toLowerCase().trim();

      if (profId && jId && profId === jId) return true;
      if (profUser && jUser && profUser === jUser) return true;
      if (profNip && jNip && profNip === jNip) return true;
      if (profUser && jNip && profUser === jNip) return true;
      if (profNip && jUser && profNip === jUser) return true;
      if (profNama && jNama && profNama.toLowerCase().trim() === jNama) return true;
      return false;
    });

    // Filter schedule items to ONLY keep items where the schedule's shift matches
    // the active shift for that class's Kelompok in the currently selected week (k1Type / k2Type).
    const activeTeacherJadwal = allTeacherJadwal.filter((j: any) => {
      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );
      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || 'Kelas';
      const kelompok = determineKelasKelompok(kelasNamaDisplay);

      const activeShiftForKelompok = (kelompok === 1 ? k1Type : k2Type).toLowerCase().trim();
      const itemShift = String(j.shift || 'pagi').toLowerCase().trim();

      return itemShift === activeShiftForKelompok;
    });

    // Map and group by day
    const stats: Record<string, { count: number; totalJp: number }> = {
      Senin: { count: 0, totalJp: 0 },
      Selasa: { count: 0, totalJp: 0 },
      Rabu: { count: 0, totalJp: 0 },
      Kamis: { count: 0, totalJp: 0 },
      Jumat: { count: 0, totalJp: 0 },
    };

    const parsedWeekly = activeTeacherJadwal.map((j: any) => {
      const jamList = parseJamKeList(j.jamKe, j.jamKeList);
      const jpCount = jamList.length || 1;
      const day = j.hari || 'Senin';

      if (stats[day]) {
        stats[day].count += 1;
        stats[day].totalJp += jpCount;
      }

      const targetK = (appData.kelas || []).find(
        (k: any) => k.id === j.kelasId || k.nama === j.kelasNama || k.id === j.kelasNama
      );
      const kelasNamaDisplay = targetK?.nama || j.kelasNama || j.kelasId || 'Kelas';
      const kelompok = determineKelasKelompok(kelasNamaDisplay);

      const weeklyActiveShiftType = kelompok === 1 ? k1Type : k2Type;
      const weeklyActiveShiftLabel = weeklyActiveShiftType === 'pagi' ? 'Pagi' : 'Siang';
      const weeklyActiveShiftTime = weeklyActiveShiftType === 'pagi' ? pagiTime : siangTime;

      return {
        ...j,
        jpCount,
        jamList,
        kelompok,
        kelasNamaDisplay,
        mapelClean: cleanMapelName(j.mataPelajaran),
        weeklyActiveShiftType,
        weeklyActiveShiftLabel,
        weeklyActiveShiftTime,
      };
    });

    return {
      teacherName: canViewAllWithoutTeacher ? 'Semua Guru (Jadwal Seluruh Pengajar)' : profNama,
      teacherNip: canViewAllWithoutTeacher ? '' : profNip,
      weeklySchedules: parsedWeekly,
      dayStats: stats,
    };
  }, [appData, currentUser, k1Type, k2Type, pagiTime, siangTime, isAdminOrKurikulum, selectedTeacherUsername]);

  const formatJamKeNumberOnly = (jamKeRaw?: string, jamList?: number[]) => {
    if (jamList && Array.isArray(jamList) && jamList.length > 0) {
      if (jamList.length === 1) return `${jamList[0]}`;
      return `${jamList[0]} - ${jamList[jamList.length - 1]}`;
    }
    let text = String(jamKeRaw || '').trim();
    if (text) {
      text = text.replace(/\s*\([^)]*\)/g, '').trim();
      text = text.replace(/^(jam\s*ke-?\s*)+/i, '').trim();
      if (text) return text;
    }
    return '-';
  };

  // Filter schedules for selected active day & map active shift for current week
  const activeDaySchedules = weeklySchedules
    .filter((j) => j.hari === activeDay)
    .sort((a, b) => {
      const shiftA = a.weeklyActiveShiftType === 'siang' ? 2 : 1;
      const shiftB = b.weeklyActiveShiftType === 'siang' ? 2 : 1;
      if (shiftA !== shiftB) return shiftA - shiftB;
      const jamA = a.jamList[0] || 1;
      const jamB = b.jamList[0] || 1;
      return jamA - jamB;
    });

  const totalWeeklySchedules = weeklySchedules.length;
  const totalWeeklyJp = weeklySchedules.reduce((acc, curr) => acc + (curr.jpCount || 1), 0);
  const activeDayTotalJp = activeDaySchedules.reduce((acc, curr) => acc + (curr.jpCount || 1), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* 1. PAGE HEADER */}
      <PageHeader
        icon={Calendar}
        title="Jadwal Mengajar Minggu Ini"
        description={`Jadwal KBM aktif sesuai rotasi shift mingguan • Pengajar: ${teacherName}${teacherNip ? ` (NIP: ${teacherNip})` : ''}`}
        badge={formattedPeriodRange}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateView('dashboard')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/20"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('mapel_kelas_guru')}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center gap-1.5 border border-emerald-400/30 transition cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Mapel &amp; Kelas Ajar</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('jadwal_mengajar')}
              className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-white/25 shadow-xs"
            >
              <Calendar className="w-4 h-4" />
              <span>Matriks Lengkap Jadwal</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/20 print:hidden"
              title="Cetak Jadwal Mingguan"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* 2. WEEK PERIOD SELECTOR & SHIFT ROTATION INFO */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          {/* Week Selector Control */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4" />
              <span>Pilih Minggu:</span>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                disabled={selectedPeriodIndex <= 0}
                onClick={() => setSelectedPeriodIndex((prev) => Math.max(0, prev - 1))}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 transition cursor-pointer text-slate-700 dark:text-slate-200 shadow-2xs"
                title="Minggu Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedPeriodIndex}
                onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-extrabold border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {shiftPeriods.map((p, idx) => {
                  const s = new Date(p.startDate);
                  const e = new Date(p.endDate);
                  const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  const isCurrentWeek = idx === defaultPeriodIndex;
                  return (
                    <option key={p.id || idx} value={idx}>
                      {isCurrentWeek ? '⭐ ' : ''}Minggu ke-{p.id || idx + 1}: {fmt(s)} s.d. {fmt(e)}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                disabled={selectedPeriodIndex >= shiftPeriods.length - 1}
                onClick={() => setSelectedPeriodIndex((prev) => Math.min(shiftPeriods.length - 1, prev + 1))}
                className="p-1.5 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 transition cursor-pointer text-slate-700 dark:text-slate-200 shadow-2xs"
                title="Minggu Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin/Kurikulum Teacher Switcher */}
          {isAdminOrKurikulum && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold whitespace-nowrap">Filter Guru:</span>
              <select
                value={selectedTeacherUsername}
                onChange={(e) => setSelectedTeacherUsername(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Semua Guru (Jadwal Terjadwal)</option>
                {teacherList.map((t) => (
                  <option key={t.id} value={t.username || t.id}>
                    {t.nama} {t.nip ? `(${t.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* ROTASI SHIFT BADGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {/* Kelompok 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Kelompok 1 (Kelas X &amp; XI)</span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                {k1Type === 'pagi' ? <Sun className="w-4 h-4 text-amber-500" /> : <Sunset className="w-4 h-4 text-sky-500" />}
                <span>{k1ShiftTitle}</span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
              {k1ShiftTime}
            </div>
          </div>

          {/* Kelompok 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Kelompok 2 (Kelas XII)</span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                {k2Type === 'pagi' ? <Sun className="w-4 h-4 text-amber-500" /> : <Sunset className="w-4 h-4 text-sky-500" />}
                <span>{k2ShiftTitle}</span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-indigo-100/70 dark:bg-indigo-950/60 text-xs font-bold text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
              {k2ShiftTime}
            </div>
          </div>

          {/* Total Sepekan */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs flex items-center justify-between gap-3 sm:col-span-2 lg:col-span-1">
            <div className="space-y-0.5">
              <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">Beban KBM Sepekan</div>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                {totalWeeklySchedules} Kelas Terjadwal
              </div>
            </div>
            <div className="px-3 py-1 rounded-xl bg-blue-100/70 dark:bg-blue-950/60 text-xs font-black text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {totalWeeklyJp} JP Aktif
            </div>
          </div>
        </div>
      </div>

      {/* 3. DAY TABS & VIEW MODE TOGGLE */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Day Tabs */}
          <div className="grid grid-cols-5 gap-1 sm:gap-2 flex-1">
            {HARI_SENIN_JUMAT.map((day) => {
              const isActive = activeDay === day && viewMode === 'day';
              const stat = dayStats[day] || { count: 0, totalJp: 0 };

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setActiveDay(day);
                    setViewMode('day');
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 px-1 sm:px-3 rounded-2xl font-bold text-xs transition cursor-pointer text-center ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="truncate w-full text-xs font-black">{day}</span>
                  <span
                    className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-extrabold whitespace-nowrap ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : stat.count > 0
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span className="hidden sm:inline">{stat.count} Sesi ({stat.totalJp} JP)</span>
                    <span className="sm:hidden">{stat.count} Sesi</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle Button */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Per Hari</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Semua Hari</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN SCHEDULE DISPLAY */}
      {viewMode === 'day' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Agenda Mengajar Hari {activeDay} ({activeDaySchedules.length} Sesi Terjadwal)</span>
            </h2>
            {activeDaySchedules.length > 0 && (
              <span className="text-xs text-blue-600 dark:text-blue-400 font-extrabold bg-blue-50 dark:bg-blue-950/60 px-3 py-1 rounded-xl border border-blue-200 dark:border-blue-800">
                Total {activeDayTotalJp} Jam Pelajaran (JP)
              </span>
            )}
          </div>

          {/* Rutinitas Khusus Mingguan: Senin (Upacara) & Jumat (Pembiasaan Baik) */}
          {activeDay === 'Senin' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-red-50 to-white dark:from-rose-950/40 dark:via-red-950/30 dark:to-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-rose-800 dark:text-rose-200 flex items-center gap-2">
                    <span>Upacara Bendera (Bukan Jam Pelajaran)</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-200/80 dark:bg-rose-900/70 text-rose-900 dark:text-rose-200">
                      Khusus Shift Pagi: Jam 1 - 2 (06.30 - 08.00)
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-rose-700/80 dark:text-rose-300/80">
                    Jam ke-1 dan 2 Shift Pagi adalah Upacara Bendera (wajib seluruh guru &amp; siswa), bukan jam pembelajaran mapel. Pembelajaran kelas dimulai dari <strong>Jam ke-3 (07.30 / 08.00 WIB)</strong>.
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                  Kegiatan Rutin Sekolah
                </span>
              </div>
            </div>
          )}

          {activeDay === 'Jumat' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-900/60 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                    <span>Pembiasaan Baik &amp; Literasi</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900/70 text-emerald-900 dark:text-emerald-200">
                      Khusus Shift Pagi: Jam 1 s.d. 2 (06.30 - 08.00)
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-emerald-700/80 dark:text-emerald-300/80">
                    Penguatan karakter &amp; literasi Shift Pagi. <strong>Semua kelas Shift Siang tidak ada pembiasaan</strong> (langsung KBM reguler).
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Kegiatan Rutin Sekolah
                </span>
              </div>
            </div>
          )}

          {activeDaySchedules.length === 0 ? (
            <div className="py-16 px-4 text-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-200">
                  Tidak Ada Jadwal Mengajar Hari {activeDay}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Anda tidak memiliki jadwal KBM yang aktif pada hari {activeDay} untuk minggu rotasi ini.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigateView('jadwal_mengajar')}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Kelola Jadwal Mengajar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeDaySchedules.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-300 dark:hover:border-blue-700 transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header: Shift & Kelompok Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl ${
                          item.weeklyActiveShiftType === 'siang'
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                            : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {item.weeklyActiveShiftType === 'siang' ? (
                          <Sunset className="w-3.5 h-3.5" />
                        ) : (
                          <Sun className="w-3.5 h-3.5" />
                        )}
                        <span>Shift {item.weeklyActiveShiftLabel} ({item.weeklyActiveShiftTime})</span>
                      </span>

                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                          item.kelompok === 1
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        }`}
                      >
                        {item.kelompok === 1 ? 'Kelas X & XI' : 'Kelas XII'}
                      </span>
                    </div>

                    {/* Class Name & JP */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-black text-slate-900 dark:text-white">
                          {item.kelasNamaDisplay}
                        </h4>
                        <span className="text-xs font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-lg">
                          Total {item.jpCount} JP
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{item.mapelClean}</span>
                      </div>
                    </div>

                    {/* Jam Pelajaran Bulatan 1-10 */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap gap-1">
                        <span>Jam KBM (1 - 10):</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-blue-600 dark:text-blue-400">
                            Jam ke-{formatJamKeNumberOnly(item.jamKe, item.jamList)}
                          </span>
                          {item.jamList && item.jamList.length > 0 && (
                            <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md">
                              {getJamPelajaranTime(Math.min(...item.jamList), item.weeklyActiveShiftType === 'siang' ? 'Siang' : 'Pagi').split(' - ')[0]} - {getJamPelajaranTime(Math.max(...item.jamList), item.weeklyActiveShiftType === 'siang' ? 'Siang' : 'Pagi').split(' - ')[1]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 w-full max-w-full my-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                          const isScheduled = Array.isArray(item.jamList) && item.jamList.includes(n);
                          const shiftType = item.weeklyActiveShiftType === 'siang' ? 'Siang' : 'Pagi';
                          const timeStr = getJamPelajaranTime(n, shiftType);
                          return isScheduled ? (
                            <div
                              key={n}
                              className="flex-1 max-w-[34px] aspect-square rounded-full bg-blue-600 text-white font-black text-xs sm:text-sm flex flex-col items-center justify-center border-2 border-blue-400 dark:border-blue-500 ring-2 ring-blue-300/80 dark:ring-blue-500/40 shadow-xs leading-none select-none transition-transform hover:scale-110"
                              title={`Jam ke-${n} (${shiftType}: ${timeStr}) - Mengajar ${item.mapelClean}`}
                            >
                              <span className="leading-none pt-0.5">{n}</span>
                              <span className="w-1 h-1 rounded-full bg-white mt-0.5 shrink-0"></span>
                            </div>
                          ) : (
                            <div
                              key={n}
                              className="flex-1 max-w-[34px] aspect-square rounded-full bg-white dark:bg-slate-800 text-blue-500 dark:text-blue-400 font-bold text-xs sm:text-sm flex items-center justify-center border-2 border-blue-300 dark:border-blue-700/80 leading-none select-none opacity-75"
                              title={`Jam ke-${n} (${shiftType}: ${timeStr})`}
                            >
                              <span>{n}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToInput(item.kelasId)}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Presensi Kelas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateView('jadwal_mengajar')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <span>Detail</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 5. ALL DAYS MATRIX TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Matriks Ringkasan Sepekan ({weeklySchedules.length} Sesi Aktif)
            </h2>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
              Total {totalWeeklyJp} JP Sepekan
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-extrabold">
                  <th className="py-3 px-4 rounded-l-xl">Hari</th>
                  <th className="py-3 px-4">Shift &amp; Waktu</th>
                  <th className="py-3 px-4">Kelompok</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4">Jam Ke</th>
                  <th className="py-3 px-4">Durasi</th>
                  <th className="py-3 px-4 rounded-r-xl text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                {weeklySchedules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada data jadwal mengajar aktif pada minggu ini.
                    </td>
                  </tr>
                ) : (
                  weeklySchedules.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                        {item.hari}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${
                            item.weeklyActiveShiftType === 'siang'
                              ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {item.weeklyActiveShiftType === 'siang' ? <Sunset className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                          <span>Shift {item.weeklyActiveShiftLabel}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          {item.kelompok === 1 ? 'Kelas X & XI' : 'Kelas XII'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.kelasNamaDisplay}
                      </td>
                      <td className="py-3 px-4 font-bold text-blue-600 dark:text-blue-400">
                        {item.mapelClean}
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-800 dark:text-slate-200">
                        Jam ke-{formatJamKeNumberOnly(item.jamKe, item.jamList)}
                      </td>
                      <td className="py-3 px-4 font-black">
                        {item.jpCount} JP
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigateToInput(item.kelasId)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs hover:bg-blue-100 transition cursor-pointer"
                        >
                          Presensi
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
