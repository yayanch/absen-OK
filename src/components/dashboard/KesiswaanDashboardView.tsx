import React from 'react';
import {
  ShieldAlert,
  Calendar,
  AlertTriangle,
  UserX,
  Home,
  ChevronRight,
  TrendingUp,
  FileText,
  UserCheck,
  Mail,
  Users,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo } from '../../utils/helpers';
import { RoleQuickActions } from './RoleQuickActions';
import { StudentAttentionWidget } from './StudentAttentionWidget';
import { PageHeader, StatCard } from '../common/UIComponents';

interface KesiswaanDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  activeSiswa: any[];
  studentCumulativeStats: any[];
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  unrecordedClasses: any[];
  targetClasses: any[];
  setSelectedStudentDetail: (item: any) => void;
  onNavigateView: (view: ViewType) => void;
}

export const KesiswaanDashboardView: React.FC<KesiswaanDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  activeSiswa,
  studentCumulativeStats,
  hadirCount,
  sakitCount,
  izinCount,
  alpaCount,
  unrecordedClasses,
  targetClasses,
  setSelectedStudentDetail,
  onNavigateView,
}) => {
  // Map student risk levels (Prioritas, Perlu Perhatian, Normal)
  const studentsWithRisk = React.useMemo(() => {
    return studentCumulativeStats.map((item) => {
      let statusRisk: 'Normal' | 'Perlu Perhatian' | 'Prioritas' = 'Normal';
      if (item.alfa >= 3 || item.totalTidakHadir >= 7) {
        statusRisk = 'Prioritas';
      } else if (item.alfa >= 1 || item.totalTidakHadir >= 3) {
        statusRisk = 'Perlu Perhatian';
      }
      return {
        ...item,
        statusRisk,
      };
    }).sort((a, b) => {
      const riskOrder = { Prioritas: 0, 'Perlu Perhatian': 1, Normal: 2 };
      if (riskOrder[a.statusRisk] !== riskOrder[b.statusRisk]) {
        return riskOrder[a.statusRisk] - riskOrder[b.statusRisk];
      }
      return b.alfa - a.alfa;
    });
  }, [studentCumulativeStats]);

  const topAlphaStudents = React.useMemo(() => {
    return studentsWithRisk.filter((s) => s.alfa > 0).slice(0, 5);
  }, [studentsWithRisk]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShieldAlert}
        title="Pusat Perhatian Kesiswaan & BP/BK"
        description="Monitoring siswa berisiko, ketidakhadiran kumulatif, pelanggaran, dan tindak lanjut home visit."
        badge="Pusat Pembinaan & Kedisiplinan Siswa"
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          />
        }
      />

      {/* Quick Actions Kesiswaan */}
      <RoleQuickActions role="kesiswaan" onNavigateView={onNavigateView} />

      {/* Statistik Utama Kesiswaan */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Hadir Hari Ini"
          value={hadirCount}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          label="Belum Presensi"
          value={Math.max(0, activeSiswa.length - (hadirCount + sakitCount + izinCount + alpaCount))}
          subtitle={unrecordedClasses.length > 0 ? `${unrecordedClasses.length} rombel belum kirim` : undefined}
          icon={Users}
          variant="neutral"
        />
        <StatCard
          label="Sakit"
          value={sakitCount}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          label="Izin"
          value={izinCount}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          label="Alpha / Tanpa Ket."
          value={alpaCount}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Widget Utama: Siswa Perlu Perhatian */}
      <StudentAttentionWidget
        students={studentsWithRisk}
        title="Siswa Perlu Perhatian &amp; Pembinaan"
        subtitle="Daftar siswa terpantau berdasarkan akumulasi ketidakhadiran (Alpha / Sakit / Izin)"
        onOpenDetail={setSelectedStudentDetail}
        onNavigateView={onNavigateView}
      />

      {/* Layout Grid 2 Kolom: Pelanggaran & Home Visit & Alpha Tinggi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Catatan Pelanggaran Terbaru */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-theme-primary" />
              <span>Pelanggaran Siswa Terbaru</span>
            </h3>
            <button
              onClick={() => onNavigateView('catatan_pelanggaran')}
              className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {!appData.pelanggaran || appData.pelanggaran.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">Belum ada catatan pelanggaran terbaru.</div>
          ) : (
            <div className="space-y-2.5">
              {appData.pelanggaran.slice(0, 4).map((p: any) => {
                const s = activeSiswa.find((item) => item.id === p.siswaId || item.nisn === p.siswaId);
                return (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{s?.nama || p.siswaNama || 'Siswa'}</div>
                      <div className="text-[10px] text-slate-400">{p.jenisPelanggaran || p.kategori} • {p.tanggal}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-extrabold rounded-lg text-[10px]">
                      +{p.poin || 10} Poin
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Status Kunjungan Rumah (Home Visit) & Top Alpha */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <Home className="w-5 h-5 text-cyan-600" />
                <span>Home Visit Yang Perlu Ditindaklanjuti</span>
              </h3>
              <button
                onClick={() => onNavigateView('home_visit')}
                className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
              >
                Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {!appData.homeVisits || appData.homeVisits.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">Belum ada agenda home visit.</div>
            ) : (
              <div className="space-y-2.5">
                {appData.homeVisits.slice(0, 3).map((hv: any) => (
                  <div key={hv.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800 dark:text-white">{hv.siswaNama}</div>
                      <div className="text-[10px] text-slate-400">Petugas: {hv.petugasNama || 'Tim BK'} • {hv.tanggal}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 font-extrabold rounded-lg text-[10px]">
                      {hv.status || 'Direncanakan'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-600" />
              <span>Siswa Dengan Akumulasi Alpha Tinggi</span>
            </h3>
            <div className="space-y-2">
              {topAlphaStudents.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">{item.siswa.nama}</span>
                  <span className="font-black text-rose-600 dark:text-rose-400">{item.alfa} Hari Alpha</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
