export type PresensiStatus = 'H' | 'I' | 'S' | 'A' | 'K' | 'D' | 'TAP' | '';

export type SidebarThemeOption = 'royal' | 'navy' | 'sky' | 'denim' | 'slate';

export type PageHeaderBackgroundOption = 'white' | 'royal' | 'deep_blue' | 'indigo' | 'slate' | 'soft_blue' | 'gradient_royal';

export type ThemeOption = 'school_blue' | 'professional' | 'ocean' | 'emerald' | 'warm' | 'amethyst' | 'violet' | 'crimson' | 'indigo' | 'slate' | 'pastel_blue' | 'pastel_mint' | 'pastel_peach' | 'pastel_lavender';

export type FontThemeOption = 'modern' | 'inter' | 'poppins' | 'lexend' | 'lora' | 'mono' | 'roboto' | 'montserrat' | 'opensans' | 'lato' | 'oswald' | 'raleway' | 'playfair' | 'nunito' | 'ubuntu' | 'quicksand';

export type LoginCardStyleOption = 'classic' | 'glass' | 'minimal' | 'vibrant' | 'cyber' | 'neumorphic' | 'fullscreen';

export interface SekolahConfig {
  nama: string;
  npsn?: string;
  alamat: string;
  website?: string;
  email?: string;
  telepon?: string;
  tahunAjaran: string;
  semester?: string;
  tanggalMulai: string;
  tanggalAkhir?: string;
  jamMasukMulai?: string;
  jamMasukSelesai?: string;
  jamPulang?: string;
  isJamMasukActive?: boolean;
  logo: string;
  favicon?: string;
  namaKepalaSekolah?: string;
  nipKepalaSekolah?: string;
  theme?: ThemeOption;
  themeMode?: 'light' | 'dark' | 'system';
  themePreset?: ThemeOption;
  sidebarTheme?: SidebarThemeOption;
  pageHeaderBackground?: PageHeaderBackgroundOption;
  pageTitleColor?: any;
  primaryColor?: string;
  density?: 'compact' | 'comfortable' | 'spacious';
  componentRadius?: 'standard' | 'rounded' | 'soft';
  shadowStyle?: 'minimal' | 'default' | 'elevated';
  sidebarBehavior?: 'expanded' | 'collapsed';
  dashboardStyle?: 'standard' | 'analytics' | 'compact';
  enableAnimations?: boolean;
  fontTheme?: FontThemeOption;
  sidebarBgImage?: string;
  sidebarBgImageOpacity?: number;
  sidebarBgImageFit?: 'cover' | 'contain' | 'tile';
  sidebarBgImagePosition?: string;
  sidebarBgImageBlendMode?: string;
  bgImage?: string;
  bgImageOpacity?: number;
  bgImageBlendMode?: string;
  loginBgImage?: string;
  loginBgOpacity?: number;
  loginBgType?: 'default' | 'image' | 'gradient' | 'pattern' | 'color';
  loginBgBlur?: 'none' | 'sm' | 'md' | 'lg';
  loginBgGradient?: string;
  loginBgPattern?: string;
  loginBgColor?: string;
  loginBgOverlayColor?: string;
  loginBgOverlayOpacity?: number;
  loginBgFit?: 'cover' | 'contain' | 'tile';
  loginCardOpacity?: number; // 0 - 100 (%)
  loginCardBlur?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  loginLeftBadgeText?: string;
  loginLeftTitlePrefix?: string;
  loginLeftTitleHighlight?: string;
  loginLeftDescription?: string;
  loginLeftFeature1Title?: string;
  loginLeftFeature1Subtitle?: string;
  loginLeftFeature2Title?: string;
  loginLeftFeature2Subtitle?: string;
  loginLeftShowPanel?: boolean;
  footerTeks?: string;
  footerSubTeks?: string;
  appVersion?: string;
  showAppVersion?: boolean;
  showFooter?: boolean;
  enableLiveChat?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  browserTitle?: string;
  
  // Pengumuman & Running Text Config
  enableRunningText?: boolean;
  runningTextAnnouncement?: string;
  runningTextSpeed?: 'slow' | 'normal' | 'fast';
  loginAnnouncementModal?: boolean;
  loginAnnouncementTitle?: string;
  loginAnnouncementText?: string;
  loginAnnouncementType?: 'info' | 'penting' | 'peringatan' | 'kegiatan';

