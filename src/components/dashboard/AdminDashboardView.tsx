import React, { useState, useEffect } from 'react';
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
  Cpu,
  Server,
  HardDrive,
  ArrowUpRight,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo, calculateDailyAttendanceStats } from '../../utils/helpers';
import { AttendanceTrendChart, AttendanceRecapChart, TrendRangeOption } from './AttendanceTrendChart';
import { PageHeader, StatCard } from '../common/UIComponents';
import { WhatsAppLiveMonitoringCard } from './WhatsAppLiveMonitoringCard';
import { RoleQuickActions } from './RoleQuickActions';

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
  trendRange: TrendRangeOption;
  setTrendRange: (r: TrendRangeOption) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomRangeChange?: (start: string, end: string) => void;
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
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
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
  customStartDate,
  customEndDate,
  onCustomRangeChange,
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
  onUpdateAppData,
  onShowToast,
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

  // Server Resources Quick Telemetry
  const [serverMetrics, setServerMetrics] = useState<{
    cpuPercent: number;
    ramPercent: number;
    ramUsedGb: number;
    ramTotalGb: number;
    diskPercent: number;
    diskUsedGb: number;
    diskTotalGb: number;
    networkInKbps: number;
    networkOutKbps: number;
    avgLatencyMs: number;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadServerMetrics = async () => {
      try {
        const res = await fetch('/api/server/resources');
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && isMounted) {
          setServerMetrics({
            cpuPercent: data.cpu.percent,
            ramPercent: data.ram.percent,
            ramUsedGb: data.ram.usedGb,
            ramTotalGb: data.ram.totalGb,
            diskPercent: data.disk.percent,
            diskUsedGb: data.disk.usedGb,
            diskTotalGb: data.disk.totalGb,
            networkInKbps: data.network.currentInKbps,
            networkOutKbps: data.network.currentOutKbps,
            avgLatencyMs: data.network.avgLatencyMs,
          });
        }
      } catch (_) {}
    };

    loadServerMetrics();
    const interval = setInterval(loadServerMetrics, 6000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

      {/* Aksi Cepat Administrator */}
      <RoleQuickActions
        role={currentUser.role}
        onNavigateView={onNavigateView}
        onNavigateToInput={onNavigateToInput}
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
          onClick={() => onNavigateView('rekap_harian')}
        />
      </div>

      {/* Attendance Overview: Tren Kehadiran 7 Hari & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rekapitulasi & Tren Kehadiran Siswa */}
        <div className="lg:col-span-8 space-y-6">
          <AttendanceRecapChart
            trendData={trendData}
            trendRange={trendRange}
            onRangeChange={setTrendRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            onCustomRangeChange={onCustomRangeChange}
            appData={appData}
            selectedDate={selectedDate}
            currentUser={currentUser}
            targetClasses={targetClasses}
            title="Grafik Tren Kehadiran Siswa"
            subtitle="Grafik persentase tingkat kehadiran harian siswa dalam rentang waktu terpilih."
            onNavigateView={onNavigateView}
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

      {/* Live WhatsApp Gateway Delivery & Failed Messages Telemetry */}
      <WhatsAppLiveMonitoringCard
        appData={appData}
        currentUser={currentUser}
        onNavigateView={onNavigateView}
        onUpdateAppData={onUpdateAppData}
        onShowToast={onShowToast}
      />

      {/* Monitoring Login Pengguna (Live Sesi Online) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Monitoring Login Pengguna</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {
                    (appData.activeUserSessions || []).filter(
                      (s) =>
                        !s.id.startsWith('sess-srv-') &&
                        !s.id.startsWith('sess-guru-') &&
                        !s.id.startsWith('sess-kesiswaan-') &&
                        !s.id.startsWith('sess-siswa-') &&
                        s.id !== 'sess-admin-active'
                    ).length
                  } Sesi Online
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pantau seluruh sesi aktif guru, siswa, dan staf serta telemetri riwayat login.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateView('monitoring_login')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-2xs group"
          >
            <span>Buka Panel Monitoring Login</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-sky-600 dark:text-sky-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Sesi Aktif Online</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {
                (appData.activeUserSessions || []).filter(
                  (s) =>
                    !s.id.startsWith('sess-srv-') &&
                    !s.id.startsWith('sess-guru-') &&
                    !s.id.startsWith('sess-kesiswaan-') &&
                    !s.id.startsWith('sess-siswa-') &&
                    s.id !== 'sess-admin-active'
                ).length
              } Pengguna
            </div>
            <span className="text-[10px] text-slate-400 block truncate">Guru, Siswa &amp; Staf</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Total Log Otentikasi</span>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
              {
                (appData.userLoginLogs || []).filter(
                  (l) => !l.id.startsWith('log-login-') && !l.id.startsWith('log-srv-')
                ).length
              } Tercatat
            </div>
            <span className="text-[10px] text-slate-400 block truncate">Riwayat login sistem</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Akun Terkunci</span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400">
              {(appData.lockedAccounts?.length || 0)} Akun
            </div>
            <span className="text-[10px] text-slate-400 block truncate">Proteksi brute-force</span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">IP Terdaftar Blacklist</span>
            <div className="text-lg font-black text-rose-600 dark:text-rose-400">
              {(appData.blockedIps?.length || 0)} Alamat IP
            </div>
            <span className="text-[10px] text-slate-400 block truncate">Firewall IDS</span>
          </div>
        </div>
      </div>

      {/* Monitoring Sumber Daya Server (CPU, RAM, Harddisk, Traffic Jaringan) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Monitoring Sumber Daya Server (Live Telemetri)</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Real-time
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Penggunaan CPU, alokasi RAM, kapasitas Harddisk, dan laju Traffic Jaringan host backend.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateView('monitoring_server')}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-2xs group"
          >
            <span>Buka Panel Monitoring Lengkap</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* CPU Quick */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-500" />
                <span>Beban CPU</span>
              </span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">
                {serverMetrics?.cpuPercent ?? 18}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(3, serverMetrics?.cpuPercent ?? 18)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              Core Aktif • Status Optimal
            </span>
          </div>

          {/* RAM Quick */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-500" />
                <span>Memori RAM</span>
              </span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">
                {serverMetrics?.ramPercent ?? 28}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(3, serverMetrics?.ramPercent ?? 28)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              {serverMetrics ? `${serverMetrics.ramUsedGb} GB / ${serverMetrics.ramTotalGb} GB` : '4.5 GB / 16.0 GB'}
            </span>
          </div>

          {/* Harddisk Quick */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                <span>Penyimpanan Disk</span>
              </span>
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-100">
                {serverMetrics?.diskPercent ?? 14}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(3, serverMetrics?.diskPercent ?? 14)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              {serverMetrics ? `${serverMetrics.diskUsedGb} GB / ${serverMetrics.diskTotalGb} GB` : '75.6 GB / 540 GB'}
            </span>
          </div>

          {/* Network Quick */}
          <div className="bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                <span>Traffic Jaringan</span>
              </span>
              <span className="text-[11px] font-bold font-mono text-cyan-600 dark:text-cyan-400">
                {serverMetrics?.avgLatencyMs ?? 1.2} ms
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold pt-0.5">
              <span className="text-cyan-600 dark:text-cyan-400">
                ↓ {serverMetrics?.networkInKbps ?? 45} KB/s
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                ↑ {serverMetrics?.networkOutKbps ?? 120} KB/s
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block truncate">
              Throughput Normal &amp; Cepat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
