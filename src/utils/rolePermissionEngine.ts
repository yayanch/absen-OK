import { AppData, CustomRole, RoleMenuPermission, UserSession, ViewType } from '../types';

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
    id: 'absen_harian_guru',
    label: 'Absen Harian Guru',
    shortDesc: 'Presensi kehadiran harian guru mengajar terintegrasi jadwal KBM dan switcher Shift & Kelompok',
    category: 'presensi',
    iconName: 'UserCheck',
  },
  {
    id: 'broadcast_wa',
    label: 'Tulis Broadcast WA',
    shortDesc: 'Tulis dan kirim pesan broadcast WhatsApp untuk Guru dan Wali Kelas kepada siswa / orang tua',
    category: 'presensi',
    iconName: 'Send',
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
    id: 'rekap_pengisian_kelas',
    label: 'Status Pengisian Presensi',
    shortDesc: 'Rekapitulasi status kelas yang sudah dan belum mengisi absensi hari ini',
    category: 'laporan',
    iconName: 'CheckCircle2',
  },
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
  {
    id: 'ekstrakurikuler',
    label: 'Kegiatan Ekstrakurikuler',
    shortDesc: 'Manajemen klub ekstrakurikuler, keanggotaan siswa, dan presensi kegiatan',
    category: 'kegiatan',
    iconName: 'Sparkles',
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
      'broadcast_wa',
      'rekap_pengisian_kelas',
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
      'ekstrakurikuler',
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
      'presensi_input',
      'absen_harian_guru',
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
      'broadcast_wa',
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
      'broadcast_wa',
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
  {
    roleId: 'piket_kesiswaan',
    roleName: 'Piket Kesiswaan',
    description: 'Petugas piket kesiswaan dengan akses scan/tampil QR presensi, pencatatan pelanggaran, dan edit presensi siswa',
    badgeColor: 'amber',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'broadcast_wa',
      'rekap_pengisian_kelas',
      'catatan_pelanggaran',
      'ekstrakurikuler',
      'absen_qr',
      'rekap_harian',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'piket_guru',
    roleName: 'Piket Guru',
    description: 'Guru piket harian dengan akses scan/tampil QR presensi, pencatatan pelanggaran, dan edit presensi siswa',
    badgeColor: 'orange',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'absen_harian_guru',
      'broadcast_wa',
      'catatan_pelanggaran',
      'ekstrakurikuler',
      'absen_qr',
      'live_chat',
      'pengaturan_admin',
    ],
  },
  {
    roleId: 'piket_kelas',
    roleName: 'Piket Kelas',
    description: 'Petugas piket kelas / sekretaris yang bertugas merekam dan mengisi kehadiran siswa kelas binaannya',
    badgeColor: 'teal',
    isSystem: true,
    allowedMenus: [
      'dashboard',
      'presensi_input',
      'rekap_harian',
      'rekap_siswa',
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
      let allowed = Array.isArray(stored.allowedMenus) ? [...stored.allowedMenus] : existing.allowedMenus;
      
      // Enforce: absen_harian_guru is ONLY for kurikulum, piket_guru, piket, and admin
      const isAllowedAbsenGuru =
        norm === 'kurikulum' ||
        norm === 'admin_kurikulum' ||
        norm === 'piket_guru' ||
        norm === 'piket' ||
        norm === 'admin' ||
        norm === 'superadmin';

      if (!isAllowedAbsenGuru) {
        allowed = allowed.filter((m) => m !== 'absen_harian_guru');
      } else if (!allowed.includes('absen_harian_guru')) {
        const pIdx = allowed.indexOf('presensi_input');
        if (pIdx !== -1) allowed.splice(pIdx + 1, 0, 'absen_harian_guru');
        else allowed.push('absen_harian_guru');
      }

      // Remove rekap_pengisian_kelas and rekap_harian from piket_guru
      if (norm === 'piket_guru' || norm === 'piket') {
        allowed = allowed.filter((m) => m !== 'rekap_pengisian_kelas' && m !== 'rekap_harian');
      }
      roleMap.set(norm, {
        ...existing,
        roleName: stored.roleName || existing.roleName,
        description: stored.description || existing.description,
        badgeColor: stored.badgeColor || existing.badgeColor,
        allowedMenus: allowed,
      });
    } else {
      // It's a custom role stored in rolePermissions
      let customAllowed: ViewType[] = Array.isArray(stored.allowedMenus) ? ([...stored.allowedMenus] as ViewType[]) : ['dashboard', 'live_chat'];
      // Hide absen_harian_guru from custom roles unless explicitly kurikulum/piket_guru
      const isAllowedAbsenGuru =
        norm === 'kurikulum' ||
        norm === 'admin_kurikulum' ||
        norm === 'piket_guru' ||
        norm === 'piket' ||
        norm === 'admin' ||
        norm === 'superadmin';
      if (!isAllowedAbsenGuru) {
        customAllowed = customAllowed.filter((m) => m !== 'absen_harian_guru');
      }

      roleMap.set(norm, {
        roleId: stored.roleId,
        roleName: stored.roleName,
        description: stored.description || 'Role kustom pengguna',
        badgeColor: stored.badgeColor || 'indigo',
        isSystem: false,
        allowedMenus: customAllowed,
      });
    }
  });

  // Ensure any customRoles in appData.customRoles are registered
  customRoles.forEach((cr) => {
    const norm = normalizeRoleKey(cr.id || cr.name);
    const isAllowedAbsenGuru =
      norm === 'kurikulum' ||
      norm === 'admin_kurikulum' ||
      norm === 'piket_guru' ||
      norm === 'piket' ||
      norm === 'admin' ||
      norm === 'superadmin';

    if (!roleMap.has(norm)) {
      let customAllowed: ViewType[] = cr.allowedMenus ? ([...cr.allowedMenus] as ViewType[]) : ['dashboard', 'live_chat'];
      if (!isAllowedAbsenGuru) {
        customAllowed = customAllowed.filter((m) => m !== 'absen_harian_guru');
      }

      roleMap.set(norm, {
        roleId: cr.id || cr.name,
        roleName: cr.label || cr.name,
        description: cr.description || 'Role kustom sekolah',
        badgeColor: cr.color || 'indigo',
        isSystem: false,
        allowedMenus: customAllowed,
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
        let customAllowed: ViewType[] = [...cr.allowedMenus] as ViewType[];
        if (!isAllowedAbsenGuru) {
          customAllowed = customAllowed.filter((m) => m !== 'absen_harian_guru');
        }
        current.allowedMenus = customAllowed;
      }
    }
  });

  return Array.from(roleMap.values());
}

