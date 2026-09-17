import React from 'react';
import {
  Users,
  UserCheck,
  Building2,
  GraduationCap,
  Calendar,
  TrendingUp,
  FileText,
  AlertCircle,
  Activity,
  Award,
  AlertTriangle,
  Clock,
  Search,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, calculateDailyAttendanceStats } from '../../utils/helpers';
import { SystemHealthWidget } from './SystemHealthWidget';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { PageHeader, StatCard } from '../common/UIComponents';

interface AdminDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  activeSiswa: any[];
  totalStudents: number;
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  kesianganCount: number;
  hadirPercentage: string;
  trendData: any[];
  trendRange: '7d' | '14d' | '30d';
  setTrendRange: (r: '7d' | '14d' | '30d') => void;
  recentLogs: any[];
  unrecordedClasses: any[];
  targetClasses: any[];
  paginatedCumulativeStats: any[];
  rekapSearch: string;
  setRekapSearch: (s: string) => void;
  rekapFilter: any;
  setRekapFilter: (f: any) => void;
  rekapClassFilter: string;
  setRekapClassFilter: (c: string) => void;
  validRekapCurrentPage: number;
  totalRekapPages: number;
  setRekapCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setSelectedStudentDetail: (item: any) => void;
  setCardModalData: (data: any) => void;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput: (kelasId?: string) => void;
  onOpenImportModal?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  activeSiswa,
  totalStudents,
  hadirCount,
  sakitCount,
  izinCount,
  alpaCount,
  kesianganCount,
  hadirPercentage,
  trendData,
  trendRange,
  setTrendRange,
  recentLogs,
  unrecordedClasses,
  targetClasses,
  paginatedCumulativeStats,
  rekapSearch,
  setRekapSearch,
  rekapFilter,
  setRekapFilter,
  rekapClassFilter,
  setRekapClassFilter,
  validRekapCurrentPage,
  totalRekapPages,
  setRekapCurrentPage,
  setSelectedStudentDetail,
  setCardModalData,
  onNavigateView,
  onNavigateToInput,
  onOpenImportModal,
}) => {
  // Rank classes by attendance % using canonical stats
  const classRanking = React.useMemo(() => {
    return targetClasses.map((k) => {
      const stats = calculateDailyAttendanceStats(appData, selectedDate, { kelasId: k.id });
      const recs = appData.presensi ? appData.presensi[`${selectedDate}_${k.id}`] : undefined;
      return {
        class: k,
        total: stats.totalSiswa,
        hadir: stats.hadirCount,
        alfa: stats.alpaCount,
        sakit: stats.sakitCount,
        izin: stats.izinCount,
        pct: Math.round(stats.attendanceRate),
        isFilled: Boolean(recs && Array.isArray(recs) && recs.length > 0),
      };
    }).sort((a, b) => b.pct - a.pct);
  }, [targetClasses, appData, selectedDate]);

  const bestClasses = classRanking.slice(0, 3);
  const attentionClasses = classRanking.filter((c) => c.isFilled).slice(-3).reverse();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title={`Selamat Datang, ${currentUser.data.nama}`}
        description="Overview kondisi presensi dan kesehatan sistem sekolah secara keseluruhan."
        badge={formatDateIndo(selectedDate)}
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-theme-primary"
          />
        }
      />

      {/* Statistik Utama Admin */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Siswa"
          value={totalStudents}
          subtitle="Siswa Terdaftar Aktif"
          icon={Users}
          variant="primary"
          onClick={() => {
            const items = activeSiswa.map((s) => ({
              name: s.nama,
              subtitle: `NISN: ${s.nisn} • Class ID: ${s.kelasId}`,
              statusBadge: 'Aktif',
            }));
            setCardModalData({
              title: 'Total Siswa Aktif Terdaftar',
              subtitle: `Total ${totalStudents} siswa terdaftar di sistem`,
              total: totalStudents,
              items,
            });
          }}
        />

        <StatCard
          label="Total Guru"
          value={appData.waliKelas?.length || (appData as any).users?.filter((u: any) => u.role === 'guru' || u.role === 'wali').length || 0}
          subtitle="Tenaga Pendidik & Wali"
          icon={GraduationCap}
          variant="primary"
          onClick={() => onNavigateView('master_guru')}
        />

        <StatCard
          label="Total Kelas"
          value={targetClasses.length}
          subtitle="Rombongan Belajar"
          icon={Building2}
          variant="primary"
          onClick={() => onNavigateView('master_kelas')}
        />

        <StatCard
          label="Kehadiran Hari Ini"
          value={hadirCount}
          subtitle={`${sakitCount} Sakit • ${izinCount} Izin • ${alpaCount} Alpha`}
          icon={UserCheck}
          variant="success"
          badge={{ label: `${hadirPercentage}%`, type: 'success' }}
          onClick={() => {
            setCardModalData({
              title: `Kehadiran Hari Ini (${selectedDate})`,
              subtitle: `Total ${hadirCount} siswa hadir (${hadirPercentage}%)`,
              total: hadirCount,
              items: [
                { name: 'Hadir', subtitle: `${hadirCount} Siswa (${hadirPercentage}%)`, statusBadge: 'Hadir' },
                { name: 'Sakit', subtitle: `${sakitCount} Siswa`, statusBadge: 'Sakit' },
                { name: 'Izin', subtitle: `${izinCount} Siswa`, statusBadge: 'Izin' },
                { name: 'Alpha', subtitle: `${alpaCount} Siswa`, statusBadge: 'Alpha' },
              ],
            });
          }}
        />
      </div>

      {/* Attendance Overview: Tren Kehadiran 7 Hari & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tren Kehadiran */}
        <div className="lg:col-span-8 space-y-6">
          <AttendanceTrendChart
            data={trendData}
            title="Tren Kehadiran Sekolah"
            subtitle="Tingkat kehadiran harian dalam rentang waktu terpilih."
            height={224}
            rangeSelector={true}
            selectedRange={trendRange === '30d' ? '14d' : trendRange}
            onRangeChange={(r) => setTrendRange(r)}
          />

          {/* Tabel Rekapitulasi Presensi Harian */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-theme-primary" />
                <span>Rekapitulasi Presensi Siswa</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={rekapSearch}
                  onChange={(e) => setRekapSearch(e.target.value)}
                  placeholder="Cari Nama / NISN..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <select
                value={rekapFilter}
                onChange={(e) => setRekapFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                <option value="absent_only">Hanya Tidak Hadir / Ada Catatan</option>
                <option value="all">Semua Siswa</option>
                <option value="sakit">Sakit (S)</option>
                <option value="izin">Izin (I)</option>
                <option value="alfa">Alpha (A)</option>
              </select>

              <select
                value={rekapClassFilter}
                onChange={(e) => setRekapClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium cursor-pointer"
              >
                <option value="all">Semua Kelas</option>
                {targetClasses.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black">
                    <th className="p-3">Siswa / Kelas</th>
                    <th className="p-3 text-center">Sakit</th>
                    <th className="p-3 text-center">Izin</th>
                    <th className="p-3 text-center">Alpha</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedCumulativeStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        Tidak ada data siswa.
                      </td>
                    </tr>
                  ) : (
                    paginatedCumulativeStats.map((item) => (
                      <tr key={item.siswa.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-white">{item.siswa.nama}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.kelas?.nama || '-'} • NISN: {item.siswa.nisn}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-amber-600">{item.sakit}</td>
                        <td className="p-3 text-center font-bold text-blue-600">{item.izin}</td>
                        <td className="p-3 text-center font-bold text-rose-600">{item.alfa}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedStudentDetail(item)}
                            className="px-2.5 py-1 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary font-bold rounded-lg text-[11px] transition cursor-pointer"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Rankings & Live Activity */}
        <div className="lg:col-span-4 space-y-6">
          {/* Kelas Kehadiran Tertinggi & Perlu Perhatian */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>Kelas Dengan Kehadiran Tertinggi</span>
              </h3>
              <div className="mt-2 space-y-2">
                {bestClasses.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-white">{item.class.nama}</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{item.pct}% Hadir</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Kelas Perlu Perhatian</span>
              </h3>
              <div className="mt-2 space-y-2">
                {attentionClasses.length === 0 ? (
                  <div className="text-xs text-slate-400">Belum ada data laporan kelas.</div>
                ) : (
                  attentionClasses.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-white">{item.class.nama}</span>
                      <span className="font-black text-rose-600 dark:text-rose-400">{item.alfa} Alpha</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Aktivitas Sistem Terbaru */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <span>Aktivitas Presensi Terkini</span>
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>

            <div className="space-y-2">
              {recentLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white truncate">{log.nama}</div>
                    <div className="text-[10px] text-slate-400">{log.kelas} • {log.waktu}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.bg}`}>{log.statusLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* System Health Section Ringkas */}
      <SystemHealthWidget onNavigateView={onNavigateView} />
    </div>
  );
};