  // Offline Mode & Synchronization Config
  enableOfflineMode?: boolean; // Mengaktifkan atau menonaktifkan fitur mode offline
  allowOfflineBypass?: boolean; // Izinkan pengguna melanjutkan akses saat offline
  showOfflineToastWarning?: boolean; // Tampilkan pop-up peringatan ketika jaringan terputus
  autoSyncOnReconnect?: boolean; // Otomatis trigger sinkronisasi data saat online kembali
  offlineNoticeMessage?: string; // Pesan informasi kustom pada tampilan offline

  // Tautan Kustom Halaman Login
  loginCustomLinks?: LoginCustomLink[];
  loginCustomLinksDisplayMode?: 'dropdown' | 'inline';
  loginCustomLinksTitle?: string;
}

export interface LoginCustomLink {
  id: string;
  label: string;
  url: string;
  description?: string;
  iconName?: 'Globe' | 'HelpCircle' | 'BookOpen' | 'Phone' | 'ExternalLink' | 'FileText' | 'Shield' | 'School' | 'Sparkles' | 'Mail';
  openInNewTab?: boolean;
}

export type WhatsAppProvider = 'fonnte' | 'wablas' | 'starsender' | 'twilio' | 'custom_webhook';

export interface WhatsAppGatewayConfig {
  enabled: boolean;
  provider: WhatsAppProvider;
  apiKey: string;
  senderNumber?: string;
  domainUrl?: string; // For Wablas / Starsender
  webhookUrl?: string; // For Custom Webhook
  accountSid?: string; // For Twilio
  authToken?: string; // For Twilio

  // Feature Toggles
  sendOtpEnabled: boolean;
  sendPresensiMasukEnabled: boolean;
  sendPresensiPulangEnabled: boolean;
  sendPresensiTerlambatEnabled: boolean;
  sendKetidakhadiranEnabled: boolean;

  // Target Recipients
  sendToStudent: boolean;
  sendToParent: boolean;

  // Custom Message Templates
  templateOtp?: string;
  templatePresensiMasuk?: string;
  templatePresensiPulang?: string;
  templatePresensiTerlambat?: string;
  templateKetidakhadiran?: string;
  templateBroadcast?: string;
}

export interface WhatsAppLog {
  id: string;
  timestamp: string;
  recipientPhone: string;
  recipientName: string;
  messageType: 'otp' | 'presensi_masuk' | 'presensi_pulang' | 'terlambat' | 'alpa' | 'broadcast' | 'test';
  messageText: string;
  status: 'success' | 'failed' | 'pending';
  provider: string;
  responseMessage?: string;
}

export interface PengumumanSekolah {
  id: string;
  judul: string;
  isi: string;
  tanggal: string;
  kategori: 'info' | 'penting' | 'peringatan' | 'kegiatan';
  target: 'semua' | 'guru' | 'siswa' | 'wali_kelas';
  aktif: boolean;
  pinToRunningText?: boolean;
  pinToLoginBanner?: boolean;
  pinToDashboard?: boolean;
  penulis?: string;
  linkUrl?: string;
  linkText?: string;
  createdAt?: string;
}

export interface AdminAccount {
  username: string;
  password: string;
  nama: string;
  foto: string;
  roles?: string[];
}

export interface KesiswaanAccount {
  username: string;
  password: string;
  nama: string;
  jabatan: string;
  foto?: string;
  noHp?: string;
  roles?: string[];
}

export interface KurikulumAccount {
  username: string;
  password: string;
  nama: string;
  jabatan?: string;
  foto?: string;
  noHp?: string;
  roles?: string[];
}

export interface StafJadwalAccount {
  username: string;
  password: string;
  nama: string;
  nip?: string;
  jabatan?: string;
  foto?: string;
  noHp?: string;
  roles?: string[];
}

export interface UserBiasaAccount {
  username: string;
  password: string;
  nama: string;
  jabatan?: string;
  foto?: string;
  mataPelajaran?: string;
  hariMengajar?: string[]; // ['Senin', 'Rabu', 'Jumat']
  batasiLoginHariMengajar?: boolean;
  roles?: string[];
}

export interface Jurusan {
  id: string;
  kode: string;
  nama: string;
}

