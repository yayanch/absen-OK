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
  BookOpen,
  Layers,
  QrCode,
  CheckCircle2,
  UserCheck,
  Activity,
  HardDriveDownload,
  Server,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { UserRole, ViewType } from '../../types';
import { cardContainerVariants, cardItemVariants } from '../common/UIComponents';

interface RoleQuickActionsProps {
  role: UserRole;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: (kelasId?: string) => void;
  onOpenImportModal?: () => void;
  onOpenWeeklyScheduleModal?: () => void;
  onScrollToClassSubmission?: () => void;
  onOpenBackupModal?: () => void;
}

interface QuickActionBtnProps {
  onClick: () => void;
  iconBgClass: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bgCardClass?: string;
  textColorClass?: string;
  subtextColorClass?: string;
}

const QuickActionBtn: React.FC<QuickActionBtnProps> = ({
  onClick,
  iconBgClass,
  icon,
  title,
  subtitle,
  bgCardClass = "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-800",
  textColorClass = "",
  subtextColorClass = "text-slate-500 dark:text-slate-400",
}) => (
  <motion.button
    type="button"
    variants={cardItemVariants}
    whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.18, ease: 'easeOut' } }}
    whileTap={{ scale: 0.975 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-3.5 rounded-2xl transition text-left cursor-pointer group border shadow-xs ${bgCardClass}`}
  >
    <div className={`p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition shadow-xs ${iconBgClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className={`font-extrabold text-xs truncate ${textColorClass}`}>{title}</div>
      <div className={`text-[10px] truncate ${subtextColorClass}`}>{subtitle}</div>
    </div>
  </motion.button>
);

export const RoleQuickActions: React.FC<RoleQuickActionsProps> = ({
  role,
  onNavigateView,
  onNavigateToInput,
  onOpenBackupModal,
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
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={handleOpenClassSubmission}
            iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            title="Rekap Pengisian Kelas"
            subtitle="Status sudah & belum isi"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_siswa')}
            iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            icon={<Users className="w-4 h-4" />}
            title="Data Siswa"
            subtitle="Master peserta didik"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('pengaturan_role')}
            iconBgClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Hak Akses Role"
            subtitle="Konfigurasi izin menu"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_user')}
            iconBgClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            icon={<UserCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Akun & User"
            subtitle="Kelola pengguna & staf"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('monitoring_server')}
            iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            icon={<Activity className="w-4 h-4 stroke-[2.5]" />}
            title="Monitoring Server"
            subtitle="Status server & resource"
          />

          <QuickActionBtn
            onClick={() => {
              if (onOpenBackupModal) {
                onOpenBackupModal();
              } else {
                onNavigateView('audit_logs');
              }
            }}
            iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            icon={<HardDriveDownload className="w-4 h-4 stroke-[2.5]" />}
            title="Backup & Restore"
            subtitle="Cadangan data sistem"
          />
        </motion.div>
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
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={handleOpenClassSubmission}
            iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            title="Rekap Pengisian Kelas"
            subtitle="Status sudah & belum isi"
          />

          <QuickActionBtn
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            icon={<ClipboardCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Input & Edit Presensi"
            subtitle="Kelola kehadiran kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('presensi_input')}
            iconBgClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            icon={<QrCode className="w-4 h-4" />}
            title="Scan / Tampil QR"
            subtitle="Presensi kartu pelajar"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('catatan_pelanggaran')}
            iconBgClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Catat Pelanggaran"
            subtitle="Poin disiplin & tindakan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_harian')}
            iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            icon={<FileText className="w-4 h-4" />}
            title="Rekap Kehadiran Rombel"
            subtitle="Laporan harian terpadu"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'kesiswaan') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
          Aksi Cepat Tim Kesiswaan & BP/BK
        </div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={handleOpenClassSubmission}
            iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
            title="Rekap Pengisian Kelas"
            subtitle="Status sudah & belum isi"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            iconBgClass="theme-action-icon"
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Siswa Perlu Perhatian"
            subtitle="Siswa berisiko alfa/sakit"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_bulanan')}
            iconBgClass="theme-action-icon"
            icon={<Calendar className="w-4 h-4" />}
            title="Rekap Ketidakhadiran"
            subtitle="Laporan bulanan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('catatan_pelanggaran')}
            iconBgClass="theme-action-icon"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Pelanggaran"
            subtitle="Catatan poin & tindakan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('home_visit')}
            iconBgClass="theme-action-icon"
            icon={<Home className="w-4 h-4" />}
            title="Home Visit"
            subtitle="Kunjungan rumah siswa"
          />
        </motion.div>
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
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            iconBgClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            icon={<ClipboardCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Input Presensi Hari Ini"
            subtitle="Isi kehadiran siswa kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_siswa')}
            iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            icon={<Users className="w-4 h-4" />}
            title="Rekap Kehadiran Siswa"
            subtitle="Data kehadiran kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('live_chat')}
            iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            icon={<FileText className="w-4 h-4" />}
            title="Pusat Pesan & Bantuan"
            subtitle="Hubungi Admin & Wali Kelas"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'wali') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Cepat Wali Kelas
        </div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            iconBgClass="theme-action-icon"
            icon={<ClipboardCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Presensi Hari Ini"
            subtitle="Input presensi kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_siswa')}
            iconBgClass="theme-action-icon"
            icon={<Users className="w-4 h-4" />}
            title="Daftar Siswa"
            subtitle="Siswa binaan kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_harian')}
            iconBgClass="theme-action-icon"
            icon={<FileText className="w-4 h-4" />}
            title="Rekap Kelas"
            subtitle="Laporan kehadiran"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            iconBgClass="theme-action-icon"
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Ketidakhadiran"
            subtitle="Peringatan siswa"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('mapel_kelas_guru')}
            iconBgClass="bg-emerald-600 text-white"
            icon={<Layers className="w-4 h-4" />}
            title="Mapel & Kelas Ajar"
            subtitle="Kelola mapel & kelas"
            bgCardClass="bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-100 border-emerald-200/80 dark:border-emerald-800/60"
            textColorClass="text-emerald-950 dark:text-emerald-100"
            subtextColorClass="text-emerald-600 dark:text-emerald-400 font-semibold"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="bg-blue-600 text-white"
            icon={<BookOpen className="w-4 h-4" />}
            title="Jadwal Mengajar"
            subtitle="Matriks & tabel jadwal"
            bgCardClass="bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 border-blue-200/80 dark:border-blue-800/60"
            textColorClass="text-blue-950 dark:text-blue-100"
            subtextColorClass="text-blue-600 dark:text-blue-400 font-semibold"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_minggu_ini')}
            iconBgClass="bg-blue-600 text-white"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Minggu Ini"
            subtitle="Ringkasan KBM sepekan"
            bgCardClass="bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 border-blue-200/80 dark:border-blue-800/60"
            textColorClass="text-blue-950 dark:text-blue-100"
            subtextColorClass="text-blue-600 dark:text-blue-400 font-semibold"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'kurikulum') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Cepat Tim Kurikulum & Akademik
        </div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="theme-action-icon"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar"
            subtitle="Plotting jadwal KBM"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_mapel')}
            iconBgClass="theme-action-icon"
            icon={<BookOpen className="w-4 h-4" />}
            title="Mata Pelajaran"
            subtitle="Master mata pelajaran"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_guru')}
            iconBgClass="theme-action-icon"
            icon={<Users className="w-4 h-4" />}
            title="Data Pendidik"
            subtitle="Guru & beban mengajar"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_shift')}
            iconBgClass="theme-action-icon"
            icon={<Clock className="w-4 h-4" />}
            title="Jadwal Shift"
            subtitle="Jam KBM Pagi & Siang"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'staf_jadwal') {
    return (
      <div className="space-y-2">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
          Aksi Utama Pengelola Jadwal
        </div>
        <motion.div
          className="grid grid-cols-1 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="bg-sky-600 text-white"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar Guru"
            subtitle="Plotting, edit jadwal, dan cetak matriks jadwal KBM"
            bgCardClass="bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-800 dark:text-slate-100 border-sky-200/80 dark:border-sky-800/60"
            textColorClass="text-sky-950 dark:text-sky-100"
            subtextColorClass="text-sky-600 dark:text-sky-400 font-semibold"
          />
        </motion.div>
      </div>
    );
  }

  // Guru Role
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
        Aksi Cepat Guru Pengajar
      </div>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        <QuickActionBtn
          onClick={() => onNavigateView('mapel_kelas_guru')}
          iconBgClass="bg-emerald-600 text-white"
          icon={<Layers className="w-4 h-4" />}
          title="Mapel & Kelas Ajar"
          subtitle="Kelola mapel & kelas"
          bgCardClass="bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-100 border-emerald-200/80 dark:border-emerald-800/60"
          textColorClass="text-emerald-950 dark:text-emerald-100"
          subtextColorClass="text-emerald-600 dark:text-emerald-400 font-semibold"
        />

        <QuickActionBtn
          onClick={() => onNavigateView('jadwal_mengajar')}
          iconBgClass="bg-blue-600 text-white"
          icon={<BookOpen className="w-4 h-4" />}
          title="Jadwal Mengajar"
          subtitle="Matriks & tabel jadwal"
          bgCardClass="bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 border-blue-200/80 dark:border-blue-800/60"
          textColorClass="text-blue-950 dark:text-blue-100"
          subtextColorClass="text-blue-600 dark:text-blue-400 font-semibold"
        />

        <QuickActionBtn
          onClick={() => onNavigateView('jadwal_minggu_ini')}
          iconBgClass="bg-blue-600 text-white"
          icon={<Calendar className="w-4 h-4" />}
          title="Jadwal Minggu Ini"
          subtitle="Ringkasan KBM sepekan"
          bgCardClass="bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 border-blue-200/80 dark:border-blue-800/60"
          textColorClass="text-blue-950 dark:text-blue-100"
          subtextColorClass="text-blue-600 dark:text-blue-400 font-semibold"
        />
      </motion.div>
    </div>
  );
};
