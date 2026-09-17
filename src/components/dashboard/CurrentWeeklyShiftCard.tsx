import React, { useMemo } from 'react';
import { CheckCircle2, ArrowRight, Clock, Sunrise, Sunset, Coffee } from 'lucide-react';
import { AppData, ViewType, Siswa } from '../../types';
import {
  generateWeeklyShiftSchedules,
  normalizeWeeklyShiftPeriods,
  getTodayString,
  getShiftTimingForStudent,
} from '../../utils/helpers';

interface CurrentWeeklyShiftCardProps {
  appData: AppData;
  siswa?: Siswa | { id: string; kelasId: string } | null;
  onNavigateView?: (view: ViewType) => void;
  className?: string;
}

export const CurrentWeeklyShiftCard: React.FC<CurrentWeeklyShiftCardProps> = ({
  appData,
  siswa,
  onNavigateView,
  className = '',
}) => {
  const activePagiTime = appData.shiftConfig?.pagiTime || "06.30 - 12.00";
  const activeSiangTime = appData.shiftConfig?.siangTime || "13.00 - 16.50";

  const getShiftLabel = (type: 'pagi' | 'siang' | 'libur', pagiT: string, siangT: string) => {
    if (type === 'pagi') return `Pagi (${pagiT})`;
    if (type === 'siang') return `Siang (${siangT})`;
    return 'Libur (KBM Off)';
  };

  const shiftSchedules = useMemo(() => {
    const rawPeriods = normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
    if (rawPeriods && rawPeriods.length > 0) {
      return rawPeriods.map(p => {
        const k1Type = p.kelompok1Type || 'pagi';
        const k2Type = p.kelompok2Type || (k1Type === 'pagi' ? 'siang' : 'pagi');
        return {
          id: p.id,
          startDate: new Date(p.startDate),
          endDate: new Date(p.endDate),
          kelompok1Type: k1Type,
          kelompok1Shift: getShiftLabel(k1Type, activePagiTime, activeSiangTime),
          kelompok2Type: k2Type,
          kelompok2Shift: getShiftLabel(k2Type, activePagiTime, activeSiangTime),
        };
      });
    }

    const defaultPeriods = generateWeeklyShiftSchedules();
    return defaultPeriods.map(p => ({
      id: p.id,
      startDate: new Date(p.startDate),
      endDate: new Date(p.endDate),
      kelompok1Type: p.kelompok1Type,
      kelompok1Shift: getShiftLabel(p.kelompok1Type, activePagiTime, activeSiangTime),
      kelompok2Type: p.kelompok2Type,
      kelompok2Shift: getShiftLabel(p.kelompok2Type, activePagiTime, activeSiangTime),
    }));
  }, [appData.shiftConfig, activePagiTime, activeSiangTime]);

  const todayStr = getTodayString();
  const currentPeriod = useMemo(() => {
    const matched = shiftSchedules.find(p => {
      const s = p.startDate.toISOString().split('T')[0];
      const e = p.endDate.toISOString().split('T')[0];
      return todayStr >= s && todayStr <= e;
    });
    return matched || shiftSchedules[0];
  }, [shiftSchedules, todayStr]);

  if (!currentPeriod) return null;

  const formatDateShort = (d: Date) => {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Student specific timing if siswa prop is provided
  const studentTiming = siswa ? getShiftTimingForStudent(appData, siswa, todayStr) : null;
  const isStudentPagi = studentTiming?.shiftType === 'pagi';
  const isStudentSiang = studentTiming?.shiftType === 'siang';

  // Pada akun siswa, tampilkan hanya teks informasi waktu belajar dengan icon depan dan icon background dekoratif
  if (siswa) {
    const shiftTypeStr = isStudentSiang ? 'siang' : studentTiming?.shiftType === 'libur' ? 'libur' : 'pagi';
    const shiftTimeStr = isStudentSiang ? activeSiangTime : isStudentPagi ? activePagiTime : '';
    const ShiftIcon = isStudentSiang ? Sunset : shiftTypeStr === 'libur' ? Coffee : Sunrise;
    const iconColor = shiftTypeStr === 'libur' ? 'text-emerald-300' : 'text-amber-300';

    return (
      <div className={`relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl shadow-blue-900/15 flex items-center justify-between ${className}`}>
        {/* Background Decorative Watermark Icon */}
        <div className="absolute -right-3 -bottom-5 text-white/10 pointer-events-none -rotate-12 select-none">
          <ShiftIcon className="w-24 h-24 sm:w-28 sm:h-28" />
        </div>

        {/* Content with front icon */}
        <div className="relative z-10 flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 ${iconColor} shrink-0 shadow-inner flex items-center justify-center`}>
            <ShiftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <p className="text-base sm:text-lg font-bold text-white tracking-wide">
            {shiftTypeStr === 'libur' ? 'Libur (KBM Off)' : `Shift ${shiftTypeStr}${shiftTimeStr ? ` (${shiftTimeStr})` : ''}`}
          </p>
        </div>
      </div>
    );
  }

  const studentShiftName = isStudentPagi ? 'Pagi' : isStudentSiang ? 'Siang' : studentTiming ? 'Libur' : '';
  const studentShiftTimeStr = isStudentPagi ? activePagiTime : isStudentSiang ? activeSiangTime : '';

  const getPagiClasses = (k1Type: string, k2Type: string) => {
    if (k1Type === 'pagi' && k2Type === 'pagi') return 'Kelas X, XI & XII';
    if (k1Type === 'pagi') return 'Kelas X & XI';
    if (k2Type === 'pagi') return 'Kelas XII';
    if (k1Type === 'siang' && k2Type === 'siang') return 'Libur (KBM Off)';
    if (k1Type === 'siang') return 'Kelas XII';
    if (k2Type === 'siang') return 'Kelas X & XI';
    return 'Kelas XII';
  };

  const getSiangClasses = (k1Type: string, k2Type: string) => {
    if (k1Type === 'siang' && k2Type === 'siang') return 'Kelas X, XI & XII';
    if (k1Type === 'siang') return 'Kelas X & XI';
    if (k2Type === 'siang') return 'Kelas XII';
    if (k1Type === 'pagi' && k2Type === 'pagi') return 'Libur (KBM Off)';
    if (k1Type === 'pagi') return 'Kelas XII';
    if (k2Type === 'pagi') return 'Kelas X & XI';
    return 'Kelas X & XI';
  };

  const currentPagiClass = getPagiClasses(currentPeriod.kelompok1Type, currentPeriod.kelompok2Type);
  const currentSiangClass = getSiangClasses(currentPeriod.kelompok1Type, currentPeriod.kelompok2Type);

  return (
    <div className={`bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-900/15 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${className}`}>
      <div className="space-y-2 flex-1">
        <div className="grid grid-cols-1 w-fit max-w-full gap-1.5">
          <div className="w-full flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold backdrop-blur-md border border-white/10 whitespace-nowrap">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              Minggu Ini (Minggu #{currentPeriod.id}) • Siklus #{Math.ceil(currentPeriod.id / 2)} (Pekan {((currentPeriod.id - 1) % 2) + 1})
            </span>
          </div>
          {siswa && studentShiftName && (
            <div className={`w-full flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black backdrop-blur-md border whitespace-nowrap ${
              isStudentPagi 
                ? 'bg-amber-400/25 text-amber-200 border-amber-300/40' 
                : isStudentSiang 
                ? 'bg-sky-400/25 text-sky-200 border-sky-300/40' 
                : 'bg-white/20 text-white border-white/20'
            }`}>
              <Clock className="w-4 h-4 shrink-0" />
              <span>Shift Kamu: {studentShiftName} ({studentShiftTimeStr} WIB)</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {formatDateShort(currentPeriod.startDate)} s.d. {formatDateShort(currentPeriod.endDate)}
          </h3>
          {onNavigateView && (
            <button
              onClick={() => onNavigateView('jadwal_shift')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20 cursor-pointer backdrop-blur-md"
              title="Lihat Detail Jadwal Shift"
            >
              <span>Detail Shift</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-blue-100/90 font-medium">
          {siswa 
            ? `Jadwal Kamu Shift ${studentShiftName}.`
            : 'Jadwal shift aktif pekan ini (rotasi berlaku selama 2 minggu sebelum berganti giliran).'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 w-full lg:w-auto">
        <div className="bg-transparent p-2 sm:p-3 min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-200 flex items-center justify-between gap-1.5">
            <span>☀️ PAGI ({activePagiTime})</span>
            {isStudentPagi && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400 text-sky-950 shadow-xs">
                Shift Kamu
              </span>
            )}
          </div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-1 capitalize whitespace-nowrap">
            {currentPagiClass}
          </div>
        </div>

        <div className="bg-transparent p-2 sm:p-3 min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-200 flex items-center justify-between gap-1.5">
            <span>🌅 SIANG ({activeSiangTime})</span>
            {isStudentSiang && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-400 text-sky-950 shadow-xs">
                Shift Kamu
              </span>
            )}
          </div>
          <div className="text-sm sm:text-base lg:text-lg font-black text-white mt-1 capitalize whitespace-nowrap">
            {currentSiangClass}
          </div>
        </div>
      </div>
    </div>
  );
};
