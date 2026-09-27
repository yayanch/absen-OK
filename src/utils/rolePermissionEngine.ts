import { AppData, RoleMenuPermission, ViewType } from '../types';

export type MenuCategoryKey =
  | 'dashboard'
  | 'presensi'
  | 'laporan'
  | 'master'
  | 'kegiatan'
  | 'qr'
  | 'sistem'
  | 'pengaturan';

export interface MenuItemInfo {
  id: ViewType;
  label: string;
  shortDesc: string;
  category: MenuCategoryKey;
  iconName: string;
}

export interface MenuCategoryInfo {
  key: MenuCategoryKey;
  title: string;
  description: string;
  iconName: string;
  items: MenuItemInfo[];
}

export const ALL_MENU_ITEMS: MenuItemInfo[] = [
  // 1. Dashboard & Portal
  {
    id: 'dashboard',
    label: 'Dashboard Utama',
    shortDesc: 'Pusat ringkasan statistik kehadiran siswa & grafik harian',
    category: 'dashboard',
    iconName: 'PieChart',
  },
  {
    id: 'portal_murid',
    label: 'Portal Siswa',
    shortDesc: 'Halaman dashboard mandiri siswa & riwayat presensi pribadi',
    category: 'dashboard',
    iconName: 'Users',
  },

  // 2. Presensi & KBM
  {
    id: 'presensi_input',
    label: 'Input Presensi Kelas',
    shortDesc: 'Pencatatan kehadiran harian siswa per kelas (H/S/I/A/T/D)',
    category: 'presensi',
    iconName: 'ClipboardCheck',
  },
  {
    id: 'mapel_kelas_guru',
    label: 'Mapel & Kelas Ajar',
    shortDesc: 'Pengaturan penugasan mata pelajaran dan kelas ajar guru',
    category: 'presensi',
    iconName: 'Layers',
  },

  // 3. Laporan & Rekapitulasi
  {
    id: 'rekap_harian',
    label: 'Rekap Presensi Harian',
    shortDesc: 'Laporan kehadiran harian seluruh kelas beserta filter tanggal',
    category: 'laporan',
    iconName: 'Calendar',
  },
  {
    id: 'rekap_mingguan',
    label: 'Rekap Presensi Mingguan',
    shortDesc: 'Laporan agregasi persentase kehadiran mingguan per kelas',
    category: 'laporan',
    iconName: 'CalendarDays',
  },
  {
    id: 'rekap_bulanan',
    label: 'Rekap Presensi Bulanan',
    shortDesc: 'Laporan rekap bulanan komprehensif siap cetak / ekspor Excel',
    category: 'laporan',
    iconName: 'CalendarDays',
  },
  {
    id: 'rekap_ketidakhadiran_tertinggi',
    label: 'Rekap Ketidakhadiran Tertinggi',
    shortDesc: 'Peringkat siswa dengan jumlah absen (S/I/A) terbanyak',
    category: 'laporan',
    iconName: 'AlertCircle',
  },
  {
    id: 'rekap_siswa',
    label: 'Riwayat Kehadiran Siswa',
    shortDesc: 'Kartu riwayat kehadiran individu siswa sepanjang semester',
    category: 'laporan',
    iconName: 'FileText',
  },

  // 4. Data Master
  {
    id: 'master_siswa',
    label: 'Data Siswa',
    shortDesc: 'Master data induk seluruh siswa, NISN, kelas, dan kontak wali',
    category: 'master',
    iconName: 'Users',
  },
  {
    id: 'master_guru',
    label: 'Data Guru & Tenaga Pendidik',
    shortDesc: 'Master data guru pengampu, NIP, jabatan, dan nomor telepon',
    category: 'master',
    iconName: 'UserCheck',
  },
  {
    id: 'master_mapel',
    label: 'Mata Pelajaran',
    shortDesc: 'Daftar kurikulum mata pelajaran, alokasi jam, dan kategori',
    category: 'master',
    iconName: 'BookOpen',
  },
  {
    id: 'master_kelas',
    label: 'Data Kelas & Rombel',
    shortDesc: 'Master data rombongan belajar beserta wali kelas yang ditugaskan',
    category: 'master',
    iconName: 'DoorOpen',
  },
  {
    id: 'master_jurusan',
    label: 'Data Jurusan / Program Keahlian',
    shortDesc: 'Master kompetensi keahlian dan jurusan sekolah',
    category: 'master',
    iconName: 'GraduationCap',
  },
  {
    id: 'jadwal_mengajar',
    label: 'Jadwal Mengajar Guru',
    shortDesc: 'Plotting jadwal mengajar mingguan per guru dan mata pelajaran',
    category: 'master',
    iconName: 'Calendar',
  },
  {
    id: 'jadwal_minggu_ini',
    label: 'Jadwal Mengajar Minggu Ini',
    shortDesc: 'Tampilan kalender jadwal mengajar aktif minggu berjalan',
    category: 'master',
    iconName: 'CalendarDays',
  },
  {
    id: 'jadwal_shift',
    label: 'Jadwal Shift Pagi & Siang',
    shortDesc: 'Pengaturan jam masuk, toleransi keterlambatan, dan jam pulang',
    category: 'master',
    iconName: 'Clock',
  },
  {
    id: 'hari_libur',
    label: 'Hari Libur & Kalender Presensi',
    shortDesc: 'Penetapan hari libur nasional dan hari bebas presensi',
    category: 'master',
    iconName: 'CalendarRange',
  },

  // 5. Kegiatan & Kesiswaan
  {
    id: 'catatan_pelanggaran',
    label: 'Catatan Pelanggaran Siswa',
    shortDesc: 'Buku pelanggaran kedisiplinan siswa, poin minus, dan tindak lanjut',
    category: 'kegiatan',
    iconName: 'ShieldAlert',
  },
  {
    id: 'home_visit',
    label: 'Home Visit (Kunjungan Rumah)',
    shortDesc: 'Dokumentasi agenda dan laporan home visit BK ke rumah siswa',
    category: 'kegiatan',
    iconName: 'Home',
  },

  // 6. QR Code & Kartu
  {
    id: 'absen_qr',
    label: 'Scan QR & Server QR Presensi',
    shortDesc: 'Kamera pemindai QR mandiri dan layar QR Dinamis Server',
    category: 'qr',
    iconName: 'QrCode',
  },
  {
    id: 'kartu_pelajar',
    label: 'Kartu Pelajar Digital',
    shortDesc: 'ID Card digital siswa dilengkapi foto dan QR Code personal',
    category: 'qr',
    iconName: 'CreditCard',
  },
  {
    id: 'cetak_kartu_qr',
    label: 'Cetak Kartu QR Siswa',
    shortDesc: 'Generator cetak lembar kartu QR siswa per kelas siap laminating',
    category: 'qr',
    iconName: 'CreditCard',
  },

  // 7. Sistem & Keamanan
  {
    id: 'master_user',
    label: 'Manajemen Akun Pengguna',
    shortDesc: 'Pusat kelola akun login guru, wali kelas, staf, dan siswa',
    category: 'sistem',
    iconName: 'UserCog',
  },
  {
    id: 'pengaturan_role',
    label: 'Pengaturan Role & Hak Akses',
    shortDesc: 'Konfigurasi peran dan pembatasan menu yang dapat dilihat/dibuka',
    category: 'sistem',
    iconName: 'ShieldCheck',
  },
  {
    id: 'intrusion_detection',
    label: 'Deteksi Intrusi (IDS)',
    shortDesc: 'Sistem deteksi serangan brute force, payload mencurigakan, IP ban',
    category: 'sistem',
    iconName: 'ShieldAlert',
  },
  {
    id: 'monitoring_server',
    label: 'Monitoring Server',
    shortDesc: 'Pantauan real-time CPU, RAM, disk usage, dan kesehatan server',
    category: 'sistem',
    iconName: 'Server',
  },
  {
    id: 'monitoring_login',
    label: 'Monitoring Login Pengguna',
    shortDesc: 'Pantauan sesi login aktif, IP address, perangkat, dan riwayat akses',
    category: 'sistem',
    iconName: 'Activity',
  },
  {
    id: 'integrasi_mysql',
    label: 'Integrasi Database MySQL',
    shortDesc: 'Konfigurasi koneksi MySQL, sinkronisasi dua arah, dan skema tabel',
    category: 'sistem',
    iconName: 'Database',
  },
  {
    id: 'database_traffic',
    label: 'Monitoring Trafik DB',
    shortDesc: 'Analisis throughput query baca/tulis dan statistik latensi',
    category: 'sistem',
    iconName: 'Activity',
  },
  {
    id: 'audit_logs',
    label: 'Log Audit & Backup Data',
    shortDesc: 'Rekam jejak aktivitas mutasi data serta cadangan berkas sistem',
    category: 'sistem',
    iconName: 'FileText',
  },
  {
    id: 'live_chat',
    label: 'Live Chat Pengguna & Admin',
    shortDesc: 'Kanal komunikasi pesan langsung internal sekolah',
    category: 'sistem',
    iconName: 'MessageSquare',
  },
  {
    id: 'whatsapp_gateway',
    label: 'WhatsApp Gateway & Notifikasi',
    shortDesc: 'Pengaturan API WhatsApp, OTP otomatis, notifikasi presensi orang tua, dan broadcast massal',
    category: 'sistem',
    iconName: 'Send',
  },

  // 8. Pengaturan Sistem
  {
    id: 'pengaturan_menu',
    label: 'Pengaturan Menu & Tata Letak',
    shortDesc: 'Kustomisasi judul bagian, nama item menu, urutan, serta penempatan posisi navigasi',
    category: 'pengaturan',
    iconName: 'Sliders',
  },
  {
    id: 'pengaturan_admin',
    label: 'Pengaturan Akun Saya',
    shortDesc: 'Pembaruan username, password, dan identitas profil pribadi',
    category: 'pengaturan',
    iconName: 'UserCog',
  },
  {
    id: 'pengaturan_sekolah',
    label: 'Pengaturan Identitas Sekolah',
    shortDesc: 'Nama instansi, logo, kop surat, alamat, dan kepala sekolah',
    category: 'pengaturan',
    iconName: 'School',
  },
  {
    id: 'pengaturan_tema',
    label: 'Pengaturan Tema & Tampilan',
    shortDesc: 'Personalisasi tema warna sidebar, logo header, dan mode gelap',
    category: 'pengaturan',
    iconName: 'Palette',
  },
  {
    id: 'data_demo',
    label: 'Manajemen Data Demo',
    shortDesc: 'Inisialisasi data sampel pengujian sistem dan reset demo',
    category: 'pengaturan',
    iconName: 'Sparkles',
  },
];

