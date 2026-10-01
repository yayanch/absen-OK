import React from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Home,
  ClipboardCheck,
  Users,
  Clock,
  ChevronRight,
  BookOpen,
  Layers,
  QrCode,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { UserRole, ViewType } from '../../types';

interface RoleQuickActionsProps {
  role: UserRole;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: (kelasId?: string) => void;
  onOpenImportModal?: () => void;
  onOpenWeeklyScheduleModal?: () => void;
  onScrollToClassSubmission?: () => void;
}

export const RoleQuickActions: React.FC<RoleQuickActionsProps> = ({
  role,
  onNavigateView,
  onNavigateToInput,
  onOpenImportModal,
  onOpenWeeklyScheduleModal,
}) => {
  const handleOpenClassSubmission = () => {
    onNavigateView('rekap_pengisian_kelas');
  };

  if (role === 'admin') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          Aksi Cepat Administrator
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Rekap Pengisian Presensi Kelas */}
          <button
            type="button"
            onClick={handleOpenClassSubmission}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Pengisian Kelas</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Status sudah &amp; belum isi</div>
            </div>
          </button>

          {/* 2. Input Presensi Siswa */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Input Presensi</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Pencatatan kehadiran</div>
            </div>
          </button>

          {/* 3. Laporan Harian */}
          <button
            type="button"
            onClick={() => onNavigateView('rekap_harian')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Laporan Harian</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Rekap kehadiran siswa</div>
            </div>
          </button>

          {/* 4. Data Induk Siswa */}
          <button
            type="button"
            onClick={() => onNavigateView('master_siswa')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Data Siswa</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Master peserta didik</div>
            </div>
          </button>

          {/* 5. Scan / Server QR */}
          <button
            type="button"
            onClick={() => onNavigateView('absen_qr')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">QR Gerbang</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Scanner &amp; server QR</div>
            </div>
          </button>

          {/* 6. Hak Akses Role */}
          <button
            type="button"
            onClick={() => onNavigateView('pengaturan_role')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0 group-hover:scale-105 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Hak Akses Role</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Konfigurasi izin menu</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'piket_kesiswaan' || role === 'piket_guru' || role === 'piket') {
    const isKesiswaanPiket = role === 'piket_kesiswaan';
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Aksi Cepat Petugas Piket {isKesiswaanPiket ? 'Kesiswaan' : 'Harian Guru'}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Rekap Pengisian Kelas */}
          <button
            type="button"
            onClick={handleOpenClassSubmission}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Pengisian Kelas</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Status sudah &amp; belum isi</div>
            </div>
          </button>

          {/* 2. Input Presensi */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Input &amp; Edit Presensi</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Kelola kehadiran kelas</div>
            </div>
          </button>

          {/* 3. Scan QR */}
          <button
            type="button"
            onClick={() => {
              onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition">
              <QrCode className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Scan / Tampil QR</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Presensi kartu pelajar</div>
            </div>
          </button>

          {/* 4. Catat Pelanggaran */}
          <button
            type="button"
            onClick={() => onNavigateView('catatan_pelanggaran')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0 group-hover:scale-105 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Catat Pelanggaran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Poin disiplin &amp; tindakan</div>
            </div>
          </button>

          {/* 5. Rekap Kehadiran Rombel */}
          <button
            type="button"
            onClick={() => onNavigateView('rekap_harian')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Kehadiran Rombel</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan harian terpadu</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'kesiswaan') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
          Aksi Cepat Tim Kesiswaan &amp; BP/BK
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Rekap Pengisian Presensi Kelas */}
          <button
            type="button"
            onClick={handleOpenClassSubmission}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Pengisian Kelas</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Status sudah &amp; belum isi</div>
            </div>
          </button>

          {/* 2. Siswa Perlu Perhatian */}
          <button
            type="button"
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Siswa Perlu Perhatian</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Siswa berisiko alfa/sakit</div>
            </div>
          </button>

          {/* 3. Rekap Ketidakhadiran */}
          <button
            type="button"
            onClick={() => onNavigateView('rekap_bulanan')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Ketidakhadiran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan bulanan</div>
            </div>
          </button>

          {/* 4. Catatan Pelanggaran */}
          <button
            type="button"
            onClick={() => onNavigateView('catatan_pelanggaran')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Pelanggaran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Catatan poin &amp; tindakan</div>
            </div>
          </button>

          {/* 5. Home Visit */}
          <button
            type="button"
            onClick={() => onNavigateView('home_visit')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
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

  if (role === 'piket_kelas') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
          Aksi Cepat Piket Kelas
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* 1. Input Presensi Hari Ini */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0 group-hover:scale-105 transition">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Input Presensi Hari Ini</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Isi kehadiran siswa kelas</div>
            </div>
          </button>

          {/* 2. Daftar Kehadiran Siswa */}
          <button
            type="button"
            onClick={() => onNavigateView('rekap_siswa')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Kehadiran Siswa</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Data kehadiran kelas</div>
            </div>
          </button>

          {/* 3. Live Chat */}
          <button
            type="button"
            onClick={() => onNavigateView('live_chat')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Pusat Pesan &amp; Bantuan</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Hubungi wali / piket</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'wali') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Cepat Wali Kelas
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* 1. Presensi Hari Ini */}
          <button
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <ClipboardCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Presensi Hari Ini</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Input presensi kelas</div>
            </div>
          </button>

          {/* 2. Daftar Siswa */}
          <button
            onClick={() => onNavigateView('master_siswa')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Daftar Siswa</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Siswa binaan kelas</div>
            </div>
          </button>

          {/* 3. Rekap Kelas */}
          <button
            onClick={() => onNavigateView('rekap_harian')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Rekap Kelas</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Laporan kehadiran</div>
            </div>
          </button>

          {/* 4. Ketidakhadiran */}
          <button
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <div className="p-2.5 rounded-xl theme-action-icon shrink-0 group-hover:scale-105 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate">Ketidakhadiran</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Peringatan siswa</div>
            </div>
          </button>

          {/* 5. Mapel & Kelas Ajar */}
          <button
            onClick={() => onNavigateView('mapel_kelas_guru')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate text-emerald-950 dark:text-emerald-100">Mapel &amp; Kelas Ajar</div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">Kelola mapel &amp; kelas</div>
            </div>
          </button>

          {/* 6. Jadwal Mengajar */}
          <button
            onClick={() => onNavigateView('jadwal_mengajar')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-blue-200/80 dark:border-blue-800/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate text-blue-950 dark:text-blue-100">Jadwal Mengajar</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">Matriks &amp; tabel jadwal</div>
            </div>
          </button>

          {/* 7. Jadwal Minggu Ini */}
          <button
            onClick={() => onNavigateView('jadwal_minggu_ini')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-blue-200/80 dark:border-blue-800/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate text-blue-950 dark:text-blue-100">Jadwal Minggu Ini</div>
              <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">Ringkasan KBM sepekan</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (role === 'kurikulum') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Cepat Tim Kurikulum &amp; Akademik
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigateView('jadwal_mengajar')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
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
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
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
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
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
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-slate-200/80 dark:border-slate-800 shadow-xs"
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

  if (role === 'staf_jadwal') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Utama Pengelola Jadwal
        </div>
        <div className="grid grid-cols-1 gap-3">
          {/* 1. Jadwal Mengajar Guru */}
          <button
            onClick={() => onNavigateView('jadwal_mengajar')}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-sky-200/80 dark:border-sky-800/60 shadow-xs"
          >
            <div className="p-2.5 rounded-xl bg-sky-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-xs truncate text-sky-950 dark:text-sky-100">Jadwal Mengajar Guru</div>
              <div className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold truncate">Plotting, edit jadwal, dan cetak matriks jadwal KBM</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Guru Role
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
        Aksi Cepat Guru Pengajar
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Mapel & Kelas Ajar */}
        <button
          onClick={() => onNavigateView('mapel_kelas_guru')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate text-emerald-950 dark:text-emerald-100">Mapel &amp; Kelas Ajar</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">Kelola mapel &amp; kelas</div>
          </div>
        </button>

        {/* 2. Jadwal Mengajar */}
        <button
          onClick={() => onNavigateView('jadwal_mengajar')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-blue-200/80 dark:border-blue-800/60 shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate text-blue-950 dark:text-blue-100">Jadwal Mengajar</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">Matriks &amp; tabel jadwal</div>
          </div>
        </button>

        {/* 3. Jadwal Mengajar Minggu Ini */}
        <button
          onClick={() => onNavigateView('jadwal_minggu_ini')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 transition text-left cursor-pointer group border border-blue-200/80 dark:border-blue-800/60 shadow-xs"
        >
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shrink-0 group-hover:scale-105 transition shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-xs truncate text-blue-950 dark:text-blue-100">Jadwal Mengajar Minggu Ini</div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate">Ringkasan KBM sepekan</div>
          </div>
        </button>
      </div>
    </div>
  );
};