export interface WaliKelas {
  id: string;
  nip: string;
  nama: string;
  nuptk?: string;
  jenisKelamin?: 'L' | 'P' | string;
  tempatLahir?: string;
  tanggalLahir?: string;
  nik?: string;
  agamaId?: string;
  alamat?: string;
  rt?: string;
  rw?: string;
  desaKelurahan?: string;
  kecamatan?: string;
  kota?: string;
  kodeWilayah?: string;
  kodePos?: string;
  noHp: string;
  email?: string;
  // Legacy / System login fields
  username: string;
  password: string;
  role?: UserRole;
  roles?: string[];
  additionalRoles?: UserRole[]; // e.g. ['wali', 'kesiswaan', 'custom_osis']
  tugasTambahan?: string; // e.g. 'Wali Kelas', 'WKS Kurikulum', 'WKS Kesiswaan', 'WKS Hubin', 'Guru Mapel'
  tugasTambahanList?: string[]; // e.g. ['Wali Kelas', 'WKS Kurikulum', 'Kepala Lab']
  foto?: string;
  jabatan?: string;
  mataPelajaran?: string;
  hariMengajar?: string[]; // e.g. ['Senin', 'Rabu', 'Jumat']
  batasiLoginHariMengajar?: boolean;
  mapelAjar?: GuruMapelKelasItem[];
}

export interface Kelas {
  id: string;
  nama: string;
  jurusanId: string;
  waliKelasId: string;
  piketPassword?: string;
}

export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  gender: 'L' | 'P';
  kelasId: string;
  status?: 'aktif' | 'tidak_aktif';
  noWa?: string;
  namaOrangTua?: string;
  noWaOrangTua?: string;
  username?: string;
  password?: string;
  foto?: string;
  alamat?: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  email?: string;
  deviceId?: string;
  deviceInfo?: string;
  deviceLockedAt?: string;
  isDeviceLocked?: boolean;
  roles?: string[];
}

export interface SiswaPresensiItem {
  siswaId: string;
  status: PresensiStatus;
  time?: string;
  pulangTime?: string;
  pulangStatus?: 'H' | 'TAP' | '';
  suratBukti?: string; // Base64 image / document string for Surat Sakit, Izin, Dispen, or Ketidakhadiran
  catatan?: string;
  sumberPresensi?: 'Online' | 'Manual' | 'QR Scan' | 'Sistem';
  isOverridden?: boolean;
  overriddenBy?: string;
}

// Map key: `${YYYY-MM-DD}_${kelasId}` -> array of SiswaPresensiItem
export type PresensiMap = Record<string, SiswaPresensiItem[]>;

export interface HomeVisit {
  id: string;
  tanggal: string;
  siswaId: string;
  kelasId: string;
  petugas: string;
  alasan: string;
  catatan: string;
  hasil: string;
  tindakLanjut: string;
  foto?: string;
  status?: 'selesai' | 'proses' | 'perlu_followup';
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  senderRole: UserRole;
  senderUsername: string;
  senderNama: string;
  senderFoto?: string;
  recipientUsername: string; // 'admin' or specific user's username or 'all'
  text: string;
  image?: string;
  timestamp: string;
  isRead: boolean;
  status?: 'pending' | 'sent' | 'read'; // 'pending' (Ceklis 1), 'sent' (Ceklis 2), 'read' (Ceklis 2 biru)
  isBot?: boolean;
  deletedFor?: string[]; // List of usernames who deleted this message for themselves ("Hapus untuk Saya")
  isDeletedForEveryone?: boolean; // True if message was recalled/deleted for everyone
}

export interface CustomRole {
  id: string;
  name: string;
  label: string;
  color?: string;
  description?: string;
  allowedMenus?: ViewType[];
  isSystem?: boolean;
}

export interface RoleMenuPermission {
  roleId: string;
  roleName: string;
  description?: string;
  badgeColor?: string;
  isSystem?: boolean;
  allowedMenus: ViewType[];
}

export type PelanggaranKategori = 'ringan' | 'sedang' | 'berat' | 'kriminal';

export interface ViolationTemplate {
  id: string;
  name: string;
  kategori: PelanggaranKategori;
  poin: number;
  tindakan: string;
}

