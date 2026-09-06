import React from 'react';
import {
  UserPlus,
  FileSpreadsheet,
  FileText,
  QrCode,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Home,
  ClipboardCheck,
  Users,
  Clock,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { UserRole, ViewType } from '../../types';

interface RoleQuickActionsProps {
  role: UserRole;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: () => void;
  onOpenImportModal?: () => void;
}

export const RoleQuickActions: React.FC<RoleQuickActionsProps> = ({
  role,
  onNavigateView,
  onNavigateToInput,
  onOpenImportModal,
}) => {
  if (role === 'admin') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Aksi Cepat Admin
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateView('master_siswa')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Tambah Siswa</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Kelola data siswa</div>
            </div>
          </button>

          <button
            onClick={() => {
              if (onOpenImportModal) onOpenImportModal();
              else onNavigateView('master_siswa');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Import Excel</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Upload data masal</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('rekap_harian')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Presensi</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan harian</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('absen_qr')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Scan QR</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Pemindaian QR</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'kesiswaan') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Aksi Cepat Tim Kesiswaan &amp; BP/BK
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Siswa Perlu Perhatian</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Siswa berisiko alfa/sakit</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('rekap_bulanan')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Ketidakhadiran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan bulanan</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('catatan_pelanggaran')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Pelanggaran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Catatan poin &amp; tindakan</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('home_visit')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Home className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Home Visit</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Kunjungan rumah siswa</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'wali') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Aksi Cepat Wali Kelas
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Presensi Hari Ini</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Input presensi kelas</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('jadwal_mengajar')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Jadwal Mengajar</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Jadwal mengajar saya</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('master_siswa')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Daftar Siswa</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Siswa binaan kelas</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('rekap_harian')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Kelas</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan kehadiran</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Ketidakhadiran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Peringatan siswa</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'kurikulum') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Aksi Cepat Tim Kurikulum &amp; Akademik
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateView('jadwal_mengajar')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Jadwal Mengajar</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Plotting jadwal KBM</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('master_mapel')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Mata Pelajaran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Master mata pelajaran</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('master_guru')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Data Pendidik</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Guru &amp; beban mengajar</div>
            </div>
          </button>

          <button
            onClick={() => onNavigateView('jadwal_shift')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Jadwal Shift</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Jam KBM Pagi &amp; Siang</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Guru Role
  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
        Aksi Cepat Guru Pengajar
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => onNavigateView('jadwal_mengajar')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
        >
          <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Jadwal Mengajar</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Jadwal mengajar saya</div>
          </div>
        </button>

        <button
          onClick={() => onNavigateView('jadwal_shift')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-700/60 shadow-xs"
        >
          <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate">Jadwal Hari Ini</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Lihat shift &amp; jam</div>
          </div>
        </button>
      </div>
    </div>
  );
};

