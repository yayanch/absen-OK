import React, { useState, useEffect, useMemo } from 'react';
import {
  School,
  Save,
  Trash2,
  UserCheck,
  Layout,
  Check,
  Building,
  MessageSquare,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  CalendarDays,
  Plus,
  Megaphone,
  Bell,
  Search,
  Filter,
  Edit3,
  ExternalLink,
  Tag,
  Users,
  AlertTriangle,
  Pin,
  Sparkles,
  Calendar,
  X,
  CheckCircle2,
  Eye,
  Info,
  Wifi,
  WifiOff,
  Database,
  Server,
  HardDrive,
  Cloud,
  CloudOff,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  AppData,
  SekolahConfig,
  ThemeOption,
  FontThemeOption,
  PengumumanSekolah,
} from '../../types';
import { PageHeader } from '../common/UIComponents';
import { compressBase64Image, formatDateIndo, addAuditLog, getEffectiveSchoolDays } from '../../utils/helpers';
import {
  generate36StudentsForAllClasses,
  generateRandomPresensiForToday,
  generateRandomPresensiRange,
  randomizeWaliKelasForClasses,
  getTodayString,
  INITIAL_PENGUMUMAN,
} from '../../data/initialData';

interface PengaturanSekolahViewProps {
  appData: AppData;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
}

type TabType = 'identitas' | 'pengumuman' | 'tampilan_header' | 'offline';

