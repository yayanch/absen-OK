import React from 'react';
import {
  X,
  Search,
  PieChart,
  SlidersHorizontal,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserSession, ViewType } from '../../types';
import { sortKelasList } from '../../data/initialData';
import {
  getTodayString,
  normalizePresensiStatus,
  calculateDailyAttendanceStats,
  calculateCumulativeStudentStats,
  getCanonicalActiveStudents,
} from '../../utils/helpers';
import { AdminDashboardView } from '../dashboard/AdminDashboardView';
import { TrendRangeOption } from '../dashboard/AttendanceRecapChart';
import { KesiswaanDashboardView } from '../dashboard/KesiswaanDashboardView';
import { WaliKelasDashboardView } from '../dashboard/WaliKelasDashboardView';
import { GuruDashboardView } from '../dashboard/GuruDashboardView';
import { KurikulumDashboardView } from '../dashboard/KurikulumDashboardView';
import { StafJadwalDashboardView } from '../dashboard/StafJadwalDashboardView';

interface DashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onRestoreDemo?: () => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  appData,
  currentUser,
  onNavigateToInput,
  onNavigateView,
  onUpdateAppData,
  onShowToast,
}) => {
  const [selectedDate, setSelectedDate] = React.useState<string>(() => getTodayString());
  const [rekapSearch, setRekapSearch] = React.useState('');
  const [rekapFilter, setRekapFilter] = React.useState<'absent_only' | 'all' | 'sakit' | 'izin' | 'alfa' | 'terlambat'>('absent_only');
  const [rekapClassFilter, setRekapClassFilter] = React.useState<string>('all');
  const [rekapCurrentPage, setRekapCurrentPage] = React.useState(1);
  const [rekapPerPage, setRekapPerPage] = React.useState(10);

  const [trendRange, setTrendRange] = React.useState<TrendRangeOption>('7d');
  const [customTrendStart, setCustomTrendStart] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().split('T')[0];
  });
  const [customTrendEnd, setCustomTrendEnd] = React.useState<string>(() => getTodayString());

  const handleCustomRangeChange = (start: string, end: string) => {
    setCustomTrendStart(start);
    setCustomTrendEnd(end);
  };

  const [selectedStudentDetail, setSelectedStudentDetail] = React.useState<{
    siswa: any;
    kelas?: any;
    sakit: number;
    izin: number;
    alfa: number;
    kesiangan?: number;
    dispensasi?: number;
    hadir: number;
    totalTidakHadir: number;
    detailRecords: { tanggal: string; status: 'S' | 'I' | 'A' | 'K' | 'D' | 'H'; catatan?: string }[];
  } | null>(null);

  const [cardModalData, setCardModalData] = React.useState<{
    title: string;
    subtitle: string;
    total: number;
    items: { name: string; subtitle?: string; statusBadge?: string; count?: number }[];
  } | null>(null);

  const [isClassDetailModalOpen, setIsClassDetailModalOpen] = React.useState(false);
  const [classDetailSearch, setClassDetailSearch] = React.useState('');
  const [classDetailTab, setClassDetailTab] = React.useState<'all' | 'filled' | 'unfilled'>('all');
  const [isWidgetModalOpen, setIsWidgetModalOpen] = React.useState(false);
  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = React.useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = React.useState('');

  const [widgetsConfig, setWidgetsConfig] = React.useState<{
    showTrendChart: boolean;
    showAttendanceTable: boolean;
    showEarlyWarning: boolean;
    showClassSubmission: boolean;
    showLiveFeed: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('dashboard_widgets_config_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return {
      showTrendChart: true,
      showAttendanceTable: true,
      showEarlyWarning: true,
      showClassSubmission: true,
      showLiveFeed: true,
    };
  });

  const toggleWidget = (key: keyof typeof widgetsConfig) => {
    setWidgetsConfig((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('dashboard_widgets_config_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const todayStr = getTodayString();
  const sortedKelas = sortKelasList(appData.kelas);

  const userScope = React.useMemo(() => {
    if (currentUser.role === 'wali') {
      return { waliKelasId: (currentUser.data as any)?.id };
    }
    if (currentUser.role === 'piket_kelas') {
      return { kelasId: (currentUser.data as any)?.kelasId };
    }
    return undefined;
  }, [currentUser]);

  let targetClasses = sortedKelas;
  if (currentUser.role === 'wali') {
    targetClasses = sortedKelas.filter((k) => k.waliKelasId === (currentUser.data as any)?.id);
  } else if (currentUser.role === 'piket_kelas') {
    targetClasses = sortedKelas.filter((k) => k.id === (currentUser.data as any)?.kelasId);
  }

  // Active Students Calculation
  const activeSiswa = React.useMemo(() => {
    return appData.siswa.filter((s) => s.status !== 'tidak_aktif' && (s as any).status !== 'nonaktif');
  }, [appData.siswa]);

  // Canonical Daily Attendance Statistics
  const dailyStats = React.useMemo(() => {
    return calculateDailyAttendanceStats(
      appData,
      selectedDate,
      userScope
    );
  }, [appData, selectedDate, userScope]);

  const totalStudents = dailyStats.totalSiswa;
  const hadirCount = dailyStats.hadirCount;
  const izinCount = dailyStats.izinCount;
  const sakitCount = dailyStats.sakitCount;
  const alpaCount = dailyStats.alpaCount;
  const kesianganCount = dailyStats.kesianganCount;
  const dispensasiCount = dailyStats.dispensasiCount;
  const hadirPercentage = dailyStats.attendanceRate.toFixed(1);
  const isFullyRecorded = dailyStats.isFullyRecorded;

  const unrecordedClasses = React.useMemo(() => {
    return targetClasses.filter((k) => {
      const presensiKey = `${selectedDate}_${k.id}`;
      const presensiRecord = appData.presensi ? appData.presensi[presensiKey] : undefined;
      return !presensiRecord || !Array.isArray(presensiRecord) || presensiRecord.length === 0;
    });
  }, [targetClasses, selectedDate, appData.presensi]);

  // Wali/Target Students
  const waliStudents = React.useMemo(() => {
    return getCanonicalActiveStudents(
      appData,
      userScope
    );
  }, [appData, userScope]);

  // Canonical Cumulative Student Stats
  const studentCumulativeStats = React.useMemo(() => {
    return calculateCumulativeStudentStats(appData, {
      maxDate: todayStr,
      ...userScope,
    });
  }, [appData, todayStr, userScope]);

  // Filtered Cumulative Table
  const filteredCumulativeStats = studentCumulativeStats.filter((item) => {
    if (rekapClassFilter !== 'all' && item.siswa.kelasId !== rekapClassFilter) {
      return false;
    }

    const matchSearch =
      (item.siswa?.nama ? String(item.siswa.nama).toLowerCase().includes(rekapSearch.toLowerCase()) : false) ||
      (item.siswa?.nisn ? String(item.siswa.nisn).toLowerCase().includes(rekapSearch.toLowerCase()) : false);
    if (!matchSearch) return false;

    if (rekapFilter === 'absent_only') return item.totalTidakHadir > 0;
    if (rekapFilter === 'sakit') return item.sakit > 0;
    if (rekapFilter === 'izin') return item.izin > 0;
    if (rekapFilter === 'alfa') return item.alfa > 0;
    if (rekapFilter === 'terlambat') return (item.kesiangan || 0) > 0;
    return true;
  });

  const validRekapCurrentPage = Number.isFinite(rekapCurrentPage) && rekapCurrentPage > 0 ? rekapCurrentPage : 1;
  const validRekapPerPage = Number.isFinite(rekapPerPage) && rekapPerPage > 0 ? rekapPerPage : 10;
  const totalRekapPages = Math.ceil(filteredCumulativeStats.length / validRekapPerPage) || 1;

  React.useEffect(() => {
    setRekapCurrentPage(1);
  }, [rekapSearch, rekapFilter, rekapClassFilter, rekapPerPage]);

  const startRekapIdx = Math.max(0, (validRekapCurrentPage - 1) * validRekapPerPage);
  const paginatedCumulativeStats = filteredCumulativeStats.slice(startRekapIdx, startRekapIdx + validRekapPerPage);

  // Trend Chart Data (Last N Days or Selected Preset/Custom Range)
  const trendData = React.useMemo(() => {
    const days: {
      date: string;
      dateLabel: string;
      hadir: number;
      sakit: number;
      izin: number;
      alpa: number;
      kesiangan: number;
      dispensasi: number;
      total: number;
      percent: number;
      isEffective: boolean;
    }[] = [];

    const dateParts = selectedDate.split('-');
    const baseYear = parseInt(dateParts[0], 10);
    const baseMonth = parseInt(dateParts[1], 10) - 1;
    const baseDay = parseInt(dateParts[2], 10);
    const baseDate = new Date(baseYear, baseMonth, baseDay);

    let startDate = new Date(baseDate);
    let endDate = new Date(baseDate);

    if (trendRange === '7d') {
      startDate.setDate(startDate.getDate() - 6);
    } else if (trendRange === '14d') {
      startDate.setDate(startDate.getDate() - 13);
    } else if (trendRange === '30d') {
      startDate.setDate(startDate.getDate() - 29);
    } else if (trendRange === 'this_month') {
      startDate = new Date(baseYear, baseMonth, 1);
      endDate = new Date(baseYear, baseMonth + 1, 0);
    } else if (trendRange === 'last_month') {
      startDate = new Date(baseYear, baseMonth - 1, 1);
      endDate = new Date(baseYear, baseMonth, 0);
    } else if (trendRange === '90d') {
      startDate.setDate(startDate.getDate() - 89);
    } else if (trendRange === 'custom') {
      const sParts = (customTrendStart || selectedDate).split('-');
      const eParts = (customTrendEnd || selectedDate).split('-');
      startDate = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
      endDate = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));
      if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
      }
    }

    const cur = new Date(startDate);
    let count = 0;
    while (cur <= endDate && count < 120) {
      const year = cur.getFullYear();
      const month = String(cur.getMonth() + 1).padStart(2, '0');
      const day = String(cur.getDate()).padStart(2, '0');
      const dStr = `${year}-${month}-${day}`;
      const dLabel = cur.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      const dayStat = calculateDailyAttendanceStats(
        appData,
        dStr,
        userScope
      );

      const dayHadir = dayStat.hadirCount;
      const dayTotal = dayStat.totalSiswa;
      const pct = Math.round(dayStat.attendanceRate);

      days.push({
        date: dStr,
        dateLabel: dLabel,
        hadir: dayHadir,
        sakit: dayStat.sakitCount,
        izin: dayStat.izinCount,
        alpa: dayStat.alpaCount,
        kesiangan: dayStat.kesianganCount,
        dispensasi: dayStat.dispensasiCount,
        total: dayTotal,
        percent: pct,
        isEffective: dayStat.isEffectiveSchoolDay,
      });

      cur.setDate(cur.getDate() + 1);
      count++;
    }
    return days;
  }, [selectedDate, trendRange, customTrendStart, customTrendEnd, appData, currentUser]);

  // Live Activity Stream
  const recentLogs = React.useMemo(() => {
    const logs: { id: string; nama: string; kelas: string; waktu: string; status: string; statusLabel: string; bg: string }[] = [];
    let count = 0;

    Object.keys(appData.presensi || {}).forEach((key) => {
      if (count >= 6) return;
      const recs = (appData.presensi || {})[key];
      if (Array.isArray(recs)) {
        recs.slice(-2).reverse().forEach((r) => {
          if (count >= 6) return;
          const s = activeSiswa.find((item) => item.id === r.siswaId || item.nisn === r.siswaId);
          if (s) {
            const k = targetClasses.find((cls) => cls.id === s.kelasId);
            const st = normalizePresensiStatus(r.status);
            let statusLabel = 'Hadir';
            let bg = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
            if (st === 'S') { statusLabel = 'Sakit'; bg = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'; }
            else if (st === 'I') { statusLabel = 'Izin'; bg = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'; }
            else if (st === 'A') { statusLabel = 'Alpha'; bg = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'; }
            else if (st === 'K') { statusLabel = 'Terlambat'; bg = 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'; }

            logs.push({
              id: `${key}_${r.siswaId}_${count}`,
              nama: s.nama,
              kelas: k?.nama || 'Siswa',
              waktu: (r as any).waktuMasuk || '07:15',
              status: st,
              statusLabel,
              bg,
            });
            count++;
          }
        });
      }
    });
    return logs;
  }, [appData.presensi, activeSiswa, targetClasses]);

  // Render Role-based View
  const renderRoleDashboard = () => {
    switch (currentUser.role) {
      case 'admin':
        return (
          <AdminDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            activeSiswa={activeSiswa}
            totalStudents={totalStudents}
            hadirCount={hadirCount}
            sakitCount={sakitCount}
            izinCount={izinCount}
            alpaCount={alpaCount}
            kesianganCount={kesianganCount}
            hadirPercentage={hadirPercentage}
            trendData={trendData}
            trendRange={trendRange}
            setTrendRange={setTrendRange}
            customStartDate={customTrendStart}
            customEndDate={customTrendEnd}
            onCustomRangeChange={handleCustomRangeChange}
            recentLogs={recentLogs}
            unrecordedClasses={unrecordedClasses}
            targetClasses={targetClasses}
            paginatedCumulativeStats={paginatedCumulativeStats}
            rekapSearch={rekapSearch}
            setRekapSearch={setRekapSearch}
            rekapFilter={rekapFilter}
            setRekapFilter={setRekapFilter}
            rekapClassFilter={rekapClassFilter}
            setRekapClassFilter={setRekapClassFilter}
            validRekapCurrentPage={validRekapCurrentPage}
            totalRekapPages={totalRekapPages}
            setRekapCurrentPage={setRekapCurrentPage}
            setSelectedStudentDetail={setSelectedStudentDetail}
            setCardModalData={setCardModalData}
            onNavigateView={onNavigateView}
            onNavigateToInput={onNavigateToInput}
            onUpdateAppData={onUpdateAppData}
            onShowToast={onShowToast}
          />
        );

      case 'kesiswaan':
      case 'piket_kesiswaan':
      case 'piket_guru':
      case 'piket':
        return (
          <KesiswaanDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            activeSiswa={activeSiswa}
            studentCumulativeStats={studentCumulativeStats}
            hadirCount={hadirCount}
            sakitCount={sakitCount}
            izinCount={izinCount}
            alpaCount={alpaCount}
            unrecordedClasses={unrecordedClasses}
            targetClasses={targetClasses}
            setSelectedStudentDetail={setSelectedStudentDetail}
            onNavigateView={onNavigateView}
            onNavigateToInput={onNavigateToInput}
            onShowToast={onShowToast}
          />
        );

      case 'wali':
      case 'piket_kelas':
        return (
          <WaliKelasDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            targetClasses={targetClasses}
            waliStudents={waliStudents}
            studentCumulativeStats={studentCumulativeStats}
            hadirCount={hadirCount}
            sakitCount={sakitCount}
            izinCount={izinCount}
            alpaCount={alpaCount}
            kesianganCount={kesianganCount}
            totalStudents={totalStudents}
            hadirPercentage={hadirPercentage}
            isFullyRecorded={isFullyRecorded}
            trendData={trendData}
            setSelectedStudentDetail={setSelectedStudentDetail}
            onNavigateView={onNavigateView}
            onNavigateToInput={onNavigateToInput}
          />
        );

      case 'kurikulum':
        return (
          <KurikulumDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateView={onNavigateView}
          />
        );

      case 'staf_jadwal':
        return (
          <StafJadwalDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            onNavigateView={onNavigateView}
          />
        );

      case 'guru':
      default:
        return (
          <GuruDashboardView
            appData={appData}
            currentUser={currentUser}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            hadirCount={hadirCount}
            totalStudents={totalStudents}
            hadirPercentage={hadirPercentage}
            recentLogs={recentLogs}
            onNavigateToInput={onNavigateToInput}
            onNavigateView={onNavigateView}
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6 max-w-7xl mx-auto pb-16"
    >
      {renderRoleDashboard()}

      {/* Customization Modal */}
      {isWidgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-theme-primary" />
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">Kustomisasi Dashboard</h3>
              </div>
              <button onClick={() => setIsWidgetModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { key: 'showTrendChart', label: 'Grafik Tren Kehadiran' },
                { key: 'showAttendanceTable', label: 'Tabel Presensi Harian' },
                { key: 'showEarlyWarning', label: 'Peringatan Dini Presensi' },
                { key: 'showLiveFeed', label: 'Feed Presensi Terkini' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border cursor-pointer">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={widgetsConfig[item.key as keyof typeof widgetsConfig]}
                    onChange={() => toggleWidget(item.key as keyof typeof widgetsConfig)}
                    className="w-4 h-4 accent-slate-800 dark:accent-slate-200 rounded cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">{selectedStudentDetail.siswa.nama}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kelas: {selectedStudentDetail.kelas?.nama || '-'} • NISN: {selectedStudentDetail.siswa.nisn || '-'}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedStudentDetail(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Hadir</div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-300">{selectedStudentDetail.hadir}</div>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Sakit</div>
                  <div className="text-lg font-black text-amber-700 dark:text-amber-300">{selectedStudentDetail.sakit}</div>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900">
                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Izin</div>
                  <div className="text-lg font-black text-blue-700 dark:text-blue-300">{selectedStudentDetail.izin}</div>
                </div>
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-100 dark:border-rose-900">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Alpha</div>
                  <div className="text-lg font-black text-rose-700 dark:text-rose-300">{selectedStudentDetail.alfa}</div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-slate-800 dark:text-white text-xs mb-2 uppercase tracking-wider">
                  Riwayat Catatan Presensi
                </h4>
                {selectedStudentDetail.detailRecords.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                    Belum ada riwayat catatan presensi untuk siswa ini.
                  </div>
                ) : (
                  <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-1">
                    {selectedStudentDetail.detailRecords.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white">{rec.tanggal}</div>
                          {rec.catatan && <div className="text-[10px] text-slate-500 mt-0.5">{rec.catatan}</div>}
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                          {rec.status === 'H' ? 'Hadir' : rec.status === 'S' ? 'Sakit' : rec.status === 'I' ? 'Izin' : 'Alpha'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Card Drilldown Modal */}
      {cardModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm">{cardModalData.title}</h3>
                <p className="text-[11px] text-slate-400">{cardModalData.subtitle}</p>
              </div>
              <button type="button" onClick={() => setCardModalData(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-2">
              {cardModalData.items.map((it, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">{it.name}</div>
                    <div className="text-[10px] text-slate-500">{it.subtitle}</div>
                  </div>
                  {it.statusBadge && (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {it.statusBadge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
