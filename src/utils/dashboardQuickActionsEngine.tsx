import React from 'react';
import {
  FileText,
  AlertTriangle,
  Calendar,
  CalendarDays,
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
  Send,
  Sparkles,
  CreditCard,
  MessageSquare,
  BookOpenCheck,
  Sliders,
  Database,
  Radio,
  BarChart3,
  HelpCircle,
  GraduationCap,
  DoorOpen,
  Eye,
} from 'lucide-react';
import {
  AppData,
  DashboardQuickActionItem,
  RoleQuickActionConfig,
  DashboardQuickActionSettings,
  QuickActionColor,
  ViewType,
} from '../types';
import { ALL_MENU_ITEMS, normalizeRoleKey } from './rolePermissionEngine';

export const AVAILABLE_QUICK_ACTION_ICONS: { name: string; label: string }[] = [
  { name: 'CheckCircle2', label: 'Centang / Sukses' },
  { name: 'ClipboardCheck', label: 'Papan Presensi' },
  { name: 'BookOpenCheck', label: 'Buku & Ceklist KBM' },
  { name: 'Calendar', label: 'Kalender / Jadwal' },
  { name: 'CalendarDays', label: 'Agenda Harian/Mingguan' },
  { name: 'Users', label: 'Pengguna / Siswa' },
  { name: 'UserCheck', label: 'Guru / Tenaga Pendidik' },
  { name: 'BookOpen', label: 'Mata Pelajaran' },
  { name: 'Layers', label: 'Mapel & Kelas Ajar' },
  { name: 'QrCode', label: 'Scan QR Code' },
  { name: 'CreditCard', label: 'Kartu Pelajar' },
  { name: 'Clock', label: 'Waktu / Shift Jam' },
  { name: 'ShieldAlert', label: 'Peringatan / Disiplin' },
  { name: 'AlertTriangle', label: 'Perlu Perhatian' },
  { name: 'Home', label: 'Home Visit' },
  { name: 'FileText', label: 'Dokumen / Laporan' },
  { name: 'Activity', label: 'Aktivitas / Monitoring' },
  { name: 'Server', label: 'Server & Status' },
  { name: 'HardDriveDownload', label: 'Backup & Restore' },
  { name: 'MessageSquare', label: 'Chat & Komunikasi' },
  { name: 'Send', label: 'Broadcast Pesan WA' },
  { name: 'Sparkles', label: 'Ekstrakurikuler' },
  { name: 'Sliders', label: 'Pengaturan' },
  { name: 'Database', label: 'Database' },
  { name: 'DoorOpen', label: 'Kelas & Rombel' },
  { name: 'GraduationCap', label: 'Jurusan / Kejuruan' },
];