export interface Pelanggaran {
  id: string;
  tanggal: string; // YYYY-MM-DD
  siswaId: string;
  kelasId: string;
  kategori: PelanggaranKategori;
  namaPelanggaran: string;
  poin: number;
  keterangan: string;
  pelapor: string;
  tindakan: string;
  status: 'proses' | 'selesai' | 'perlu_tindak_lanjut';
  foto?: string;
  createdAt?: string;
}

export interface HariLibur {
  id: string;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  jenis: 'nasional' | 'sekolah' | 'tanpa_presensi';
}

export interface SecurityIncident {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string; // Indonesian formatted date/time
  type:
    | 'brute_force_login'
    | 'account_lockout'
    | 'suspicious_payload'
    | 'unauthorized_route_access'
    | 'anomaly_access_time'
    | 'ip_rate_limit_exceeded'
    | 'session_tampering'
    | 'credential_stuffing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  targetUsername?: string;
  targetRole?: string;
  ipAddress: string;
  userAgent?: string;
  payloadSnippet?: string;
  status: 'active' | 'blocked' | 'investigated' | 'resolved' | 'whitelisted';
  actionTaken: 'none' | 'rate_limited' | 'account_locked' | 'ip_banned' | 'request_dropped';
  locationEstimate?: string;
}

export interface BlockedIp {
  id: string;
  ip: string;
  reason: string;
  blockedAt: string;
  expiresAt?: string; // null for permanent
  blockedBy: string; // 'ids_auto' or username
  threatCount: number;
}

export interface LockedAccount {
  username: string;
  lockedAt: string;
  unlocksAt: string;
  failedAttempts: number;
  reason: string;
  lastIp: string;
}

export interface SecurityConfig {
  idsEnabled: boolean;
  maxFailedLoginAttempts: number; // default 5
  lockoutDurationMinutes: number; // default 15
  autoBanMaliciousIps: boolean;
  strictWafInspection: boolean; // SQLi/XSS inspection
  nightAnomalyAlertEnabled: boolean; // Flag login between 23:00 - 05:00
  notificationPopupOnCritical: boolean;
  ipWhitelist?: string[];
  usernameWhitelist?: string[];
}

export type LoginStatus =
  | 'success'
  | 'failed_password'
  | 'user_not_found'
  | 'account_locked'
  | 'ip_blocked'
  | 'waf_rejected'
  | 'anomaly_time'
  | 'session_terminated';

export interface UserLoginLog {
  id: string;
  timestamp: string; // ISO string
  formattedTime: string; // e.g. "23 Sep 2026, 07:15:22"
  username: string;
  nama: string;
  role: string; // 'admin' | 'guru' | 'wali' | 'murid' | 'kesiswaan' | 'kurikulum' | 'staf_jadwal' | 'hubin' | 'unknown'
  status: LoginStatus;
  statusLabel: string;
  ipAddress: string;
  location?: string;
  device: string;
  browser: string;
  userAgent: string;
  failureReason?: string;
  sessionId?: string;
  sessionDurationSeconds?: number;
}

export interface ActiveUserSession {
  id: string;
  username: string;
  nama: string;
  role: string;
  loginAt: string;
  lastActiveAt: string;
  formattedLoginTime: string;
  ipAddress: string;
  location?: string;
  device: string;
  browser: string;
  userAgent: string;
  isCurrent?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO string / Indonesian Date string
  role: string;      // admin, kesiswaan, dll.
  username: string;
  nama: string;
  aksi: string;      // e.g., 'Tambah Jurusan', 'Hapus Siswa'
  detail: string;    // Deskrpisi perubahan detail
  ipAddress?: string;
}

export type BackupFrequency = 'daily' | 'weekly' | 'monthly' | 'all';

export interface BackupScheduleConfig {
  autoBackupEnabled: boolean;
  frequency: BackupFrequency;
  dailyTime: string; // e.g. "23:00"
  weeklyDay: number; // 0 = Minggu, 1 = Senin, ... 6 = Sabtu
  weeklyTime: string; // e.g. "22:00"
  monthlyDay: number; // 1 - 31 (default 1)
  monthlyTime: string; // e.g. "23:00"
  retentionDaily: number; // max daily backups kept (default 7)
  retentionWeekly: number; // max weekly backups kept (default 4)
  retentionMonthly: number; // max monthly backups kept (default 12)
  includePresensiOnlyInDaily?: boolean;
  lastDailyBackup?: string;
  lastWeeklyBackup?: string;
  lastMonthlyBackup?: string;
  lastManualBackup?: string;
}