/**
 * Internal single role permission evaluator
 */
function checkSingleRoleMenuAccess(role: string, view: ViewType, appData?: AppData): boolean {
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
 * Checks whether a role or set of roles has permission to access and view a given menu ViewType.
 * Supports single role string, array of roles, or primary role + additionalRoles.
 */
export function hasMenuAccess(
  role: string | string[] | undefined,
  view: ViewType,
  appData?: AppData,
  additionalRoles?: string[]
): boolean {
  if (!role && (!additionalRoles || additionalRoles.length === 0)) return false;

  const rolesToCheck: string[] = [];
  if (Array.isArray(role)) {
    rolesToCheck.push(...role);
  } else if (typeof role === 'string' && role.trim()) {
    rolesToCheck.push(role);
  }
  if (Array.isArray(additionalRoles)) {
    rolesToCheck.push(...additionalRoles);
  }

  if (rolesToCheck.length === 0) return false;

  // If any assigned role has access to this view, grant access
  return rolesToCheck.some((singleRole) => checkSingleRoleMenuAccess(singleRole, view, appData));
}

// Alias export for convenience
export const isMenuAllowed = hasMenuAccess;

/**
 * Returns role display name, color badge class, and description for any standard or custom role.
 */
export function getRoleBadgeMeta(
  roleId?: string,
  appData?: AppData
): { label: string; color: string; badgeClass: string; isCustom: boolean } {
  if (!roleId) {
    return {
      label: 'Guru Pengampu',
      color: 'indigo',
      badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
      isCustom: false,
    };
  }

  const normalized = normalizeRoleKey(roleId);
  const allRoles = getAllRolePermissions(appData);
  const matched = allRoles.find((r) => normalizeRoleKey(r.roleId) === normalized);

  const roleName = matched?.roleName || (
    normalized === 'admin' ? 'Administrator' :
    normalized === 'kesiswaan' ? 'WKS Kesiswaan / BP BK' :
    normalized === 'kurikulum' ? 'WKS Kurikulum' :
    normalized === 'staf_jadwal' ? 'Staf Pengelola Jadwal' :
    normalized === 'hubin' ? 'WKS Hubin & Humas' :
    normalized === 'wali' ? 'Wali Kelas' :
    normalized === 'guru' ? 'Guru Pengampu' :
    normalized === 'murid' ? 'Siswa / Murid' :
    roleId
  );

  const color = matched?.badgeColor || (
    normalized === 'admin' ? 'blue' :
    normalized === 'kesiswaan' ? 'purple' :
    normalized === 'kurikulum' ? 'amber' :
    normalized === 'wali' ? 'emerald' :
    normalized === 'staf_jadwal' ? 'cyan' :
    normalized === 'hubin' ? 'teal' :
    normalized === 'murid' ? 'rose' :
    'indigo'
  );

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800',
    amber: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
    cyan: 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/80 dark:text-cyan-300 dark:border-cyan-800',
    teal: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/80 dark:text-teal-300 dark:border-teal-800',
    rose: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-indigo-800',
  };

  const badgeClass = colorClasses[color] || colorClasses.indigo;
  const isCustom = !matched?.isSystem && !['admin', 'kesiswaan', 'kurikulum', 'wali', 'guru', 'staf_jadwal', 'hubin', 'murid'].includes(normalized);

  return {
    label: roleName,
    color,
    badgeClass,
    isCustom,
  };
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

/**
 * Maps a duty / job title string to its corresponding system or custom role key
 */
export function mapDutyToRole(duty: string, customRoles?: CustomRole[]): string | null {
  if (!duty || typeof duty !== 'string') return null;
  const d = duty.trim().toLowerCase();

  if (d.includes('wali kelas') || d === 'wali') return 'wali';
  if (d.includes('kesiswaan') || d.includes('bp bk') || d.includes('bimbingan konseling')) return 'kesiswaan';
  if (d.includes('kurikulum')) return 'kurikulum';
  if (d.includes('hubin') || d.includes('hubungan industri') || d.includes('humas')) return 'hubin';
  if (d.includes('staf jadwal') || d.includes('pengelola jadwal') || d.includes('jadwal kbm')) return 'staf_jadwal';
  if (d.includes('administrator') || d === 'admin') return 'admin';

  // Check custom roles matching name or label
  if (Array.isArray(customRoles)) {
    const matchedCustom = customRoles.find(
      (cr) =>
        cr.name?.toLowerCase() === d ||
        cr.label?.toLowerCase() === d ||
        cr.id?.toLowerCase() === d
    );
    if (matchedCustom) return matchedCustom.id || matchedCustom.name;
  }

  return null;
}

/**
 * Maps an array of duties to unique role strings
 */
export function mapDutiesToRoles(duties: string[], customRoles?: CustomRole[]): string[] {
  if (!Array.isArray(duties)) return [];
  const roles = new Set<string>();
  duties.forEach((d) => {
    const r = mapDutyToRole(d, customRoles);
    if (r) roles.add(normalizeRoleKey(r));
  });
  return Array.from(roles);
}

export interface ReconciledRolesResult {
  primaryRole: string;
  additionalRoles: string[];
  roles: string[];
  isWaliActive: boolean;
}

/**
 * Reconciles primary role, additional roles, and duties into a unified role state
 */
export function reconcileRolesAndDuties(
  primaryRole: string = 'guru',
  additionalRoles: string[] = [],
  duties: string[] = [],
  appData?: AppData,
  currentGuruId?: string
): ReconciledRolesResult {
  const normPrimary = normalizeRoleKey(primaryRole || 'guru');
  const customRoles = appData?.customRoles;

  const dutyRoles = mapDutiesToRoles(duties, customRoles);
  const normalizedAdditional = (additionalRoles || []).map(normalizeRoleKey);

  // Combine duty-derived roles and additionalRoles
  const combinedAddSet = new Set<string>();
  dutyRoles.forEach((r) => {
    if (r !== normPrimary) combinedAddSet.add(r);
  });
  normalizedAdditional.forEach((r) => {
    if (r !== normPrimary) combinedAddSet.add(r);
  });

  const finalAdditionalRoles = Array.from(combinedAddSet);
  const allRoles = Array.from(new Set([normPrimary, ...finalAdditionalRoles]));

  const isWaliByRole = allRoles.includes('wali');
  const isWaliByDuty = duties.some((d) => d.toLowerCase().includes('wali'));
  const isWaliByClass = Boolean(
    currentGuruId && appData?.kelas?.some((k) => k.waliKelasId === currentGuruId)
  );
  const isWaliActive = isWaliByRole || isWaliByDuty || isWaliByClass;

  return {
    primaryRole: normPrimary,
    additionalRoles: finalAdditionalRoles,
    roles: allRoles,
    isWaliActive,
  };
}

/**
 * Resolves all effective roles for a current user session considering primary role,
 * multi-role arrays, duties, and data bindings.
 */
export function getEffectiveUserRoles(
  currentUser?: UserSession | null,
  appData?: AppData
): string[] {
  if (!currentUser) return ['guru'];

  const rolesSet = new Set<string>();

  // 1. Primary role on session
  if (currentUser.role) {
    rolesSet.add(normalizeRoleKey(currentUser.role));
  }

  // 2. Roles array on session
  if (Array.isArray(currentUser.roles)) {
    currentUser.roles.forEach((r) => {
      if (r) rolesSet.add(normalizeRoleKey(r));
    });
  }

  // 3. User data attributes
  const userData = currentUser.data as any;
  if (userData) {
    if (userData.role) {
      rolesSet.add(normalizeRoleKey(userData.role));
    }
    if (Array.isArray(userData.roles)) {
      userData.roles.forEach((r: string) => {
        if (r) rolesSet.add(normalizeRoleKey(r));
      });
    }
    if (Array.isArray(userData.additionalRoles)) {
      userData.additionalRoles.forEach((r: string) => {
        if (r) rolesSet.add(normalizeRoleKey(r));
      });
    }

    // Tugas tambahan on userData
    const userDuties: string[] = [];
    if (Array.isArray(userData.tugasTambahanList)) {
      userDuties.push(...userData.tugasTambahanList);
    }
    if (typeof userData.tugasTambahan === 'string') {
      userDuties.push(...userData.tugasTambahan.split(',').map((s: string) => s.trim()));
    }
    if (userDuties.length > 0) {
      mapDutiesToRoles(userDuties, appData?.customRoles).forEach((r) => rolesSet.add(r));
    }

    // 4. If matched in appData.waliKelas by ID, username, or NIP
    if (appData?.waliKelas && Array.isArray(appData.waliKelas)) {
      const matchedGuru = appData.waliKelas.find(
        (w) =>
          (userData.id && w.id === userData.id) ||
          (userData.username && w.username?.toLowerCase() === userData.username?.toLowerCase()) ||
          (userData.nip && w.nip && w.nip === userData.nip)
      );

      if (matchedGuru) {
        if (matchedGuru.role) rolesSet.add(normalizeRoleKey(matchedGuru.role));
        if (Array.isArray(matchedGuru.roles)) {
          matchedGuru.roles.forEach((r) => rolesSet.add(normalizeRoleKey(r)));
        }
        if (Array.isArray(matchedGuru.additionalRoles)) {
          matchedGuru.additionalRoles.forEach((r) => rolesSet.add(normalizeRoleKey(r)));
        }
        const guruDuties: string[] = [];
        if (Array.isArray(matchedGuru.tugasTambahanList)) {
          guruDuties.push(...matchedGuru.tugasTambahanList);
        }
        if (typeof matchedGuru.tugasTambahan === 'string') {
          guruDuties.push(...matchedGuru.tugasTambahan.split(',').map((s: string) => s.trim()));
        }
        if (guruDuties.length > 0) {
          mapDutiesToRoles(guruDuties, appData.customRoles).forEach((r) => rolesSet.add(r));
        }
        if (appData.kelas?.some((k) => k.waliKelasId === matchedGuru.id)) {
          rolesSet.add('wali');
        }
      }
    }

    // 5. If user is assigned as wali in any class
    if (userData.id && appData?.kelas?.some((k) => k.waliKelasId === userData.id)) {
      rolesSet.add('wali');
    }
  }

  // Ensure murid role is isolated if student
  if (rolesSet.has('murid') || rolesSet.has('siswa')) {
    return ['murid'];
  }

  const result = Array.from(rolesSet).filter(Boolean);
  return result.length > 0 ? result : ['guru'];
}