export const MENU_CATEGORIES: MenuCategoryInfo[] = [
  {
    key: 'dashboard',
    title: 'Dashboard & Portal',
    description: 'Halaman beranda ringkasan informasi dan portal mandiri',
    iconName: 'PieChart',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'dashboard'),
  },
  {
    key: 'presensi',
    title: 'Presensi & KBM',
    description: 'Aktivitas pencatatan absensi harian dan pembagian kelas ajar',
    iconName: 'ClipboardCheck',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'presensi'),
  },
  {
    key: 'laporan',
    title: 'Laporan & Rekapitulasi Presensi',
    description: 'Rekapitulasi data kehadiran harian, mingguan, dan bulanan',
    iconName: 'CalendarDays',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'laporan'),
  },
  {
    key: 'master',
    title: 'Data Master & KBM',
    description: 'Master induk siswa, guru, mapel, kelas, jurusan, dan jadwal',
    iconName: 'Users',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'master'),
  },
  {
    key: 'kegiatan',
    title: 'Kegiatan & Kesiswaan',
    description: 'Pencatatan pelanggaran, poin kedisiplinan, dan home visit',
    iconName: 'ShieldAlert',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'kegiatan'),
  },
  {
    key: 'qr',
    title: 'QR Code & Kartu Identitas',
    description: 'Pemindai QR kehadiran, kartu digital, dan cetak kartu QR',
    iconName: 'QrCode',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'qr'),
  },
  {
    key: 'sistem',
    title: 'Sistem & Keamanan',
    description: 'Manajemen akun, IDS, monitoring server, audit log, dan integrasi',
    iconName: 'Database',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'sistem'),
  },
  {
    key: 'pengaturan',
    title: 'Pengaturan Sistem',
    description: 'Konfigurasi profil akun, identitas sekolah, tema, dan data demo',
    iconName: 'Sliders',
    items: ALL_MENU_ITEMS.filter((m) => m.category === 'pengaturan'),
  },
];

