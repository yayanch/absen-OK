import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  Info,
  ArrowUpRight,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { calculateDailyAttendanceStats } from '../../utils/helpers';

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
  trendRange: '7d' | '14d' | '30d';
  onRangeChange?: (range: '7d' | '14d' | '30d') => void;
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
  trendData,
  trendRange = '7d',
  onRangeChange,
  appData,
  selectedDate,
  currentUser,
  targetClasses = [],
  title = 'Rekapitulasi & Visualisasi Tren Kehadiran',
  subtitle = 'Grafik analitik komprehensif tingkat kehadiran siswa, distribusi status presensi, dan komparasi rombel.',
  onNavigateView,
  className = '',
}) => {
  // Chart visual type: 'trend_area' | 'class_bar' | 'status_donut'
  const [activeTab, setActiveTab] = useState<'trend_area' | 'class_bar' | 'status_donut'>('trend_area');
  // Sub-mode for trend: 'area_stacked' | 'line_detail' | 'rate_only'
  const [trendSubMode, setTrendSubMode] = useState<'area_stacked' | 'line_detail' | 'rate_only'>('area_stacked');
  // Legend visibility toggles
  const [showHadir, setShowHadir] = useState(true);
  const [showSakit, setShowSakit] = useState(true);
  const [showIzin, setShowIzin] = useState(true);
  const [showAlpha, setShowAlpha] = useState(true);
  const [showKesiangan, setShowKesiangan] = useState(true);

  // 1. Calculate Aggregate Cumulative Stats from trendData
  const aggregateMetrics = useMemo(() => {
    if (!trendData || trendData.length === 0) {
      return {
        avgRate: 0,
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

    const avgRate = countPct > 0 ? (sumPct / countPct).toFixed(1) : '0';

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

  // 2. Class-Level Data for Bar Chart Comparison
  const classComparisonData = useMemo(() => {
    if (!appData || !selectedDate || !targetClasses || targetClasses.length === 0) {
      return [];
    }

    return targetClasses
      .map((k) => {
        const stats = calculateDailyAttendanceStats(appData, selectedDate, { kelasId: k.id });
        return {
          id: k.id,
          name: k.nama,
          hadir: stats.hadirCount,
          sakit: stats.sakitCount,
          izin: stats.izinCount,
          alpa: stats.alpaCount,
          kesiangan: stats.kesianganCount,
          total: stats.totalSiswa,
          rate: Math.round(stats.attendanceRate),
        };
      })
      .sort((a, b) => b.rate - a.rate);
  }, [appData, selectedDate, targetClasses]);

  // 3. Status Distribution Donut Data
  const donutData = useMemo(() => {
    const totalAbsen =
      aggregateMetrics.totalHadir +
      aggregateMetrics.totalSakit +
      aggregateMetrics.totalIzin +
      aggregateMetrics.totalAlpha +
      aggregateMetrics.totalKesiangan;

    if (totalAbsen === 0) {
      return [
        { name: 'Belum Ada Data', value: 1, color: '#94a3b8' },
      ];
    }

    const res = [];
    if (aggregateMetrics.totalHadir > 0) {
      res.push({ name: 'Hadir Tepat Waktu', value: aggregateMetrics.totalHadir, color: '#10b981', code: 'H' });
    }
    if (aggregateMetrics.totalKesiangan > 0) {
      res.push({ name: 'Terlambat / Kesiangan', value: aggregateMetrics.totalKesiangan, color: '#f59e0b', code: 'K' });
    }
    if (aggregateMetrics.totalSakit > 0) {
      res.push({ name: 'Sakit (Surat)', value: aggregateMetrics.totalSakit, color: '#0ea5e9', code: 'S' });
    }
    if (aggregateMetrics.totalIzin > 0) {
      res.push({ name: 'Izin Resmi', value: aggregateMetrics.totalIzin, color: '#6366f1', code: 'I' });
    }
    if (aggregateMetrics.totalAlpha > 0) {
      res.push({ name: 'Alpha (Tanpa Keterangan)', value: aggregateMetrics.totalAlpha, color: '#f43f5e', code: 'A' });
    }

    return res;
  }, [aggregateMetrics]);

  // Custom Dark Mode / Light Mode Tooltip for Trend Chart
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const currentData = payload[0]?.payload as AttendanceTrendDataPoint;
    if (!currentData) return null;

    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 text-xs min-w-[210px] space-y-2 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>{label}</span>
          </span>
          <span className="font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">
            {currentData.percent}%
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-emerald-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Hadir:</span>
            </span>
            <span className="font-bold">{currentData.hadir} siswa</span>
          </div>

          {(currentData.sakit ?? 0) > 0 && (
            <div className="flex items-center justify-between text-sky-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>Sakit:</span>
              </span>
              <span className="font-bold">{currentData.sakit} siswa</span>
            </div>
          )}

          {(currentData.izin ?? 0) > 0 && (
            <div className="flex items-center justify-between text-indigo-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>Izin:</span>
              </span>
              <span className="font-bold">{currentData.izin} siswa</span>
            </div>
          )}

          {(currentData.alpa ?? 0) > 0 && (
            <div className="flex items-center justify-between text-rose-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Alpha:</span>
              </span>
              <span className="font-bold">{currentData.alpa} siswa</span>
            </div>
          )}

          {(currentData.kesiangan ?? 0) > 0 && (
            <div className="flex items-center justify-between text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Kesiangan:</span>
              </span>
              <span className="font-bold">{currentData.kesiangan} siswa</span>
            </div>
          )}

          <div className="pt-1 border-t border-slate-700/50 flex items-center justify-between text-slate-400 text-[10px]">
            <span>Total Siswa:</span>
            <span className="font-semibold text-slate-300">{currentData.total} siswa</span>
          </div>
        </div>
      </div>
    );
  };

  // Custom Tooltip for Class Bar Chart
  const CustomClassTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/60 text-xs min-w-[200px] space-y-2">
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
          <span className="font-bold text-slate-200">{data.name}</span>
          <span className="font-black text-emerald-400 text-xs">{data.rate}% Hadir</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between text-emerald-300">
            <span>Hadir:</span>
            <span className="font-bold">{data.hadir} Siswa</span>
          </div>
          <div className="flex justify-between text-sky-300">
            <span>Sakit:</span>
            <span className="font-bold">{data.sakit} Siswa</span>
          </div>
          <div className="flex justify-between text-indigo-300">
            <span>Izin:</span>
            <span className="font-bold">{data.izin} Siswa</span>
          </div>
          <div className="flex justify-between text-rose-300">
            <span>Alpha:</span>
            <span className="font-bold">{data.alpa} Siswa</span>
          </div>
          <div className="pt-1 border-t border-slate-700/50 flex justify-between text-slate-400 text-[10px]">
            <span>Kapasitas Rombel:</span>
            <span>{data.total} Siswa</span>
          </div>
        </div>
      </div>
    );
  };

  // Custom Tooltip for Donut Chart
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0];
    const total =
      aggregateMetrics.totalHadir +
      aggregateMetrics.totalSakit +
      aggregateMetrics.totalIzin +
      aggregateMetrics.totalAlpha +
      aggregateMetrics.totalKesiangan;
    const pct = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';

    return (
      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-xl border border-slate-700/60 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
          <span className="font-bold text-slate-200">{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4 font-mono text-[11px] text-slate-300">
          <span>{data.value} Presensi</span>
          <span className="font-black text-emerald-400">{pct}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 transition-all duration-200 ${className}`}>
      {/* 1. Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Recharts Engine
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* View Switchers & Range Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Main Chart Type Tabs */}
          <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('trend_area')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'trend_area'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Tren Harian</span>
            </button>

            {targetClasses.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('class_bar')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  activeTab === 'class_bar'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Per Kelas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('status_donut')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition cursor-pointer ${
                activeTab === 'status_donut'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Distribusi</span>
            </button>
          </div>

          {/* Time Range Selector (For Trend Mode) */}
          {activeTab === 'trend_area' && onRangeChange && (
            <div className="inline-flex rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200/60 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => onRangeChange('7d')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
                  trendRange === '7d'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                7 Hari
              </button>
              <button
                type="button"
                onClick={() => onRangeChange('14d')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
                  trendRange === '14d'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                14 Hari
              </button>
              <button
                type="button"
                onClick={() => onRangeChange('30d')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${
                  trendRange === '30d'
                    ? 'bg-emerald-600 text-white shadow-2xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                30 Hari
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Quick Metrik KPI Rekapitulasi */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Rata-rata Hadir</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {aggregateMetrics.avgRate}%
          </div>
          <span className="text-[10px] text-slate-400 block truncate">
            {Number(aggregateMetrics.avgRate) >= 95 ? 'Kategori Sangat Tinggi' : 'Kategori Baik'}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Hadir</span>
            <Users className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
            {aggregateMetrics.totalHadir.toLocaleString('id-ID')}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Presensi siswa</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Sakit</span>
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
          </div>
          <div className="text-lg font-black text-sky-600 dark:text-sky-400 font-mono">
            {aggregateMetrics.totalSakit}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Surat dokter / ket.</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Izin</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {aggregateMetrics.totalIzin}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Permohonan resmi</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Total Alpha</span>
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
          </div>
          <div className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono">
            {aggregateMetrics.totalAlpha}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Tanpa keterangan</span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-1">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Terlambat</span>
            <Clock className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
            {aggregateMetrics.totalKesiangan}
          </div>
          <span className="text-[10px] text-slate-400 block truncate">Kesiangan gerbang</span>
        </div>
      </div>

      {/* 3. Main Chart Canvas View */}
      <div className="relative w-full pt-1">
        {/* =================================================== */}
        {/* TAB 1: TREN HARIAN (AREA / LINE COMPOSITE) */}
        {/* =================================================== */}
        {activeTab === 'trend_area' && (
          <div className="space-y-3">
            {/* Mode Garis vs Stacked & Legend Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">Mode Grafik:</span>
                <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTrendSubMode('area_stacked')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      trendSubMode === 'area_stacked'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Area Komposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendSubMode('line_detail')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      trendSubMode === 'line_detail'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Multi-Garis
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendSubMode('rate_only')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      trendSubMode === 'rate_only'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-black'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    Hanya % Hadir
                  </button>
                </div>
              </div>

              {/* Interactive Series Toggle Pills */}
              {trendSubMode !== 'rate_only' && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setShowHadir(!showHadir)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      showHadir
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Hadir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSakit(!showSakit)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      showSakit
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    <span>Sakit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowIzin(!showIzin)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      showIzin
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Izin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowAlpha(!showAlpha)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      showAlpha
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Alpha</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowKesiangan(!showKesiangan)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      showKesiangan
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-400 line-through'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Kesiangan</span>
                  </button>
                </div>
              )}
            </div>

            {/* Recharts Container */}
            <div className="h-72 w-full pt-2">
              {trendData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400">
                  <Info className="w-6 h-6 mb-1 text-slate-300" />
                  <span>Belum ada data rekaman presensi dalam rentang tanggal ini.</span>
                </div>
              ) : trendSubMode === 'area_stacked' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradHadir" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="gradSakit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gradAlpha" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800 opacity-60" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <Tooltip content={<CustomTrendTooltip />} />
                    {showHadir && (
                      <Area
                        type="monotone"
                        dataKey="hadir"
                        name="Hadir"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradHadir)"
                      />
                    )}
                    {showSakit && (
                      <Area
                        type="monotone"
                        dataKey="sakit"
                        name="Sakit"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#gradSakit)"
                      />
                    )}
                    {showIzin && (
                      <Area
                        type="monotone"
                        dataKey="izin"
                        name="Izin"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="#6366f1"
                        fillOpacity={0.15}
                      />
                    )}
                    {showAlpha && (
                      <Area
                        type="monotone"
                        dataKey="alpa"
                        name="Alpha"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#gradAlpha)"
                      />
                    )}
                    {showKesiangan && (
                      <Area
                        type="monotone"
                        dataKey="kesiangan"
                        name="Kesiangan"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="#f59e0b"
                        fillOpacity={0.15}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              ) : trendSubMode === 'line_detail' ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800 opacity-60" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <Tooltip content={<CustomTrendTooltip />} />
                    {showHadir && (
                      <Line
                        type="monotone"
                        dataKey="hadir"
                        name="Hadir"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 3.5, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                        activeDot={{ r: 6 }}
                      />
                    )}
                    {showSakit && (
                      <Line
                        type="monotone"
                        dataKey="sakit"
                        name="Sakit"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#0ea5e9' }}
                      />
                    )}
                    {showIzin && (
                      <Line
                        type="monotone"
                        dataKey="izin"
                        name="Izin"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#6366f1' }}
                      />
                    )}
                    {showAlpha && (
                      <Line
                        type="monotone"
                        dataKey="alpa"
                        name="Alpha"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: '#f43f5e' }}
                      />
                    )}
                    {showKesiangan && (
                      <Line
                        type="monotone"
                        dataKey="kesiangan"
                        name="Kesiangan"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#f59e0b' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800 opacity-60" />
                    <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <Tooltip content={<CustomTrendTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="percent"
                      name="% Kehadiran"
                      stroke="#10b981"
                      strokeWidth={3.5}
                      dot={{ r: 4.5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* =================================================== */}
        {/* TAB 2: KOMPARASI KELAS (BAR CHART) */}
        {/* =================================================== */}
        {activeTab === 'class_bar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pb-1">
              <span>Perbandingan persentase (%) kehadiran antar rombongan belajar:</span>
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {classComparisonData.length} Rombel Terdata
              </span>
            </div>

            <div className="h-72 w-full">
              {classComparisonData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data kelas yang dapat dibandingkan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classComparisonData.slice(0, 12)} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800 opacity-60" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      stroke="currentColor"
                      className="text-slate-400 dark:text-slate-500"
                    />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400 dark:text-slate-500" />
                    <Tooltip content={<CustomClassTooltip />} />
                    <Bar dataKey="rate" name="% Hadir" fill="#10b981" radius={[6, 6, 0, 0]}>
                      {classComparisonData.slice(0, 12).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.rate >= 95
                              ? '#10b981'
                              : entry.rate >= 85
                              ? '#0ea5e9'
                              : entry.rate >= 75
                              ? '#f59e0b'
                              : '#f43f5e'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* =================================================== */}
        {/* TAB 3: DISTRIBUSI STATUS PRESENSI (DONUT CHART) */}
        {/* =================================================== */}
        {activeTab === 'status_donut' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            <div className="md:col-span-6 h-64 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<CustomDonutTooltip />} />
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Donut Center Total Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                  {aggregateMetrics.avgRate}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Rata-rata Hadir
                </span>
              </div>
            </div>

            {/* Donut Legend Breakdown */}
            <div className="md:col-span-6 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 pb-1 border-b border-slate-100 dark:border-slate-800">
                Rincian Status Presensi ({trendRange === '7d' ? '7 Hari Terakhir' : trendRange === '14d' ? '14 Hari Terakhir' : '30 Hari Terakhir'})
              </h4>
              <div className="space-y-2">
                {donutData.map((item, idx) => {
                  const total =
                    aggregateMetrics.totalHadir +
                    aggregateMetrics.totalSakit +
                    aggregateMetrics.totalIzin +
                    aggregateMetrics.totalAlpha +
                    aggregateMetrics.totalKesiangan;
                  const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs border border-slate-100 dark:border-slate-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">{item.value} siswa</span>
                        <span className="font-black text-slate-800 dark:text-white text-xs min-w-[42px] text-right">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Insight Footer */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            {aggregateMetrics.bestDay ? (
              <>
                Kehadiran tertinggi dicatat pada <strong className="text-emerald-600 dark:text-emerald-400">{aggregateMetrics.bestDay.label} ({aggregateMetrics.bestDay.pct}%)</strong>.
              </>
            ) : (
              'Data presensi tersinkronisasi otomatis dengan server backend.'
            )}
          </span>
        </div>

        {onNavigateView && (
          <button
            type="button"
            onClick={() => onNavigateView('rekap_harian')}
            className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition cursor-pointer self-start sm:self-auto"
          >
            <span>Buka Laporan Rekap Harian</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
