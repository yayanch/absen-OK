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

interface RoleSectionHeaderProps {
  title: string;
  subtitle: string;
  dotColorClass: string;
  count?: number;
}

const RoleSectionHeader: React.FC<RoleSectionHeaderProps> = ({
  title,
  subtitle,
  dotColorClass,
  count,
}) => (
  <div className="flex items-center justify-between flex-wrap gap-2 px-1 mb-2.5">
    <div>
      <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColorClass} animate-pulse`} />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
        {subtitle}
      </p>
    </div>
    {count !== undefined && (
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
        {count} kartu aksi
      </span>
    )}
  </div>
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
        <RoleSectionHeader
          title="Kartu Cepat Administrator"
          subtitle="Akses langsung 1-klik untuk rekapitulasi presensi, master data, hak akses, user & server"
          dotColorClass="bg-blue-600"
          count={6}
        />
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
            title="Rekap Pengisian Presensi Kelas"
            subtitle="Status kelas sudah & belum isi"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_siswa')}
            iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            icon={<Users className="w-4 h-4" />}
            title="Data Siswa"
            subtitle="Master data peserta didik"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('pengaturan_role')}
            iconBgClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Hak Akses Role"
            subtitle="Konfigurasi izin menu & peran"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_user')}
            iconBgClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            icon={<UserCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Akun & Pengguna"
            subtitle="Kelola staf, guru & admin"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('monitoring_server')}
            iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            icon={<Activity className="w-4 h-4 stroke-[2.5]" />}
            title="Monitoring Server"
            subtitle="Status resource & performa server"
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
            subtitle="Cadangkan & pulihkan database sistem"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'piket_kesiswaan' || role === 'piket_guru' || role === 'piket') {
    const isKesiswaanPiket = role === 'piket_kesiswaan';
    return (
      <div className="space-y-2">
        <RoleSectionHeader
          title={isKesiswaanPiket ? "Kartu Cepat Piket Kesiswaan" : "Kartu Cepat Guru Piket Harian"}
          subtitle={
            isKesiswaanPiket
              ? "Akses langsung 1-klik untuk rekap presensi kelas, scan QR, dan pencatatan kedisiplinan"
              : "Akses langsung 1-klik untuk input presensi darurat, scan QR siswa & penegakan disiplin"
          }
          dotColorClass="bg-amber-500"
          count={isKesiswaanPiket ? 5 : 3}
        />
        <motion.div
          className={
            isKesiswaanPiket
              ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
              : "grid grid-cols-1 sm:grid-cols-3 gap-3"
          }
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          {isKesiswaanPiket && (
            <QuickActionBtn
              onClick={handleOpenClassSubmission}
              iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
              title="Rekap Pengisian Presensi Kelas"
              subtitle="Status kelas sudah & belum isi"
            />
          )}

          <QuickActionBtn
            onClick={() => {
              if (onNavigateToInput) onNavigateToInput();
              else onNavigateView('presensi_input');
            }}
            iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            icon={<ClipboardCheck className="w-4 h-4 stroke-[2.5]" />}
            title="Input Presensi Kelas"
            subtitle="Kelola kehadiran siswa harian"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('presensi_input')}
            iconBgClass="bg-teal-500/10 text-teal-600 dark:text-teal-400"
            icon={<QrCode className="w-4 h-4" />}
            title="Scan Presensi QR"
            subtitle="Pindai kartu pelajar & barcode"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('catatan_pelanggaran')}
            iconBgClass="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Catatan Pelanggaran Siswa"
            subtitle="Poin disiplin & tindakan siswa"
          />

          {isKesiswaanPiket && (
            <QuickActionBtn
              onClick={() => onNavigateView('rekap_harian')}
              iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
              icon={<FileText className="w-4 h-4" />}
              title="Rekap Presensi Harian"
              subtitle="Laporan kehadiran seluruh rombel"
            />
          )}
        </motion.div>
      </div>
    );
  }

  if (role === 'kesiswaan') {
    return (
      <div className="space-y-2">
        <RoleSectionHeader
          title="Kartu Cepat Tim Kesiswaan & BP/BK"
          subtitle="Akses langsung 1-klik untuk pembinaan siswa, pemantauan ketidakhadiran, pelanggaran & home visit"
          dotColorClass="bg-cyan-600"
          count={5}
        />
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
            title="Rekap Pengisian Presensi Kelas"
            subtitle="Status kelas sudah & belum isi"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            iconBgClass="theme-action-icon"
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Siswa Perlu Perhatian"
            subtitle="Siswa berisiko alfa & tidak hadir"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_bulanan')}
            iconBgClass="theme-action-icon"
            icon={<Calendar className="w-4 h-4" />}
            title="Rekap Presensi Bulanan"
            subtitle="Laporan bulanan seluruh kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('catatan_pelanggaran')}
            iconBgClass="theme-action-icon"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Catatan Pelanggaran Siswa"
            subtitle="Catatan poin & sanksi kedisiplinan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('home_visit')}
            iconBgClass="theme-action-icon"
            icon={<Home className="w-4 h-4" />}
            title="Laporan Home Visit"
            subtitle="Kunjungan rumah & tindak lanjut BK"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'piket_kelas') {
    return (
      <div className="space-y-2">
        <RoleSectionHeader
          title="Kartu Cepat Piket Kelas"
          subtitle="Akses langsung 1-klik untuk pengisian presensi siswa hari ini & rekapitulasi kehadiran kelas"
          dotColorClass="bg-teal-500"
          count={3}
        />
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
            onClick={() => onNavigateView('rekap_harian')}
            iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            icon={<Users className="w-4 h-4" />}
            title="Rekap Presensi Kelas"
            subtitle="Laporan kehadiran harian kelas"
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
        <RoleSectionHeader
          title="Kartu Cepat Wali Kelas"
          subtitle="Akses langsung 1-klik untuk presensi hari ini, data siswa binaan, rekap, & jadwal mengajar"
          dotColorClass="bg-emerald-600"
          count={7}
        />
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
            title="Input Presensi Hari Ini"
            subtitle="Isi presensi kelas binaan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_siswa')}
            iconBgClass="theme-action-icon"
            icon={<Users className="w-4 h-4" />}
            title="Data Siswa Kelas"
            subtitle="Daftar peserta didik binaan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_harian')}
            iconBgClass="theme-action-icon"
            icon={<FileText className="w-4 h-4" />}
            title="Rekap Presensi Kelas"
            subtitle="Laporan kehadiran harian kelas"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('rekap_ketidakhadiran_tertinggi')}
            iconBgClass="theme-action-icon"
            icon={<AlertTriangle className="w-4 h-4" />}
            title="Siswa Perlu Perhatian"
            subtitle="Peringatan & evaluasi siswa"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('mapel_kelas_guru')}
            iconBgClass="bg-emerald-600 text-white"
            icon={<Layers className="w-4 h-4" />}
            title="Mapel & Kelas Ajar"
            subtitle="Kelola mapel & kelas pengampu"
            bgCardClass="bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-800 dark:text-slate-100 border-emerald-200/80 dark:border-emerald-800/60"
            textColorClass="text-emerald-950 dark:text-emerald-100"
            subtextColorClass="text-emerald-600 dark:text-emerald-400 font-semibold"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="bg-blue-600 text-white"
            icon={<BookOpen className="w-4 h-4" />}
            title="Jadwal Mengajar Guru"
            subtitle="Matriks & jadwal KBM guru"
            bgCardClass="bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-slate-800 dark:text-slate-100 border-blue-200/80 dark:border-blue-800/60"
            textColorClass="text-blue-950 dark:text-blue-100"
            subtextColorClass="text-blue-600 dark:text-blue-400 font-semibold"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_minggu_ini')}
            iconBgClass="bg-blue-600 text-white"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar Minggu Ini"
            subtitle="Agenda mengajar sepekan"
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
        <RoleSectionHeader
          title="Kartu Cepat Tim Kurikulum & Akademik"
          subtitle="Akses langsung 1-klik untuk presensi guru, plotting jadwal KBM, master mapel & shift belajar"
          dotColorClass="bg-indigo-600"
          count={5}
        />
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => onNavigateView('absen_harian_guru')}
            iconBgClass="theme-action-icon"
            icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
            title="Absen Harian Guru"
            subtitle="Presensi & jam kerja pendidik"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="theme-action-icon"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar Guru"
            subtitle="Plotting & manajemen jadwal KBM"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_mapel')}
            iconBgClass="theme-action-icon"
            icon={<BookOpen className="w-4 h-4" />}
            title="Mata Pelajaran"
            subtitle="Master kurikulum & mapel"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_guru')}
            iconBgClass="theme-action-icon"
            icon={<Users className="w-4 h-4" />}
            title="Data Tenaga Pendidik"
            subtitle="Master guru & beban mengajar"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_shift')}
            iconBgClass="theme-action-icon"
            icon={<Clock className="w-4 h-4" />}
            title="Jadwal Shift Belajar"
            subtitle="Pengaturan jam KBM Pagi & Siang"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'staf_jadwal') {
    return (
      <div className="space-y-2">
        <RoleSectionHeader
          title="Kartu Cepat Pengelola Jadwal Mengajar"
          subtitle="Akses langsung 1-klik untuk editor jadwal guru, plotting KBM, shift jam pelajaran & data pendidik"
          dotColorClass="bg-sky-600"
          count={5}
        />
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_mengajar')}
            iconBgClass="bg-sky-600 text-white"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar Guru"
            subtitle="Plotting & edit jadwal KBM"
            bgCardClass="bg-sky-50/80 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-slate-800 dark:text-slate-100 border-sky-200/80 dark:border-sky-800/60"
            textColorClass="text-sky-950 dark:text-sky-100"
            subtextColorClass="text-sky-600 dark:text-sky-400 font-semibold"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_shift')}
            iconBgClass="bg-indigo-600 text-white"
            icon={<Clock className="w-4 h-4" />}
            title="Jadwal Shift Belajar"
            subtitle="Pengaturan jam KBM Pagi & Siang"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('jadwal_minggu_ini')}
            iconBgClass="bg-blue-600 text-white"
            icon={<Calendar className="w-4 h-4" />}
            title="Jadwal Mengajar Minggu Ini"
            subtitle="Matriks jadwal mengajar sepekan"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_guru')}
            iconBgClass="bg-emerald-600 text-white"
            icon={<Users className="w-4 h-4" />}
            title="Data Tenaga Pendidik"
            subtitle="Daftar guru & alokasi mengajar"
          />

          <QuickActionBtn
            onClick={() => onNavigateView('master_mapel')}
            iconBgClass="bg-amber-600 text-white"
            icon={<BookOpen className="w-4 h-4" />}
            title="Mata Pelajaran"
            subtitle="Master kurikulum mata pelajaran"
          />
        </motion.div>
      </div>
    );
  }

  if (role === 'adm_siswa') {
    return (
      <div className="space-y-2">
        <RoleSectionHeader
          title="Kartu Cepat Administrasi Siswa"
          subtitle="Akses langsung 1-klik untuk master peserta didik, rekap harian, cetak kartu QR & pelanggaran"
          dotColorClass="bg-sky-500"
          count={5}
        />
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={cardContainerVariants}
          initial="hidden"
          animate="show"
        >
          <QuickActionBtn
            onClick={() => onNavigateView('master_siswa')}
            iconBgClass="bg-sky-500/10 text-sky-600 dark:text-sky-400"
            icon={<Users className="w-4 h-4" />}
            title="Data Siswa"
            subtitle="Kelola master peserta didik"
          />
          <QuickActionBtn
            onClick={() => onNavigateView('rekap_harian')}
            iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            icon={<CheckCircle2 className="w-4 h-4" />}
            title="Rekap Presensi Harian"
            subtitle="Presensi harian siswa rombel"
          />
          <QuickActionBtn
            onClick={() => onNavigateView('cetak_kartu_qr')}
            iconBgClass="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            icon={<QrCode className="w-4 h-4" />}
            title="Cetak Kartu QR Siswa"
            subtitle="Kartu pelajar & barcode"
          />
          <QuickActionBtn
            onClick={handleOpenClassSubmission}
            iconBgClass="bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            icon={<ClipboardCheck className="w-4 h-4" />}
            title="Rekap Pengisian Presensi Kelas"
            subtitle="Status sudah & belum isi"
          />
          <QuickActionBtn
            onClick={() => onNavigateView('catatan_pelanggaran')}
            iconBgClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            icon={<ShieldAlert className="w-4 h-4" />}
            title="Catatan Pelanggaran Siswa"
            subtitle="Catatan & poin kedisiplinan"
          />
        </motion.div>
      </div>
    );
  }

  // Guru Role (Tidak menampilkan aksi cepat di dashboard guru sesuai permintaan)
  return null;
};