// All menu IDs for full admin access
export const ALL_MENU_IDS: ViewType[] = ALL_MENU_ITEMS.map((m) => m.id);

// Standard Default System Role Permissions
export const DEFAULT_ROLE_PERMISSIONS: RoleMenuPermission[] = [
  {
    roleId: 'admin',
    roleName: 'Administrator Utama',
    description: 'Akses penuh ke seluruh menu, konfigurasi sistem, dan manajemen keamanan',
    badgeColor: 'blue',
    isSystem: true,
    allowedMenus: ALL_MENU_IDS.filter((id) => id !== 'portal_murid'),
  },
  {
    roleId: 'kesiswaan',
    roleName: 'WKS Kesiswaan & BP BK',
    description: 'Pengawasan presensi siswa, kedisiplinan, catatan pelanggaran, dan home visit',
    badgeColor: 'purple',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'rekap_harian',
      'rekap_mingguan',
      'rekap_bulanan',
      'rekap_ketidakhadiran_tertinggi',
      'master_siswa',
      'master_guru',
      'master_mapel',
      'mapel_kelas_guru',
      'master_kelas',
      'master_jurusan',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'hari_libur',
      'catatan_pelanggaran',
      'home_visit',
      'absen_qr',
      'cetak_kartu_qr',
      'audit_logs',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'kurikulum',
    roleName: 'WKS Kurikulum',
    description: 'Pengelolaan kurikulum, master mata pelajaran, dan jadwal mengajar guru',
    badgeColor: 'amber',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'master_guru',
      'master_mapel',
      'mapel_kelas_guru',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'master_kelas',
      'master_jurusan',
      'hari_libur',
      'catatan_pelanggaran',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'wali',
    roleName: 'Wali Kelas',
    description: 'Pemantauan presensi siswa di kelas binaan, pelanggaran, dan rekapitulasi kehadiran',
    badgeColor: 'emerald',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'rekap_harian',
      'rekap_mingguan',
      'rekap_bulanan',
      'rekap_ketidakhadiran_tertinggi',
      'master_siswa',
      'mapel_kelas_guru',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'catatan_pelanggaran',
      'home_visit',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'guru',
    roleName: 'Guru & Tenaga Pendidik',
    description: 'Melihat jadwal mengajar pribadi, kelas ajar, dan mencatat pelanggaran siswa',
    badgeColor: 'indigo',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'mapel_kelas_guru',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'catatan_pelanggaran',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'staf_jadwal',
    roleName: 'Staf Pengelola Jadwal KBM',
    description: 'Pengaturan teknis alokasi jadwal pelajaran dan plotting jam mengajar',
    badgeColor: 'cyan',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'jadwal_mengajar',
      'jadwal_minggu_ini',
      'jadwal_shift',
      'master_guru',
      'master_mapel',
      'mapel_kelas_guru',
      'master_kelas',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'hubin',
    roleName: 'WKS Hubin & Industri',
    description: 'Pemantauan data siswa, kompetensi jurusan, dan kemitraan industri',
    badgeColor: 'teal',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'master_siswa',
      'master_jurusan',
      'catatan_pelanggaran',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'murid',
    roleName: 'Siswa / Murid',
    description: 'Portal mandiri siswa, scan kehadiran QR, kartu pelajar digital, dan jadwal pelajaran',
    badgeColor: 'rose',
    isSystem: true,
    allowedMenus: [
      'portal_murid',
      'absen_qr',
      'kartu_pelajar',
      'rekap_siswa',
      'jadwal_mengajar',
      'catatan_pelanggaran',
      'live_chat',
    ],
  },
];

