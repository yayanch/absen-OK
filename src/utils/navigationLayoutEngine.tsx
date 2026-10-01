import React from 'react';
import {
  PieChart,
  ClipboardCheck,
  Home,
  ShieldAlert,
  MessageSquare,
  Calendar,
  CalendarDays,
  GraduationCap,
  UserCheck,
  DoorOpen,
  Users,
  Sliders,
  UserCog,
  School,
  Sparkles,
  Database,
  Activity,
  Palette,
  QrCode,
  CreditCard,
  FileText,
  Clock,
  CalendarRange,
  BookOpen,
  Layers,
  Server,
  ShieldCheck,
  Folder,
  Layout,
  Grid,
  List,
  CheckCircle2,
  HardDriveDownload,
  RotateCcw,
  Send,
  ClipboardList,
  LucideIcon
} from 'lucide-react';
import { AppData, NavigationLayoutConfig, NavigationSectionConfig, NavigationMenuItemOverride, ViewType } from '../types';
import { ALL_MENU_ITEMS } from './rolePermissionEngine';

export const AVAILABLE_NAV_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: 'PieChart', label: 'Pie Chart / Statistik', icon: PieChart },
  { name: 'ClipboardCheck', label: 'Clipboard / Presensi', icon: ClipboardCheck },
  { name: 'CalendarDays', label: 'Kalender / Laporan', icon: CalendarDays },
  { name: 'Calendar', label: 'Jadwal / Kalender', icon: Calendar },
  { name: 'Users', label: 'Users / Siswa', icon: Users },
  { name: 'UserCheck', label: 'Guru / Tenaga Pendidik', icon: UserCheck },
  { name: 'UserCog', label: 'Manajemen Akun / Pengguna', icon: UserCog },
  { name: 'DoorOpen', label: 'Kelas / Ruangan', icon: DoorOpen },
  { name: 'GraduationCap', label: 'Jurusan / Akademik', icon: GraduationCap },
  { name: 'BookOpen', label: 'Mata Pelajaran', icon: BookOpen },
  { name: 'Layers', label: 'Mapel & Kelas Ajar', icon: Layers },
  { name: 'Clock', label: 'Shift & Jam Waktu', icon: Clock },
  { name: 'CalendarRange', label: 'Hari Libur / Agenda', icon: CalendarRange },
  { name: 'ShieldAlert', label: 'Pelanggaran / Keamanan', icon: ShieldAlert },
  { name: 'ShieldCheck', label: 'Role & Hak Akses', icon: ShieldCheck },
  { name: 'Home', label: 'Home Visit / Kunjungan', icon: Home },
  { name: 'QrCode', label: 'QR Code / Barcode', icon: QrCode },
  { name: 'CreditCard', label: 'Kartu Pelajar / ID Card', icon: CreditCard },
  { name: 'Database', label: 'Database / MySQL', icon: Database },
  { name: 'Server', label: 'Server & Monitoring', icon: Server },
  { name: 'Activity', label: 'Trafik & Monitoring', icon: Activity },
  { name: 'FileText', label: 'Log Audit / Dokumen', icon: FileText },
  { name: 'HardDriveDownload', label: 'Backup / Download', icon: HardDriveDownload },
  { name: 'MessageSquare', label: 'Chat & Komunikasi', icon: MessageSquare },
  { name: 'School', label: 'Identitas Sekolah', icon: School },
  { name: 'Palette', label: 'Tema & Tampilan', icon: Palette },
  { name: 'Sparkles', label: 'Data Demo / Spesial', icon: Sparkles },
  { name: 'Sliders', label: 'Pengaturan / Konfigurasi', icon: Sliders },
  { name: 'Folder', label: 'Folder / Kategori', icon: Folder },
  { name: 'Layout', label: 'Tata Letak / Posisi', icon: Layout },
  { name: 'Grid', label: 'Grid / Modul', icon: Grid },
  { name: 'List', label: 'Daftar / Rincian', icon: List },
  { name: 'ClipboardList', label: 'Petugas Piket / Logbook', icon: ClipboardList },
  { name: 'CheckCircle2', label: 'Check / Rekap Pengisian', icon: CheckCircle2 },
  { name: 'Send', label: 'Kirim / WhatsApp', icon: Send }
];

export const ICON_MAP: Record<string, LucideIcon> = AVAILABLE_NAV_ICONS.reduce((acc, item) => {
  acc[item.name] = item.icon;
  return acc;
}, {} as Record<string, LucideIcon>);

export function renderNavIcon(iconName?: string, className: string = 'w-4 h-4'): React.ReactNode {
  if (!iconName) return <Sliders className={className} />;
  const Comp = ICON_MAP[iconName] || Sliders;
  return <Comp className={className} />;
}

