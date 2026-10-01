import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Sparkles,
  Layers,
  Palette,
  RotateCcw,
  Save,
  Check,
  Eye,
  Sliders,
  SlidersHorizontal,
  FileImage,
  Link,
  ShieldCheck,
  School,
  Sun,
  Moon,
  Trash2,
  Type,
  FileText,
  Smartphone,
  MessageSquare,
  CheckCircle2,
  Tag,
  Info,
  Globe,
  Phone,
  BookOpen,
  HelpCircle,
  ExternalLink,
  Mail,
  ArrowUp,
  ArrowDown,
  Plus,
  Edit,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { AppData, SekolahConfig, LoginCustomLink } from '../../types';
import {
  LOGIN_IMAGE_PRESETS,
  LOGIN_GRADIENT_PRESETS,
  LOGIN_PATTERN_PRESETS,
} from '../../data/loginBackgroundPresets';
import { compressBase64Image, addAuditLog } from '../../utils/helpers';

interface LoginBackgroundSettingsProps {
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

type SettingsTab = 'left_panel' | 'background' | 'custom_links';
type BgTypeTab = 'default' | 'image' | 'gradient' | 'pattern' | 'color';

export const LoginBackgroundSettings: React.FC<LoginBackgroundSettingsProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};

  // Tab State
  const [activeTab, setActiveTab] = useState<SettingsTab>('left_panel');

  // Background Form states
  const [bgType, setBgType] = useState<BgTypeTab>(
    (sekolah.loginBgType as BgTypeTab) || (sekolah.loginBgImage ? 'image' : 'default')
  );
  const [bgImage, setBgImage] = useState<string>(sekolah.loginBgImage || '');
  const [bgGradient, setBgGradient] = useState<string>(
    sekolah.loginBgGradient || LOGIN_GRADIENT_PRESETS[0].gradient
  );
  const [bgPattern, setBgPattern] = useState<string>(
    sekolah.loginBgPattern || LOGIN_PATTERN_PRESETS[0].id
  );
  const [bgColor, setBgColor] = useState<string>(sekolah.loginBgColor || '#1e3a8a');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(
    sekolah.loginBgOverlayOpacity ?? (sekolah.loginBgOpacity ? Math.round((1 - sekolah.loginBgOpacity) * 100) : 35)
  );
  const [blurLevel, setBlurLevel] = useState<'none' | 'sm' | 'md' | 'lg'>(
    sekolah.loginBgBlur || 'none'
  );
  const [bgFit, setBgFit] = useState<'cover' | 'contain' | 'tile'>(
    sekolah.loginBgFit || 'cover'
  );
  const [overlayColor, setOverlayColor] = useState<string>(
    sekolah.loginBgOverlayColor || '#020617'
  );
  const [cardOpacity, setCardOpacity] = useState<number>(
    sekolah.loginCardOpacity ?? 60
  );
  const [cardBlur, setCardBlur] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>(
    sekolah.loginCardBlur || '2xl'
  );

  // Left Panel Text States
  const [loginLeftShowPanel, setLoginLeftShowPanel] = useState<boolean>(
    sekolah.loginLeftShowPanel !== false
  );
  const [loginLeftBadgeText, setLoginLeftBadgeText] = useState<string>(
    sekolah.loginLeftBadgeText || `Portal Kehadiran Terpadu ${sekolah.nama || 'SMK Negeri 6 Garut'}`
  );
  const [loginLeftTitlePrefix, setLoginLeftTitlePrefix] = useState<string>(
    sekolah.loginLeftTitlePrefix || 'Sistem Presensi'
  );
  const [loginLeftTitleHighlight, setLoginLeftTitleHighlight] = useState<string>(
    sekolah.loginLeftTitleHighlight || 'Digital & OTP'
  );
  const [loginLeftDescription, setLoginLeftDescription] = useState<string>(
    sekolah.loginLeftDescription ||
      'Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.'
  );
  const [loginLeftFeature1Title, setLoginLeftFeature1Title] = useState<string>(
    sekolah.loginLeftFeature1Title || 'Presensi Digital'
  );
  const [loginLeftFeature1Subtitle, setLoginLeftFeature1Subtitle] = useState<string>(
    sekolah.loginLeftFeature1Subtitle || 'Cepat, Praktis & Akurat'
  );
  const [loginLeftFeature2Title, setLoginLeftFeature2Title] = useState<string>(
    sekolah.loginLeftFeature2Title || 'OTP WhatsApp'
  );
  const [loginLeftFeature2Subtitle, setLoginLeftFeature2Subtitle] = useState<string>(
    sekolah.loginLeftFeature2Subtitle || 'Verifikasi Cepat & Aman'
  );

  // Custom Links state
  const [customLinks, setCustomLinks] = useState<LoginCustomLink[]>(() => {
    if (Array.isArray(sekolah.loginCustomLinks) && sekolah.loginCustomLinks.length > 0) {
      return JSON.parse(JSON.stringify(sekolah.loginCustomLinks));
    }
    return [
      {
        id: 'LNK_1',
        label: 'Website Sekolah',
        description: 'Kunjungi portal website utama SMK Negeri 6 Garut',
        url: 'https://smkn6garut.sch.id',
        iconName: 'Globe',
        openInNewTab: true,
      },
      {
        id: 'LNK_2',
        label: 'Pusat Bantuan WhatsApp',
        description: 'Layanan konsultasi & kendala teknis presensi',
        url: 'https://wa.me/6281234567890',
        iconName: 'Phone',
        openInNewTab: true,
      },
      {
        id: 'LNK_3',
        label: 'Panduan Presensi',
        description: 'Petunjuk cara absensi siswa & tata tertib',
        url: '#',
        iconName: 'BookOpen',
        openInNewTab: false,
      },
    ];
  });
  const [customLinksDisplayMode, setCustomLinksDisplayMode] = useState<'dropdown' | 'inline'>(
    sekolah.loginCustomLinksDisplayMode || 'dropdown'
  );
  const [customLinksTitle, setCustomLinksTitle] = useState<string>(
    sekolah.loginCustomLinksTitle || 'Tautan Cepat & Bantuan'
  );

  // Link Form state
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkFormLabel, setLinkFormLabel] = useState('');
  const [linkFormDescription, setLinkFormDescription] = useState('');
  const [linkFormUrl, setLinkFormUrl] = useState('');
  const [linkFormIcon, setLinkFormIcon] = useState<any>('Globe');
  const [linkFormOpenNewTab, setLinkFormOpenNewTab] = useState(true);
  const [previewDropdownOpen, setPreviewDropdownOpen] = useState(false);

  // Handlers for Custom Links
  const handleOpenAddLink = () => {
    setEditingLinkId(null);
    setLinkFormLabel('');
    setLinkFormDescription('');
    setLinkFormUrl('');
    setLinkFormIcon('Globe');
    setLinkFormOpenNewTab(true);
    setIsEditingLink(true);
  };

  const handleOpenEditLink = (link: LoginCustomLink) => {
    setEditingLinkId(link.id);
    setLinkFormLabel(link.label);
    setLinkFormDescription(link.description || '');
    setLinkFormUrl(link.url);
    setLinkFormIcon(link.iconName || 'Globe');
    setLinkFormOpenNewTab(link.openInNewTab !== false);
    setIsEditingLink(true);
  };

  const handleSaveLink = () => {
    if (!linkFormLabel.trim()) {
      onShowToast('Judul / Label tautan wajib diisi.', 'warning');
      return;
    }
    if (!linkFormUrl.trim()) {
      onShowToast('URL / Alamat tautan wajib diisi (contoh: https://..., wa.me/..., atau #)', 'warning');
      return;
    }

    if (editingLinkId) {
      setCustomLinks((prev) =>
        prev.map((item) =>
          item.id === editingLinkId
            ? {
                ...item,
                label: linkFormLabel.trim(),
                description: linkFormDescription.trim() || undefined,
                url: linkFormUrl.trim(),
                iconName: linkFormIcon,
                openInNewTab: linkFormOpenNewTab,
              }
            : item
        )
      );
      onShowToast('Tautan berhasil diperbarui!', 'success');
    } else {
      const newLink: LoginCustomLink = {
        id: `LNK_${Date.now()}`,
        label: linkFormLabel.trim(),
        description: linkFormDescription.trim() || undefined,
        url: linkFormUrl.trim(),
        iconName: linkFormIcon,
        openInNewTab: linkFormOpenNewTab,
      };
      setCustomLinks((prev) => [...prev, newLink]);
      onShowToast('Tautan kustom baru berhasil ditambahkan!', 'success');
    }

    setIsEditingLink(false);
    setEditingLinkId(null);
  };

  const handleDeleteLink = (id: string, label: string) => {
    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Tautan Kustom',
        `Apakah Anda yakin ingin menghapus tautan "${label}" dari halaman login?`,
        'danger',
        () => {
          setCustomLinks((prev) => prev.filter((item) => item.id !== id));
          onShowToast(`Tautan "${label}" berhasil dihapus.`, 'info');
        }
      );
    } else {
      setCustomLinks((prev) => prev.filter((item) => item.id !== id));
      onShowToast(`Tautan "${label}" berhasil dihapus.`, 'info');
    }
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === customLinks.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...customLinks];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setCustomLinks(updated);
  };

  const handleAddPresetLink = (preset: { label: string; description?: string; url: string; iconName: any }) => {
    const newLink: LoginCustomLink = {
      id: `LNK_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: preset.label,
      description: preset.description,
      url: preset.url,
      iconName: preset.iconName,
      openInNewTab: preset.url !== '#',
    };
    setCustomLinks((prev) => [...prev, newLink]);
    onShowToast(`Preset "${preset.label}" berhasil ditambahkan!`, 'success');
  };

  // Upload/URL Sub-tabs for Image
  const [imageSourceTab, setImageSourceTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Upload & Base64 Compression
  const handleProcessFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onShowToast('File harus berupa gambar (JPG, PNG, WebP, dll).', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onShowToast('Ukuran file terlalu besar (Maksimal 10MB).', 'warning');
      return;
    }

    try {
      setIsUploading(true);
      const compressed = await compressBase64Image(file, 2560, 0.90, false);
      if (compressed) {
        setBgImage(compressed);
        setBgType('image');
        onShowToast('Foto background berhasil dimuat dalam resolusi tinggi!', 'success');
      } else {
        onShowToast('Gagal memproses file gambar.', 'error');
      }
    } catch (e) {
      console.error(e);
      onShowToast('Terjadi kesalahan saat memproses gambar.', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!customUrlInput.trim()) {
      onShowToast('Silakan masukkan tautan URL gambar yang valid.', 'warning');
      return;
    }
    setBgImage(customUrlInput.trim());
    setBgType('image');
    onShowToast('URL Background berhasil diterapkan!', 'success');
  };

  // Quick Preset Text Template Application
  const applyTextPreset = (type: 'default' | 'akademik' | 'kedisiplinan' | 'singkat') => {
    const schoolName = sekolah.nama || 'SMK Negeri 6 Garut';
    switch (type) {
      case 'default':
        setLoginLeftBadgeText(`Portal Kehadiran Terpadu ${schoolName}`);
        setLoginLeftTitlePrefix('Sistem Presensi');
        setLoginLeftTitleHighlight('Digital & OTP');
        setLoginLeftDescription('Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.');
        setLoginLeftFeature1Title('Presensi Digital');
        setLoginLeftFeature1Subtitle('Cepat, Praktis & Akurat');
        setLoginLeftFeature2Title('OTP WhatsApp');
        setLoginLeftFeature2Subtitle('Verifikasi Cepat & Aman');
        break;
      case 'akademik':
        setLoginLeftBadgeText(`Portal Akademik & Presensi ${schoolName}`);
        setLoginLeftTitlePrefix('Portal Digital');
        setLoginLeftTitleHighlight('Siswa & Guru');
        setLoginLeftDescription('Sistem rekapitulasi kehadiran belajar mengajar, monitoring jurnal kelas, dan integrasi absensi harian sekolah.');
        setLoginLeftFeature1Title('Presensi KBM Real-time');
        setLoginLeftFeature1Subtitle('Terhubung dengan Jadwal');
        setLoginLeftFeature2Title('Laporan Kehadiran');
        setLoginLeftFeature2Subtitle('Rekap Otomatis Wali Kelas');
        break;
      case 'kedisiplinan':
        setLoginLeftBadgeText(`Sistem Monitoring Disiplin ${schoolName}`);
        setLoginLeftTitlePrefix('Presensi & Disiplin');
        setLoginLeftTitleHighlight('Terpadu Sekolah');
        setLoginLeftDescription('Mewujudkan kedisiplinan dan transparansi kehadiran siswa dengan notifikasi otomatis ke orang tua dan wali kelas.');
        setLoginLeftFeature1Title('Validasi Kehadiran');
        setLoginLeftFeature1Subtitle('QR Code & Verifikasi OTP');
        setLoginLeftFeature2Title('Info Orang Tua');
        setLoginLeftFeature2Subtitle('Notifikasi WA Real-time');
        break;
      case 'singkat':
        setLoginLeftBadgeText(`Selamat Datang di ${schoolName}`);
        setLoginLeftTitlePrefix('Sistem Absensi');
        setLoginLeftTitleHighlight('Digital');
        setLoginLeftDescription('Silakan masuk ke akun Anda untuk melakukan pencatatan presensi kehadiran dan mengakses informasi sekolah.');
        setLoginLeftFeature1Title('Akurat & Cepat');
        setLoginLeftFeature1Subtitle('Scan QR & Portal Siswa');
        setLoginLeftFeature2Title('Aman Terenkripsi');
        setLoginLeftFeature2Subtitle('Proteksi Data Sekolah');
        break;
    }
    onShowToast('Template teks berhasil dimuat! Klik "Simpan Pengaturan" untuk menerapkan.', 'info');
  };

  // Save Settings to AppData
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (readOnly) return;

    const baseSekolah: SekolahConfig = appData.sekolah || {
      nama: 'SMKN 6 GARUT',
      alamat: '',
      tahunAjaran: '2026/2027',
      tanggalMulai: '2026-07-15',
      logo: '',
    };

    const updatedSekolah: SekolahConfig = {
      ...baseSekolah,
      loginBgType: bgType,
      loginBgImage: bgType === 'image' ? bgImage : undefined,
      loginBgGradient: bgType === 'gradient' ? bgGradient : undefined,
      loginBgPattern: bgType === 'pattern' ? bgPattern : undefined,
      loginBgColor: bgType === 'color' ? bgColor : undefined,
      loginBgOverlayOpacity: overlayOpacity,
      loginBgOpacity: Number(((100 - overlayOpacity) / 100).toFixed(2)),
      loginBgBlur: blurLevel,
      loginBgFit: bgFit,
      loginBgOverlayColor: overlayColor,
      loginCardOpacity: cardOpacity,
      loginCardBlur: cardBlur,
      loginLeftShowPanel,
      loginLeftBadgeText,
      loginLeftTitlePrefix,
      loginLeftTitleHighlight,
      loginLeftDescription,
      loginLeftFeature1Title,
      loginLeftFeature1Subtitle,
      loginLeftFeature2Title,
      loginLeftFeature2Subtitle,
      loginCustomLinks: customLinks,
      loginCustomLinksDisplayMode: customLinksDisplayMode,
      loginCustomLinksTitle: customLinksTitle,
    };

    let updatedAppData: AppData = {
      ...appData,
      sekolah: updatedSekolah,
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Pengaturan Tampilan Login',
      `Memperbarui kustomisasi halaman login (Teks panel kiri, tautan kustom mode ${customLinksDisplayMode}, & background tipe: ${bgType}).`
    );

    onUpdateAppData(updatedAppData);
    onShowToast('Pengaturan Halaman Login berhasil disimpan!', 'success');
  };

  // Reset to default
  const handleResetToDefault = () => {
    const doReset = () => {
      setBgType('default');
      setBgImage('');
      setBgGradient(LOGIN_GRADIENT_PRESETS[0].gradient);
      setBgPattern(LOGIN_PATTERN_PRESETS[0].id);
      setBgColor('#1e3a8a');
      setOverlayOpacity(35);
      setBlurLevel('none');
      setBgFit('cover');
      setOverlayColor('#020617');
      setCardOpacity(60);
      setCardBlur('2xl');

      // Reset text
      setLoginLeftShowPanel(true);
      setLoginLeftBadgeText(`Portal Kehadiran Terpadu ${sekolah.nama || 'SMK Negeri 6 Garut'}`);
      setLoginLeftTitlePrefix('Sistem Presensi');
      setLoginLeftTitleHighlight('Digital & OTP');
      setLoginLeftDescription('Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.');
      setLoginLeftFeature1Title('Presensi Digital');
      setLoginLeftFeature1Subtitle('Cepat, Praktis & Akurat');
      setLoginLeftFeature2Title('OTP WhatsApp');
      setLoginLeftFeature2Subtitle('Verifikasi Cepat & Aman');

      const baseSekolah: SekolahConfig = appData.sekolah || {
        nama: 'SMKN 6 GARUT',
        alamat: '',
        tahunAjaran: '2026/2027',
        tanggalMulai: '2026-07-15',
        logo: '',
      };

      const updatedSekolah: SekolahConfig = {
        ...baseSekolah,
        loginBgType: 'default',
        loginBgImage: undefined,
        loginBgGradient: undefined,
        loginBgPattern: undefined,
        loginBgColor: undefined,
        loginBgOverlayOpacity: 35,
        loginBgOpacity: 0.65,
        loginBgBlur: 'none',
        loginBgFit: 'cover',
        loginBgOverlayColor: '#020617',
        loginCardOpacity: 60,
        loginCardBlur: '2xl',
        loginLeftShowPanel: true,
        loginLeftBadgeText: undefined,
        loginLeftTitlePrefix: undefined,
        loginLeftTitleHighlight: undefined,
        loginLeftDescription: undefined,
        loginLeftFeature1Title: undefined,
        loginLeftFeature1Subtitle: undefined,
        loginLeftFeature2Title: undefined,
        loginLeftFeature2Subtitle: undefined,
      };

      const updatedAppData = addAuditLog(
        { ...appData, sekolah: updatedSekolah },
        'Reset Tampilan Login',
        'Mengembalikan tampilan latar belakang & teks halaman login ke tema bawaan resmi.'
      );

      onUpdateAppData(updatedAppData);
      onShowToast('Tampilan & Teks Login berhasil dikembalikan ke bawaan!', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Kembalikan Pengaturan Login ke Bawaan?',
        'Teks panel kiri dan latar belakang halaman login akan dikembalikan ke teks resmi bawaan.',
        'info',
        doReset
      );
    } else {
      doReset();
    }
  };

  // Helper to get preview style
  const getPreviewBackgroundStyle = (): React.CSSProperties => {
    if (bgType === 'image' && bgImage) {
      return {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: bgFit === 'tile' ? 'auto' : bgFit,
        backgroundRepeat: bgFit === 'tile' ? 'repeat' : 'no-repeat',
        backgroundPosition: 'center center',
      };
    }
    if (bgType === 'gradient') {
      return {
        background: bgGradient,
      };
    }
    if (bgType === 'pattern') {
      const pat = LOGIN_PATTERN_PRESETS.find((p) => p.id === bgPattern) || LOGIN_PATTERN_PRESETS[0];
      return {
        backgroundColor: pat.bgBase,
        backgroundImage: pat.svgPattern,
        backgroundSize: '24px 24px',
      };
    }
    if (bgType === 'color') {
      return {
        backgroundColor: bgColor,
      };
    }
    return {
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)',
    };
  };

  const getBlurFilter = () => {
    switch (blurLevel) {
      case 'sm': return 'blur(4px)';
      case 'md': return 'blur(8px)';
      case 'lg': return 'blur(16px)';
      default: return 'none';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info with Actions */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
            <Type className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Pengaturan Tampilan & Teks Halaman Login
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kustomisasi teks judul, deskripsi, poin fitur, branding panel kiri, serta latar belakang halaman login.
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        )}
      </div>

      {/* TABS SELECTOR: PANEL TEKS KIRI vs LATAR BELAKANG vs TAUTAN KUSTOM */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('left_panel')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'left_panel'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Type className="w-4 h-4" />
          <span>Teks & Panel Kiri</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('background')}
          className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'background'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Latar Belakang</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom_links')}
          className={`flex-1 min-w-[150px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'custom_links'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>Tautan Kustom / Link</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            {customLinks.length}
          </span>
        </button>
      </div>

      {/* Main Grid: Control Panel + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ========================================================= */}
          {/* TAB 1: KUSTOMISASI TEKS PANEL KIRI                       */}
          {/* ========================================================= */}
          {activeTab === 'left_panel' && (
            <div className="space-y-5">
              {/* Card 0: Toggle Show/Hide Left Panel */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Status Tampilan Panel Kiri
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tampilkan panel branding dan teks deskripsi di sisi kiri layar login (desktop/tablet).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={loginLeftShowPanel}
                    onChange={(e) => setLoginLeftShowPanel(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Card 1: Pilihan Cepat Template Teks */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Pilihan Cepat Template Teks</span>
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">1 Klik Terapkan</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => applyTextPreset('default')}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-left transition cursor-pointer"
                  >
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Presensi & OTP</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Template Bawaan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextPreset('akademik')}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-left transition cursor-pointer"
                  >
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Portal Akademik</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">KBM & Rekap Kelas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextPreset('kedisiplinan')}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-left transition cursor-pointer"
                  >
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Disiplin Sekolah</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Kehadiran & WA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTextPreset('singkat')}
                    className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-left transition cursor-pointer"
                  >
                    <span className="block text-xs font-bold text-slate-800 dark:text-white">Teks Singkat</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">Ringkas & Minimal</span>
                  </button>
                </div>
              </div>

              {/* Card 2: Badge / Tag Header Atas */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Teks Label / Badge Atas
                </label>
                <input
                  type="text"
                  value={loginLeftBadgeText}
                  onChange={(e) => setLoginLeftBadgeText(e.target.value)}
                  placeholder="Contoh: Portal Kehadiran Terpadu SMK NEGERI 6 GARUT"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400">
                  Label pill berbentuk kapsul di bagian paling atas dengan indikator titik biru berkedip.
                </p>
              </div>

              {/* Card 3: Judul Utama & Highlight Gradasi */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Judul Utama Halaman Login
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Awalan Judul (Warna Putih/Solid)
                    </label>
                    <input
                      type="text"
                      value={loginLeftTitlePrefix}
                      onChange={(e) => setLoginLeftTitlePrefix(e.target.value)}
                      placeholder="Contoh: Sistem Presensi"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Judul Highlight (Efek Warna Gradasi)
                    </label>
                    <input
                      type="text"
                      value={loginLeftTitleHighlight}
                      onChange={(e) => setLoginLeftTitleHighlight(e.target.value)}
                      placeholder="Contoh: Digital & OTP"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/60 dark:border-blue-800/40 text-xs text-blue-900 dark:text-blue-300 font-medium flex items-center gap-2">
                  <span className="font-bold">Pratinjau Judul:</span>
                  <span>{loginLeftTitlePrefix || 'Sistem Presensi'}</span>
                  <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                    {loginLeftTitleHighlight || 'Digital & OTP'}
                  </span>
                </div>
              </div>

              {/* Card 4: Paragraf Deskripsi & Informasi */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Paragraf Deskripsi / Informasi Sekolah
                </label>
                <textarea
                  rows={3}
                  value={loginLeftDescription}
                  onChange={(e) => setLoginLeftDescription(e.target.value)}
                  placeholder="Masukkan kalimat pengantar atau deskripsi sistem presensi sekolah..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Teks ini menjelaskan fungsi dan kemudahan portal presensi bagi warga sekolah.
                </p>
              </div>

              {/* Card 5: Poin Fitur & Keunggulan (2 Kolom) */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Poin Fitur & Keunggulan (Bagian Bawah)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Fitur 1 */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                      <span>Poin Fitur 1</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Judul Fitur 1</label>
                      <input
                        type="text"
                        value={loginLeftFeature1Title}
                        onChange={(e) => setLoginLeftFeature1Title(e.target.value)}
                        placeholder="Contoh: Presensi Digital"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subjudul / Keterangan</label>
                      <input
                        type="text"
                        value={loginLeftFeature1Subtitle}
                        onChange={(e) => setLoginLeftFeature1Subtitle(e.target.value)}
                        placeholder="Contoh: Cepat, Praktis & Akurat"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Fitur 2 */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                      <MessageSquare className="w-4 h-4" />
                      <span>Poin Fitur 2</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Judul Fitur 2</label>
                      <input
                        type="text"
                        value={loginLeftFeature2Title}
                        onChange={(e) => setLoginLeftFeature2Title(e.target.value)}
                        placeholder="Contoh: OTP WhatsApp"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subjudul / Keterangan</label>
                      <input
                        type="text"
                        value={loginLeftFeature2Subtitle}
                        onChange={(e) => setLoginLeftFeature2Subtitle(e.target.value)}
                        placeholder="Contoh: Verifikasi Cepat & Aman"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: KUSTOMISASI LATAR BELAKANG                         */}
          {/* ========================================================= */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              {/* TIPE LATAR BELAKANG SELECTOR */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Pilih Jenis Latar Belakang (Style Type)</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setBgType('default')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      bgType === 'default'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      {bgType === 'default' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1">Bawaan Sistem</span>
                    <span className="text-[10px] text-slate-400">Ambient aura glow & grid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBgType('image');
                      if (!bgImage && LOGIN_IMAGE_PRESETS.length > 0) {
                        setBgImage(LOGIN_IMAGE_PRESETS[0].imageUrl);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      bgType === 'image'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <FileImage className="w-4 h-4 text-emerald-600" />
                      {bgType === 'image' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1">Foto / Gambar</span>
                    <span className="text-[10px] text-slate-400">Foto gedung atau upload</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgType('gradient')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      bgType === 'gradient'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Palette className="w-4 h-4 text-purple-600" />
                      {bgType === 'gradient' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1">Gradasi Warna</span>
                    <span className="text-[10px] text-slate-400">Preset gradasi modern</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgType('pattern')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      bgType === 'pattern'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      {bgType === 'pattern' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1">Pola Geometris</span>
                    <span className="text-[10px] text-slate-400">Pattern grid / dot / wave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBgType('color')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                      bgType === 'color'
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: bgColor }} />
                      {bgType === 'color' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                    <span className="text-xs font-bold mt-1">Warna Polos</span>
                    <span className="text-[10px] text-slate-400">Solid color pilihan</span>
                  </button>
                </div>
              </div>

              {/* IMAGE SELECTION PANEL */}
              {bgType === 'image' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Pilihan Sumber Gambar Foto
                    </h4>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setImageSourceTab('preset')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          imageSourceTab === 'preset'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Preset Sekolah
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceTab('upload')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          imageSourceTab === 'upload'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Upload Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageSourceTab('url')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          imageSourceTab === 'url'
                            ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Link URL
                      </button>
                    </div>
                  </div>

                  {imageSourceTab === 'preset' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {LOGIN_IMAGE_PRESETS.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setBgImage(item.imageUrl)}
                          className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-video flex flex-col justify-end p-2.5 ${
                            bgImage === item.imageUrl
                              ? 'border-blue-600 ring-4 ring-blue-500/20 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="relative z-10">
                            <p className="text-white text-xs font-bold leading-snug">{item.name}</p>
                            <span className="text-[10px] text-slate-300 capitalize">{item.category}</span>
                          </div>
                          {bgImage === item.imageUrl && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {imageSourceTab === 'upload' && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-3 shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isUploading ? 'Memproses dan Mengompresi Foto...' : 'Klik atau Tarik Foto Gedung Sekolah ke Sini'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Format JPG, PNG, atau WebP (Maksimal 10MB)
                      </p>
                    </div>
                  )}

                  {imageSourceTab === 'url' && (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        placeholder="https://domain-anda.sch.id/foto-sekolah.jpg"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                      >
                        Terapkan URL
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* GRADIENT PRESETS */}
              {bgType === 'gradient' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Pilihan Preset Gradasi
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {LOGIN_GRADIENT_PRESETS.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setBgGradient(item.gradient)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between h-24 ${
                          bgGradient === item.gradient
                            ? 'border-blue-600 ring-4 ring-blue-500/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                        style={{ background: item.gradient }}
                      >
                        <div className="flex justify-end">
                          {bgGradient === item.gradient && (
                            <div className="w-5 h-5 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-white text-xs font-bold drop-shadow-sm">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PATTERN PRESETS */}
              {bgType === 'pattern' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Pilihan Pola Geometris
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {LOGIN_PATTERN_PRESETS.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setBgPattern(item.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between h-24 ${
                          bgPattern === item.id
                            ? 'border-blue-600 ring-4 ring-blue-500/20 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                        style={{
                          backgroundColor: item.bgBase,
                          backgroundImage: item.svgPattern,
                          backgroundSize: '20px 20px',
                        }}
                      >
                        <div className="flex justify-end">
                          {bgPattern === item.id && (
                            <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                        <p className="text-white text-xs font-bold drop-shadow-sm bg-black/40 px-2 py-0.5 rounded-md w-fit">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOLID COLOR */}
              {bgType === 'color' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Pilih Warna Polos
                  </h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-slate-200"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs uppercase font-bold"
                    />
                  </div>
                </div>
              )}

              {/* OVERLAY & CARD GLASSMORPHISM */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  <span>Pengaturan Lapisan Tint & Transparansi Kartu</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Kegelapan Overlay Background</span>
                      <span className="text-blue-600">{overlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      value={overlayOpacity}
                      onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span>Opasitas Kaca Form Login</span>
                      <span className="text-blue-600">{cardOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={cardOpacity}
                      onChange={(e) => setCardOpacity(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: KUSTOMISASI TAUTAN KUSTOM / LINK HALAMAN LOGIN     */}
          {/* ========================================================= */}
          {activeTab === 'custom_links' && (
            <div className="space-y-6">
              {/* Card 1: Model Tampilan (Dropdown vs Inline) & Judul */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Link className="w-4 h-4 text-blue-600" />
                      <span>Model Tampilan Tautan Login</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Pilih format bagaimana tautan dan link bantuan ditampilkan pada kartu login.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {customLinks.length} Tautan Aktif
                  </span>
                </div>

                {/* Model Selector Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setCustomLinksDisplayMode('dropdown')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      customLinksDisplayMode === 'dropdown'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-4 ring-blue-500/15 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400">
                        <ChevronDown className="w-4 h-4" />
                        <span>Model Dropdown (Rekomendasi)</span>
                      </div>
                      {customLinksDisplayMode === 'dropdown' && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Satu tombol dropdown elegan dengan popover menu. Sangat rapi, hemat ruang layar, dan mendukung banyak tautan dengan deskripsi detail.
                    </p>
                  </div>

                  <div
                    onClick={() => setCustomLinksDisplayMode('inline')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      customLinksDisplayMode === 'inline'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-4 ring-blue-500/15 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
                        <Tag className="w-4 h-4" />
                        <span>Model Deretan Tombol (Inline Badges)</span>
                      </div>
                      {customLinksDisplayMode === 'inline' && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      Tautan ditampilkan mendatar dalam bentuk pill badges berdampingan di bawah form login. Cocok jika tautan berjumlah sedikit (1–3 link).
                    </p>
                  </div>
                </div>

                {/* Judul Dropdown Field */}
                {customLinksDisplayMode === 'dropdown' && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Label / Judul Tombol Dropdown
                    </label>
                    <input
                      type="text"
                      value={customLinksTitle}
                      onChange={(e) => setCustomLinksTitle(e.target.value)}
                      placeholder="Contoh: Tautan Cepat & Bantuan"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Teks ini akan muncul pada tombol menu dropdown di halaman login.
                    </p>
                  </div>
                )}
              </div>

              {/* Card 2: Preset Tautan Cepat */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Preset Tautan Populer Sekolah</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Klik untuk menambahkan</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'Website Sekolah Resmi',
                        description: `Portal informasi utama ${sekolah.nama || 'SMKN 6 Garut'}`,
                        url: 'https://smkn6garut.sch.id',
                        iconName: 'Globe',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>+ Website Sekolah</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'Pusat Bantuan WhatsApp',
                        description: 'Layanan konsultasi & kendala presensi',
                        url: 'https://wa.me/6281234567890',
                        iconName: 'Phone',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:hover:bg-emerald-900 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>+ WhatsApp Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'Panduan & Tata Tertib Siswa',
                        description: 'Petunjuk cara absensi & aturan sekolah',
                        url: '#',
                        iconName: 'BookOpen',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:hover:bg-amber-900 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>+ Panduan Siswa</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'Portal PPDB Online',
                        description: 'Pendaftaran Peserta Didik Baru',
                        url: 'https://ppdb.jabarprov.go.id',
                        iconName: 'School',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 dark:bg-cyan-950/70 dark:hover:bg-cyan-900 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <School className="w-3.5 h-3.5" />
                    <span>+ Portal PPDB</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'E-Learning / LMS Sekolah',
                        description: 'Platform materi & pembelajaran digital',
                        url: 'https://elearning.sekolah.id',
                        iconName: 'Sparkles',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:hover:bg-purple-900 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>+ E-Learning</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleAddPresetLink({
                        label: 'Email Layanan Informasi',
                        description: 'Surat elektronik resmi tata usaha',
                        url: 'mailto:info@smkn6garut.sch.id',
                        iconName: 'Mail',
                      })
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:hover:bg-rose-900 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>+ Email Sekolah</span>
                  </button>
                </div>
              </div>

              {/* Card 3: Form Tambah / Edit Tautan */}
              {isEditingLink && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 sm:p-6 rounded-3xl border-2 border-blue-400 dark:border-blue-700 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>{editingLinkId ? 'Edit Tautan Kustom' : 'Tambah Tautan Kustom Baru'}</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditingLink(false)}
                      className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-300 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Label / Nama Tautan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={linkFormLabel}
                        onChange={(e) => setLinkFormLabel(e.target.value)}
                        placeholder="Contoh: Website Resmi Sekolah"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Ikon Tautan
                      </label>
                      <select
                        value={linkFormIcon}
                        onChange={(e) => setLinkFormIcon(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Globe">🌐 Globe (Website / Portal)</option>
                        <option value="Phone">💬 WhatsApp / Telepon</option>
                        <option value="BookOpen">📖 BookOpen (Buku / Panduan)</option>
                        <option value="School">🏫 School (Sekolah / PPDB)</option>
                        <option value="HelpCircle">❓ HelpCircle (Pusat Bantuan)</option>
                        <option value="FileText">📄 FileText (Dokumen / Regulasi)</option>
                        <option value="Mail">📧 Mail (Email Kontak)</option>
                        <option value="Sparkles">✨ Sparkles (E-Learning / Fitur Baru)</option>
                        <option value="Shield">🛡️ Shield (Keamanan / Privasi)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Alamat URL / Tautan Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={linkFormUrl}
                      onChange={(e) => setLinkFormUrl(e.target.value)}
                      placeholder="Contoh: https://smkn6garut.sch.id atau wa.me/628123456789 atau #"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-400">
                      Gunakan <code className="text-blue-500 font-bold">#</code> jika tautan ingin memicu pop-up pengumuman sekolah langsung.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Deskripsi Singkat (Opsional)
                    </label>
                    <input
                      type="text"
                      value={linkFormDescription}
                      onChange={(e) => setLinkFormDescription(e.target.value)}
                      placeholder="Contoh: Kunjungi portal resmi untuk info kegiatan dan PPDB"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={linkFormOpenNewTab}
                        onChange={(e) => setLinkFormOpenNewTab(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Buka tautan di Tab Baru (Target _blank)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingLink(false)}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveLink}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Tautan</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 4: Daftar Tautan Kustom yang Aktif */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                      Daftar Tautan Halaman Login ({customLinks.length})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Urutkan atau edit tautan yang ditampilkan pada form login.
                    </p>
                  </div>

                  {!isEditingLink && (
                    <button
                      type="button"
                      onClick={handleOpenAddLink}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Tautan</span>
                    </button>
                  )}
                </div>

                {customLinks.length === 0 ? (
                  <div className="text-center py-8 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <Globe className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Belum ada tautan kustom yang ditambahkan
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Gunakan tombol "Tambah Tautan" di atas atau pilih salah satu preset populer.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customLinks.map((link, idx) => {
                      const renderIconPreview = (name?: string) => {
                        switch (name) {
                          case 'Phone': return <Phone className="w-4 h-4 text-emerald-500" />;
                          case 'BookOpen': return <BookOpen className="w-4 h-4 text-amber-500" />;
                          case 'School': return <School className="w-4 h-4 text-cyan-500" />;
                          case 'HelpCircle': return <HelpCircle className="w-4 h-4 text-purple-500" />;
                          case 'FileText': return <FileText className="w-4 h-4 text-indigo-500" />;
                          case 'Mail': return <Mail className="w-4 h-4 text-rose-500" />;
                          case 'Sparkles': return <Sparkles className="w-4 h-4 text-amber-400" />;
                          case 'Shield': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
                          default: return <Globe className="w-4 h-4 text-blue-500" />;
                        }
                      };

                      return (
                        <div
                          key={link.id}
                          className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3 hover:border-blue-400 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 shadow-2xs shrink-0">
                              {renderIconPreview(link.iconName)}
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {link.label}
                                </p>
                                {link.openInNewTab !== false && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold shrink-0">
                                    Tab Baru
                                  </span>
                                )}
                              </div>
                              {link.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {link.description}
                                </p>
                              )}
                              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-mono truncate mt-0.5">
                                {link.url}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveLink(idx, 'up')}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="Pindahkan Ke Atas"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === customLinks.length - 1}
                              onClick={() => handleMoveLink(idx, 'down')}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                              title="Pindahkan Ke Bawah"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLink(link)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 cursor-pointer"
                              title="Edit Tautan"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLink(link.id, link.label)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 cursor-pointer"
                              title="Hapus Tautan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>Pratinjau Langsung (Live Preview)</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Real-time
              </span>
            </div>

            {/* Mock Screen Wrapper */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner h-[520px] flex flex-col justify-between">
              {/* Background Layer with chosen styles & filters */}
              <div
                className="absolute inset-0 transition-all duration-300"
                style={{
                  ...getPreviewBackgroundStyle(),
                  filter: getBlurFilter(),
                  transform: blurLevel !== 'none' ? 'scale(1.05)' : 'none',
                }}
              />

              {/* Tint Overlay Layer */}
              <div
                className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
                style={{
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity / 100,
                }}
              />

              {/* Mock Header */}
              <div className="relative z-10 p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border border-white/50 dark:border-slate-700/60 backdrop-blur-md flex items-center justify-center font-bold text-[10px]">
                    <School className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-[11px] text-white leading-none drop-shadow-xs">
                      {sekolah.nama || 'SMKN 6 GARUT'}
                    </p>
                    <p className="text-[9px] text-slate-300 leading-none mt-0.5">
                      Portal Presensi Siswa Digital
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-md backdrop-blur-md">
                  TA 2026/2027
                </span>
              </div>

              {/* Mock Content Body: Left Text + Right Login Card */}
              <div className="relative z-10 px-3.5 py-2 my-auto grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                {/* Simulated Left Panel */}
                {loginLeftShowPanel && (
                  <div className="hidden md:flex md:col-span-7 flex-col space-y-2 text-left pr-2 text-white">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[9px] font-bold w-fit border border-white/20 backdrop-blur-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                      <span className="truncate max-w-[150px]">{loginLeftBadgeText}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black leading-tight">
                        {loginLeftTitlePrefix}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">
                          {loginLeftTitleHighlight}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-200 mt-1 line-clamp-2 leading-relaxed opacity-90">
                        {loginLeftDescription}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 text-[9px]">
                      <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/15">
                        <Smartphone className="w-3 h-3 text-emerald-300" />
                        <span className="font-bold truncate max-w-[70px]">{loginLeftFeature1Title}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg border border-white/15">
                        <MessageSquare className="w-3 h-3 text-blue-300" />
                        <span className="font-bold truncate max-w-[70px]">{loginLeftFeature2Title}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Simulated Right Card */}
                <div className={`${loginLeftShowPanel ? 'md:col-span-5' : 'col-span-12'} flex justify-center`}>
                  <div
                    className={`w-full max-w-[220px] rounded-2xl p-3 shadow-xl border space-y-2 transition-all ${
                      cardBlur === 'none'
                        ? 'backdrop-blur-none'
                        : cardBlur === 'sm'
                        ? 'backdrop-blur-xs'
                        : cardBlur === 'md'
                        ? 'backdrop-blur-sm'
                        : cardBlur === 'lg'
                        ? 'backdrop-blur-md'
                        : 'backdrop-blur-xl'
                    }`}
                    style={{
                      backgroundColor: `rgba(255, 255, 255, ${cardOpacity / 100})`,
                      borderColor: `rgba(255, 255, 255, ${Math.min(0.9, (cardOpacity / 100) * 0.6 + 0.2)})`,
                    }}
                  >
                    <div className="text-center space-y-0.5">
                      <div className="w-6 h-6 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center font-bold text-xs shadow-sm">
                        <School className="w-3.5 h-3.5" />
                      </div>
                      <p className="text-[10px] font-black text-slate-900 truncate">
                        {sekolah.nama || 'SMKN 6 GARUT'}
                      </p>
                      <p className="text-[8px] font-semibold text-blue-600">
                        Sistem Absensi Siswa
                      </p>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="h-5 bg-slate-100/90 rounded-md border border-slate-200/80 flex items-center px-1.5 text-[8px] text-slate-600 font-medium">
                        Username / NISN
                      </div>
                      <div className="h-5 bg-slate-100/90 rounded-md border border-slate-200/80 flex items-center px-1.5 text-[8px] text-slate-600 font-medium">
                        ••••••••
                      </div>
                      <div className="h-5 bg-blue-600 rounded-md flex items-center justify-center text-white text-[9px] font-black shadow-sm">
                        Masuk ke Sistem
                      </div>
                    </div>

                    {/* LIVE PREVIEW: CUSTOM LINKS (DROPDOWN OR INLINE) */}
                    {customLinks.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/60 relative">
                        {customLinksDisplayMode === 'dropdown' ? (
                          <div>
                            <button
                              type="button"
                              onClick={() => setPreviewDropdownOpen(!previewDropdownOpen)}
                              className="w-full py-1 px-1.5 rounded-lg text-[9px] font-bold bg-white/90 hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between gap-1 shadow-2xs cursor-pointer"
                            >
                              <div className="flex items-center gap-1 truncate">
                                <Link className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                <span className="truncate">{customLinksTitle || 'Tautan Cepat & Bantuan'}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-1 py-0.2 rounded text-[8px] bg-slate-100 text-slate-600 font-bold">
                                  {customLinks.length}
                                </span>
                                <ChevronDown className={`w-2.5 h-2.5 transition-transform ${previewDropdownOpen ? 'rotate-180' : ''}`} />
                              </div>
                            </button>

                            {/* Dropdown Popover Preview */}
                            {previewDropdownOpen && (
                              <div className="absolute left-0 right-0 bottom-full mb-1 z-50 rounded-xl border border-slate-200 bg-white/98 shadow-xl p-1 text-[8px] space-y-0.5 animate-in fade-in zoom-in-95 duration-100">
                                <div className="px-1.5 py-0.5 text-[8px] font-bold text-slate-800 border-b border-slate-100 flex items-center justify-between">
                                  <span>{customLinksTitle || 'Tautan Cepat & Bantuan'}</span>
                                  <X className="w-2.5 h-2.5 cursor-pointer text-slate-400" onClick={() => setPreviewDropdownOpen(false)} />
                                </div>
                                <div className="max-h-28 overflow-y-auto space-y-0.5 pt-0.5">
                                  {customLinks.map((l) => (
                                    <div key={l.id} className="p-1 rounded-md hover:bg-slate-100 flex items-center gap-1 text-slate-700">
                                      <Globe className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                      <span className="truncate font-semibold">{l.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {customLinks.map((l) => (
                              <span
                                key={l.id}
                                className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-white/90 border border-slate-200 text-slate-700 flex items-center gap-1 shadow-2xs"
                              >
                                <Globe className="w-2 h-2 text-blue-500" />
                                <span className="truncate max-w-[70px]">{l.label}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Mock Footer */}
              <div className="relative z-10 p-2 text-center text-[9px] text-white/80 font-medium">
                © {new Date().getFullYear()} {sekolah.nama || 'SMKN 6 Garut'}. Sistem Presensi Sekolah.
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Perubahan teks dan gaya langsung tersinkronisasi pada pratinjau di atas.
            </p>

            {!readOnly && (
              <button
                type="button"
                onClick={() => handleSave()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Seluruh Pengaturan Login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