/**
 * Normalizes role string (handles aliases like 'user' -> 'guru', 'siswa' -> 'murid')
 */
export function normalizeRoleKey(role?: string): string {
  if (!role) return 'guru';
  const lower = role.trim().toLowerCase();
  if (lower === 'user') return 'guru';
  if (lower === 'siswa') return 'murid';
  return lower;
}

/**
 * Retrieves all registered roles (default system roles + custom roles + configured permissions)
 */
export function getAllRolePermissions(appData?: AppData): RoleMenuPermission[] {
  const customRoles = appData?.customRoles || [];
  const storedPermissions = appData?.rolePermissions || [];

  // Start with default roles, override with stored permissions if any
  const roleMap = new Map<string, RoleMenuPermission>();

  DEFAULT_ROLE_PERMISSIONS.forEach((def) => {
    roleMap.set(def.roleId, { ...def, allowedMenus: [...def.allowedMenus] });
  });

  // Apply stored rolePermissions
  storedPermissions.forEach((stored) => {
    const norm = normalizeRoleKey(stored.roleId);
    const existing = roleMap.get(norm);
    if (existing) {
      roleMap.set(norm, {
        ...existing,
        roleName: stored.roleName || existing.roleName,
        description: stored.description || existing.description,
        badgeColor: stored.badgeColor || existing.badgeColor,
        allowedMenus: Array.isArray(stored.allowedMenus) ? [...stored.allowedMenus] : existing.allowedMenus,
      });
    } else {
      // It's a custom role stored in rolePermissions
      roleMap.set(norm, {
        roleId: stored.roleId,
        roleName: stored.roleName,
        description: stored.description || 'Role kustom pengguna',
        badgeColor: stored.badgeColor || 'indigo',
        isSystem: false,
        allowedMenus: Array.isArray(stored.allowedMenus) ? [...stored.allowedMenus] : ['dashboard', 'live_chat'],
      });
    }
  });

  // Ensure any customRoles in appData.customRoles are registered
  customRoles.forEach((cr) => {
    const norm = normalizeRoleKey(cr.id || cr.name);
    if (!roleMap.has(norm)) {
      roleMap.set(norm, {
        roleId: cr.id || cr.name,
        roleName: cr.label || cr.name,
        description: cr.description || 'Role kustom sekolah',
        badgeColor: cr.color || 'indigo',
        isSystem: false,
        allowedMenus: cr.allowedMenus || ['dashboard', 'live_chat'],
      });
    } else {
      const current = roleMap.get(norm)!;
      // Sync label/color if present in customRoles
      if (cr.label && cr.label !== current.roleName) {
        current.roleName = cr.label;
      }
      if (cr.color && cr.color !== current.badgeColor) {
        current.badgeColor = cr.color;
      }
      if (cr.allowedMenus && !storedPermissions.some((p) => normalizeRoleKey(p.roleId) === norm)) {
        current.allowedMenus = [...cr.allowedMenus];
      }
    }
  });

  return Array.from(roleMap.values());
}