// 8 Default Sections with default Indonesian labels and standard ordering
export const DEFAULT_NAVIGATION_SECTIONS: NavigationSectionConfig[] = [
  {
    id: 'dashboard',
    title: 'DASHBOARD',
    iconName: 'PieChart',
    order: 1,
    visible: true,
    isAccordion: false,
    description: 'Halaman ringkasan statistik dan beranda portal',
    menuIds: ['dashboard', 'portal_murid']
  },
  {
    id: 'presensi',
    title: 'PRESENSI & KBM',
    iconName: 'ClipboardCheck',
    order: 2,
    visible: true,
    isAccordion: false,
    description: 'Pencatatan kehadiran harian siswa dan alokasi mapel guru',
    menuIds: ['presensi_input', 'mapel_kelas_guru']
  },
  {
    id: 'laporan',
    title: 'LAPORAN',
    iconName: 'CalendarDays',
    order: 3,
    visible: true,
    isAccordion: true,
    description: 'Rekapitulasi berkala kehadiran harian, mingguan, dan bulanan',
    menuIds: ['rekap_pengisian_kelas', 'rekap_harian', 'rekap_mingguan', 'rekap_bulanan', 'rekap_ketidakhadiran_tertinggi', 'rekap_siswa']
  },
  {
    id: 'master',
    title: 'DATA MASTER',
    iconName: 'Users',
    order: 4,
    visible: true,
    isAccordion: true,
    description: 'Database induk siswa, guru, petugas piket, mapel, kelas, jurusan, jadwal, dan shift',
    menuIds: [
      'master_siswa',
      'master_guru',
      'petugas_piket',
      'master_mapel',
      'mapel_kelas_guru',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'master_kelas',
      'master_jurusan',
      'hari_libur'
    ]
  },
  {
    id: 'kegiatan',
    title: 'KEGIATAN',
    iconName: 'ShieldAlert',
    order: 5,
    visible: true,
    isAccordion: false,
    description: 'Pencatatan poin kedisiplinan dan buku kunjungan rumah',
    menuIds: ['catatan_pelanggaran', 'home_visit', 'ekstrakurikuler']
  },
  {
    id: 'qr',
    title: 'QR & KARTU',
    iconName: 'QrCode',
    order: 6,
    visible: true,
    isAccordion: false,
    description: 'Pemindai kehadiran QR Code, kartu digital, dan cetak massal',
    menuIds: ['absen_qr', 'kartu_pelajar', 'cetak_kartu_qr']
  },
  {
    id: 'sistem',
    title: 'SISTEM & KEAMANAN',
    iconName: 'Database',
    order: 7,
    visible: true,
    isAccordion: true,
    description: 'Manajemen akun, IDS, server monitoring, audit logs, dan live chat',
    menuIds: [
      'master_user',
      'pengaturan_role',
      'pengaturan_menu',
      'intrusion_detection',
      'monitoring_server',
      'monitoring_login',
      'integrasi_mysql',
      'database_traffic',
      'audit_logs',
      'live_chat',
      'whatsapp_gateway'
    ]
  },
  {
    id: 'pengaturan',
    title: 'PENGATURAN',
    iconName: 'Sliders',
    order: 8,
    visible: true,
    isAccordion: true,
    description: 'Konfigurasi akun, identitas sekolah, tata letak menu, dan tema',
    menuIds: [
      'pengaturan_admin',
      'pengaturan_role',
      'pengaturan_menu',
      'pengaturan_sekolah',
      'pengaturan_tema',
      'data_demo'
    ]
  }
];

export const DEFAULT_MENU_LABELS: Record<ViewType, string> = ALL_MENU_ITEMS.reduce((acc, item) => {
  acc[item.id] = item.label;
  return acc;
}, {} as Record<ViewType, string>);

/**
 * Returns clean and complete navigation layout from appData or defaults
 */
