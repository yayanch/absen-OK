import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, LucideIcon } from 'lucide-react';

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

export { AttendanceRecapChart } from './AttendanceRecapChart';

export interface AttendanceTrendChartProps {
  data: AttendanceTrendDataPoint[];
  title?: string;
  subtitle?: string;
  height?: number;
  rangeSelector?: boolean;
  selectedRange?: '7d' | '14d';
  onRangeChange?: (range: '7d' | '14d') => void;
  icon?: LucideIcon;
  className?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  data,
  title = 'Tren Kehadiran Siswa',
  subtitle = 'Tingkat kehadiran harian dalam rentang waktu terpilih.',
  height = 220,
  rangeSelector = false,
  selectedRange = '7d',
  onRangeChange,
  icon: Icon = TrendingUp,
  className = '',
}) => {
  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Icon className="w-5 h-5 text-theme-primary" />
            <span>{title}</span>
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {rangeSelector && onRangeChange && (
          <div className="inline-flex self-start sm:self-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => onRangeChange('7d')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedRange === '7d'
                  ? 'bg-theme-primary text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              7 Hari
            </button>
            <button
              type="button"
              onClick={() => onRangeChange('14d')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedRange === '14d'
                  ? 'bg-theme-primary text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              14 Hari
            </button>
          </div>
        )}
      </div>

      <div style={{ height }} className="w-full pt-3 pb-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
            Belum ada riwayat data kehadiran dalam rentang ini.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800 opacity-60"
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                unit="%"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as AttendanceTrendDataPoint;
                    return (
                      <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-xl border border-slate-700/50 text-xs space-y-1">
                        <p className="font-bold text-slate-200">{label}</p>
                        <p className="text-emerald-400 font-extrabold text-sm">
                          Tingkat Hadir: {d.percent}%
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          Hadir: {d.hadir} / {d.total} Siswa
                        </p>
                        {Boolean((d.sakit ?? 0) > 0 || (d.izin ?? 0) > 0 || (d.alpa ?? 0) > 0) && (
                          <div className="pt-1 border-t border-slate-700/60 flex items-center gap-2 text-[10px] text-slate-300">
                            {(d.sakit ?? 0) > 0 && <span className="text-sky-300">S: {d.sakit}</span>}
                            {(d.izin ?? 0) > 0 && <span className="text-indigo-300">I: {d.izin}</span>}
                            {(d.alpa ?? 0) > 0 && <span className="text-rose-300">A: {d.alpa}</span>}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="percent"
                stroke="var(--theme-primary)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: 'var(--theme-primary)',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: 'var(--theme-primary)',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