export const PengaturanSekolahView: React.FC<PengaturanSekolahViewProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};

  // Tab State
  const [activeTab, setActiveTab] = useState<TabType>('identitas');

  // Identitas & Profil State
  const [nama, setNama] = useState(sekolah.nama || '');
  const [alamat, setAlamat] = useState(sekolah.alamat || '');
  const [website, setWebsite] = useState(sekolah.website || '');
  const [email, setEmail] = useState(sekolah.email || '');
  const [telepon, setTelepon] = useState(sekolah.telepon || '');
  const [tahunAjaran, setTahunAjaran] = useState(sekolah.tahunAjaran || '2026/2027');
  const [semester, setSemester] = useState(sekolah.semester || 'Ganjil');
  const [tanggalMulai, setTanggalMulai] = useState(sekolah.tanggalMulai || '2026-07-15');
  const [tanggalAkhir, setTanggalAkhir] = useState(sekolah.tanggalAkhir || '2027-06-30');
  const [namaKepalaSekolah, setNamaKepalaSekolah] = useState(sekolah.namaKepalaSekolah || '');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState(sekolah.nipKepalaSekolah || '');
  const [logoBase64, setLogoBase64] = useState(sekolah.logo || '');
  const [faviconBase64, setFaviconBase64] = useState(sekolah.favicon || '');

  // Pengumuman & Running Text State
  const [enableRunningText, setEnableRunningText] = useState<boolean>(sekolah.enableRunningText ?? true);
  const [runningTextAnnouncement, setRunningTextAnnouncement] = useState<string>(
    sekolah.runningTextAnnouncement ||
      'Selamat datang di Sistem Presensi Digital SMKN 6 Garut Tahun Ajaran 2026/2027. Budayakan disiplin hadir tepat waktu setiap hari!'
  );
  const [runningTextSpeed, setRunningTextSpeed] = useState<'slow' | 'normal' | 'fast'>(sekolah.runningTextSpeed || 'normal');
  const [loginAnnouncementModal, setLoginAnnouncementModal] = useState<boolean>(sekolah.loginAnnouncementModal ?? false);
  const [loginAnnouncementTitle, setLoginAnnouncementTitle] = useState<string>(sekolah.loginAnnouncementTitle || '');
  const [loginAnnouncementText, setLoginAnnouncementText] = useState<string>(sekolah.loginAnnouncementText || '');
  const [loginAnnouncementType, setLoginAnnouncementType] = useState<'info' | 'penting' | 'peringatan' | 'kegiatan'>(
    sekolah.loginAnnouncementType || 'info'
  );
  const [previewLoginAnnouncementModalOpen, setPreviewLoginAnnouncementModalOpen] = useState<boolean>(false);

  // Daftar Pengumuman Sekolah CRUD
  const [pengumumanList, setPengumumanList] = useState<PengumumanSekolah[]>(
    appData.pengumuman && appData.pengumuman.length > 0 ? appData.pengumuman : INITIAL_PENGUMUMAN
  );
  const [isFormPengumumanOpen, setIsFormPengumumanOpen] = useState<boolean>(false);
  const [editingPengumumanId, setEditingPengumumanId] = useState<string | null>(null);
  const [formPgmJudul, setFormPgmJudul] = useState<string>('');
  const [formPgmIsi, setFormPgmIsi] = useState<string>('');
  const [formPgmKategori, setFormPgmKategori] = useState<'info' | 'penting' | 'peringatan' | 'kegiatan'>('info');
  const [formPgmTarget, setFormPgmTarget] = useState<'semua' | 'guru' | 'siswa' | 'wali_kelas'>('semua');
  const [formPgmPenulis, setFormPgmPenulis] = useState<string>('Administrator / Pimpinan');
  const [formPgmTanggal, setFormPgmTanggal] = useState<string>(getTodayString());
  const [formPgmLinkUrl, setFormPgmLinkUrl] = useState<string>('');
  const [formPgmLinkText, setFormPgmLinkText] = useState<string>('');
  const [formPgmAktif, setFormPgmAktif] = useState<boolean>(true);
  const [formPgmPinRunningText, setFormPgmPinRunningText] = useState<boolean>(false);
  const [formPgmPinDashboard, setFormPgmPinDashboard] = useState<boolean>(true);
  const [formPgmPinLoginBanner, setFormPgmPinLoginBanner] = useState<boolean>(false);

  // Filter & Pencarian Pengumuman
  const [pgmSearch, setPgmSearch] = useState<string>('');
  const [pgmFilterKategori, setPgmFilterKategori] = useState<string>('semua');
  const [pgmFilterTarget, setPgmFilterTarget] = useState<string>('semua');

  // Header, Sidebar & Footer State
  const [selectedTheme] = useState<ThemeOption>(sekolah.themePreset || sekolah.theme || 'school_blue');
  const [selectedFontTheme] = useState<FontThemeOption>(sekolah.fontTheme || 'modern');
  const [showFooter, setShowFooter] = useState(sekolah.showFooter !== false);
  const [appVersion, setAppVersion] = useState(sekolah.appVersion || 'v2.5.0');
  const [showAppVersion, setShowAppVersion] = useState(sekolah.showAppVersion !== false);
  const [enableLiveChat, setEnableLiveChat] = useState(appData.enableLiveChat ?? sekolah.enableLiveChat ?? true);
  const [footerTeks, setFooterTeks] = useState(
    sekolah.footerTeks !== undefined
      ? sekolah.footerTeks
      : `© ${new Date().getFullYear()} ${sekolah.nama || 'Aplikasi Presensi Sekolah'}. Hak Cipta Dilindungi.`
  );
  const [footerSubTeks, setFooterSubTeks] = useState(
    sekolah.footerSubTeks !== undefined
      ? sekolah.footerSubTeks
      : 'Absensi Siswa & Rekap Kehadiran'
  );
  const [headerTitle, setHeaderTitle] = useState(sekolah.headerTitle || 'Absensi Siswa');
  const [headerSubtitle, setHeaderSubtitle] = useState(sekolah.headerSubtitle || 'SMKN 6 GARUT');
  const [browserTitle, setBrowserTitle] = useState(sekolah.browserTitle || '');

  // Offline & Synchronization Settings State
  const [enableOfflineMode, setEnableOfflineMode] = useState<boolean>(sekolah.enableOfflineMode !== false);
  const [allowOfflineBypass, setAllowOfflineBypass] = useState<boolean>(sekolah.allowOfflineBypass !== false);
  const [showOfflineToastWarning, setShowOfflineToastWarning] = useState<boolean>(sekolah.showOfflineToastWarning !== false);
  const [autoSyncOnReconnect, setAutoSyncOnReconnect] = useState<boolean>(sekolah.autoSyncOnReconnect !== false);
  const [offlineNoticeMessage, setOfflineNoticeMessage] = useState<string>(sekolah.offlineNoticeMessage || '');
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [pingResult, setPingResult] = useState<{ status: 'idle' | 'success' | 'failed'; message: string; ms?: number }>({ status: 'idle', message: '' });
  const [isCleaningCache, setIsCleaningCache] = useState<boolean>(false);

  const handleCleanCache = async () => {
    setIsCleaningCache(true);
    try {
      const res = await fetch('/api/server/cache-clean', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        onShowToast(json.message || 'Cache sistem dan memori server berhasil dibersihkan!', 'success');
        try {
          const syncRes = await fetch('/api/global-state?force=true');
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.appData) {
              onUpdateAppData(syncData.appData);
            }
          }
        } catch (e) {}
      } else {
        onShowToast('Gagal membersihkan cache server: ' + (json.message || ''), 'error');
      }
    } catch (err: any) {
      onShowToast('Gagal menghubungi server untuk membersihkan cache', 'error');
    } finally {
      setIsCleaningCache(false);
    }
  };

  useEffect(() => {
    const s: Partial<SekolahConfig> = appData.sekolah || {};
    setNama(s.nama || '');
    setAlamat(s.alamat || '');
    setWebsite(s.website || '');
    setEmail(s.email || '');
    setTelepon(s.telepon || '');
    setTahunAjaran(s.tahunAjaran || '2026/2027');
    setSemester(s.semester || 'Ganjil');
    setTanggalMulai(s.tanggalMulai || '2026-07-15');
    setTanggalAkhir(s.tanggalAkhir || '2027-06-30');
    setNamaKepalaSekolah(s.namaKepalaSekolah || '');
    setNipKepalaSekolah(s.nipKepalaSekolah || '');
    setLogoBase64(s.logo || '');
    setFaviconBase64(s.favicon || '');
    setShowFooter(s.showFooter !== false);
    setAppVersion(s.appVersion || 'v2.5.0');
    setShowAppVersion(s.showAppVersion !== false);
    setEnableLiveChat(appData.enableLiveChat ?? s.enableLiveChat ?? true);
    setFooterTeks(
      s.footerTeks !== undefined
        ? s.footerTeks
        : `© ${new Date().getFullYear()} ${s.nama || 'Aplikasi Presensi Sekolah'}. Hak Cipta Dilindungi.`
    );
    setFooterSubTeks(
      s.footerSubTeks !== undefined
        ? s.footerSubTeks
        : 'Absensi Siswa & Rekap Kehadiran'
    );
    setHeaderTitle(s.headerTitle || 'Absensi Siswa');
    setHeaderSubtitle(s.headerSubtitle || 'SMKN 6 GARUT');
    setBrowserTitle(s.browserTitle || '');
    setEnableRunningText(s.enableRunningText ?? true);
    setRunningTextAnnouncement(
      s.runningTextAnnouncement ||
        'Selamat datang di Sistem Presensi Digital SMKN 6 Garut Tahun Ajaran 2026/2027. Budayakan disiplin hadir tepat waktu setiap hari!'
    );
    setRunningTextSpeed(s.runningTextSpeed || 'normal');
    setLoginAnnouncementModal(s.loginAnnouncementModal ?? false);
    setLoginAnnouncementTitle(s.loginAnnouncementTitle || '');
    setLoginAnnouncementText(s.loginAnnouncementText || '');
    setLoginAnnouncementType(s.loginAnnouncementType || 'info');

    // Load offline config
    setEnableOfflineMode(s.enableOfflineMode !== false);
    setAllowOfflineBypass(s.allowOfflineBypass !== false);
    setShowOfflineToastWarning(s.showOfflineToastWarning !== false);
    setAutoSyncOnReconnect(s.autoSyncOnReconnect !== false);
    setOfflineNoticeMessage(s.offlineNoticeMessage || '');

    if (appData.pengumuman) {
      setPengumumanList(appData.pengumuman);
    }
  }, [appData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const raw = evt.target?.result as string;
      const compressed = await compressBase64Image(raw, 350, 0.7);
      setLogoBase64(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const raw = evt.target?.result as string;
      const compressed = await compressBase64Image(raw, 128, 0.8);
      setFaviconBase64(compressed);
    };
    reader.readAsDataURL(file);
  };

  const previewToday = getTodayString();
  const previewDaysUpToToday = useMemo(() => {
    if (!tanggalMulai) return 0;
    const end = tanggalAkhir && tanggalAkhir < previewToday ? tanggalAkhir : previewToday;
    if (tanggalMulai > end) return 0;
    return getEffectiveSchoolDays({
      startDate: tanggalMulai,
      endDate: end,
      appData: { ...appData, sekolah: { ...appData.sekolah, tanggalMulai, tanggalAkhir } },
    }).length;
  }, [tanggalMulai, tanggalAkhir, previewToday, appData]);

  const previewDaysTotalPeriod = useMemo(() => {
    if (!tanggalMulai || !tanggalAkhir || tanggalMulai > tanggalAkhir) return 0;
    return getEffectiveSchoolDays({
      startDate: tanggalMulai,
      endDate: tanggalAkhir,
      appData: { ...appData, sekolah: { ...appData.sekolah, tanggalMulai, tanggalAkhir } },
    }).length;
  }, [tanggalMulai, tanggalAkhir, appData]);

  // Simpan Pengaturan Sekolah Umum
  const handleSaveSettings = (
    e?: React.FormEvent,
    customMsg?: string,
    overrides?: Partial<SekolahConfig>
  ) => {
    if (e) e.preventDefault();

    if (!nama.trim()) {
      onShowToast('Nama Resmi Sekolah wajib diisi.', 'warning');
      return;
    }

    const newSekolah: SekolahConfig = {
      ...sekolah,
      nama: nama.trim(),
      alamat: alamat.trim(),
      website: website.trim(),
      email: email.trim(),
      telepon: telepon.trim(),
      tahunAjaran: tahunAjaran.trim(),
      semester: semester.trim(),
      tanggalMulai,
      tanggalAkhir,
      logo: logoBase64,
      favicon: faviconBase64,
      theme: selectedTheme,
      fontTheme: selectedFontTheme,
      namaKepalaSekolah: namaKepalaSekolah.trim(),
      nipKepalaSekolah: nipKepalaSekolah.trim(),
      showFooter,
      enableLiveChat,
      footerTeks: footerTeks.trim(),
      footerSubTeks: footerSubTeks.trim(),
      appVersion: appVersion.trim(),
      showAppVersion,
      headerTitle: headerTitle.trim(),
      headerSubtitle: headerSubtitle.trim(),
      browserTitle: browserTitle.trim(),
      enableRunningText,
      runningTextAnnouncement: runningTextAnnouncement.trim(),
      runningTextSpeed,
      loginAnnouncementModal,
      loginAnnouncementTitle: loginAnnouncementTitle.trim(),
      loginAnnouncementText: loginAnnouncementText.trim(),
      loginAnnouncementType,
      enableOfflineMode,
      allowOfflineBypass,
      showOfflineToastWarning,
      autoSyncOnReconnect,
      offlineNoticeMessage: offlineNoticeMessage.trim(),
      ...overrides,
    };

    let nextAppData: AppData = {
      ...appData,
      enableLiveChat,
      sekolah: newSekolah,
      pengumuman: pengumumanList,
    };

    nextAppData = addAuditLog(
      nextAppData,
      'Ubah Pengaturan Sekolah',
      `Memperbarui konfigurasi sekolah ${newSekolah.nama} (Tab: ${activeTab}).`
    );
    onUpdateAppData(nextAppData);

    onShowToast(customMsg || 'Pengaturan Sekolah berhasil disimpan!', 'success');
  };

  // Pengumuman Handlers
  const handleOpenAddPengumuman = () => {
    setEditingPengumumanId(null);
    setFormPgmJudul('');
    setFormPgmIsi('');
    setFormPgmKategori('info');
    setFormPgmTarget('semua');
    setFormPgmPenulis(sekolah.namaKepalaSekolah || 'WKS Kesiswaan / Humas');
    setFormPgmTanggal(getTodayString());
    setFormPgmLinkUrl('');
    setFormPgmLinkText('');
    setFormPgmAktif(true);
    setFormPgmPinRunningText(false);
    setFormPgmPinDashboard(true);
    setFormPgmPinLoginBanner(false);
    setIsFormPengumumanOpen(true);
  };

  const handleOpenEditPengumuman = (item: PengumumanSekolah) => {
    setEditingPengumumanId(item.id);
    setFormPgmJudul(item.judul);
    setFormPgmIsi(item.isi);
    setFormPgmKategori(item.kategori);
    setFormPgmTarget(item.target);
    setFormPgmPenulis(item.penulis || '');
    setFormPgmTanggal(item.tanggal || getTodayString());
    setFormPgmLinkUrl(item.linkUrl || '');
    setFormPgmLinkText(item.linkText || '');
    setFormPgmAktif(item.aktif);
    setFormPgmPinRunningText(item.pinToRunningText || false);
    setFormPgmPinDashboard(item.pinToDashboard !== false);
    setFormPgmPinLoginBanner(item.pinToLoginBanner || false);
    setIsFormPengumumanOpen(true);
  };

  const handleSavePengumuman = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPgmJudul.trim() || !formPgmIsi.trim()) {
      onShowToast('Judul dan isi pengumuman wajib diisi.', 'warning');
      return;
    }

    let updatedList: PengumumanSekolah[] = [];
    if (editingPengumumanId) {
      updatedList = pengumumanList.map((p) =>
        p.id === editingPengumumanId
          ? {
              ...p,
              judul: formPgmJudul.trim(),
              isi: formPgmIsi.trim(),
              kategori: formPgmKategori,
              target: formPgmTarget,
              penulis: formPgmPenulis.trim(),
              tanggal: formPgmTanggal,
              linkUrl: formPgmLinkUrl.trim() || undefined,
              linkText: formPgmLinkText.trim() || undefined,
              aktif: formPgmAktif,
              pinToRunningText: formPgmPinRunningText,
              pinToDashboard: formPgmPinDashboard,
              pinToLoginBanner: formPgmPinLoginBanner,
            }
          : p
      );
      onShowToast('Pengumuman berhasil diperbarui!', 'success');
    } else {
      const newPengumuman: PengumumanSekolah = {
        id: `PGM_${Date.now()}`,
        judul: formPgmJudul.trim(),
        isi: formPgmIsi.trim(),
        kategori: formPgmKategori,
        target: formPgmTarget,
        penulis: formPgmPenulis.trim(),
        tanggal: formPgmTanggal,
        linkUrl: formPgmLinkUrl.trim() || undefined,
        linkText: formPgmLinkText.trim() || undefined,
        aktif: formPgmAktif,
        pinToRunningText: formPgmPinRunningText,
        pinToDashboard: formPgmPinDashboard,
        pinToLoginBanner: formPgmPinLoginBanner,
        createdAt: getTodayString(),
      };
      updatedList = [newPengumuman, ...pengumumanList];
      onShowToast('Pengumuman baru berhasil diterbitkan!', 'success');
    }

    setPengumumanList(updatedList);
    setIsFormPengumumanOpen(false);
    setEditingPengumumanId(null);

    const updatedAppData: AppData = {
      ...appData,
      pengumuman: updatedList,
    };
    onUpdateAppData(updatedAppData);
  };

  const handleToggleAktifPengumuman = (id: string) => {
    const updated = pengumumanList.map((p) => (p.id === id ? { ...p, aktif: !p.aktif } : p));
    setPengumumanList(updated);
    onUpdateAppData({ ...appData, pengumuman: updated });
    onShowToast('Status publikasi pengumuman diubah.', 'info');
  };

  const handleDeletePengumuman = (id: string, judul: string) => {
    const doDelete = () => {
      const updated = pengumumanList.filter((p) => p.id !== id);
      setPengumumanList(updated);
      onUpdateAppData({ ...appData, pengumuman: updated });
      onShowToast(`Pengumuman "${judul}" berhasil dihapus.`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Pengumuman',
        `Apakah Anda yakin ingin menghapus pengumuman "${judul}"?`,
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  const handleResetDefaultPengumuman = () => {
    const doReset = () => {
      setPengumumanList(INITIAL_PENGUMUMAN);
      onUpdateAppData({ ...appData, pengumuman: INITIAL_PENGUMUMAN });
      onShowToast('Daftar pengumuman berhasil direset ke contoh default.', 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Reset Daftar Pengumuman',
        'Kembalikan daftar pengumuman ke contoh bawaan sistem?',
        'warning',
        doReset
      );
    } else {
      doReset();
    }
  };

  // Demo Generators
  const handleGenerateSampleData = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const newSiswa = generate36StudentsForAllClasses(appData.kelas);
      let updatedAppData = { ...appData, siswa: newSiswa };
      updatedAppData = addAuditLog(
        updatedAppData,
        'Generate Data Siswa Demo',
        `Menghasilkan ${newSiswa.length} data siswa acak untuk ${appData.kelas.length} kelas.`
      );
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil membuat ${newSiswa.length} siswa demo untuk ${appData.kelas.length} kelas!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Buat Sample Data (36 Siswa / Kelas)',
        `Aksi ini akan membuat 36 data siswa otomatis untuk setiap kelas (${appData.kelas.length} kelas = total ${
          appData.kelas.length * 36
        } siswa). Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleGenerateRandomPresensi = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Silakan tambahkan data Siswa terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const newPresensi = generateRandomPresensiForToday(appData.kelas, appData.siswa, appData.presensi);
      let updatedAppData = { ...appData, presensi: newPresensi };
      updatedAppData = addAuditLog(
        updatedAppData,
        'Acak Presensi Hari Ini',
        `Mengisi presensi acak realistis untuk seluruh kelas pada hari ini.`
      );
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil membuat data presensi acak untuk hari ini bagi seluruh kelas!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Acak Presensi Hari Ini (Semua Kelas)',
        `Aksi ini akan menghasilkan status kehadiran acak untuk seluruh siswa di semua kelas (${appData.kelas.length} kelas) untuk hari ini. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleGenerateRandomPresensiRange = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.siswa || appData.siswa.length === 0) {
      onShowToast('Silakan tambahkan data Siswa terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const today = getTodayString();
      const start = tanggalMulai || '2026-07-15';
      const newPresensi = generateRandomPresensiRange(appData.kelas, appData.siswa, start, today, appData.presensi);
      let updatedAppData = { ...appData, presensi: newPresensi };
      updatedAppData = addAuditLog(
        updatedAppData,
        'Acak Presensi Periode',
        `Mengisi data presensi acak historis dari tanggal ${start} s.d. ${today}.`
      );
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil membuat data presensi acak dari ${start} s.d. ${today}!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Acak Presensi Periode (Tanggal Mulai s.d. Hari Ini)',
        `Aksi ini akan mengisi data presensi acak harian dari tanggal mulai ajaran (${
          tanggalMulai || '2026-07-15'
        }) hingga hari ini untuk seluruh kelas. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  const handleRandomizeWaliKelas = () => {
    if (!appData.kelas || appData.kelas.length === 0) {
      onShowToast('Silakan tambahkan data Kelas terlebih dahulu.', 'warning');
      return;
    }
    if (!appData.waliKelas || appData.waliKelas.length === 0) {
      onShowToast('Silakan tambahkan data Wali Kelas terlebih dahulu.', 'warning');
      return;
    }

    const doGenerate = () => {
      const updatedKelas = randomizeWaliKelasForClasses(appData.kelas, appData.waliKelas);
      const updatedAppData = { ...appData, kelas: updatedKelas };
      onUpdateAppData(updatedAppData);
      onShowToast(`Berhasil mengacak Wali Kelas untuk seluruh ${updatedKelas.length} kelas!`, 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Acak Penugasan Wali Kelas',
        `Aksi ini akan menetapkan Wali Kelas secara acak untuk seluruh ${appData.kelas.length} kelas yang ada. Lanjutkan?`,
        'emerald',
        doGenerate
      );
    } else {
      doGenerate();
    }
  };

  // Filtered Pengumuman
  const filteredPengumuman = pengumumanList.filter((p) => {
    const matchSearch =
      p.judul.toLowerCase().includes(pgmSearch.toLowerCase()) ||
      p.isi.toLowerCase().includes(pgmSearch.toLowerCase()) ||
      (p.penulis && p.penulis.toLowerCase().includes(pgmSearch.toLowerCase()));
    const matchKategori = pgmFilterKategori === 'semua' || p.kategori === pgmFilterKategori;
    const matchTarget = pgmFilterTarget === 'semua' || p.target === pgmFilterTarget;
    return matchSearch && matchKategori && matchTarget;
  });

  const activePengumumanCount = pengumumanList.filter((p) => p.aktif).length;

  const getKategoriBadge = (kategori: string) => {
    switch (kategori) {
      case 'penting':
        return {
          bg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          label: 'Penting',
        };
      case 'peringatan':
        return {
          bg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          label: 'Peringatan / Kedisiplinan',
        };
      case 'kegiatan':
        return {
          bg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          label: 'Agenda / Kegiatan',
        };
      default:
        return {
          bg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          label: 'Informasi Umum',
        };
    }
  };

  const getTargetBadge = (target: string) => {
    switch (target) {
      case 'guru':
        return 'Guru & Staf';
      case 'siswa':
        return 'Seluruh Siswa';
      case 'wali_kelas':
        return 'Wali Kelas';
      default:
        return 'Semua (Publik)';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        icon={Building}
        title="Pengaturan Sekolah"
        description="Kelola profil institusi, pengumuman sekolah, serta tampilan header & footer aplikasi dalam satu panel terpadu."
        badge="Pusat Konfigurasi"
      />

      {/* TAB NAVIGATION BAR */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('identitas')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
            activeTab === 'identitas'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Profil &amp; Identitas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pengumuman')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
            activeTab === 'pengumuman'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Pengumuman Sekolah</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === 'pengumuman'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {activePengumumanCount} Aktif
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tampilan_header')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
            activeTab === 'tampilan_header'
              ? 'bg-slate-800 text-white dark:bg-slate-700 shadow-md shadow-slate-700/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>Header, Sidebar &amp; Footer</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offline')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none ${
            activeTab === 'offline'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {enableOfflineMode ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>Mode Offline &amp; Sinkronisasi</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              activeTab === 'offline'
                ? 'bg-white/20 text-white'
                : enableOfflineMode
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            {enableOfflineMode ? 'Aktif' : 'Nonaktif'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: IDENTITAS & PROFIL SEKOLAH */}
      {/* ========================================================================= */}
      {activeTab === 'identitas' && (
        <form onSubmit={(e) => handleSaveSettings(e, 'Profil & Identitas Sekolah berhasil diperbarui!')} className="space-y-6">
          {/* Logo & Favicon Sekolah */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                {logoBase64 ? (
                  <img src={logoBase64} alt="Logo Sekolah" className="w-24 h-24 object-contain mx-auto" />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center text-3xl text-slate-300 dark:text-slate-600 mx-auto">
                    <School className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Logo Utama Sekolah</label>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={readOnly}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {logoBase64 && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setLogoBase64('')}
                      className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Hapus Logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Logo</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Format yang didukung: PNG, JPG, WebP transparan (Maks. 1MB)
                </p>
              </div>
            </div>

            {/* Favicon Browser */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {faviconBase64 ? (
                  <img src={faviconBase64} alt="Favicon Pratinjau" className="w-10 h-10 object-contain" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">Favicon</span>
                )}
              </div>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Favicon / Ikon Tab Browser</label>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFaviconUpload}
                    disabled={readOnly}
                    className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950 dark:file:text-blue-300 hover:file:bg-blue-100 cursor-pointer"
                  />
                  {faviconBase64 && !readOnly && (
                    <button
                      type="button"
                      onClick={() => setFaviconBase64('')}
                      className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Hapus Favicon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Favicon</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Ikon kecil yang tampil di tab peramban browser web (Rekomendasi ukuran 32x32px atau 64x64px).
                </p>
              </div>
            </div>
          </div>

          {/* Form Informasi Sekolah */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Informasi &amp; Kontak Instansi Sekolah</h3>
                <p className="text-xs text-slate-500">Data ini digunakan pada kop surat, laporan presensi, dan identitas resmi.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Nama Resmi Sekolah</label>
              <input
                type="text"
                required
                disabled={readOnly}
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Misal: SMKN 6 GARUT"
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">Alamat Lengkap Sekolah</label>
              <textarea
                rows={2}
                disabled={readOnly}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Jl. Raya Limbangan..."
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Alamat Situs / Website Resmi</span>
              </label>
              <input
                type="url"
                disabled={readOnly}
                placeholder="https://smkn6garut.sch.id"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Email Resmi Sekolah</span>
                </label>
                <input
                  type="email"
                  disabled={readOnly}
                  placeholder="info@smkn6garut.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-500" />
                  <span>Nomor Telepon / Kontak Resmi</span>
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  placeholder="(0262) 438123"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Tahun Ajaran, Semester, & Periode */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                <span>Tahun Ajaran &amp; Periode Kalender Akademik</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Tahun Ajaran Aktif
                  </label>
                  <input
                    type="text"
                    required
                    disabled={readOnly}
                    value={tahunAjaran}
                    onChange={(e) => setTahunAjaran(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Semester Aktif
                  </label>
                  <select
                    value={semester}
                    disabled={readOnly}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Tanggal Mulai Periode
                  </label>
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Tanggal Akhir Periode
                  </label>
                  <input
                    type="date"
                    required
                    disabled={readOnly}
                    value={tanggalAkhir}
                    onChange={(e) => setTanggalAkhir(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dynamic Calculation Info Banner */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <span>Kalkulasi Otomatis Hari Presensi Berdasarkan Tanggal Mulai</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-blue-100 dark:border-blue-900/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Hari Efektif s.d Hari Ini:</span>
                    <div className="text-base font-extrabold text-blue-900 dark:text-blue-100 mt-0.5">
                      {previewDaysUpToToday} Hari Efektif
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {tanggalMulai ? `Mulai ${formatDateIndo(tanggalMulai)}` : 'Tanggal mulai belum diisi'}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/90 rounded-xl p-3 border border-blue-100 dark:border-blue-900/40">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] font-semibold">Total Hari Efektif 1 Periode:</span>
                    <div className="text-base font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                      {previewDaysTotalPeriod} Hari Efektif
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {tanggalAkhir ? `s.d ${formatDateIndo(tanggalAkhir)}` : 'Tanggal akhir belum diisi'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                  Semua perhitungan hari efektif, persentase kehadiran, rekap harian/mingguan/bulanan, dasbor statistik, dan ranking ketidakhadiran secara dinamis dihitung mulai dari <strong>Tanggal Mulai Periode</strong>. Mengubah tanggal ini akan otomatis mengkalkulasi ulang seluruh data.
                </p>
              </div>
            </div>

            {/* Informasi Pimpinan Sekolah */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Pimpinan / Kepala Sekolah</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Nama Lengkap &amp; Gelar Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={namaKepalaSekolah}
                    onChange={(e) => setNamaKepalaSekolah(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Misal: Drs. H. Mulyadi, M.Pd."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={nipKepalaSekolah}
                    onChange={(e) => setNipKepalaSekolah(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Misal: 19720510 199803 1 004"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Data Sample Generator Tools */}
          {!readOnly && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Utilitas &amp; Generator Data Percobaan (Demo)</h3>
                  <p className="text-[11px] text-slate-400">Otomatisasi pengisian data siswa, presensi, dan wali kelas untuk pengujian sistem.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleGenerateSampleData}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition space-y-1 group cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>36 Siswa / Kelas</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Otomatis isi 36 data siswa lengkap per kelas.</p>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomPresensi}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition space-y-1 group cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Presensi Hari Ini</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Isi status presensi acak realistis hari ini.</p>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateRandomPresensiRange}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition space-y-1 group cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
                    <span>Presensi Periode</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Generate presensi historis periode semester.</p>
                </button>

                <button
                  type="button"
                  onClick={handleRandomizeWaliKelas}
                  className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left transition space-y-1 group cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-500" />
                    <span>Acak Wali Kelas</span>
                  </span>
                  <p className="text-[10px] text-slate-400">Tetapkan penugasan wali kelas secara acak.</p>
                </button>
              </div>
            </div>
          )}

          {!readOnly && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Profil &amp; Identitas Sekolah</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PENGUMUMAN & INFORMASI SEKOLAH */}
      {/* ========================================================================= */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-6">
          {/* SECTION 1: RUNNING TEXT (TEKS BERJALAN) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Megaphone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Banner Pesan Berjalan (Running Text Ticker)
                  </h3>
                  <p className="text-[11px] text-slate-400">Pesan dinamis yang berjalan di header aplikasi presensi.</p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !enableRunningText;
                      setEnableRunningText(next);
                      handleSaveSettings(
                        undefined,
                        `Running Text ${next ? 'diaktifkan' : 'dinonaktifkan'}.`,
                        { enableRunningText: next }
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      enableRunningText
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {enableRunningText ? 'Aktif (Tampil)' : 'Nonaktif'}
                  </button>
                </div>
              )}
            </div>

            {enableRunningText && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Teks Pengumuman Berjalan
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={runningTextAnnouncement}
                    onChange={(e) => setRunningTextAnnouncement(e.target.value)}
                    placeholder="Tuliskan pesan teks yang akan berjalan di header..."
                    className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0">Kecepatan:</label>
                    <select
                      value={runningTextSpeed}
                      disabled={readOnly}
                      onChange={(e) => setRunningTextSpeed(e.target.value as any)}
                      className="py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                    >
                      <option value="slow">Lambat (Mudah Dibaca)</option>
                      <option value="normal">Normal (Standar)</option>
                      <option value="fast">Cepat (Ringkas)</option>
                    </select>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={(e) => handleSaveSettings(e, 'Pesan Teks Berjalan berhasil disimpan!')}
                      className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Pengumuman Berjalan</span>
                    </button>
                  )}
                </div>

                {/* Live Preview Ticker */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                    <span>Pratinjau Teks Berjalan:</span>
                  </span>
                  <div className="p-2.5 bg-amber-50/90 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 overflow-hidden flex items-center gap-2.5 text-xs text-amber-950 dark:text-amber-200">
                    <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Megaphone className="w-3 h-3" />
                      <span>Pengumuman</span>
                    </span>
                    <div className="overflow-hidden whitespace-nowrap w-full">
                      <span className="inline-block animate-marquee font-semibold text-xs">
                        {runningTextAnnouncement || 'Belum ada pesan pengumuman berjalan.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: MODAL / NOTIFIKASI PENGUMUMAN HALAMAN LOGIN */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Bell className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Popup Pengumuman Layar Masuk (Login Modal Notice)
                  </h3>
                  <p className="text-[11px] text-slate-400">Tampilkan jendela popup pengumuman saat pengguna membuka layar login.</p>
                </div>
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Status:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !loginAnnouncementModal;
                      setLoginAnnouncementModal(next);
                      handleSaveSettings(
                        undefined,
                        `Popup Pengumuman Login ${next ? 'diaktifkan' : 'dinonaktifkan'}.`,
                        { loginAnnouncementModal: next }
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      loginAnnouncementModal
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {loginAnnouncementModal ? 'Aktif (Tampil)' : 'Nonaktif'}
                  </button>
                </div>
              )}
            </div>

            {loginAnnouncementModal && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Judul Pengumuman Login
                    </label>
                    <input
                      type="text"
                      disabled={readOnly}
                      value={loginAnnouncementTitle}
                      onChange={(e) => setLoginAnnouncementTitle(e.target.value)}
                      placeholder="Misal: Pelaksanaan PTS Semester Ganjil 2026/2027"
                      className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Tipe / Kategori
                    </label>
                    <select
                      value={loginAnnouncementType}
                      disabled={readOnly}
                      onChange={(e) => setLoginAnnouncementType(e.target.value as any)}
                      className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="info">Informasi (Biru)</option>
                      <option value="penting">Penting (Kuning)</option>
                      <option value="peringatan">Peringatan (Merah)</option>
                      <option value="kegiatan">Agenda/Kegiatan (Hijau)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                    Isi Pesan Pengumuman Login
                  </label>
                  <textarea
                    rows={2}
                    disabled={readOnly}
                    value={loginAnnouncementText}
                    onChange={(e) => setLoginAnnouncementText(e.target.value)}
                    placeholder="Tuliskan keterangan detail pengumuman yang akan dibaca di layar masuk..."
                    className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {!readOnly && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPreviewLoginAnnouncementModalOpen(true)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>👁️ Pratinjau Banner Popup Login</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSaveSettings(e, 'Pengumuman Login berhasil disimpan!')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Pengumuman Login</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: MANAJEMEN DAFTAR PENGUMUMAN SEKOLAH (CRUD) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <span>Daftar Arsip &amp; Publikasi Pengumuman Sekolah</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Total: {pengumumanList.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Kelola edaran, himbauan, notifikasi akademik, dan agenda kegiatan sekolah.</p>
              </div>

              {!readOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetDefaultPengumuman}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                    title="Muat contoh pengumuman"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Contoh Pengumuman</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenAddPengumuman}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Buat Pengumuman Baru</span>
                  </button>
                </div>
              )}
            </div>

            {/* FORM MODAL / DRAWER TAMBAH & EDIT PENGUMUMAN */}
            {isFormPengumumanOpen && !readOnly && (
              <div className="p-5 bg-slate-50/90 dark:bg-slate-800/60 rounded-2xl border-2 border-amber-500/40 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-500" />
                    <span>{editingPengumumanId ? 'Edit Pengumuman Sekolah' : 'Buat Publikasi Pengumuman Baru'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormPengumumanOpen(false);
                      setEditingPengumumanId(null);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSavePengumuman} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Judul Pengumuman <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formPgmJudul}
                        onChange={(e) => setFormPgmJudul(e.target.value)}
                        placeholder="Misal: Pelaksanaan Upacara Bendera HUT RI ke-81"
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tanggal Pengumuman
                      </label>
                      <input
                        type="date"
                        required
                        value={formPgmTanggal}
                        onChange={(e) => setFormPgmTanggal(e.target.value)}
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Kategori Pengumuman
                      </label>
                      <select
                        value={formPgmKategori}
                        onChange={(e) => setFormPgmKategori(e.target.value as any)}
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="info">Informasi Umum (Biru)</option>
                        <option value="penting">Penting / Instruksi (Kuning)</option>
                        <option value="peringatan">Peringatan / Tata Tertib (Merah)</option>
                        <option value="kegiatan">Agenda / Kegiatan (Hijau)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Sasaran
                      </label>
                      <select
                        value={formPgmTarget}
                        onChange={(e) => setFormPgmTarget(e.target.value as any)}
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="semua">Semua Pengguna (Publik)</option>
                        <option value="guru">Bapak/Ibu Guru &amp; Staf</option>
                        <option value="siswa">Seluruh Siswa</option>
                        <option value="wali_kelas">Wali Kelas Saja</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Penulis / Penerbit
                      </label>
                      <input
                        type="text"
                        value={formPgmPenulis}
                        onChange={(e) => setFormPgmPenulis(e.target.value)}
                        placeholder="Misal: WKS Kesiswaan"
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Rincian Isi Pengumuman <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={formPgmIsi}
                      onChange={(e) => setFormPgmIsi(e.target.value)}
                      placeholder="Tuliskan detail pengumuman secara lengkap, jelas, dan santun..."
                      className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                        <span>Tautan Eksternal / Dokumen (Opsional)</span>
                      </label>
                      <input
                        type="url"
                        value={formPgmLinkUrl}
                        onChange={(e) => setFormPgmLinkUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Label Tombol Tautan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={formPgmLinkText}
                        onChange={(e) => setFormPgmLinkText(e.target.value)}
                        placeholder="Misal: Unduh Surat Edaran PDF"
                        className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Pengaturan Penempatan & Status */}
                  <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPgmAktif}
                        onChange={(e) => setFormPgmAktif(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Publikasikan Sekarang (Aktif)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPgmPinLoginBanner}
                        onChange={(e) => setFormPgmPinLoginBanner(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Sematkan di Layar Login (Popup Banner)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPgmPinDashboard}
                        onChange={(e) => setFormPgmPinDashboard(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Sematkan di Dashboard</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formPgmPinRunningText}
                        onChange={(e) => setFormPgmPinRunningText(e.target.checked)}
                        className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Tampilkan di Running Text</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormPengumumanOpen(false);
                        setEditingPengumumanId(null);
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-500/25 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{editingPengumumanId ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* FILTER & PENCARIAN PENGUMUMAN */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pgmSearch}
                  onChange={(e) => setPgmSearch(e.target.value)}
                  placeholder="Cari judul atau isi pengumuman..."
                  className="w-full py-2.5 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={pgmFilterKategori}
                  onChange={(e) => setPgmFilterKategori(e.target.value)}
                  className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Kategori</option>
                  <option value="info">Informasi Umum</option>
                  <option value="penting">Penting</option>
                  <option value="peringatan">Peringatan</option>
                  <option value="kegiatan">Agenda Kegiatan</option>
                </select>

                <select
                  value={pgmFilterTarget}
                  onChange={(e) => setPgmFilterTarget(e.target.value)}
                  className="py-2.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Sasaran</option>
                  <option value="guru">Guru &amp; Staf</option>
                  <option value="siswa">Siswa</option>
                  <option value="wali_kelas">Wali Kelas</option>
                </select>
              </div>
            </div>

            {/* LIST PENGUMUMAN */}
            {filteredPengumuman.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Tidak ada pengumuman yang sesuai kriteria pencarian.</p>
                <p className="text-[11px] text-slate-400">Silakan ubah filter atau tambahkan publikasi baru.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPengumuman.map((item) => {
                  const badge = getKategoriBadge(item.kategori);
                  const targetLabel = getTargetBadge(item.target);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-3 ${
                        item.aktif
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider ${badge.bg}`}>
                            {badge.label}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Tag className="w-3 h-3 text-slate-400" />
                            <span>{targetLabel}</span>
                          </span>
                          {item.pinToLoginBanner && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 flex items-center gap-1">
                              <Bell className="w-3 h-3 text-indigo-500" />
                              <span>Popup Login</span>
                            </span>
                          )}
                          {item.pinToDashboard && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                              <Pin className="w-3 h-3 text-blue-500" />
                              <span>Dashboard</span>
                            </span>
                          )}
                          {item.pinToRunningText && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                              <Megaphone className="w-3 h-3 text-amber-500" />
                              <span>Running Text</span>
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateIndo(item.tanggal)} • Oleh: <strong className="text-slate-600 dark:text-slate-300">{item.penulis || 'Admin'}</strong>
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                          {item.judul}
                        </h4>

                        <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                          {item.isi}
                        </p>

                        {item.linkUrl && (
                          <div className="pt-1">
                            <a
                              href={item.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-bold transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>{item.linkText || 'Lihat Tautan / Lampiran'}</span>
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleToggleAktifPengumuman(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            item.aktif
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                          title="Ubah status aktif publikasi"
                        >
                          {item.aktif ? 'Tayang' : 'Draft / Nonaktif'}
                        </button>

                        {!readOnly && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditPengumuman(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                              title="Edit Pengumuman"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePengumuman(item.id, item.judul)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                              title="Hapus Pengumuman"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HEADER, SIDEBAR & FOOTER */}
      {/* ========================================================================= */}
      {activeTab === 'tampilan_header' && (
        <form onSubmit={(e) => handleSaveSettings(e, 'Pengaturan Header, Sidebar & Footer berhasil disimpan!')} className="space-y-6">
          {/* Header & Sidebar Customization */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Kustomisasi Judul Header Sidebar &amp; Tab Web</h3>
                <p className="text-xs text-slate-500">Atur judul utama, sub-judul sidebar, serta teks judul di tab peramban browser.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Judul Header Sidebar (Brand Title)</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={headerTitle}
                  onChange={(e) => setHeaderTitle(e.target.value)}
                  placeholder="Misal: Absensi Siswa"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Sub-judul Header Sidebar (Brand Subtitle)</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={headerSubtitle}
                  onChange={(e) => setHeaderSubtitle(e.target.value)}
                  placeholder="Misal: SMKN 6 GARUT"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Judul Tab Browser (Browser Tab Title)</label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={browserTitle}
                  onChange={(e) => setBrowserTitle(e.target.value)}
                  placeholder="Misal: SMKN 6 GARUT - Absensi Siswa"
                  className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Teks yang akan tampil di tab jendela peramban web pengguna.</p>
              </div>
            </div>
          </div>

          {/* Pengaturan Live Chat */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Fasilitas Live Chat Admin &amp; Pengguna</span>
            </h3>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center sm:justify-start gap-2">
                  <span>Status Fitur Live Chat:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      enableLiveChat
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {enableLiveChat ? 'Aktif (ON)' : 'Nonaktif (OFF)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gunakan sakelar ini untuk mengaktifkan atau menonaktifkan fasilitas komunikasi langsung ke Administrator.
                </p>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => setEnableLiveChat(!enableLiveChat)}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${
                    enableLiveChat ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-rose-600 shadow-md shadow-rose-600/30'
                  }`}
                  title={`Klik slider untuk ${enableLiveChat ? 'mematikan' : 'mengaktifkan'} Live Chat`}
                >
                  <span className="sr-only">Toggle Live Chat Status</span>
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center font-black text-[10px] ${
                      enableLiveChat ? 'translate-x-8 text-emerald-600' : 'translate-x-0 text-rose-600'
                    }`}
                  >
                    {enableLiveChat ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Pengaturan Footer Aplikasi */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Pengaturan Footer Aplikasi</span>
            </h3>

            <div className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <input
                type="checkbox"
                id="showFooterToggle"
                disabled={readOnly}
                checked={showFooter}
                onChange={(e) => setShowFooter(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
              />
              <label htmlFor="showFooterToggle" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                Tampilkan Footer di Bagian Bawah Halaman Aplikasi
              </label>
            </div>

            {showFooter && (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Teks Hak Cipta / Footer Utama
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={footerTeks}
                    onChange={(e) => setFooterTeks(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Misal: © 2026 SMKN 6 Garut. Hak Cipta Dilindungi."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Teks Sub-Footer / Keterangan Tambahan
                  </label>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={footerSubTeks}
                    onChange={(e) => setFooterSubTeks(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Misal: Dikembangkan untuk efisiensi dan transparansi rekap kehadiran."
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="showAppVersionToggle"
                      disabled={readOnly}
                      checked={showAppVersion}
                      onChange={(e) => setShowAppVersion(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 dark:border-slate-600 cursor-pointer"
                    />
                    <label htmlFor="showAppVersionToggle" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                      Tampilkan Badge Versi Aplikasi di Halaman Login &amp; Footer
                    </label>
                  </div>

                  {showAppVersion && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                        Nomor / Label Versi Aplikasi
                      </label>
                      <input
                        type="text"
                        disabled={readOnly}
                        value={appVersion}
                        onChange={(e) => setAppVersion(e.target.value)}
                        className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Misal: v2.5.0"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-xs shadow-lg shadow-slate-700/25 transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Header, Sidebar &amp; Footer</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MODE OFFLINE & SINKRONISASI */}
      {/* ========================================================================= */}
      {activeTab === 'offline' && (
        <form
          onSubmit={(e) => handleSaveSettings(e, 'Pengaturan Mode Offline & Sinkronisasi berhasil disimpan!')}
          className="space-y-6"
        >
          {/* Master Switch Banner */}
          <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
            enableOfflineMode
              ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-white dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border-emerald-200/80 dark:border-emerald-800/60 shadow-sm'
              : 'bg-gradient-to-br from-rose-500/10 via-rose-50/40 to-white dark:from-rose-950/40 dark:via-slate-900 dark:to-slate-900 border-rose-200/80 dark:border-rose-800/60 shadow-sm'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                  enableOfflineMode
                    ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                    : 'bg-rose-500 text-white shadow-rose-500/30'
                }`}>
                  {enableOfflineMode ? <Wifi className="w-7 h-7" /> : <WifiOff className="w-7 h-7" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Status Fitur Mode Offline (Offline Storage &amp; Local Fallback)
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${
                      enableOfflineMode
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {enableOfflineMode ? 'AKTIF (ENABLED)' : 'NONAKTIF (DISABLED)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                    {enableOfflineMode
                      ? 'Fitur offline aktif: Pengguna dapat tetap menginput presensi dan melihat jadwal guru/siswa saat koneksi internet terputus menggunakan LocalStorage lokal perangkat.'
                      : 'Fitur offline nonaktif: Aplikasi memblokir akses lokal saat internet terputus dan mewajibkan koneksi aktif ke server pusat cloud/MySQL untuk menjamin integritas data real-time.'}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-3">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    const nextVal = !enableOfflineMode;
                    setEnableOfflineMode(nextVal);
                    if (!nextVal) {
                      onShowToast('Mode Offline dinonaktifkan. Pengguna akan diwajibkan terkoneksi internet.', 'warning');
                    } else {
                      onShowToast('Mode Offline diaktifkan. Akses lokal diizinkan saat koneksi terputus.', 'info');
                    }
                  }}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                    enableOfflineMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                      enableOfflineMode ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Opsi Perilaku & Kebijakan Mode Offline */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Kebijakan Akses &amp; Perilaku Sinkronisasi Offline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Konfigurasikan bagaimana sistem menangani putusnya jaringan, notifikasi, dan tombol bypass lokal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opsi 1: Allow Offline Bypass */}
              <div className={`p-4 rounded-2xl border transition-all ${
                allowOfflineBypass
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-900/50'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-100 block cursor-pointer">
                      Izinkan Tombol Lanjutkan Offline (Bypass Modal)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Bila diaktifkan, guru &amp; staf dapat menekan tombol &ldquo;Lanjutkan Mode Offline (Akses Lokal)&rdquo; pada layar peringatan untuk tetap mencatat presensi tanpa internet.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={readOnly || !enableOfflineMode}
                    checked={allowOfflineBypass && enableOfflineMode}
                    onChange={(e) => setAllowOfflineBypass(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded-lg border-slate-300 focus:ring-blue-500 mt-1 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Opsi 2: Auto Sync On Reconnect */}
              <div className={`p-4 rounded-2xl border transition-all ${
                autoSyncOnReconnect
                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/50'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-100 block cursor-pointer">
                      Otomatis Sinkronisasi Saat Online Kembali
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Seketika internet tersambung kembali, sistem secara proaktif menyinkronkan data presensi lokal dan log mutasi ke server MySQL/Cloud.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={autoSyncOnReconnect}
                    onChange={(e) => setAutoSyncOnReconnect(e.target.checked)}
                    className="w-5 h-5 text-emerald-600 rounded-lg border-slate-300 focus:ring-emerald-500 mt-1 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Opsi 3: Toast Notification on Offline/Online */}
              <div className={`p-4 rounded-2xl border transition-all ${
                showOfflineToastWarning
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/50'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-100 block cursor-pointer">
                      Notifikasi Pop-up Status Koneksi Jaringan
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Tampilkan notifikasi pop-up (Toast Alert) saat browser mendeteksi transisi dari kondisi Online ke Offline atau sebaliknya.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={showOfflineToastWarning}
                    onChange={(e) => setShowOfflineToastWarning(e.target.checked)}
                    className="w-5 h-5 text-amber-600 rounded-lg border-slate-300 focus:ring-amber-500 mt-1 cursor-pointer disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Opsi 4: Local Storage Persistence Health & Cache Clean */}
              <div className="p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-100">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Proteksi Cache &amp; Keamanan Data Lokal</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Data master siswa, kelas, guru, dan presensi otomatis di-cache ke LocalStorage terenkripsi browser untuk pencegahan kehilangan data saat koneksi drop mendadak.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCleaningCache}
                    onClick={handleCleanCache}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCleaningCache ? 'animate-spin' : ''}`} />
                    <span>{isCleaningCache ? 'Membersihkan...' : 'Bersihkan Cache'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Offline Message / Instructions */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Pesan Instruksi / Bantuan Kustom Layar Offline
              </label>
              <textarea
                rows={3}
                disabled={readOnly}
                value={offlineNoticeMessage}
                onChange={(e) => setOfflineNoticeMessage(e.target.value)}
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: Jika mengalami kendala jaringan di lingkungan sekolah, silakan hubungi Tim IT / Helpdesk di Ruang Server atau hubungi ext. 102."
              />
              <p className="text-[11px] text-slate-400">
                Pesan ini akan ditampilkan pada layar peringatan offline kepada guru atau siswa ketika sambungan internet terputus.
              </p>
            </div>
          </div>

          {/* Diagnostik & Pengujian Koneksi */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Panel Diagnostik &amp; Pengujian Sistem Offline
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Periksa status perangkat saat ini, kapasitas penyimpanan cache lokal, dan latensi server.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isTestingPing}
                onClick={async () => {
                  setIsTestingPing(true);
                  const start = Date.now();
                  try {
                    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
                    const elapsed = Date.now() - start;
                    if (res.ok) {
                      setPingResult({
                        status: 'success',
                        message: `Server merespons normal (HTTP 200). Latensi: ${elapsed}ms`,
                        ms: elapsed,
                      });
                      onShowToast(`Koneksi server aktif (${elapsed}ms)`, 'success');
                    } else {
                      setPingResult({
                        status: 'failed',
                        message: `Server merespons status HTTP ${res.status}`,
                        ms: elapsed,
                      });
                      onShowToast('Server merespons galat', 'warning');
                    }
                  } catch (err: any) {
                    setPingResult({
                      status: 'failed',
                      message: `Gagal menjangkau server: ${err.message || 'Network Error'}`,
                    });
                    onShowToast('Gagal menghubungi server pusat', 'error');
                  } finally {
                    setIsTestingPing(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingPing ? 'animate-spin' : ''}`} />
                <span>{isTestingPing ? 'Menguji Koneksi...' : 'Uji Koneksi Server'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Status Browser</div>
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100">
                  {typeof navigator !== 'undefined' && navigator.onLine ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Online (Terhubung)</span>
                    </>
                  ) : (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-rose-600 dark:text-rose-400">Offline (Terputus)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Kapasitas Storage Presensi</div>
                <div className="flex items-center gap-2 font-black text-slate-800 dark:text-slate-100">
                  <Database className="w-4 h-4 text-blue-500" />
                  <span>{Object.keys(appData.presensi || {}).length} Sesi Presensi Tersimpan</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Status Diagnostik Server</div>
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                  {pingResult.status === 'success' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Online ({pingResult.ms}ms)</span>
                    </span>
                  ) : pingResult.status === 'failed' ? (
                    <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Gagal / Terputus</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Belum diuji</span>
                  )}
                </div>
              </div>
            </div>

            {pingResult.message && (
              <div className={`p-3.5 rounded-2xl text-xs font-medium border flex items-center gap-2.5 ${
                pingResult.status === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                {pingResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{pingResult.message}</span>
              </div>
            )}
          </div>

          {!readOnly && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-600/25 transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Mode Offline</span>
              </button>
            </div>
          )}
        </form>
      )}

      {/* MODAL PRATINJAU BANNER POPUP PENGUMUMAN LOGIN */}
      {previewLoginAnnouncementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden space-y-0">
            {/* Header Dialog */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${
              loginAnnouncementType === 'penting'
                ? 'bg-amber-500/15 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
                : loginAnnouncementType === 'peringatan'
                ? 'bg-rose-500/15 border-rose-200 dark:border-rose-900/50 text-rose-950 dark:text-rose-200'
                : loginAnnouncementType === 'kegiatan'
                ? 'bg-emerald-500/15 border-emerald-200 dark:border-emerald-900/50 text-emerald-950 dark:text-emerald-200'
                : 'bg-blue-500/15 border-blue-200 dark:border-blue-900/50 text-blue-950 dark:text-blue-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${
                  loginAnnouncementType === 'penting'
                    ? 'bg-amber-500'
                    : loginAnnouncementType === 'peringatan'
                    ? 'bg-rose-500'
                    : loginAnnouncementType === 'kegiatan'
                    ? 'bg-emerald-500'
                    : 'bg-blue-600'
                }`}>
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider opacity-80">
                    Pratinjau Pengumuman Layar Masuk
                  </span>
                  <h3 className="text-sm font-black leading-tight">
                    {loginAnnouncementTitle || 'Pengumuman Resmi Sekolah'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLoginAnnouncementModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Dialog */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {loginAnnouncementType.toUpperCase()}
                </span>
                <span>•</span>
                <span>{formatDateIndo(getTodayString())}</span>
                <span>•</span>
                <span>{sekolah.nama || 'SMKN 6 Garut'}</span>
              </div>

              <div className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-line leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 font-medium">
                {loginAnnouncementText || 'Isi pesan pengumuman login akan tampil di sini kepada seluruh pengguna sebelum melakukan login ke sistem presensi.'}
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-blue-500" />
                <span>Jendela ini muncul otomatis di layar login saat opsi status aktif.</span>
              </div>
            </div>

            {/* Footer Dialog */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewLoginAnnouncementModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Saya Mengerti (Tutup)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