export function getNavigationLayout(appData?: AppData): NavigationLayoutConfig {
  const existingLayout = appData?.navigationLayout;
  if (!existingLayout || !Array.isArray(existingLayout.sections) || existingLayout.sections.length === 0) {
    return {
      sections: JSON.parse(JSON.stringify(DEFAULT_NAVIGATION_SECTIONS)),
      itemOverrides: {},
      version: 1,
      updatedAt: new Date().toISOString()
    };
  }

  // Clone sections
  const clonedSections: NavigationSectionConfig[] = JSON.parse(JSON.stringify(existingLayout.sections));
  
  // Sort sections by order
  clonedSections.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Verify that all known ALL_MENU_ITEMS are accounted for in at least one section
  const assignedMenuIds = new Set<string>();
  clonedSections.forEach((sec) => {
    (sec.menuIds || []).forEach((m) => assignedMenuIds.add(m));
  });

  // If any menu item is missing, add it to 'pengaturan' or 'sistem' or first section
  const missingItems = ALL_MENU_ITEMS.filter((item) => !assignedMenuIds.has(item.id));
  if (missingItems.length > 0) {
    const targetSection = clonedSections.find((s) => s.id === 'pengaturan') || clonedSections[0];
    if (targetSection) {
      missingItems.forEach((item) => {
        if (!targetSection.menuIds.includes(item.id)) {
          targetSection.menuIds.push(item.id);
        }
      });
    }
  }

  // Ensure petugas_piket is in the 'master' section
  const masterSec = clonedSections.find((s) => s.id === 'master');
  if (masterSec && !masterSec.menuIds.includes('petugas_piket')) {
    const guruIdx = masterSec.menuIds.indexOf('master_guru');
    if (guruIdx !== -1) {
      masterSec.menuIds.splice(guruIdx + 1, 0, 'petugas_piket');
    } else {
      masterSec.menuIds.push('petugas_piket');
    }
  }

  // Ensure rekap_pengisian_kelas is in the 'laporan' section
  const laporanSec = clonedSections.find((s) => s.id === 'laporan');
  if (laporanSec && !laporanSec.menuIds.includes('rekap_pengisian_kelas')) {
    laporanSec.menuIds.unshift('rekap_pengisian_kelas');
  }

  // Remove any legacy standalone piket_section
  const filteredSections = clonedSections.filter((s) => s.id !== 'piket_section');

  return {
    sections: filteredSections,
    itemOverrides: existingLayout.itemOverrides || {},
    version: existingLayout.version || 1,
    updatedAt: existingLayout.updatedAt || new Date().toISOString()
  };
}

/**
 * Get effective label for a menu item
 */
export function getEffectiveMenuLabel(viewId: ViewType, layout?: NavigationLayoutConfig): string {
  const override = layout?.itemOverrides?.[viewId];
  if (override?.customLabel && override.customLabel.trim() !== '') {
    return override.customLabel.trim();
  }
  const defaultItem = ALL_MENU_ITEMS.find((m) => m.id === viewId);
  return defaultItem?.label || viewId;
}

/**
 * Get effective icon for a menu item
 */
export function getEffectiveMenuIcon(viewId: ViewType, layout?: NavigationLayoutConfig): string {
  const override = layout?.itemOverrides?.[viewId];
  if (override?.customIcon && override.customIcon.trim() !== '') {
    return override.customIcon.trim();
  }
  const defaultItem = ALL_MENU_ITEMS.find((m) => m.id === viewId);
  return defaultItem?.iconName || 'Sliders';
}

/**
 * Check if a menu item is marked as visible
 */
export function isMenuVisibleInLayout(viewId: ViewType, layout?: NavigationLayoutConfig): boolean {
  const override = layout?.itemOverrides?.[viewId];
  if (override && override.visible !== undefined) {
    return override.visible;
  }
  return true;
}

/**
 * Helper to move section up or down
 */
export function reorderSections(
  sections: NavigationSectionConfig[],
  currentIndex: number,
  targetIndex: number
): NavigationSectionConfig[] {
  if (targetIndex < 0 || targetIndex >= sections.length || currentIndex === targetIndex) {
    return sections;
  }

  const result = [...sections];
  const [removed] = result.splice(currentIndex, 1);
  result.splice(targetIndex, 0, removed);

  // Recalculate order values
  return result.map((sec, idx) => ({
    ...sec,
    order: idx + 1
  }));
}

/**
 * Helper to reorder menu items within a section
 */
export function reorderMenuItems(
  section: NavigationSectionConfig,
  currentIndex: number,
  targetIndex: number
): NavigationSectionConfig {
  const menuIds = [...section.menuIds];
  if (targetIndex < 0 || targetIndex >= menuIds.length || currentIndex === targetIndex) {
    return section;
  }

  const [removed] = menuIds.splice(currentIndex, 1);
  menuIds.splice(targetIndex, 0, removed);

  return {
    ...section,
    menuIds
  };
}

/**
 * Helper to move a menu item to another section
 */
export function moveMenuItemToSection(
  sections: NavigationSectionConfig[],
  menuId: ViewType,
  fromSectionId: string,
  toSectionId: string,
  targetPositionIndex?: number
): NavigationSectionConfig[] {
  return sections.map((sec) => {
    if (sec.id === fromSectionId && fromSectionId !== toSectionId) {
      return {
        ...sec,
        menuIds: sec.menuIds.filter((id) => id !== menuId)
      };
    }
    if (sec.id === toSectionId) {
      const filtered = sec.menuIds.filter((id) => id !== menuId);
      if (typeof targetPositionIndex === 'number' && targetPositionIndex >= 0 && targetPositionIndex <= filtered.length) {
        filtered.splice(targetPositionIndex, 0, menuId);
      } else {
        filtered.push(menuId);
      }
      return {
        ...sec,
        menuIds: filtered
      };
    }
    return sec;
  });
}