export interface NavigationSectionConfig {
  id: string; // e.g. 'dashboard', 'presensi', 'laporan', 'master', 'kegiatan', 'qr', 'sistem', 'pengaturan', or custom string
  title: string; // Displayed title of the section, e.g. "DASHBOARD", "PRESENSI & KBM"
  iconName?: string;
  order: number;
  visible?: boolean;
  isAccordion?: boolean;
  menuIds: ViewType[]; // Ordered list of views inside this section
  isCustom?: boolean;
  description?: string;
}

export interface NavigationMenuItemOverride {
  id: ViewType;
  customLabel?: string;
  customIcon?: string;
  sectionId?: string; // which section it currently belongs to
  visible?: boolean;
  order?: number;
}

export interface NavigationLayoutConfig {
  sections: NavigationSectionConfig[];
  itemOverrides?: Record<string, NavigationMenuItemOverride>;
  updatedAt?: string;
  version?: number;
}

export interface AppData {
  sekolah: SekolahConfig;
  admin: AdminAccount;
  kesiswaan?: KesiswaanAccount;
  kurikulum?: KurikulumAccount;
  stafJadwal?: StafJadwalAccount;
  userBiasa?: UserBiasaAccount;
  gsheetUrl?: string;
  spreadsheetId?: string;
  auditLogs?: AuditLog[];
  jurusan: Jurusan[];
  waliKelas: WaliKelas[];
  kelas: Kelas[];
  siswa: Siswa[];
  presensi: PresensiMap;
  homeVisits?: HomeVisit[];
  pelanggaran?: Pelanggaran[];
  deletedHomeVisitIds?: string[];
  deletedPelanggaranIds?: string[];
  deletedSiswaIds?: string[];
  violationTemplates?: ViolationTemplate[];
  chatMessages?: ChatMessage[];
  enableLiveChat?: boolean;
  customRoles?: CustomRole[];
  rolePermissions?: RoleMenuPermission[];
  navigationLayout?: NavigationLayoutConfig;
  hariLibur?: HariLibur[];
  shiftConfig?: ShiftConfig;
  jadwalMengajar?: JadwalMengajarGuru[];
  mataPelajaran?: MataPelajaran[];
  guruMapelKelas?: GuruMapelKelasItem[];
  presensiMengajarGuru?: AbsensiMengajarGuruItem[];
  presensiGuru?: Record<string, GuruPresensiItem[]>;
  pengumuman?: PengumumanSekolah[];
  securityIncidents?: SecurityIncident[];
  blockedIps?: BlockedIp[];
  lockedAccounts?: LockedAccount[];
  securityConfig?: SecurityConfig;
  backupConfig?: BackupScheduleConfig;
  userLoginLogs?: UserLoginLog[];
  activeUserSessions?: ActiveUserSession[];
  whatsappGateway?: WhatsAppGatewayConfig;
  whatsappLogs?: WhatsAppLog[];
  ekstrakurikuler?: Ekstrakurikuler[];
  anggotaEkskul?: AnggotaEkskul[];
  presensiEkskul?: Record<string, PresensiEkskulItem[]>;
  petugasPiket?: PetugasPiket[];
  catatanPiketHarian?: CatatanPiketHarian[];
}

export interface PetugasPiket {
  id: string;
  nama: string;
  tipe: 'piket_guru' | 'piket_kesiswaan';
  nip?: string;
  noHp?: string;
  hariPiket: string[]; // e.g. ['Senin', 'Rabu', 'Jumat']
  shiftPiket?: 'Pagi' | 'Siang' | 'Semua';
  username: string;
  password?: string;
  foto?: string;
  keterangan?: string;
  status?: 'aktif' | 'nonaktif';
  createdAt?: string;
  updatedAt?: string;
}

export interface CatatanPiketHarian {
  id: string;
  tanggal: string; // YYYY-MM-DD
  hari: string;
  shift: 'Pagi' | 'Siang';
  petugasNama: string;
  petugasUsername: string;
  tipePiket: 'piket_guru' | 'piket_kesiswaan';
  kejadian: string;
  tindakan?: string;
  siswaTerlibat?: string[];
  status: 'selesai' | 'tindak_lanjut' | 'info';
  createdAt: string;
}