/**
 * Checks whether a role has permission to access and view a given menu ViewType
 */
export function hasMenuAccess(role: string | undefined, view: ViewType, appData?: AppData): boolean {
  if (!role) return false;
  const normalized = normalizeRoleKey(role);

  // Murid specific view fallbacks
  if (normalized === 'murid') {
    if (view === 'portal_murid' || view === 'absen_qr' || view === 'kartu_pelajar' || view === 'rekap_siswa') {
      return true;
    }
  }

  // Safety guard: Administrator always retains access to essential settings and main dashboard so they are never locked out
  const isEssentialAdminView =
    view === 'dashboard' ||
    view === 'pengaturan_admin' ||
    view === 'pengaturan_role' ||
    view === 'pengaturan_menu' ||
    view === 'pengaturan_sekolah';

  // Get effective permission for this role (honors any customizations made in Pengaturan Hak Akses Role)
  const allRoles = getAllRolePermissions(appData);
  const foundRole = allRoles.find((r) => normalizeRoleKey(r.roleId) === normalized);

  if (foundRole && Array.isArray(foundRole.allowedMenus)) {
    if (normalized === 'admin' && isEssentialAdminView) {
      return true;
    }
    return foundRole.allowedMenus.includes(view);
  }

  // Fallback to default system roles if any
  const defaultDef = DEFAULT_ROLE_PERMISSIONS.find((d) => d.roleId === normalized);
  if (defaultDef) {
    if (normalized === 'admin' && isEssentialAdminView) {
      return true;
    }
    return defaultDef.allowedMenus.includes(view);
  }

  // Fallback for admin if not found in permissions
  if (normalized === 'admin') {
    return view !== 'portal_murid';
  }

  // Default fallback for unrecognized non-admin role: can view dashboard
  return view === 'dashboard' || view === 'live_chat';
}

/**
 * Updates permission for a specific role and returns updated AppData
 */
export function updateRolePermissionInAppData(
  appData: AppData,
  roleId: string,
  updatedAllowedMenus: ViewType[],
  roleMeta?: { roleName?: string; description?: string; badgeColor?: string }
): AppData {
  const norm = normalizeRoleKey(roleId);
  const currentRoles = getAllRolePermissions(appData);

  const newPermissions = currentRoles.map((r) => {
    if (normalizeRoleKey(r.roleId) === norm) {
      return {
        ...r,
        roleName: roleMeta?.roleName || r.roleName,
        description: roleMeta?.description || r.description,
        badgeColor: roleMeta?.badgeColor || r.badgeColor,
        allowedMenus: [...updatedAllowedMenus],
      };
    }
    return r;
  });

  // Also sync customRoles if it was a custom role
  const updatedCustomRoles = (appData.customRoles || []).map((cr) => {
    if (normalizeRoleKey(cr.id || cr.name) === norm) {
      return {
        ...cr,
        label: roleMeta?.roleName || cr.label,
        color: roleMeta?.badgeColor || cr.color,
        allowedMenus: [...updatedAllowedMenus],
      };
    }
    return cr;
  });

  return {
    ...appData,
    rolePermissions: newPermissions,
    customRoles: updatedCustomRoles,
  };
}

/**
 * Resets all role permissions back to factory defaults
 */
export function resetRolePermissionsToDefault(appData: AppData): AppData {
  return {
    ...appData,
    rolePermissions: DEFAULT_ROLE_PERMISSIONS.map((d) => ({
      ...d,
      allowedMenus: [...d.allowedMenus],
    })),
  };
}
