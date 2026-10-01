import React, { useState } from 'react';
import {
  CheckCircle2,
  Calendar,
  ClipboardCheck,
  ArrowLeft,
  RefreshCw,
  Building2,
  Users,
} from 'lucide-react';
import { AppData, UserSession, ViewType } from '../../types';
import { formatDateIndo } from '../../utils/helpers';
import { getTodayString, sortKelasList } from '../../data/initialData';
import { PageHeader } from '../common/UIComponents';
import { ClassAttendanceSubmissionCard } from '../dashboard/ClassAttendanceSubmissionCard';

interface RekapPengisianKelasViewProps {
  appData: AppData;
  currentUser: UserSession;
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RekapPengisianKelasView: React.FC<RekapPengisianKelasViewProps> = ({
  appData,
  currentUser,
  onNavigateToInput,
  onNavigateView,
  onShowToast,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Target classes sorted nicely
  const targetClasses = React.useMemo(() => {
    return sortKelasList(appData.kelas || []);
  }, [appData.kelas]);

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <PageHeader
        icon={CheckCircle2}
        title="Rekap Pengisian Presensi Kelas"
        description="Monitoring keterisian absensi seluruh rombongan belajar per hari, pantau kelas yang sudah dan belum mengisi, serta kirim pengingat WhatsApp ke wali kelas."
        badge={formatDateIndo(selectedDate)}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-theme-primary"
            />

            <button
              type="button"
              onClick={() => onNavigateToInput()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-theme-primary hover:bg-theme-primary-dark text-white shadow-xs transition cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Input Presensi</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateView('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          </div>
        }
      />

      {/* 2. Full Content: Class Attendance Submission Card */}
      <ClassAttendanceSubmissionCard
        appData={appData}
        selectedDate={selectedDate}
        targetClasses={targetClasses}
        onNavigateToInput={onNavigateToInput}
        onNavigateView={onNavigateView}
        onShowToast={onShowToast}
        title="Status Keterisian Seluruh Rombel"
        subtitle={`Rangkuman kelengkapan kehadiran siswa tanggal ${formatDateIndo(selectedDate)}`}
      />
    </div>
  );
};
