import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon, CheckCircle2, Clock, Sparkles, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';

export interface ClassAttendanceSummary {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  kesiangan?: number;
  dispensasi?: number;
  total: number;
  isFilled: boolean;
}

interface ClassDonutChartProps {
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  kesiangan?: number;
  dispensasi?: number;
  total: number;
  isFilled: boolean;
  size?: number;
}

export const ClassDonutChart: React.FC<ClassDonutChartProps> = ({
  hadir,
  izin,
  sakit,
  alpa,
  kesiangan = 0,
  dispensasi = 0,
  total,
  isFilled,
  size = 76,
}) => {
  const radius = 34;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // ~213.628

  if (!isFilled || total === 0) {
    return (
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray="4 4"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1">
          <span className="text-[10px] font-extrabold text-slate-400 leading-none">0%</span>
          <span className="text-[8px] font-semibold text-slate-400 mt-0.5 leading-none">Belum</span>
        </div>
      </div>
    );
  }

  const segments = [
    { label: 'Hadir', count: hadir, color: '#10b981' },     // emerald-500
    { label: 'Kesiangan', count: kesiangan, color: '#ea580c' }, // orange-600
    { label: 'Dispensasi', count: dispensasi, color: '#a855f7' }, // purple-500
    { label: 'Izin', count: izin, color: '#f59e0b' },       // amber-500
    { label: 'Sakit', count: sakit, color: '#3b82f6' },      // blue-500
    { label: 'Alpa', count: alpa, color: '#ef4444' },       // rose-500
  ];

  const hadirPercentage = total > 0 ? Math.round((hadir / total) * 100) : 0;

  let accumulatedPercent = 0;

  return (
    <div
      className="relative flex items-center justify-center shrink-0 group"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, idx) => {
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
              className="transition-all duration-300 hover:opacity-80"
            >
              <title>{`${seg.label}: ${seg.count} siswa (${Math.round(percent * 100)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-1 pointer-events-none">
        <span className="text-[12px] font-black text-slate-800 dark:text-white leading-none">
          {hadirPercentage}%
        </span>
        <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-tighter leading-none">
          Hadir
        </span>
      </div>
    </div>
  );
};

interface OverallPieChartProps {
  totalHadir: number;
  totalIzin: number;
  totalSakit: number;
  totalAlpa: number;
  totalKesiangan?: number;
  totalDispensasi?: number;
  totalStudents: number;
  filledClassesCount: number;
  totalClassesCount: number;
  onOpenDetail?: () => void;
}

export const OverallPieChart: React.FC<OverallPieChartProps> = ({
  totalHadir,
  totalIzin,
  totalSakit,
  totalAlpa,
  totalKesiangan = 0,
  totalDispensasi = 0,
  totalStudents,
  filledClassesCount,
  totalClassesCount,
  onOpenDetail,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const recordedStudentsTotal = totalHadir + totalIzin + totalSakit + totalAlpa + totalKesiangan + totalDispensasi;
  const unrecordedStudents = Math.max(0, totalStudents - recordedStudentsTotal);

  const chartData = [
    { name: 'Hadir (H)', value: totalHadir, color: '#10b981' },
    { name: 'Kesiangan (K)', value: totalKesiangan, color: '#ea580c' },
    { name: 'Dispensasi (D)', value: totalDispensasi, color: '#a855f7' },
    { name: 'Izin (I)', value: totalIzin, color: '#f59e0b' },
    { name: 'Sakit (S)', value: totalSakit, color: '#3b82f6' },
    { name: 'Alpa (A)', value: totalAlpa, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  if (unrecordedStudents > 0) {
    chartData.push({ name: 'Belum Diisi', value: unrecordedStudents, color: '#64748b' });
  }

  const overallHadirPct =
    recordedStudentsTotal > 0 ? Math.round((totalHadir / recordedStudentsTotal) * 100) : 0;

  const cardContent = (fullscreen: boolean) => (
    <div
      className={`bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col justify-between box-border transition-all duration-300 ${
        fullscreen
          ? 'fixed inset-0 w-full h-full z-50 rounded-none p-6 md:p-10 overflow-y-auto bg-slate-950'
          : 'rounded-2xl p-4 sm:p-5 hover:scale-[1.02] hover:shadow-lg hover:border-slate-700'
      }`}
    >
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

      <div className={`relative z-10 flex flex-col gap-3.5 ${fullscreen ? 'max-w-5xl w-full mx-auto my-auto' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400">
                <PieChartIcon className="w-3.5 h-3.5" />
              </span>
              <h4 className={`${fullscreen ? 'text-2xl' : 'text-base'} font-black text-white truncate`}>
                Presensi Hari Ini
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 text-[10px] font-extrabold border border-indigo-500/30">
                {filledClassesCount}/{totalClassesCount} Kelas
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Ringkasan kehadiran gabungan seluruh siswa hari ini.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenDetail && !fullscreen && (
              <button
                type="button"
                onClick={onOpenDetail}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>Detail</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullScreen(!fullscreen)}
              title={fullscreen ? 'Keluar Full Screen' : 'Full Screen'}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-700/80 font-bold"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Section: Donut + Stat Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center bg-slate-950/60 p-3 rounded-2xl border border-slate-800/70">
          {/* Donut Chart Display */}
          <div className="sm:col-span-5 md:col-span-4 flex flex-col items-center justify-center py-1">
            <div className={`relative flex items-center justify-center shrink-0 ${fullscreen ? 'w-56 h-56' : 'w-28 h-28'}`}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={fullscreen ? 68 : 34}
                      outerRadius={fullscreen ? 98 : 52}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                      formatter={(val: any) => [`${val} siswa`, 'Jumlah']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                  Kosong
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className={`${fullscreen ? 'text-3xl' : 'text-xl'} font-black text-white`}>{overallHadirPct}%</span>
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                  Hadir
                </span>
              </div>
            </div>
          </div>

          {/* Stat Metrics Grid */}
          <div className="sm:col-span-7 md:col-span-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {/* Hadir */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Hadir
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalHadir / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalHadir} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Kesiangan */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                  Kesiangan
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalKesiangan / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalKesiangan} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Dispensasi */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  Dispensasi
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalDispensasi / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalDispensasi} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Izin */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  Izin
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalIzin / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalIzin} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Sakit */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  Sakit
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalSakit / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalSakit} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Alpa */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Alpa
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {recordedStudentsTotal > 0 ? Math.round((totalAlpa / recordedStudentsTotal) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalAlpa} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>

            {/* Belum Absen */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                  Belum Absen
                </span>
                <span className="text-[10px] font-extrabold text-slate-500">
                  {totalStudents > 0 ? Math.round((unrecordedStudents / totalStudents) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {unrecordedStudents} <span className="text-[10px] font-medium text-slate-400">siswa</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {cardContent(false)}
      {isFullScreen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          {cardContent(true)}
        </div>
      )}
    </>
  );
};

export interface ClassSubmissionPieChartProps {
  filledClassesCount: number;
  unfilledClassesCount: number;
  totalClassesCount: number;
  onOpenDetail?: () => void;
}

export const ClassSubmissionPieChart: React.FC<ClassSubmissionPieChartProps> = ({
  filledClassesCount,
  unfilledClassesCount,
  totalClassesCount,
  onOpenDetail,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const chartData = [
    { name: 'Sudah Mengisi', value: filledClassesCount, color: '#10b981' },
    { name: 'Belum Mengisi', value: unfilledClassesCount, color: '#f43f5e' },
  ].filter((item) => item.value > 0);

  const filledPct =
    totalClassesCount > 0 ? Math.round((filledClassesCount / totalClassesCount) * 100) : 0;

  const cardContent = (fullscreen: boolean) => (
    <div
      className={`bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden flex flex-col justify-between box-border transition-all duration-300 ${
        fullscreen
          ? 'fixed inset-0 w-full h-full z-50 rounded-none p-6 md:p-10 overflow-y-auto bg-slate-950'
          : 'rounded-2xl p-4 sm:p-5 hover:scale-[1.02] hover:shadow-lg hover:border-slate-700'
      }`}
    >
      {/* Decorative ambient gradient */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-6 -ml-6 w-36 h-36 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />

      <div className={`relative z-10 flex flex-col gap-3.5 ${fullscreen ? 'max-w-5xl w-full mx-auto my-auto' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                <PieChartIcon className="w-3.5 h-3.5" />
              </span>
              <h4 className={`${fullscreen ? 'text-2xl' : 'text-base'} font-black text-white truncate`}>
                Rekap Pengisian Wali Kelas
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30">
                {filledPct}% Terisi
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Rasio pengisian laporan presensi oleh wali kelas hari ini.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenDetail && !fullscreen && (
              <button
                type="button"
                onClick={onOpenDetail}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>Daftar Kelas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFullScreen(!fullscreen)}
              title={fullscreen ? 'Keluar Full Screen' : 'Full Screen'}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center cursor-pointer border border-slate-700/80 font-bold"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Section: Donut + Stat Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center bg-slate-950/60 p-3 rounded-2xl border border-slate-800/70">
          {/* Donut Chart Display */}
          <div className="sm:col-span-5 md:col-span-4 flex flex-col items-center justify-center py-1">
            <div className={`relative flex items-center justify-center shrink-0 ${fullscreen ? 'w-56 h-56' : 'w-28 h-28'}`}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={fullscreen ? 68 : 34}
                      outerRadius={fullscreen ? 98 : 52}
                      paddingAngle={3}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-sub-${index}`} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '10px',
                        color: '#ffffff',
                        fontSize: '11px',
                        padding: '6px 10px',
                      }}
                      formatter={(val: any) => [`${val} kelas`, 'Jumlah']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 text-xs font-bold">
                  Kosong
                </div>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className={`${fullscreen ? 'text-3xl' : 'text-xl'} font-black text-white`}>{filledPct}%</span>
                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">
                  Pengisian
                </span>
              </div>
            </div>
          </div>

          {/* Stat Metrics Grid */}
          <div className="sm:col-span-7 md:col-span-8 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 gap-2">
            {/* Sudah Mengisi */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  Sudah Mengisi
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {totalClassesCount > 0 ? Math.round((filledClassesCount / totalClassesCount) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {filledClassesCount} <span className="text-[10px] font-medium text-slate-400">Kelas</span>
              </div>
            </div>

            {/* Belum Mengisi */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  Belum Mengisi
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  {totalClassesCount > 0 ? Math.round((unfilledClassesCount / totalClassesCount) * 100) : 0}%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {unfilledClassesCount} <span className="text-[10px] font-medium text-slate-400">Kelas</span>
              </div>
            </div>

            {/* Total Kelas */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:scale-[1.02] hover:shadow-lg hover:border-slate-700 transition-all duration-200">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  Total Kelas
                </span>
                <span className="text-[10px] font-extrabold text-slate-400">
                  100%
                </span>
              </div>
              <div className="text-base font-black text-white">
                {totalClassesCount} <span className="text-[10px] font-medium text-slate-400">Kelas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {cardContent(false)}
      {isFullScreen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          {cardContent(true)}
        </div>
      )}
    </>
  );
};