export interface Ekstrakurikuler {
  id: string;
  nama: string;
  pembinaId: string; // ID dari waliKelas/guru
  pembinaNama?: string;
  jadwalHari?: string; // e.g. 'Sabtu'
  jamMulai?: string; // e.g. '14:00'
  jamSelesai?: string; // e.g. '16:00'
  tempat?: string; // e.g. 'Lapangan Utama'
  deskripsi?: string;
}

export interface AnggotaEkskul {
  id: string;
  ekskulId: string;
  siswaId: string;
  tanggalBergabung: string; // YYYY-MM-DD
}

export interface PresensiEkskulItem {
  siswaId: string;
  status: 'H' | 'S' | 'I' | 'A' | ''; // Hadir, Sakit, Izin, Alpha
  catatan?: string;
  time?: string;
}

export interface SiswaPresensiSesiGuru {
  siswaId: string;
  siswaNama: string;
  status: 'H' | 'S' | 'I' | 'A' | 'T' | 'K' | 'D' | ''; // Hadir, Sakit, Izin, Alpha, Terlambat, Kesiangan, Dispensasi, atau Kosong
  catatan?: string;
  suratBukti?: string; // Base64 image / document string for Surat Sakit, Izin, Dispen
}

export interface AbsensiMengajarGuruItem {
  id: string;
  jadwalId?: string;
  guruUsername: string;
  guruNama: string;
  tanggal: string; // YYYY-MM-DD
  hari: string; // 'Senin', 'Selasa', dll.
  kelasId: string;
  kelasNama: string;
  mataPelajaran: string;
  materiAjar?: string; // Jurnal mengajar / Topik bahasan
  jamPelajaran?: string; // misal "07.30 - 09.30" atau "Jam ke-1 s.d 3"
  presensiSiswa: SiswaPresensiSesiGuru[];
  catatanGuru?: string;
  createdAt: string;
}

export interface GuruPresensiItem {
  id: string;
  guruId: string;
  guruUsername?: string;
  guruNama: string;
  guruNip?: string;
  tanggal: string; // YYYY-MM-DD
  hari: string; // e.g. 'Senin', 'Selasa'
  status: 'H' | 'S' | 'I' | 'A' | 'D' | 'T' | ''; // Hadir, Sakit, Izin, Alpha, Dinas Luar, Terlambat
  jamMasuk?: string;
  jamPulang?: string;
  catatan?: string;
  jadwalHariIni?: string;
  sumberPresensi?: 'Online' | 'Manual' | 'QR Scan' | 'Sistem';
  isOverridden?: boolean;
  overriddenBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface MataPelajaran {
  id: string;
  kode: string; // e.g. "MP-001", "MAT-X", "RPL-PW"
  nama: string; // e.g. "Pemrograman Web"
  kategori?: 'Kelompok A (Nasional)' | 'Kelompok B (Kewilayahan)' | 'Kelompok C (Kejuruan/Peminatan)' | 'Muatan Lokal' | 'Bimbingan Konseling' | 'Umum';
  tingkat?: 'Semua Tingkat' | 'X' | 'XI' | 'XII';
  jurusanId?: string; // Opsional jika khusus jurusan tertentu
  jurusanNama?: string;
  alokasiJp?: number; // Jumlah Jam Pelajaran per minggu, misal 4 JP
  kkm?: number; // Kriteria Ketuntasan Minimal, misal 75
  deskripsi?: string;
}

export interface GuruMapelKelasItem {
  id: string; // Unique id, e.g. "GMK-001"
  guruId: string; // ID dari waliKelas / guru pengampu
  guruUsername?: string;
  guruNama?: string;
  guruNip?: string;
  kodeMapel: string; // e.g. "MAT-WJB", "RPL-PWPB"
  namaMapel: string; // e.g. "Matematika Wajib", "Pemrograman Web"
  kategori?: string; // 'Kelompok A (Nasional)', 'Kelompok B', 'Kelompok C', 'Muatan Lokal', dll.
  tingkat?: string; // 'Semua Tingkat' | 'X' | 'XI' | 'XII'
  alokasiJp?: number; // Jumlah jam pelajaran / minggu (misal 4 JP)
  kkm?: number; // KKM mata pelajaran (misal 75)
  deskripsi?: string;
  kelasIds: string[]; // Daftar ID kelas yang disatukan dengan mata pelajaran ini
  catatan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface JadwalMengajarGuru {
  id: string;
  guruId?: string; // id from waliKelas
  guruUsername: string; // username guru / wali
  guruNama: string;
  guruNip?: string;
  hari: string; // 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'
  kelasId: string;
  kelasNama: string;
  mataPelajaran: string;
  kodeMapel?: string;
  jamKeList?: number[]; // List of jam pelajaran 1 to 11
  shift?: 'Pagi' | 'Siang' | 'Normal' | string; // 'Pagi', 'Siang', 'Normal'
  jamMulai?: string; // e.g. "07:15"
  jamSelesai?: string; // e.g. "08:45"
  jamKe?: string; // e.g. "1 - 3"
  jumlahJp?: number;
  catatan?: string;
}

export interface ShiftPeriod {
  id: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  kelompok1Type: 'pagi' | 'siang' | 'libur';
  kelompok2Type: 'pagi' | 'siang' | 'libur';
}

export interface ShiftConfig {
  pagiTime: string; // e.g. "06.30 - 12.00"
  siangTime: string; // e.g. "13.00 - 16.50"
  periods: ShiftPeriod[];

