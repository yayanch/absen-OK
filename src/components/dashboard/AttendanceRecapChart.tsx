import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Award,
  Filter,
  ChevronDown
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';

export type TrendRangeOption = '7d' | '14d' | '30d' | 'this_month' | 'last_month' | '90d' | 'custom';

export interface AttendanceTrendDataPoint {
  date?: string;
  dateLabel: string;
  percent: number;
  hadir: number;
  total: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  kesiangan?: number;
  dispensasi?: number;
  isEffective?: boolean;
}

export interface AttendanceRecapChartProps {
  trendData: AttendanceTrendDataPoint[];
  trendRange: TrendRangeOption;
  onRangeChange?: (range: TrendRangeOption) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
  appData?: AppData;
  selectedDate?: string;
  currentUser?: UserSession;
  targetClasses?: any[];
  title?: string;
  subtitle?: string;
  onNavigateView?: (view: ViewType) => void;
  className?: string;
}

export const AttendanceRecapChart: React.FC<AttendanceRecapChartProps> = ({
  trendData = [],
  trendRange = '7d',
  onRangeChange,
  customStartDate,
  customEndDate,
  onCustomRangeChange,
  title = 'Grafik Tren Kehadiran Siswa',
  subtitle = 'Grafik persentase tingkat kehadiran harian siswa.',
  onNavigateView,
  className = '',
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(trendRange === 'custom');

  // 1. Calculate Aggregate Cumulative Stats from trendData
  const aggregateMetrics = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return {
        avgRate: '0.0',
        totalHadir: 0,
        totalSakit: 0,
        totalIzin: 0,
        totalAlpha: 0,
        totalKesiangan: 0,
        bestDay: null as { label: string; pct: number } | null,
        worstDay: null as { label: string; pct: number } | null,
      };
    }

    let sumPct = 0;
    let countPct = 0;
    let sumHadir = 0;
    let sumSakit = 0;
    let sumIzin = 0;
    let sumAlpha = 0;
    let sumKesiangan = 0;
    let bestDay: { label: string; pct: number } | null = null;
    let worstDay: { label: string; pct: number } | null = null;

    trendData.forEach((d) => {
      sumPct += d.percent;
      countPct++;
      sumHadir += d.hadir || 0;
      sumSakit += d.sakit || 0;
      sumIzin += d.izin || 0;
      sumAlpha += d.alpa || 0;
      sumKesiangan += d.kesiangan || 0;

      if (!bestDay || d.percent > bestDay.pct) {
        bestDay = { label: d.dateLabel, pct: d.percent };
      }
      if (!worstDay || d.percent < worstDay.pct) {
        worstDay = { label: d.dateLabel, pct: d.percent };
      }
    });

    const avgRate = countPct > 0 ? (sumPct / countPct).toFixed(1) : '0.0';

    return {
      avgRate,
      totalHadir: sumHadir,
      totalSakit: sumSakit,
      totalIzin: sumIzin,
      totalAlpha: sumAlpha,
      totalKesiangan: sumKesiangan,
      bestDay,
      worstDay,
    };
  }, [trendData]);

  // Label text for active range badge
  const rangeLabel = useMemo(() => {
    switch (trendRange) {
      case '7d':
        return '1 Minggu (7 Hari)';
      case '14d':
        return '2 Minggu (14 Hari)';
      case '30d':
        return '1 Bulan (30 Hari)';
      case 'this_month':
        return 'Bulan Ini';
      case 'last_month':
        return 'Bulan Lalu';
      case '90d':
        return '3 Bulan (Triwulan)';
      case 'custom':
        return customStartDate && customEndDate
          ? `${customStartDate} s/d ${customEndDate}`
          : 'Rentang Kustom';
      default:
        return '7 Hari';
    }
  }, [trendRange, customStartDate, customEndDate]);

  // Dynamic X-Axis tick interval for large ranges
  const xAxisInterval = useMemo(() => {
    if (trendData.length > 60) return 6;
    if (trendData.length > 30) return 3;
    if (trendData.length > 14) return 1;
    return 0;
  }, [trendData.length]);

  // Custom Tooltip for Daily Trend Chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const currentData = payload[0]?.payload as AttendanceTrendDataPoint;
    if (!currentData) return null;

    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/60 text-xs min-w-[200px] space-y-2">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span>{label}</span>
          </span>
          <span className="font-black text-blue-400 bg-blue-950 px-2 py-0.5 rounded-full border border-blue-800 text-[11px]">
            {currentData.percent}%
          </span>
        </div>

        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-blue-300">
            <span>Hadir:</span>
            <span className="font-bold">{currentData.hadir} siswa</span>
          </div>
          {(currentData.sakit ?? 0) > 0 && (
            <div className="flex justify-between text-sky-300">
              <span>Sakit:</span>
              <span className="font-bold">{currentData.sakit} siswa</span>
            </div>
          )}
          {(currentData.izin ?? 0) > 0 && (
            <div className="flex justify-between text-indigo-300">
              <span>Izin:</span>
              <span className="font-bold">{currentData.izin} siswa</span>
            </div>
          )}
          {(currentData.alpa ?? 0) > 0 && (
            <div className="flex justify-between text-rose-300">
              <span>Alpha:</span>
              <span className="font-bold">{currentData.alpa} siswa</span>
            </div>
          )}
          {(currentData.kesiangan ?? 0) > 0 && (
            <div className="flex justify-between text-amber-300">
              <span>Kesiangan:</span>
              <span className="font-bold">{currentData.kesiangan} siswa</span>
            </div>
          )}
          {Boolean(currentData.total) && (
            <div className="pt-1 border-t border-slate-700/60 flex justify-between text-slate-400 text-[10px]">
              <span>Kapasitas:</span>
              <span>{currentData.total} siswa</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-all duration-200 ${className}`}>
      {/* 1. HEADER DENGAN FILTER RENTANG WAKTU (MINGGUAN, BULANAN, DLL.) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
              <span>{title}</span>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/80 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {rangeLabel}
              </span>
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Time Range Filter Selector */}
        {onRangeChange && (
          <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
            {/* Quick Preset Buttons */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => {
                  setShowCustomInputs(false);
                  onRangeChange('7d');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  trendRange === '7d'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="1 Minggu Terakhir"
              >
                1 Minggu
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCustomInputs(false);
                  onRangeChange('14d');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  trendRange === '14d'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="2 Minggu Terakhir"
              >
                2 Minggu
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCustomInputs(false);
                  onRangeChange('30d');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  trendRange === '30d'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="30 Hari Terakhir"
              >
                1 Bulan
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCustomInputs(false);
                  onRangeChange('this_month');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  trendRange === 'this_month'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Bulan Berjalan"
              >
                Bulan Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCustomInputs(false);
                  onRangeChange('90d');
                }}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer hidden sm:inline-block ${
                  trendRange === '90d'
                    ? 'bg-blue-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="3 Bulan Terakhir"
              >
                3 Bulan
              </button>
            </div>

            {/* Dropdown / Custom Range Trigger */}
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold border border-slate-200/60 dark:border-slate-700/60">
              <select
                value={trendRange}
                onChange={(e) => {
                  const val = e.target.value as TrendRangeOption;
                  if (val === 'custom') {
                    setShowCustomInputs(true);
                  } else {
                    setShowCustomInputs(false);
                  }
                  onRangeChange(val);
                }}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-bold px-2 py-1 focus:outline-none cursor-pointer"
              >
                <option value="7d" className="dark:bg-slate-800">1 Minggu (7 Hari)</option>
                <option value="14d" className="dark:bg-slate-800">2 Minggu (14 Hari)</option>
                <option value="30d" className="dark:bg-slate-800">1 Bulan (30 Hari)</option>
                <option value="this_month" className="dark:bg-slate-800">Bulan Ini</option>
                <option value="last_month" className="dark:bg-slate-800">Bulan Lalu</option>
                <option value="90d" className="dark:bg-slate-800">3 Bulan (Triwulan)</option>
                <option value="custom" className="dark:bg-slate-800">Pilih Tanggal Kustom...</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Custom Date Range Inputs (when 'custom' is active) */}
      {trendRange === 'custom' && onCustomRangeChange && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl text-xs">
          <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Rentang Tanggal Kustom:</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStartDate || ''}
              onChange={(e) => onCustomRangeChange(e.target.value, customEndDate || e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 font-medium">s/d</span>
            <input
              type="date"
              value={customEndDate || ''}
              onChange={(e) => onCustomRangeChange(customStartDate || e.target.value, e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* 2. AREA GRAFIK TREN HARIAN (WARNA BIRU RESPONSIF & MUDAH DIBACA) */}
      <div className="w-full pt-1">
        <div className="h-72 w-full">
          {trendData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Belum ada rekaman presensi harian pada rentang waktu ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDailyTrendBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-200 dark:text-slate-800 opacity-60"
                />
                <XAxis
                  dataKey="dateLabel"
                  interval={xAxisInterval}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                />
                <Tooltip content={<CustomTrendTooltip />} />
                <Area
                  type="monotone"
                  dataKey="percent"
                  name="% Kehadiran"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fill="url(#gradDailyTrendBlue)"
                  dot={trendData.length <= 31 ? {
                    r: 4,
                    fill: '#2563eb',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  } : false}
                  activeDot={{
                    r: 6.5,
                    fill: '#1d4ed8',
                    stroke: '#ffffff',
                    strokeWidth: 2.5,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 3. RINCIAN PERSENTASE HARIAN RINGKAS (TEMA BIRU) */}
      {trendData.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span>Rincian Harian ({trendData.length} Hari Terdata):</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              Rata-rata: {aggregateMetrics.avgRate}%
            </span>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {trendData.map((d, idx) => {
              const isBest = aggregateMetrics.bestDay && d.dateLabel === aggregateMetrics.bestDay.label && d.percent > 0;
              return (
                <div
                  key={d.date || d.dateLabel + idx}
                  className={`min-w-[90px] p-2 rounded-xl border text-center shrink-0 transition ${
                    isBest
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800'
                  }`}
                >
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center justify-center gap-1">
                    <span>{d.dateLabel}</span>
                    {isBest && <Award className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="text-sm font-black text-slate-900 dark:text-white font-mono mt-0.5">
                    {d.percent}%
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                    {d.hadir} Hadir
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. FOOTER INSIGHT & QUICK LINK (WARNA BIRU) */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
          <span>
            {aggregateMetrics.bestDay && aggregateMetrics.bestDay.pct > 0 ? (
              <>
                Kehadiran tertinggi tercatat pada <strong className="text-blue-600 dark:text-blue-400">{aggregateMetrics.bestDay.label} ({aggregateMetrics.bestDay.pct}%)</strong> • Rata-rata: <strong className="text-slate-700 dark:text-slate-200">{aggregateMetrics.avgRate}%</strong>.
              </>
            ) : (
              'Grafik tren kehadiran harian terhubung langsung dengan data presensi sekolah.'
            )}
          </span>
        </div>

        {onNavigateView && (
          <button
            type="button"
            onClick={() => onNavigateView('rekap_harian')}
            className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer self-start sm:self-auto"
          >
            <span>Buka Laporan Rekapitulasi Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
