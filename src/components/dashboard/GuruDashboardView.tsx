import React from "react";
import { Calendar } from "lucide-react";
import { AppData, UserSession, ViewType } from "../../types";
import { formatDateIndo } from "../../utils/helpers";
import { TeacherScheduleWidget } from "./TeacherScheduleWidget";
import { GuruQuickCardsWidget } from "./GuruQuickCardsWidget";
import { PageHeader } from "../common/UIComponents";

interface GuruDashboardViewProps {
  appData: AppData;
  currentUser: UserSession;
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  hadirCount?: number;
  totalStudents?: number;
  hadirPercentage?: string;
  recentLogs?: any[];
  onNavigateToInput: (kelasId?: string) => void;
  onNavigateView: (view: ViewType) => void;
  onUpdateAppData?: (updated: AppData) => void;
  onShowToast?: (msg: string, type: "success" | "error" | "warning" | "info") => void;
}

export const GuruDashboardView: React.FC<GuruDashboardViewProps> = ({
  appData,
  currentUser,
  selectedDate,
  setSelectedDate,
  onNavigateToInput,
  onNavigateView,
  onUpdateAppData,
  onShowToast,
}) => {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Calendar}
        title={`Selamat Datang, ${currentUser.data.nama}`}
        description="Akses cepat layanan mengajar, presensi harian, dan administrasi kelas Anda hari ini."
        badge={formatDateIndo(selectedDate)}
        actions={
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          />
        }
      />

      {/* Kartu Cepat Guru (Quick Action Cards) */}
      <GuruQuickCardsWidget
        appData={appData}
        currentUser={currentUser}
        selectedDate={selectedDate}
        onNavigateView={onNavigateView}
        onNavigateToInput={onNavigateToInput}
      />

      {/* Widget Utama Guru: Jadwal Mengajar Hari Ini */}
      <TeacherScheduleWidget
        appData={appData}
        currentUser={currentUser}
        selectedDate={selectedDate}
        onNavigateToInput={onNavigateToInput}
        onNavigateView={onNavigateView}
        onUpdateAppData={onUpdateAppData}
        onShowToast={onShowToast}
      />
    </div>
  );
};