export function renderQuickActionIcon(iconName: string, className = 'w-4 h-4'): React.ReactNode {
  switch (iconName) {
    case 'CheckCircle2':
      return <CheckCircle2 className={className} />;
    case 'ClipboardCheck':
      return <ClipboardCheck className={className} />;
    case 'BookOpenCheck':
      return <BookOpenCheck className={className} />;
    case 'Calendar':
      return <Calendar className={className} />;
    case 'CalendarDays':
      return <CalendarDays className={className} />;
    case 'Users':
      return <Users className={className} />;
    case 'UserCheck':
      return <UserCheck className={className} />;
    case 'BookOpen':
      return <BookOpen className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'QrCode':
      return <QrCode className={className} />;
    case 'CreditCard':
      return <CreditCard className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'ShieldAlert':
      return <ShieldAlert className={className} />;
    case 'AlertTriangle':
      return <AlertTriangle className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'Activity':
      return <Activity className={className} />;
    case 'Server':
      return <Server className={className} />;
    case 'HardDriveDownload':
      return <HardDriveDownload className={className} />;
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'Send':
      return <Send className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'Sliders':
      return <Sliders className={className} />;
    case 'Database':
      return <Database className={className} />;
    case 'DoorOpen':
      return <DoorOpen className={className} />;
    case 'GraduationCap':
      return <GraduationCap className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export function getQuickActionColorClasses(colorScheme: QuickActionColor = 'blue'): {
  iconBg: string;
  iconGradient: string;
  pillTag: string;
  badge: string;
} {
  switch (colorScheme) {
    case 'emerald':
      return {
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        iconGradient: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white shadow-md shadow-emerald-500/25',
        pillTag: 'bg-emerald-50/90 dark:bg-emerald-950/70 border border-emerald-200/90 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 font-bold text-xs',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300',
      };
    case 'amber':
      return {
        iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        iconGradient: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25',
        pillTag: 'bg-amber-50/90 dark:bg-amber-950/70 border border-amber-200/90 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-bold text-xs',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
      };
    case 'rose':
      return {
        iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        iconGradient: 'bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 text-white shadow-md shadow-rose-500/25',
        pillTag: 'bg-rose-50/90 dark:bg-rose-950/70 border border-rose-200/90 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 font-bold text-xs',
        badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300',
      };
    case 'indigo':
      return {
        iconBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        iconGradient: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-700 text-white shadow-md shadow-indigo-500/25',
        pillTag: 'bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/90 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 font-bold text-xs',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300',
      };
    case 'cyan':
      return {
        iconBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        iconGradient: 'bg-gradient-to-br from-cyan-400 via-teal-500 to-blue-600 text-white shadow-md shadow-cyan-500/25',
        pillTag: 'bg-cyan-50/90 dark:bg-cyan-950/70 border border-cyan-200/90 dark:border-cyan-800/80 text-cyan-700 dark:text-cyan-300 font-bold text-xs',
        badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300',
      };
    case 'purple':
    case 'violet':
      return {
        iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        iconGradient: 'bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 text-white shadow-md shadow-purple-500/25',
        pillTag: 'bg-purple-50/90 dark:bg-purple-950/70 border border-purple-200/90 dark:border-purple-800/80 text-purple-700 dark:text-purple-300 font-bold text-xs',
        badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300',
      };
    case 'teal':
      return {
        iconBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        iconGradient: 'bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-600 text-white shadow-md shadow-teal-500/25',
        pillTag: 'bg-teal-50/90 dark:bg-teal-950/70 border border-teal-200/90 dark:border-teal-800/80 text-teal-700 dark:text-teal-300 font-bold text-xs',
        badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300',
      };
    case 'sky':
      return {
        iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        iconGradient: 'bg-gradient-to-br from-sky-400 via-blue-500 to-blue-600 text-white shadow-md shadow-sky-500/25',
        pillTag: 'bg-sky-50/90 dark:bg-sky-950/70 border border-sky-200/90 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 font-bold text-xs',
        badge: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
      };
    case 'slate':
      return {
        iconBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
        iconGradient: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-md shadow-slate-500/20',
        pillTag: 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs',
        badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      };
    case 'blue':
    default:
      return {
        iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        iconGradient: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25',
        pillTag: 'bg-blue-50/90 dark:bg-blue-950/70 border border-blue-200/90 dark:border-blue-800/80 text-blue-700 dark:text-blue-300 font-bold text-xs',
        badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300',
      };
  }
}

// Default standard configurations for every system role
export const DEFAULT_ROLE_QUICK_ACTIONS: Record<string, RoleQuickActionConfig> = {
  admin: {
    roleKey: 'admin',
    roleLabel: 'Administrator Utama',
    sectionTitle: 'Kartu Cepat Administrator',
    sectionSubtitle: 'Akses langsung 1-klik untuk rekapitulasi presensi, master data, hak akses, user & server',
    dotColorClass: 'bg-blue-600',
    enabled: true,
    cards: [
      {
        id: 'qa_adm_rekap_pengisian',
        view: 'rekap_pengisian_kelas',
        title: 'Rekap Pengisian Presensi Kelas',
        subtitle: 'Status kelas sudah & belum isi',
        iconName: 'CheckCircle2',
        colorScheme: 'emerald',
        enabled: true,
        specialAction: 'open_class_submission',
      },
      {
        id: 'qa_adm_master_siswa',
        view: 'master_siswa',
        title: 'Data Siswa',
        subtitle: 'Master data peserta didik',
        iconName: 'Users',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_adm_pengaturan_role',
        view: 'pengaturan_role',
        title: 'Hak Akses Role',
        subtitle: 'Konfigurasi izin menu & peran',
        iconName: 'ShieldAlert',
        colorScheme: 'purple',
        enabled: true,
      },
      {
        id: 'qa_adm_master_user',
        view: 'master_user',
        title: 'Akun & Pengguna',
        subtitle: 'Kelola staf, guru & admin',
        iconName: 'UserCheck',
        colorScheme: 'cyan',
        enabled: true,
      },
      {
        id: 'qa_adm_monitoring_server',
        view: 'monitoring_server',
        title: 'Monitoring Server',
        subtitle: 'Status resource & performa server',
        iconName: 'Activity',
        colorScheme: 'amber',
        enabled: true,
      },
      {
        id: 'qa_adm_backup_restore',
        view: 'audit_logs',
        title: 'Backup & Restore',
        subtitle: 'Cadangkan & pulihkan database sistem',
        iconName: 'HardDriveDownload',
        colorScheme: 'blue',
        enabled: true,
        specialAction: 'open_backup_modal',
      },
    ],
  },

  guru: {
    roleKey: 'guru',
    roleLabel: 'Dewan Guru & Pengajar',
    sectionTitle: 'Kartu Cepat Guru',
    sectionSubtitle: 'Akses langsung 1-klik untuk tugas mengajar, presensi harian, jadwal & administrasi KBM Anda',
    dotColorClass: 'bg-indigo-600',
    enabled: true,
    cards: [
      {
        id: 'qa_guru_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        isUtama: true,
        badgeText: '4 Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_guru_jadwal_mingguan',
        view: 'jadwal_minggu_ini',
        title: 'Jadwal Mengajar Saya',
        subtitle: 'Matriks jadwal mengajar mingguan & alokasi JP kelas',
        iconName: 'Calendar',
        colorScheme: 'sky',
        enabled: true,
        isUtama: true,
        badgeText: '70 JP Beban Mengajar',
      },
      {
        id: 'qa_guru_pelanggaran',
        view: 'catatan_pelanggaran',
        title: 'Catatan Pelanggaran Siswa',
        subtitle: 'Catat poin kedisiplinan & sanksi tata tertib siswa',
        iconName: 'AlertTriangle',
        colorScheme: 'rose',
        enabled: true,
        badgeText: 'Input Kedisiplinan',
      },
      {
        id: 'qa_guru_chat',
        view: 'live_chat',
        title: 'Pesan & Live Chat Sekolah',
        subtitle: 'Komunikasi langsung dengan sesama guru, wali & staf',
        iconName: 'MessageSquare',
        colorScheme: 'emerald',
        enabled: true,
        badgeText: 'Live Chat Sekolah',
      },
      {
        id: 'qa_guru_presensi_input',
        view: 'presensi_input',
        title: 'Input Presensi Kelas',
        subtitle: 'Pencatatan kehadiran harian siswa per kelas (H/S/I/A/T/D)',
        iconName: 'ClipboardCheck',
        colorScheme: 'blue',
        enabled: true,
        specialAction: 'navigate_to_input',
        badgeText: '12 Rombel Aktif',
      },
      {
        id: 'qa_guru_absen_harian',
        view: 'absen_harian_guru',
        title: 'Absen Harian Guru',
        subtitle: 'Presensi kehadiran harian guru mengajar terintegrasi jadwal KBM',
        iconName: 'UserCheck',
        colorScheme: 'teal',
        enabled: true,
        badgeText: 'Shift & Kelompok',
      },
    ],
  },

  wali: {
    roleKey: 'wali',
    roleLabel: 'Wali Kelas',
    sectionTitle: 'Kartu Cepat Wali Kelas',
    sectionSubtitle: 'Akses langsung 1-klik untuk presensi hari ini, data siswa binaan, rekap, & jadwal mengajar',
    dotColorClass: 'bg-emerald-600',
    enabled: true,
    cards: [
      {
        id: 'qa_wali_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        isUtama: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_wali_presensi_input',
        view: 'presensi_input',
        title: 'Input Presensi Hari Ini',
        subtitle: 'Isi presensi kelas binaan',
        iconName: 'ClipboardCheck',
        colorScheme: 'emerald',
        enabled: true,
        specialAction: 'navigate_to_input',
      },
      {
        id: 'qa_wali_master_siswa',
        view: 'master_siswa',
        title: 'Data Siswa Kelas',
        subtitle: 'Daftar peserta didik binaan',
        iconName: 'Users',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_wali_rekap_harian',
        view: 'rekap_harian',
        title: 'Rekap Presensi Kelas',
        subtitle: 'Laporan kehadiran harian kelas',
        iconName: 'FileText',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_wali_siswa_perhatian',
        view: 'rekap_ketidakhadiran_tertinggi',
        title: 'Siswa Perlu Perhatian',
        subtitle: 'Peringatan & evaluasi siswa',
        iconName: 'AlertTriangle',
        colorScheme: 'amber',
        enabled: true,
      },
      {
        id: 'qa_wali_mapel_kelas',
        view: 'mapel_kelas_guru',
        title: 'Mapel & Kelas Ajar',
        subtitle: 'Kelola mapel & kelas pengampu',
        iconName: 'Layers',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_wali_jadwal_mengajar',
        view: 'jadwal_mengajar',
        title: 'Jadwal Mengajar Guru',
        subtitle: 'Matriks & jadwal KBM guru',
        iconName: 'BookOpen',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_wali_jadwal_mingguan',
        view: 'jadwal_minggu_ini',
        title: 'Jadwal Mengajar Minggu Ini',
        subtitle: 'Agenda mengajar sepekan',
        iconName: 'Calendar',
        colorScheme: 'cyan',
        enabled: true,
      },
    ],
  },

  kesiswaan: {
    roleKey: 'kesiswaan',
    roleLabel: 'Tim Kesiswaan & BP/BK',
    sectionTitle: 'Kartu Cepat Tim Kesiswaan & BP/BK',
    sectionSubtitle: 'Akses langsung 1-klik untuk pembinaan siswa, pemantauan ketidakhadiran, pelanggaran & home visit',
    dotColorClass: 'bg-cyan-600',
    enabled: true,
    cards: [
      {
        id: 'qa_kes_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_kes_rekap_pengisian',
        view: 'rekap_pengisian_kelas',
        title: 'Rekap Pengisian Presensi Kelas',
        subtitle: 'Status kelas sudah & belum isi',
        iconName: 'CheckCircle2',
        colorScheme: 'emerald',
        enabled: true,
        specialAction: 'open_class_submission',
      },
      {
        id: 'qa_kes_siswa_perhatian',
        view: 'rekap_ketidakhadiran_tertinggi',
        title: 'Siswa Perlu Perhatian',
        subtitle: 'Siswa berisiko alfa & tidak hadir',
        iconName: 'AlertTriangle',
        colorScheme: 'amber',
        enabled: true,
      },
      {
        id: 'qa_kes_rekap_bulanan',
        view: 'rekap_bulanan',
        title: 'Rekap Presensi Bulanan',
        subtitle: 'Laporan bulanan seluruh kelas',
        iconName: 'Calendar',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_kes_pelanggaran',
        view: 'catatan_pelanggaran',
        title: 'Catatan Pelanggaran Siswa',
        subtitle: 'Catatan poin & sanksi kedisiplinan',
        iconName: 'ShieldAlert',
        colorScheme: 'rose',
        enabled: true,
      },
      {
        id: 'qa_kes_home_visit',
        view: 'home_visit',
        title: 'Laporan Home Visit',
        subtitle: 'Kunjungan rumah & tindak lanjut BK',
        iconName: 'Home',
        colorScheme: 'purple',
        enabled: true,
      },
    ],
  },

  kurikulum: {
    roleKey: 'kurikulum',
    roleLabel: 'WKS Kurikulum & Akademik',
    sectionTitle: 'Kartu Cepat Tim Kurikulum & Akademik',
    sectionSubtitle: 'Akses langsung 1-klik untuk presensi guru, plotting jadwal KBM, master mapel & shift belajar',
    dotColorClass: 'bg-indigo-600',
    enabled: true,
    cards: [
      {
        id: 'qa_kur_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        isUtama: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_kur_absen_harian',
        view: 'absen_harian_guru',
        title: 'Absen Harian Guru',
        subtitle: 'Presensi & jam kerja pendidik',
        iconName: 'UserCheck',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_kur_jadwal_mengajar',
        view: 'jadwal_mengajar',
        title: 'Jadwal Mengajar Guru',
        subtitle: 'Plotting & manajemen jadwal KBM',
        iconName: 'Calendar',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_kur_master_mapel',
        view: 'master_mapel',
        title: 'Mata Pelajaran',
        subtitle: 'Master kurikulum & mapel',
        iconName: 'BookOpen',
        colorScheme: 'amber',
        enabled: true,
      },
      {
        id: 'qa_kur_mapel_kelas',
        view: 'mapel_kelas_guru',
        title: 'Mapel & Kelas Ajar',
        subtitle: 'Penugasan guru mapel dan rombel',
        iconName: 'Layers',
        colorScheme: 'cyan',
        enabled: true,
      },
      {
        id: 'qa_kur_master_guru',
        view: 'master_guru',
        title: 'Data Tenaga Pendidik',
        subtitle: 'Master guru & beban mengajar',
        iconName: 'Users',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_kur_jadwal_shift',
        view: 'jadwal_shift',
        title: 'Jadwal Shift Belajar',
        subtitle: 'Pengaturan jam KBM Pagi & Siang',
        iconName: 'Clock',
        colorScheme: 'purple',
        enabled: true,
      },
    ],
  },

  staf_jadwal: {
    roleKey: 'staf_jadwal',
    roleLabel: 'Staf Pengelola Jadwal KBM',
    sectionTitle: 'Kartu Cepat Pengelola Jadwal Mengajar',
    sectionSubtitle: 'Akses langsung 1-klik untuk editor jadwal guru, plotting KBM, shift jam pelajaran & data pendidik',
    dotColorClass: 'bg-sky-600',
    enabled: true,
    cards: [
      {
        id: 'qa_stf_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_stf_jadwal_mengajar',
        view: 'jadwal_mengajar',
        title: 'Jadwal Mengajar Guru',
        subtitle: 'Plotting & edit jadwal KBM',
        iconName: 'Calendar',
        colorScheme: 'sky',
        enabled: true,
      },
      {
        id: 'qa_stf_jadwal_shift',
        view: 'jadwal_shift',
        title: 'Jadwal Shift Belajar',
        subtitle: 'Pengaturan jam KBM Pagi & Siang',
        iconName: 'Clock',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_stf_jadwal_mingguan',
        view: 'jadwal_minggu_ini',
        title: 'Jadwal Mengajar Minggu Ini',
        subtitle: 'Matriks jadwal mengajar sepekan',
        iconName: 'CalendarDays',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_stf_master_guru',
        view: 'master_guru',
        title: 'Data Tenaga Pendidik',
        subtitle: 'Daftar guru & alokasi mengajar',
        iconName: 'Users',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_stf_master_mapel',
        view: 'master_mapel',
        title: 'Mata Pelajaran',
        subtitle: 'Master kurikulum mata pelajaran',
        iconName: 'BookOpen',
        colorScheme: 'amber',
        enabled: true,
      },
    ],
  },

  adm_siswa: {
    roleKey: 'adm_siswa',
    roleLabel: 'Admin Siswa (Non-Guru)',
    sectionTitle: 'Kartu Cepat Administrasi Siswa',
    sectionSubtitle: 'Akses langsung 1-klik untuk master peserta didik, rekap harian, cetak kartu QR & pelanggaran',
    dotColorClass: 'bg-sky-500',
    enabled: true,
    cards: [
      {
        id: 'qa_adm_master_siswa',
        view: 'master_siswa',
        title: 'Data Siswa',
        subtitle: 'Kelola master peserta didik',
        iconName: 'Users',
        colorScheme: 'sky',
        enabled: true,
      },
      {
        id: 'qa_adm_rekap_harian',
        view: 'rekap_harian',
        title: 'Rekap Presensi Harian',
        subtitle: 'Presensi harian siswa rombel',
        iconName: 'CheckCircle2',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_adm_cetak_kartu',
        view: 'cetak_kartu_qr',
        title: 'Cetak Kartu QR Siswa',
        subtitle: 'Kartu pelajar & barcode',
        iconName: 'QrCode',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_adm_rekap_pengisian',
        view: 'rekap_pengisian_kelas',
        title: 'Rekap Pengisian Presensi Kelas',
        subtitle: 'Status sudah & belum isi',
        iconName: 'ClipboardCheck',
        colorScheme: 'cyan',
        enabled: true,
        specialAction: 'open_class_submission',
      },
      {
        id: 'qa_adm_pelanggaran',
        view: 'catatan_pelanggaran',
        title: 'Catatan Pelanggaran Siswa',
        subtitle: 'Catatan & poin kedisiplinan',
        iconName: 'ShieldAlert',
        colorScheme: 'amber',
        enabled: true,
      },
    ],
  },

  piket: {
    roleKey: 'piket',
    roleLabel: 'Petugas Piket Harian',
    sectionTitle: 'Kartu Cepat Guru Piket Harian',
    sectionSubtitle: 'Akses langsung 1-klik untuk input presensi darurat, scan QR siswa & penegakan disiplin',
    dotColorClass: 'bg-amber-500',
    enabled: true,
    cards: [
      {
        id: 'qa_pkt_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_pkt_rekap_pengisian',
        view: 'rekap_pengisian_kelas',
        title: 'Rekap Pengisian Presensi Kelas',
        subtitle: 'Status kelas sudah & belum isi',
        iconName: 'CheckCircle2',
        colorScheme: 'emerald',
        enabled: true,
        specialAction: 'open_class_submission',
      },
      {
        id: 'qa_pkt_presensi_input',
        view: 'presensi_input',
        title: 'Input Presensi Kelas',
        subtitle: 'Kelola kehadiran siswa harian',
        iconName: 'ClipboardCheck',
        colorScheme: 'blue',
        enabled: true,
        specialAction: 'navigate_to_input',
      },
      {
        id: 'qa_pkt_scan_qr',
        view: 'absen_qr',
        title: 'Scan Presensi QR',
        subtitle: 'Pindai kartu pelajar & barcode',
        iconName: 'QrCode',
        colorScheme: 'teal',
        enabled: true,
      },
      {
        id: 'qa_pkt_pelanggaran',
        view: 'catatan_pelanggaran',
        title: 'Catatan Pelanggaran Siswa',
        subtitle: 'Poin disiplin & tindakan siswa',
        iconName: 'ShieldAlert',
        colorScheme: 'rose',
        enabled: true,
      },
      {
        id: 'qa_pkt_rekap_harian',
        view: 'rekap_harian',
        title: 'Rekap Presensi Harian',
        subtitle: 'Laporan kehadiran seluruh rombel',
        iconName: 'FileText',
        colorScheme: 'amber',
        enabled: true,
      },
    ],
  },

  piket_kelas: {
    roleKey: 'piket_kelas',
    roleLabel: 'Petugas Piket Kelas / Siswa',
    sectionTitle: 'Kartu Cepat Piket Kelas',
    sectionSubtitle: 'Akses langsung 1-klik untuk pengisian presensi siswa hari ini & rekapitulasi kehadiran kelas',
    dotColorClass: 'bg-teal-500',
    enabled: true,
    cards: [
      {
        id: 'qa_pktkls_input',
        view: 'presensi_input',
        title: 'Input Presensi Hari Ini',
        subtitle: 'Isi kehadiran siswa kelas',
        iconName: 'ClipboardCheck',
        colorScheme: 'teal',
        enabled: true,
        specialAction: 'navigate_to_input',
      },
      {
        id: 'qa_pktkls_rekap',
        view: 'rekap_harian',
        title: 'Rekap Presensi Kelas',
        subtitle: 'Laporan kehadiran harian kelas',
        iconName: 'Users',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_pktkls_chat',
        view: 'live_chat',
        title: 'Pusat Pesan & Bantuan',
        subtitle: 'Hubungi Admin & Wali Kelas',
        iconName: 'MessageSquare',
        colorScheme: 'amber',
        enabled: true,
      },
    ],
  },

  hubin: {
    roleKey: 'hubin',
    roleLabel: 'WKS Hubin & Industri',
    sectionTitle: 'Kartu Cepat Hubin & Kerjasama Industri',
    sectionSubtitle: 'Akses cepat data siswa magang/PKL, rekapitulasi kehadiran dan jadwal shift',
    dotColorClass: 'bg-emerald-600',
    enabled: true,
    cards: [
      {
        id: 'qa_hub_kbm',
        view: 'presensi_kbm_guru',
        title: 'Absen Mengajar Guru (KBM)',
        subtitle: 'Input presensi kehadiran siswa per jam pelajaran mengajar & tabel log riwayat KBM',
        iconName: 'BookOpen',
        colorScheme: 'purple',
        enabled: true,
        badgeText: 'Sesi Mengajar Hari Ini',
      },
      {
        id: 'qa_hub_siswa',
        view: 'master_siswa',
        title: 'Data Siswa & Jurusan',
        subtitle: 'Daftar peserta didik & kompetensi',
        iconName: 'Users',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_hub_rekap',
        view: 'rekap_harian',
        title: 'Rekap Kehadiran Harian',
        subtitle: 'Pantau presensi harian siswa',
        iconName: 'CheckCircle2',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_hub_shift',
        view: 'jadwal_shift',
        title: 'Jadwal Shift Belajar',
        subtitle: 'Pengaturan shift jam belajar',
        iconName: 'Clock',
        colorScheme: 'purple',
        enabled: true,
      },
      {
        id: 'qa_hub_pelanggaran',
        view: 'catatan_pelanggaran',
        title: 'Catatan Kedisiplinan',
        subtitle: 'Evaluasi disiplin siswa',
        iconName: 'ShieldAlert',
        colorScheme: 'rose',
        enabled: true,
      },
    ],
  },

  murid: {
    roleKey: 'murid',
    roleLabel: 'Siswa / Murid',
    sectionTitle: 'Kartu Cepat Portal Siswa',
    sectionSubtitle: 'Akses cepat portal mandiri, scan kehadiran QR, dan riwayat presensi saya',
    dotColorClass: 'bg-blue-600',
    enabled: true,
    cards: [
      {
        id: 'qa_mrd_portal',
        view: 'portal_murid',
        title: 'Portal Siswa Mandiri',
        subtitle: 'Dashboard statistik kehadiran saya',
        iconName: 'Users',
        colorScheme: 'blue',
        enabled: true,
      },
      {
        id: 'qa_mrd_scan_qr',
        view: 'absen_qr',
        title: 'Scan Presensi QR',
        subtitle: 'Pindai QR kehadiran dinamis',
        iconName: 'QrCode',
        colorScheme: 'emerald',
        enabled: true,
      },
      {
        id: 'qa_mrd_kartu',
        view: 'kartu_pelajar',
        title: 'Kartu Pelajar Digital',
        subtitle: 'Identitas kartu digital & barcode',
        iconName: 'CreditCard',
        colorScheme: 'indigo',
        enabled: true,
      },
      {
        id: 'qa_mrd_rekap',
        view: 'rekap_siswa',
        title: 'Riwayat Kehadiran Saya',
        subtitle: 'Cek presensi semester berjalan',
        iconName: 'FileText',
        colorScheme: 'amber',
        enabled: true,
      },
      {
        id: 'qa_mrd_chat',
        view: 'live_chat',
        title: 'Pusat Bantuan & Guru BK',
        subtitle: 'Kirim pesan ke wali kelas / admin',
        iconName: 'MessageSquare',
        colorScheme: 'cyan',
        enabled: true,
      },
    ],
  },
};

// Aliases for matching roles
export function normalizeRoleForQuickActions(role: string): string {
  const norm = normalizeRoleKey(role);
  if (norm === 'siswa') return 'murid';
  if (norm === 'user') return 'guru';
  if (norm === 'piket_guru' || norm === 'piket_kesiswaan') return 'piket';
  return norm;
}

export function getDefaultRoleQuickActionConfig(roleKey: string): RoleQuickActionConfig {
  const normKey = normalizeRoleForQuickActions(roleKey);
  if (DEFAULT_ROLE_QUICK_ACTIONS[normKey]) {
    return JSON.parse(JSON.stringify(DEFAULT_ROLE_QUICK_ACTIONS[normKey]));
  }

  // Generic fallback for custom role
  return {
    roleKey: roleKey,
    roleLabel: roleKey.replace(/_/g, ' ').toUpperCase(),
    sectionTitle: `Kartu Cepat ${roleKey.replace(/_/g, ' ').toUpperCase()}`,
    sectionSubtitle: 'Akses cepat navigasi dashboard',
    dotColorClass: 'bg-indigo-600',
    enabled: true,
    cards: [
      {
        id: `qa_${roleKey}_dashboard`,
        view: 'dashboard',
        title: 'Dashboard Utama',
        subtitle: 'Ringkasan data & statistik',
        iconName: 'CheckCircle2',
        colorScheme: 'blue',
        enabled: true,
      },
    ],
  };
}

export function getRoleQuickActionConfig(
  appData?: AppData,
  roleKey?: string
): RoleQuickActionConfig {
  if (!roleKey) return getDefaultRoleQuickActionConfig('admin');
  const normKey = normalizeRoleForQuickActions(roleKey);

  const saved = appData?.dashboardQuickActions?.rolesConfig?.[normKey] ||
    appData?.dashboardQuickActions?.rolesConfig?.[roleKey];

  if (saved) {
    const rawCards = (saved.cards || []).map((c, idx) => ({
      ...c,
      order: c.order ?? idx,
    }));

    // CRITICAL: If this role is a teacher role (guru, wali, kurikulum, kesiswaan, staf_jadwal, piket, hubin)
    // and the saved configuration is missing the 'presensi_kbm_guru' card,
    // automatically prepend the KBM card so existing saved database configs immediately display it!
    const teacherRoles = ['guru', 'wali', 'kurikulum', 'kesiswaan', 'staf_jadwal', 'piket', 'hubin'];
    const hasKbmCard = rawCards.some((c) => c.view === 'presensi_kbm_guru');

    if (teacherRoles.includes(normKey) && !hasKbmCard) {
      const defaultKbm =
        DEFAULT_ROLE_QUICK_ACTIONS[normKey]?.cards?.find((c) => c.view === 'presensi_kbm_guru') ||
        DEFAULT_ROLE_QUICK_ACTIONS.guru.cards.find((c) => c.view === 'presensi_kbm_guru');
      if (defaultKbm) {
        rawCards.unshift({ ...defaultKbm, order: -1 });
      }
    }

    return {
      ...saved,
      cards: rawCards,
    };
  }

  return getDefaultRoleQuickActionConfig(normKey);
}

export interface KnownRoleOption {
  key: string;
  label: string;
  description: string;
  dotColor: string;
  isSystem: boolean;
}

export function getAvailableRolesForConfig(appData?: AppData): KnownRoleOption[] {
  const systemRoles: KnownRoleOption[] = [
    { key: 'admin', label: 'Administrator Utama', description: 'Kendali penuh sistem & rekapitulasi sekolah', dotColor: 'bg-blue-600', isSystem: true },
    { key: 'guru', label: 'Dewan Guru & Pengajar', description: 'Guru mata pelajaran, absensi KBM & jam mengajar', dotColor: 'bg-indigo-600', isSystem: true },
    { key: 'wali', label: 'Wali Kelas', description: 'Pembina kelas binaan, siswa & catatan presensi', dotColor: 'bg-emerald-600', isSystem: true },
    { key: 'kesiswaan', label: 'WKS Kesiswaan & BP/BK', description: 'Pengawasan siswa, evaluasi alfa & home visit', dotColor: 'bg-cyan-600', isSystem: true },
    { key: 'kurikulum', label: 'WKS Kurikulum', description: 'Jadwal pelajaran, kurikulum & pemantauan guru', dotColor: 'bg-purple-600', isSystem: true },
    { key: 'staf_jadwal', label: 'Staf Pengelola Jadwal', description: 'Plotting jadwal KBM, shift & kalender libur', dotColor: 'bg-sky-600', isSystem: true },
    { key: 'adm_siswa', label: 'Admin Siswa (Non-Guru)', description: 'Master data siswa, cetak kartu QR & dokumen', dotColor: 'bg-sky-500', isSystem: true },
    { key: 'piket', label: 'Petugas Piket Harian', description: 'Petugas piket gerbang & presensi harian', dotColor: 'bg-amber-500', isSystem: true },
    { key: 'piket_kelas', label: 'Petugas Piket Kelas', description: 'Sekretaris / perwakilan siswa pengisi absen', dotColor: 'bg-teal-500', isSystem: true },
    { key: 'hubin', label: 'WKS Hubin & Industri', description: 'Hubungan industri, PKL/magang & shift siswa', dotColor: 'bg-emerald-600', isSystem: true },
    { key: 'murid', label: 'Siswa / Murid', description: 'Siswa mandiri, portal kartu & riwayat presensi', dotColor: 'bg-blue-500', isSystem: true },
  ];

  // Append custom roles
  const customRoleItems = (appData?.customRoles || []).map((cr) => ({
    key: cr.id || cr.name,
    label: cr.label || cr.name,
    description: cr.description || `Role kustom ${cr.label || cr.name}`,
    dotColor: 'bg-violet-600',
    isSystem: false,
  }));

  return [...systemRoles, ...customRoleItems];
}

export function updateRoleQuickActionConfig(
  appData: AppData,
  roleKey: string,
  newConfig: RoleQuickActionConfig,
  editorName = 'Administrator'
): AppData {
  const normKey = normalizeRoleForQuickActions(roleKey);
  const currentSettings = appData.dashboardQuickActions?.rolesConfig || {};

  const updatedSettings: DashboardQuickActionSettings = {
    rolesConfig: {
      ...currentSettings,
      [normKey]: {
        ...newConfig,
        roleKey: normKey,
      },
    },
    updatedAt: new Date().toISOString(),
    updatedBy: editorName,
  };

  return {
    ...appData,
    dashboardQuickActions: updatedSettings,
  };
}

export function resetRoleQuickActionToDefault(
  appData: AppData,
  roleKey: string,
  editorName = 'Administrator'
): AppData {
  const normKey = normalizeRoleForQuickActions(roleKey);
  const currentSettings = { ...(appData.dashboardQuickActions?.rolesConfig || {}) };
  delete currentSettings[normKey];
  delete currentSettings[roleKey];

  return {
    ...appData,
    dashboardQuickActions: {
      rolesConfig: currentSettings,
      updatedAt: new Date().toISOString(),
      updatedBy: editorName,
    },
  };
}

export function resetAllRoleQuickActionsToDefault(
  appData: AppData,
  editorName = 'Administrator'
): AppData {
  return {
    ...appData,
    dashboardQuickActions: {
      rolesConfig: {},
      updatedAt: new Date().toISOString(),
      updatedBy: editorName,
    },
  };
}