  // Shift 1 (Pagi) timing & kesiangan configuration
  isJamMasukPagiActive?: boolean;
  pagiJamMasukMulai?: string; // e.g. "06:30"
  pagiJamMasukSelesai?: string; // e.g. "06:45"
  pagiJamPulang?: string; // e.g. "12:00"

  // Shift 2 (Siang) timing & kesiangan configuration
  isJamMasukSiangActive?: boolean;
  siangJamMasukMulai?: string; // e.g. "12:45"
  siangJamMasukSelesai?: string; // e.g. "13:00"
  siangJamPulang?: string; // e.g. "16:50"
}

export type UserRole = string;

export interface PiketKelasAccount {
  id: string;
  username: string;
  nama: string;
  kelasId: string;
  kelasNama: string;
  role: 'piket_kelas';
  tugasTambahan?: string;
}

export interface UserSession {
  role: UserRole;
  roles?: string[];
  data: AdminAccount | WaliKelas | KesiswaanAccount | KurikulumAccount | StafJadwalAccount | UserBiasaAccount | Siswa | PiketKelasAccount | any;
}

export type ViewType =
  | 'dashboard'
  | 'portal_murid'
  | 'absen_qr'
  | 'kartu_pelajar'
  | 'rekap_siswa'
  | 'presensi_input'
  | 'home_visit'
  | 'catatan_pelanggaran'
  | 'ekstrakurikuler'
  | 'petugas_piket'
  | 'live_chat'
  | 'rekap_harian'
  | 'rekap_mingguan'
  | 'rekap_bulanan'
  | 'rekap_ketidakhadiran_tertinggi'
  | 'rekap_pengisian_kelas'
  | 'broadcast_wa'
  | 'master_jurusan'
  | 'master_wali'
  | 'master_guru'
  | 'master_mapel'
  | 'mapel_kelas_guru'
  | 'master_kelas'
  | 'master_siswa'
  | 'jadwal_mengajar'
  | 'jadwal_minggu_ini'
  | 'data_demo'
  | 'pengaturan_sekolah'
  | 'pengaturan_tema'
  | 'pengaturan_admin'
  | 'master_user'
  | 'pengaturan_role'
  | 'pengaturan_menu'
  | 'integrasi_mysql'
  | 'database_traffic'
  | 'cetak_kartu_qr'
  | 'hari_libur'
  | 'jadwal_shift'
  | 'audit_logs'
  | 'intrusion_detection'
  | 'monitoring_server'
  | 'monitoring_login'
  | 'whatsapp_gateway';

export type SyncStatus = 'idle' | 'dirty' | 'saving' | 'syncing' | 'saved' | 'error' | 'offline' | 'unknown' | 'conflict';

export type SyncResult =
  | { success: true; version?: number; message?: string; source?: 'server' | 'mysql' | 'cache' }
  | { success: false; reason: 'network' | 'server' | 'validation' | 'timeout' | 'unknown'; message: string; status?: number };
