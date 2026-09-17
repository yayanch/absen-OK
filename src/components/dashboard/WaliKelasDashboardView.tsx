import React, { useState } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  Mail,
  UserX,
  ClipboardCheck,
  Calendar,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo } from '../../utils/helpers';
import { RoleQuickActions } from './RoleQuickActions';
import { StudentAttentionWidget } from './StudentAttentionWidget';
import { AttendanceTrendChart } from './AttendanceTrendChart';
import { PageHeader, StatCard } from '../common/UIComponents';

interface WaliKelasDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  targetClasses: any[];
  waliStudents: any[];
  studentCumulativeStats: any[];
  hadirCount: number;
  sakitCount: number;
  izinCount: number;
  alpaCount: number;
  kesianganCount: number;
  totalStudents: number;
  hadirPercentage: string;
  isFullyRecorded: boolean;
  trendData: any[];
  setSelectedStudentDetail: (item: any) => void;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput: (kelasId?: string) => void;
}

export const WaliKelasDashboardView: React.FC<WaliKelasDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  targetClasses,
  waliStudents,
  studentCumulativeStats,
  hadirCount,
  sakitCount,
  izinCount,
  alpaCount,
  kesianganCount,
  totalStudents,
  hadirPercentage,
  isFullyRecorded,
  trendData,
  setSelectedStudentDetail,
  onNavigateView,
  onNavigateToInput,
}) => {
  const currentClassName = targetClasses.map((k) => k.nama).join(', ') || 'Kelas Binaan';

  // 5 Siswa perlu perhatian di kelas wali
  const classAttentionStudents = React.useMemo(() => {
    return studentCumulativeStats.map((item) => {
      let statusRisk: 'Normal' | 'Perlu Perhatian' | 'Prioritas' = 'Normal';
      if (item.alfa >= 3 || item.totalTidakHadir >= 7) {
        statusRisk = 'Prioritas';
      } else if (item.alfa >= 1 || item.totalTidakHadir >= 3) {
        statusRisk = 'Perlu Perhatian';
      }
      return { ...item, statusRisk };
    }).sort((a, b) => {
      const riskOrder = { Prioritas: 0, 'Perlu Perhatian': 1, Normal: 2 };
      if (riskOrder[a.statusRisk] !== riskOrder[b.statusRisk]) {
        return riskOrder[a.statusRisk] - riskOrder[b.statusRisk];
      }
      return b.alfa - a.alfa;
    });
  }, [studentCumulativeStats]);

  const topAttention = classAttentionStudents.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Building2}
        title={`Kelas ${currentClassName}`}
        description={`Total ${totalStudents} Siswa Terdaftar • Tanggal ${formatDateIndo(selectedDate)}`}
        badge="Kelas Binaan Wali Kelas"
        actions={
          <button
            onClick={() => onNavigateToInput(targetClasses[0]?.id)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Input Presensi Hari Ini</span>
          </button>
        }
      />

      {/* Quick Actions Wali Kelas */}
      <RoleQuickActions
        role="wali"
        onNavigateView={onNavigateView}
        onNavigateToInput={() => onNavigateToInput(targetClasses[0]?.id)}
      />

      {/* Status Presensi Hari Ini Banner */}
      {isFullyRecorded ? (
        <div className="bg-emerald-100/90 border border-emerald-300 rounded-2xl p-4 text-slate-900 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-200 text-emerald-950 shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-xs md:text-sm text-black">Presensi Kelas Hari Ini Sudah Lengkap!</span>
              <p className="text-xs text-slate-800 font-medium mt-0.5">Seluruh data presensi kelas {currentClassName} telah tercatat.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-rose-100/90 border border-rose-300 rounded-2xl p-4 text-slate-900 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-200 text-rose-950 shrink-0">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-xs md:text-sm text-black">Presensi Kelas Hari Ini Belum Diisi</span>
              <p className="text-xs text-slate-800 font-medium mt-0.5">Silahkan lakukan pengisian presensi siswa kelas Anda.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToInput(targetClasses[0]?.id)}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            Isi Sekarang
          </button>
        </div>
      )}

      {/* Statistik Kehadiran Kelas (Hadir, Belum, Sakit, Izin, Alpha) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          label="Hadir"
          value={hadirCount}
          subtitle={`${hadirPercentage}% Kehadiran`}
          icon={UserCheck}
          variant="success"
        />
        <StatCard
          label="Belum Presensi"
          value={isFullyRecorded ? 0 : totalStudents - (hadirCount + sakitCount + izinCount + alpaCount)}
          icon={Users}
          variant="neutral"
        />
        <StatCard
          label="Sakit"
          value={sakitCount}
          icon={Calendar}
          variant="info"
        />
        <StatCard
          label="Izin"
          value={izinCount}
          icon={Calendar}
          variant="warning"
        />
        <StatCard
          label="Alpha"
          value={alpaCount}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>

      {/* Main Section: 5 Siswa Perlu Perhatian & Tren Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5 Siswa Perlu Perhatian Widget */}
        <div className="lg:col-span-7">
          <StudentAttentionWidget
            students={topAttention}
            title="5 Siswa Perlu Perhatian di Kelas"
            subtitle={`Indikator ketidakhadiran siswa kelas ${currentClassName}`}
            maxItems={5}
            onOpenDetail={setSelectedStudentDetail}
            onNavigateView={onNavigateView}
          />
        </div>

        {/* Right: Tren Kehadiran Kelas */}
        <div className="lg:col-span-5">
          <AttendanceTrendChart
            data={trendData}
            title={`Tren Kehadiran ${currentClassName}`}
            subtitle={`Grafik persentase kehadiran harian kelas ${currentClassName}`}
            height={200}
          />
        </div>
      </div>

      {/* Ringkasan Siswa Kelas */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-theme-primary" />
            <span>Daftar Siswa Kelas {currentClassName} ({waliStudents.length} Siswa)</span>
          </h3>
          <button
            onClick={() => onNavigateView('master_siswa')}
            className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            Kelola Data Siswa <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
          {waliStudents.map((s) => {
            const stat = studentCumulativeStats.find((st) => st.siswa.id === s.id);
            return (
              <div
                key={s.id}
                onClick={() => stat && setSelectedStudentDetail(stat)}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <div>
                  <div className="font-bold text-xs text-slate-800 dark:text-white">{s.nama}</div>
                  <div className="text-[10px] text-slate-400">NISN: {s.nisn || '-'}</div>
                </div>
                {stat && (
                  <div className="flex items-center gap-1 text-[10px] font-extrabold">
                    <span className="text-amber-600">S:{stat.sakit}</span>
                    <span className="text-blue-600">I:{stat.izin}</span>
                    <span className="text-rose-600">A:{stat.alfa}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
