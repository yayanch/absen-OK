import React from 'react';

interface AttendanceCircleChartProps {
  hadir: number;
  sakit?: number;
  izin?: number;
  alpa?: number;
  terlambat?: number;
  total?: number;
  size?: number; // default 46
  showLegend?: boolean; // default true
}

export const AttendanceCircleChart: React.FC<AttendanceCircleChartProps> = ({
  hadir,
  sakit = 0,
  izin = 0,
  alpa = 0,
  terlambat = 0,
  total: propTotal,
  size = 46,
  showLegend = true,
}) => {
  const calculatedTotal = hadir + sakit + izin + alpa + terlambat;
  const total = propTotal !== undefined ? propTotal : calculatedTotal;
  const isFilled = total > 0;
  const hadirPercentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

  const radius = 34;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius; // ~213.628

  const segments = [
    { label: 'Hadir', count: hadir, color: '#10b981' }, // emerald-500
    { label: 'Sakit', count: sakit, color: '#3b82f6' }, // blue-500
    { label: 'Izin', count: izin, color: '#f59e0b' },   // amber-500
    { label: 'Alpa', count: alpa, color: '#ef4444' },   // rose-500
    { label: 'Terlambat', count: terlambat, color: '#8b5cf6' }, // violet-500
  ];

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col items-center justify-center py-0.5">
      {/* Circular Donut Graph */}
      <div
        className="relative flex items-center justify-center shrink-0 cursor-pointer group transition-transform hover:scale-105"
        style={{ width: size, height: size }}
        title={`Rincian Kehadiran (${total} Siswa):\n• Hadir (H): ${hadir} (${hadirPercentage}%)\n• Sakit (S): ${sakit}\n• Izin (I): ${izin}\n• Alpa (A): ${alpa}${terlambat > 0 ? `\n• Terlambat: ${terlambat}` : ''}`}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            className="dark:stroke-slate-700/60"
          />
          {isFilled &&
            segments.map((seg, idx) => {
              if (seg.count <= 0) return null;
              const percent = seg.count / total;
              const strokeDasharray = `${percent * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-300"
                />
              );
            })}
        </svg>

        {/* Center Percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-0.5 pointer-events-none">
          <span className="text-[11px] font-black text-slate-800 dark:text-white leading-none">
            {isFilled ? `${hadirPercentage}%` : '-'}
          </span>
        </div>
      </div>

      {/* Subtitle & Legend */}
      {showLegend && (
        <div className="mt-1 flex flex-col items-center text-center">
          <div className="flex items-center justify-center gap-1 text-[10px] font-extrabold leading-tight">
            <span className="text-emerald-600 dark:text-emerald-400">H:{hadir}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className={sakit > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}>S:{sakit}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className={izin > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}>I:{izin}</span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className={alpa > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}>A:{alpa}</span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
            {total} Siswa
          </span>
        </div>
      )}
    </div>
  );
};
