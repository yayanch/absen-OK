import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, CalendarDays } from 'lucide-react';
import { AppData, UserSession } from '../types';
import { formatDateIndo, isWeekend, isFutureDate, getTodayString, getHariLiburInfo } from '../utils/helpers';

interface DatePickerWithStatusProps {
  selectedDate: string;
  onChangeDate: (dateStr: string) => void;
  appData: AppData;
  currentUser?: UserSession;
  kelasId?: string;
  label?: string;
  className?: string;
  hideCalendarButton?: boolean;
  hideUnfilledWarning?: boolean;
}

export const DatePickerWithStatus: React.FC<DatePickerWithStatusProps> = ({
  selectedDate,
  onChangeDate,
  appData,
  currentUser,
  kelasId,
  label = 'Pilih Tanggal Absensi',
  className = '',
  hideCalendarButton = false,
  hideUnfilledWarning = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const shouldHideWarning = hideUnfilledWarning || currentUser?.role === 'wali';

  // Determine viewing month & year for the popover
  const initialDt = selectedDate ? new Date(selectedDate + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(initialDt.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDt.getMonth()); // 0-indexed

  const today = getTodayString();
  const startDate = appData.sekolah.tanggalMulai || '2026-07-15';

  // Determine target classes relevant for the current user/selection
  let targetClasses = appData.kelas;
  if (kelasId) {
    targetClasses = appData.kelas.filter((k) => k.id === kelasId);
  } else if (currentUser && currentUser.role === 'wali') {
    targetClasses = appData.kelas.filter((k) => k.waliKelasId === (currentUser.data as any).id);
  }

  // Helper to check if a specific date string is filled
  const checkStatusForDate = (dateStr: string): 'filled' | 'unfilled' | 'weekend' | 'future' | 'before_start' | 'holiday' => {
    if (!dateStr) return 'before_start';

    // 0. Check Hari Libur / Tanpa Presensi
    const libur = getHariLiburInfo(dateStr, appData);
    if (libur) return 'holiday';

    // 1. Check if all target classes have presensi submitted for this date
    let isRecorded = false;
    if (targetClasses.length > 0) {
      isRecorded = targetClasses.every((k) => {
        const key = `${dateStr}_${k.id}`;
        const recs = (appData.presensi || {})[key];
        return recs && recs.length > 0;
      });
    }

    if (isRecorded) {
      return 'filled';
    }

    // 2. If not recorded, check if it's weekend, future date, or before school start date
    if (isFutureDate(dateStr)) return 'future';
    if (isWeekend(dateStr)) return 'weekend';
    if (dateStr < startDate) return 'before_start';

    // 3. Otherwise, it is an active school weekday that hasn't been filled -> UNFILLED (RED)
    return 'unfilled';
  };

  const currentStatus = checkStatusForDate(selectedDate);

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate days for calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Find all unfilled dates from startDate to today
  const getUnfilledDatesList = (): string[] => {
    const list: string[] = [];
    const curr = new Date(startDate + 'T00:00:00');
    const end = new Date(today + 'T00:00:00');

    while (curr <= end) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;

      if (checkStatusForDate(dStr) === 'unfilled') {
        list.push(dStr);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  };

  const unfilledDates = getUnfilledDatesList();

  return (
    <div className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            {label}
          </label>
          {!hideCalendarButton && (
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{showCalendar ? 'Tutup Kalender' : 'Lihat Kalender Status'}</span>
            </button>
          )}
        </div>
      )}

      {/* Input container with status border and badge */}
      <div className="space-y-2">
        <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className={`w-full py-3 pl-4 pr-10 rounded-2xl text-xs font-bold transition focus:outline-none focus:ring-2 ${
                currentStatus === 'unfilled'
                  ? 'bg-rose-50/70 border-2 border-rose-400 text-rose-900 focus:ring-rose-500'
                  : currentStatus === 'filled'
                  ? 'bg-emerald-50/70 border-2 border-emerald-400 text-emerald-900 focus:ring-emerald-500'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 focus:ring-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Buka Kalender Status Absensi"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>

          {/* Status Badge Tag */}
          <div className="shrink-0">
            {currentStatus === 'unfilled' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 rounded-2xl text-xs font-black shadow-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>belum diisi</span>
              </span>
            )}
            {currentStatus === 'filled' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-extrabold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>sudah diisi</span>
              </span>
            )}
            {currentStatus === 'weekend' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold">
                <span>HARI LIBUR AKHIR PEKAN</span>
              </span>
            )}
            {currentStatus === 'future' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold">
                <span>MASA DEPAN</span>
              </span>
            )}
            {currentStatus === 'before_start' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold">
                <span>SEBELUM MULAI ({startDate})</span>
              </span>
            )}
            {currentStatus === 'holiday' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-purple-50 border border-purple-300 text-purple-800 dark:bg-purple-950/50 dark:border-purple-800 dark:text-purple-200 rounded-2xl text-xs font-black shadow-xs">
                <CalendarDays className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                <span>{getHariLiburInfo(selectedDate, appData)?.keterangan || 'HARI LIBUR / TANPA PRESENSI'}</span>
              </span>
            )}
          </div>
        </div>

        {/* Unfilled dates warning bar if any */}
        {unfilledDates.length > 0 && !shouldHideWarning && (
          <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 p-3 rounded-2xl flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-200 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>{unfilledDates.length} Tanggal Belum Diisi Absensinya:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {unfilledDates.slice(0, 5).map((dStr) => (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => onChangeDate(dStr)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition border ${
                    selectedDate === dStr
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                  }`}
                >
                  {dStr.split('-').reverse().slice(0, 2).join('/')}
                </button>
              ))}
              {unfilledDates.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowCalendar(true)}
                  className="text-[11px] font-bold text-amber-700 dark:text-amber-300 underline px-1 py-1"
                >
                  +{unfilledDates.length - 5} lainnya
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Month Calendar Popover */}
      {showCalendar && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-slate-800 text-sm">
                Kalender Status Absensi ({monthNames[viewMonth]} {viewYear})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowCalendar(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-slate-800 text-sm">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Ming</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-11 rounded-2xl" />
            ))}

            {/* Days of Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const mm = String(viewMonth + 1).padStart(2, '0');
              const dd = String(dayNum).padStart(2, '0');
              const dStr = `${viewYear}-${mm}-${dd}`;

              const st = checkStatusForDate(dStr);
              const isSelected = selectedDate === dStr;

              let styleClasses = 'bg-slate-50 text-slate-400 border-transparent';
              let badgeDot = null;

              if (st === 'unfilled') {
                styleClasses = isSelected
                  ? 'bg-amber-600 text-white font-black border-2 border-amber-700 shadow-md shadow-amber-600/30 ring-2 ring-amber-400'
                  : 'bg-amber-50 text-amber-900 border-2 border-amber-300 hover:bg-amber-100 font-extrabold';
                badgeDot = (
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                );
              } else if (st === 'filled') {
                styleClasses = isSelected
                  ? 'bg-emerald-600 text-white font-black border-2 border-emerald-700 shadow-lg shadow-emerald-600/30'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 font-bold';
                badgeDot = (
                  <span className="absolute top-1 right-1 inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                );
              } else if (st === 'weekend') {
                styleClasses = 'bg-slate-100/60 text-slate-300 border-transparent cursor-not-allowed';
              } else if (st === 'future') {
                styleClasses = 'bg-slate-50 text-slate-300 border-transparent cursor-not-allowed';
              } else if (st === 'before_start') {
                styleClasses = 'bg-slate-50 text-slate-300 border-transparent cursor-not-allowed';
              }

              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() => {
                    onChangeDate(dStr);
                    setShowCalendar(false);
                  }}
                  className={`relative h-11 rounded-2xl flex flex-col items-center justify-center transition text-xs ${styleClasses}`}
                >
                  {badgeDot}
                  <span>{dayNum}</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-300 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-600"></span>
              <span className="text-amber-700 dark:text-amber-300 font-bold">Kuning/Amber: Belum Diisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600"></span>
              <span className="text-emerald-700">Hijau: Sudah Diisi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-300"></span>
              <span className="text-slate-400">Abu-abu: Libur/Luar Periode</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
