import React, { useState, useRef, useMemo } from 'react';
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
  Type,
  Smartphone,
  MessageSquare,
  Globe,
  Phone,
  BookOpen,
  ChevronDown,
  X,
  Plus,
  Tag,
  Sun,
  Moon,
  School,
  Mail,
  Shield,
  Edit,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react';
import { AppData, SekolahConfig, LoginCustomLink } from '../../types';
import {
  LOGIN_IMAGE_PRESETS,
  LOGIN_GRADIENT_PRESETS,
  LOGIN_PATTERN_PRESETS,
} from '../../data/loginBackgroundPresets';
import { compressBase64Image, addAuditLog } from '../../utils/helpers';
import {
  parseColorToRgb,
  calculateLuminance,
  blendRgb,
  parseGradientAverageRgb,
  sampleImageLuminance,
  RGB,
} from '../../utils/colorDetection';

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

type SettingsTab = 'left_panel' | 'container_card' | 'background' | 'custom_links';

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

  // =========================================================
  // 2-LAYER BACKGROUND FORM STATES
  // =========================================================
  // Lapisan 1: Wallpaper / Background Image
  const [enableWallpaper, setEnableWallpaper] = useState<boolean>(
    sekolah.loginBgEnableWallpaper ??
      (sekolah.loginBgType === 'image' || Boolean(sekolah.loginBgImage) || sekolah.loginBgType === 'two_layer' || sekolah.loginBgType === 'default' || sekolah.loginBgType === undefined)
  );
  const [imageSourceTab, setImageSourceTab] = useState<'preset' | 'upload' | 'url'>('preset');
  const [bgImage, setBgImage] = useState<string>(
    sekolah.loginBgImage || (LOGIN_IMAGE_PRESETS.length > 0 ? LOGIN_IMAGE_PRESETS[0].imageUrl : '')
  );
  const [wallpaperFit, setWallpaperFit] = useState<'cover' | 'contain' | 'tile'>(
    sekolah.loginBgWallpaperFit || sekolah.loginBgFit || 'cover'
  );
  const [wallpaperOpacity, setWallpaperOpacity] = useState<number>(
    sekolah.loginBgWallpaperOpacity ?? (sekolah.bgImageOpacity ?? (typeof sekolah.loginBgOpacity === 'number' ? Math.round(sekolah.loginBgOpacity * 100) : 85))
  );
  const [wallpaperBlur, setWallpaperBlur] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl'>(
    sekolah.loginBgWallpaperBlur || sekolah.loginBgBlur || 'none'
  );
  const [wallpaperFilter, setWallpaperFilter] = useState<'none' | 'grayscale' | 'darken_30' | 'darken_50' | 'sepia'>(
    sekolah.loginBgWallpaperFilter || 'none'
  );

  // Lapisan 2: Warna Fill / Pola dasar
  const [enableFill, setEnableFill] = useState<boolean>(
    sekolah.loginBgEnableFill ??
      (sekolah.loginBgType === 'color' || sekolah.loginBgType === 'gradient' || sekolah.loginBgType === 'pattern' || sekolah.loginBgType === 'two_layer' || sekolah.loginBgType === 'default' || sekolah.loginBgType === undefined)
  );
  const [fillType, setFillType] = useState<'solid' | 'gradient' | 'pattern'>(
    sekolah.loginBgFillType || (sekolah.loginBgType === 'color' ? 'solid' : sekolah.loginBgType === 'pattern' ? 'pattern' : 'gradient')
  );
  const [bgColor, setBgColor] = useState<string>(sekolah.loginBgFillColor || sekolah.loginBgColor || '#1e3a8a');
  const [bgGradient, setBgGradient] = useState<string>(
    sekolah.loginBgFillGradient || sekolah.loginBgGradient || LOGIN_GRADIENT_PRESETS[0].gradient
  );
  const [bgPattern, setBgPattern] = useState<string>(
    sekolah.loginBgFillPattern || sekolah.loginBgPattern || LOGIN_PATTERN_PRESETS[0].id
  );
  const [fillOpacity, setFillOpacity] = useState<number>(sekolah.loginBgFillOpacity ?? 100);

  // Penggabungan Blend Mode & Overlay Tint
  const [blendMode, setBlendMode] = useState<
    'normal' | 'multiply' | 'overlay' | 'screen' | 'soft-light' | 'hard-light' | 'darken' | 'lighten' | 'color-dodge'
  >(sekolah.loginBgBlendMode || 'normal');
  const [overlayColor, setOverlayColor] = useState<string>(sekolah.loginBgOverlayColor || '#020617');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(sekolah.loginBgOverlayOpacity ?? 35);

  // Card & Contrast States
  const [contrastMode, setContrastMode] = useState<'auto' | 'dark' | 'light'>(sekolah.loginContrastMode || 'auto');
  const [cardTheme, setCardTheme] = useState<'white' | 'neutral' | 'light' | 'dark' | 'glass' | 'auto'>(sekolah.loginCardTheme || 'white');
  const [cardOpacity, setCardOpacity] = useState<number>(sekolah.loginCardOpacity ?? 100);
  const [cardBlur, setCardBlur] = useState<'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>(sekolah.loginCardBlur || '2xl');

  // Container Card Customizations
  const [cardLayout, setCardLayout] = useState<'center' | 'left' | 'right'>(sekolah.loginCardLayout || 'right');
  const [cardMaxWidth, setCardMaxWidth] = useState<'compact' | 'standard' | 'wide' | 'large'>(sekolah.loginCardMaxWidth || 'standard');
  const [cardRounded, setCardRounded] = useState<'none' | 'lg' | 'xl' | '2xl' | '3xl' | 'full_pill'>(sekolah.loginCardRounded || '2xl');
  const [cardShadow, setCardShadow] = useState<'none' | 'soft' | 'medium' | 'glow' | 'neon'>(sekolah.loginCardShadow || 'medium');
  const [cardBorder, setCardBorder] = useState<'none' | 'subtle' | 'gradient' | 'glass' | 'accent'>(sekolah.loginCardBorder || 'glass');
  const [cardShowLogo, setCardShowLogo] = useState<boolean>(sekolah.loginCardShowLogo !== false);
  const [cardLogoAlign, setCardLogoAlign] = useState<'left' | 'center' | 'right'>(sekolah.loginCardLogoAlign || 'center');
  const [cardLogoSize, setCardLogoSize] = useState<'sm' | 'md' | 'lg'>(sekolah.loginCardLogoSize || 'md');
  const [cardShowSchoolName, setCardShowSchoolName] = useState<boolean>(sekolah.loginCardShowSchoolName !== false);
  const [cardShowSubtitle, setCardShowSubtitle] = useState<boolean>(sekolah.loginCardShowSubtitle !== false);
  const [cardShowAcademicYear, setCardShowAcademicYear] = useState<boolean>(sekolah.loginCardShowAcademicYear !== false);
  const [cardWelcomeTitle, setCardWelcomeTitle] = useState<string>(sekolah.loginCardWelcomeTitle || 'Sistem Absensi Siswa');
  const [cardWelcomeSubtext, setCardWelcomeSubtext] = useState<string>(sekolah.loginCardWelcomeSubtext || 'Masuk dengan Username / NISN / NIP Anda');
  const [cardInputStyle, setCardInputStyle] = useState<'outlined' | 'filled' | 'underlined'>(sekolah.loginCardInputStyle || 'outlined');
  const [cardInputRounded, setCardInputRounded] = useState<'lg' | 'xl' | 'full'>(sekolah.loginCardInputRounded || 'xl');
  const [cardButtonAccent, setCardButtonAccent] = useState<'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'slate' | 'neutral'>(
    sekolah.loginCardButtonAccent || 'blue'
  );
  const [cardButtonRounded, setCardButtonRounded] = useState<'lg' | 'xl' | 'full'>(sekolah.loginCardButtonRounded || 'xl');
  const [cardSchoolNameCustom, setCardSchoolNameCustom] = useState<string>(sekolah.loginCardSchoolNameCustom || '');
  const [cardUsernameLabel, setCardUsernameLabel] = useState<string>(sekolah.loginCardUsernameLabel || 'Username / NIP / NISN');
  const [cardUsernamePlaceholder, setCardUsernamePlaceholder] = useState<string>(sekolah.loginCardUsernamePlaceholder || '');
  const [cardPasswordLabel, setCardPasswordLabel] = useState<string>(sekolah.loginCardPasswordLabel || 'Password');
  const [cardPasswordPlaceholder, setCardPasswordPlaceholder] = useState<string>(sekolah.loginCardPasswordPlaceholder || '');
  const [cardRememberMeText, setCardRememberMeText] = useState<string>(sekolah.loginCardRememberMeText || 'Ingat saya');
  const [cardButtonText, setCardButtonText] = useState<string>(sekolah.loginCardButtonText || 'Masuk ke Sistem');
  const [cardButtonLoadingText, setCardButtonLoadingText] = useState<string>(sekolah.loginCardButtonLoadingText || 'Memverifikasi Akun...');
  const [cardFooterNote, setCardFooterNote] = useState<string>(sekolah.loginCardFooterNote || '');
  const [cardFooterNoteLink, setCardFooterNoteLink] = useState<string>(sekolah.loginCardFooterNoteLink || '');

  // Left Panel Text States
  const [loginLeftShowPanel, setLoginLeftShowPanel] = useState<boolean>(sekolah.loginLeftShowPanel !== false);
  const [loginLeftBadgeText, setLoginLeftBadgeText] = useState<string>(
    sekolah.loginLeftBadgeText || `Portal Kehadiran Terpadu ${sekolah.nama || 'SMK Negeri 6 Garut'}`
  );
  const [loginLeftTitlePrefix, setLoginLeftTitlePrefix] = useState<string>(sekolah.loginLeftTitlePrefix || 'Sistem Presensi');
  const [loginLeftTitlePrefixSize, setLoginLeftTitlePrefixSize] = useState<'xs' | 'sm' | 'md' | 'lg'>(
    sekolah.loginLeftTitlePrefixSize || 'sm'
  );
  const [loginLeftTitleHighlight, setLoginLeftTitleHighlight] = useState<string>(sekolah.loginLeftTitleHighlight || 'Digital & OTP');
  const [loginLeftDescription, setLoginLeftDescription] = useState<string>(
    sekolah.loginLeftDescription ||
      'Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.'
  );
  const [loginLeftDescriptionAlign, setLoginLeftDescriptionAlign] = useState<'left' | 'center' | 'right' | 'justify'>(
    sekolah.loginLeftDescriptionAlign || 'left'
  );
  const [loginLeftDescriptionColor, setLoginLeftDescriptionColor] = useState<string>(
    sekolah.loginLeftDescriptionColor || ''
  );
  const [loginLeftDescriptionSize, setLoginLeftDescriptionSize] = useState<'xs' | 'sm' | 'base' | 'lg' | 'xl'>(
    sekolah.loginLeftDescriptionSize || 'base'
  );
  const [loginLeftFeature1Title, setLoginLeftFeature1Title] = useState<string>(sekolah.loginLeftFeature1Title || 'Presensi Digital');
  const [loginLeftFeature1Subtitle, setLoginLeftFeature1Subtitle] = useState<string>(sekolah.loginLeftFeature1Subtitle || 'Cepat, Praktis & Akurat');
  const [loginLeftFeature2Title, setLoginLeftFeature2Title] = useState<string>(sekolah.loginLeftFeature2Title || 'OTP WhatsApp');
  const [loginLeftFeature2Subtitle, setLoginLeftFeature2Subtitle] = useState<string>(sekolah.loginLeftFeature2Subtitle || 'Verifikasi Cepat & Aman');

  // Custom Links state
  const defaultCustomLinksList: LoginCustomLink[] = [
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

  const [customLinks, setCustomLinks] = useState<LoginCustomLink[]>(() => {
    if (Array.isArray(sekolah.loginCustomLinks)) {
      return JSON.parse(JSON.stringify(sekolah.loginCustomLinks));
    }
    return defaultCustomLinksList;
  });
  const [customLinksDisplayMode, setCustomLinksDisplayMode] = useState<'dropdown' | 'inline'>(
    sekolah.loginCustomLinksDisplayMode || 'dropdown'
  );
  const [customLinksTitle, setCustomLinksTitle] = useState<string>(sekolah.loginCustomLinksTitle || 'Tautan Cepat & Bantuan');

  // Link Form state
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkFormLabel, setLinkFormLabel] = useState('');
  const [linkFormDescription, setLinkFormDescription] = useState('');
  const [linkFormUrl, setLinkFormUrl] = useState('');
  const [linkFormIcon, setLinkFormIcon] = useState<any>('Globe');
  const [linkFormOpenNewTab, setLinkFormOpenNewTab] = useState(true);

  // Upload/URL states
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Luminance & Dark/Light Detection
  const [detectedLuminance, setDetectedLuminance] = useState<number | null>(null);

  React.useEffect(() => {
    if (enableWallpaper && bgImage) {
      let isCancelled = false;
      sampleImageLuminance(bgImage).then((lum) => {
        if (!isCancelled) setDetectedLuminance(lum);
      });
      return () => {
        isCancelled = true;
      };
    } else {
      setDetectedLuminance(null);
    }
  }, [enableWallpaper, bgImage]);

  const liveDetectedDark = useMemo(() => {
    if (contrastMode === 'dark') return { isDark: true, luminance: 40 };
    if (contrastMode === 'light') return { isDark: false, luminance: 210 };

    const overlayRgb = parseColorToRgb(overlayColor) || { r: 2, g: 6, b: 23 };
    const overlayAlpha = (overlayOpacity ?? 35) / 100;
    let baseRgb: RGB = { r: 240, g: 242, b: 245 };

    if (enableFill) {
      if (fillType === 'solid' && bgColor) {
        baseRgb = parseColorToRgb(bgColor) || { r: 30, g: 41, b: 59 };
      } else if (fillType === 'gradient' && bgGradient) {
        baseRgb = parseGradientAverageRgb(bgGradient);
      } else if (fillType === 'pattern' && bgPattern) {
        const pat = LOGIN_PATTERN_PRESETS.find((p) => p.id === bgPattern) || LOGIN_PATTERN_PRESETS[0];
        baseRgb = parseColorToRgb(pat.bgBase) || { r: 15, g: 23, b: 42 };
      }
    } else if (enableWallpaper) {
      const rawLum = detectedLuminance !== null ? detectedLuminance : 40;
      baseRgb = { r: rawLum, g: rawLum, b: rawLum };
    }

    const effectiveRgb = blendRgb(baseRgb, overlayRgb, overlayAlpha);
    const lum = Math.round(calculateLuminance(effectiveRgb));
    return { isDark: lum < 135, luminance: lum };
  }, [contrastMode, enableFill, fillType, bgColor, bgGradient, bgPattern, enableWallpaper, detectedLuminance, overlayColor, overlayOpacity]);

  // Handlers for File Upload
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
      const compressed = await compressBase64Image(file, 2560, 0.9, false);
      if (compressed) {
        setBgImage(compressed);
        setEnableWallpaper(true);
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
    setEnableWallpaper(true);
    onShowToast('URL Background berhasil diterapkan!', 'success');
  };

  // Custom Links Handlers
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
      onConfirmModal('Hapus Tautan Kustom', `Apakah Anda yakin ingin menghapus tautan "${label}" dari halaman login?`, 'danger', () => {
        setCustomLinks((prev) => prev.filter((item) => item.id !== id));
        onShowToast(`Tautan "${label}" berhasil dihapus.`, 'info');
      });
    } else {
      setCustomLinks((prev) => prev.filter((item) => item.id !== id));
      onShowToast(`Tautan "${label}" berhasil dihapus.`, 'info');
    }
  };

  // Quick Preset Text Template Application
  const applyTextPreset = (type: 'default' | 'akademik' | 'kedisiplinan' | 'singkat') => {
    const schoolName = sekolah.nama || 'SMK Negeri 6 Garut';
    switch (type) {
      case 'default':
        setLoginLeftBadgeText(`Portal Kehadiran Terpadu ${schoolName}`);
        setLoginLeftTitlePrefix('Sistem Presensi');
        setLoginLeftTitleHighlight('Digital & OTP');
        setLoginLeftDescription(
          'Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.'
        );
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
      // Backward compatibility fields
      loginBgType: 'two_layer',
      loginBgImage: enableWallpaper ? bgImage : undefined,
      loginBgGradient: bgGradient,
      loginBgPattern: bgPattern,
      loginBgColor: bgColor,
      loginBgOverlayOpacity: overlayOpacity,
      loginBgOpacity: Number((wallpaperOpacity / 100).toFixed(2)),
      bgImageOpacity: wallpaperOpacity,
      loginBgBlur: wallpaperBlur,
      loginBgFit: wallpaperFit,
      loginBgOverlayColor: overlayColor,

      // 2-Layer Background Explicit Configurations
      loginBgEnableWallpaper: enableWallpaper,
      loginBgWallpaperFit: wallpaperFit,
      loginBgWallpaperOpacity: wallpaperOpacity,
      loginBgWallpaperBlur: wallpaperBlur,
      loginBgWallpaperFilter: wallpaperFilter,

      loginBgEnableFill: enableFill,
      loginBgFillType: fillType,
      loginBgFillColor: bgColor,
      loginBgFillGradient: bgGradient,
      loginBgFillPattern: bgPattern,
      loginBgFillOpacity: fillOpacity,

      loginBgBlendMode: blendMode,

      // Card & Panel Configs
      loginContrastMode: contrastMode,
      loginCardTheme: cardTheme,
      loginCardOpacity: cardOpacity,
      loginCardBlur: cardBlur,
      loginCardLayout: cardLayout,
      loginCardMaxWidth: cardMaxWidth,
      loginCardRounded: cardRounded,
      loginCardShadow: cardShadow,
      loginCardBorder: cardBorder,
      loginCardShowLogo: cardShowLogo,
      loginCardLogoAlign: cardLogoAlign,
      loginCardLogoSize: cardLogoSize,
      loginCardShowSchoolName: cardShowSchoolName,
      loginCardShowSubtitle: cardShowSubtitle,
      loginCardShowAcademicYear: cardShowAcademicYear,
      loginCardWelcomeTitle: cardWelcomeTitle,
      loginCardWelcomeSubtext: cardWelcomeSubtext,
      loginCardSchoolNameCustom: cardSchoolNameCustom,
      loginCardUsernameLabel: cardUsernameLabel,
      loginCardUsernamePlaceholder: cardUsernamePlaceholder,
      loginCardPasswordLabel: cardPasswordLabel,
      loginCardPasswordPlaceholder: cardPasswordPlaceholder,
      loginCardRememberMeText: cardRememberMeText,
      loginCardButtonText: cardButtonText,
      loginCardButtonLoadingText: cardButtonLoadingText,
      loginCardFooterNote: cardFooterNote,
      loginCardFooterNoteLink: cardFooterNoteLink,
      loginCardInputStyle: cardInputStyle,
      loginCardInputRounded: cardInputRounded,
      loginCardButtonAccent: cardButtonAccent,
      loginCardButtonRounded: cardButtonRounded,
      loginLeftShowPanel,
      loginLeftBadgeText,
      loginLeftTitlePrefix,
      loginLeftTitlePrefixSize,
      loginLeftTitleHighlight,
      loginLeftDescription,
      loginLeftDescriptionAlign,
      loginLeftDescriptionColor,
      loginLeftDescriptionSize,
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
      `Memperbarui kustomisasi latar belakang 2 lapisan (Wallpaper: ${enableWallpaper ? 'Aktif' : 'Nonaktif'}, Warna Fill: ${
        enableFill ? fillType : 'Nonaktif'
      }, Blend Mode: ${blendMode}).`
    );

    onUpdateAppData(updatedAppData);
    onShowToast('Pengaturan Latar Belakang 2 Lapisan Halaman Login berhasil disimpan!', 'success');
  };

  // Reset to default
  const handleResetToDefault = () => {
    const doReset = () => {
      setEnableWallpaper(true);
      setBgImage(LOGIN_IMAGE_PRESETS[0].imageUrl);
      setWallpaperFit('cover');
      setWallpaperOpacity(85);
      setWallpaperBlur('none');
      setWallpaperFilter('none');

      setEnableFill(true);
      setFillType('gradient');
      setBgColor('#1e3a8a');
      setBgGradient(LOGIN_GRADIENT_PRESETS[0].gradient);
      setBgPattern(LOGIN_PATTERN_PRESETS[0].id);
      setFillOpacity(100);

      setBlendMode('normal');
      setOverlayColor('#020617');
      setOverlayOpacity(35);

      setCardOpacity(65);
      setCardBlur('2xl');
      setCardLayout('right');
      setCardMaxWidth('standard');
      setCardRounded('2xl');
      setCardShadow('medium');
      setCardBorder('glass');
      setCardShowLogo(true);

      setCustomLinks(defaultCustomLinksList);
      setCustomLinksDisplayMode('dropdown');
      setCustomLinksTitle('Tautan Cepat & Bantuan');
      setLoginLeftShowPanel(true);
      setLoginLeftBadgeText(`Portal Kehadiran Terpadu ${sekolah.nama || 'SMK Negeri 6 Garut'}`);
      setLoginLeftTitlePrefix('Sistem Presensi');
      setLoginLeftTitleHighlight('Digital & OTP');
      setLoginLeftDescription(
        'Platform manajemen presensi siswa digital real-time dengan verifikasi NISN + OTP WhatsApp, proteksi Kunci 1 HP 1 Siswa (*Device Binding*), dan rekapitulasi kehadiran instan.'
      );

      handleSave();
      onShowToast('Tampilan login berhasil dikembalikan ke pengaturan 2 lapisan default!', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Kembalikan Pengaturan Login ke Bawaan?',
        'Pengaturan latar belakang 2 lapisan dan teks halaman login akan dikembalikan ke tema resmi bawaan.',
        'info',
        doReset
      );
    } else {
      doReset();
    }
  };

  // Helpers for CSS styles
  const getFillStyleCSS = (): React.CSSProperties => {
    if (fillType === 'solid') {
      return { backgroundColor: bgColor };
    }
    if (fillType === 'gradient') {
      return { background: bgGradient };
    }
    if (fillType === 'pattern') {
      const pat = LOGIN_PATTERN_PRESETS.find((p) => p.id === bgPattern) || LOGIN_PATTERN_PRESETS[0];
      return {
        backgroundColor: pat.bgBase,
        backgroundImage: pat.svgPattern,
        backgroundSize: '24px 24px',
      };
    }
    return { background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1e1b4b 100%)' };
  };

  const getWallpaperFilterCSS = (filter: string, blur: string) => {
    let blurPx = '0px';
    if (blur === 'sm') blurPx = '4px';
    if (blur === 'md') blurPx = '8px';
    if (blur === 'lg') blurPx = '16px';
    if (blur === 'xl') blurPx = '24px';

    let filterStr = `blur(${blurPx})`;
    if (filter === 'grayscale') filterStr += ' grayscale(100%)';
    if (filter === 'darken_30') filterStr += ' brightness(70%)';
    if (filter === 'darken_50') filterStr += ' brightness(50%)';
    if (filter === 'sepia') filterStr += ' sepia(60%)';

    return filterStr;
  };

  return (
    <div className="space-y-6">
      {/* Header Info with Actions */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>Pengaturan Latar Belakang Login 2 Lapisan</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Wallpapers + Fill Color
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kustomisasi 2 lapisan terpisah (Lapisan 1: Wallpaper & Foto, Lapisan 2: Warna Fill & Pola) dengan blend mode dan efek overlay.
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

      {/* TABS SELECTOR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 max-w-3xl">
        <button
          type="button"
          onClick={() => setActiveTab('left_panel')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
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
          onClick={() => setActiveTab('container_card')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'container_card'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Container Kartu Login</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('background')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'background'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-500" />
          <span>Latar Belakang (2 Lapisan)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom_links')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'custom_links'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Link className="w-4 h-4" />
          <span>Tautan Kustom</span>
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
          {/* TAB 1: TEKS PANEL KIRI                                    */}
          {/* ========================================================= */}
          {activeTab === 'left_panel' && (
            <div className="space-y-5">
              {/* Toggle Panel Kiri */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Status Tampilan Panel Kiri
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Tampilkan panel branding dan teks deskripsi di sisi kiri layar login.
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

              {/* Presets Template Teks */}
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

              {/* Form Teks Panel */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Badge / Tagline Atas
                  </label>
                  <input
                    type="text"
                    value={loginLeftBadgeText}
                    onChange={(e) => setLoginLeftBadgeText(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Judul Highlight (Gradasi - Baris Atas)</label>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Baris Atas
                      </span>
                    </div>
                    <input
                      type="text"
                      value={loginLeftTitleHighlight}
                      onChange={(e) => setLoginLeftTitleHighlight(e.target.value)}
                      placeholder="Contoh: Digital & Terpadu"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1 leading-snug">
                      Teks utama dengan efek gradasi warna modern yang ditampilkan di baris atas.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Awalan / Sub-Judul (Baris Bawah)</label>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                        Muat 1 Baris
                      </span>
                    </div>
                    <input
                      type="text"
                      value={loginLeftTitlePrefix}
                      onChange={(e) => setLoginLeftTitlePrefix(e.target.value)}
                      placeholder="Contoh: Sistem Terpadu Siswa dan Guru"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {/* Size Selector for Awalan Judul */}
                    <div className="pt-1.5 space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Ukuran Teks Awalan (Agar Rapi 1 Baris):
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { id: 'xs', label: 'Ekstra Kecil' },
                          { id: 'sm', label: 'Kompak (Default)' },
                          { id: 'md', label: 'Sedang' },
                          { id: 'lg', label: 'Besar' },
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setLoginLeftTitlePrefixSize(sz.id as any)}
                            className={`px-1.5 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer border ${
                              loginLeftTitlePrefixSize === sz.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                          Paragraf Deskripsi Sistem
                        </label>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Mendukung Multi-Baris
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
                        Tekan Enter untuk membuat baris baru. Format baris dan poin akan ditampilkan persis di halaman login.
                      </p>
                    </div>

                    {/* Quick Helper Tools */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginLeftDescription((prev) => (prev ? `${prev}\n• ` : '• '));
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+ Poin (•)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginLeftDescription((prev) => (prev ? `${prev} *teks tebal*` : '*teks tebal*'));
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                      >
                        *Tebal*
                      </button>
                    </div>
                  </div>

                  {/* Alignment, Font Size & Color Options Bar */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Text Alignment */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <span>Posisi Baris Teks:</span>
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 'left', label: 'Kiri', icon: AlignLeft },
                            { id: 'center', label: 'Tengah', icon: AlignCenter },
                            { id: 'right', label: 'Kanan', icon: AlignRight },
                            { id: 'justify', label: 'Rata', icon: AlignJustify },
                          ].map((alignItem) => {
                            const IconComp = alignItem.icon;
                            const isSelected = loginLeftDescriptionAlign === alignItem.id;
                            return (
                              <button
                                key={alignItem.id}
                                type="button"
                                onClick={() => setLoginLeftDescriptionAlign(alignItem.id as any)}
                                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                                <span>{alignItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Font Color Picker */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Palette className="w-3 h-3 text-blue-500" />
                            <span>Warna Font:</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            {loginLeftDescriptionColor ? loginLeftDescriptionColor.toUpperCase() : 'Otomatis'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Auto (Theme contrast) */}
                          <button
                            type="button"
                            onClick={() => setLoginLeftDescriptionColor('')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                              !loginLeftDescriptionColor
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Otomatis
                          </button>
                          {/* Preset Swatches */}
                          {[
                            { color: '#ffffff', title: 'Putih' },
                            { color: '#e2e8f0', title: 'Abu Terang' },
                            { color: '#94a3b8', title: 'Abu Lembut' },
                            { color: '#67e8f9', title: 'Cyan Neon' },
                            { color: '#93c5fd', title: 'Biru Muda' },
                            { color: '#86efac', title: 'Hijau Muda' },
                            { color: '#fde047', title: 'Kuning Amber' },
                            { color: '#f472b6', title: 'Merah Muda' },
                          ].map((swatch) => (
                            <button
                              key={swatch.color}
                              type="button"
                              title={swatch.title}
                              onClick={() => setLoginLeftDescriptionColor(swatch.color)}
                              style={{ backgroundColor: swatch.color }}
                              className={`w-5 h-5 rounded-full border transition cursor-pointer shadow-xs ${
                                loginLeftDescriptionColor.toLowerCase() === swatch.color.toLowerCase()
                                  ? 'ring-2 ring-blue-500 ring-offset-2 scale-110 border-blue-500'
                                  : 'border-slate-300 dark:border-slate-600 hover:scale-105'
                              }`}
                            />
                          ))}
                          {/* Custom Color Input */}
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="color"
                              value={loginLeftDescriptionColor || '#e2e8f0'}
                              onChange={(e) => setLoginLeftDescriptionColor(e.target.value)}
                              className="w-6 h-6 rounded-full cursor-pointer opacity-0 absolute inset-0"
                            />
                            <div
                              className="w-6 h-6 rounded-lg border border-dashed border-slate-400 dark:border-slate-500 flex items-center justify-center text-[10px] font-bold text-slate-500 hover:border-blue-500 hover:text-blue-500"
                              title="Pilih Warna Khusus (Color Picker)"
                            >
                              +
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Font Size Selector */}
                    <div className="pt-2.5 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1">
                          <Type className="w-3 h-3 text-blue-500" />
                          <span>Ukuran Font Deskripsi:</span>
                        </label>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                          {loginLeftDescriptionSize === 'xs'
                            ? 'Ekstra Kecil (XS - 12px)'
                            : loginLeftDescriptionSize === 'sm'
                            ? 'Kompak (SM - 14px)'
                            : loginLeftDescriptionSize === 'lg'
                            ? 'Besar (LG - 18px)'
                            : loginLeftDescriptionSize === 'xl'
                            ? 'Ekstra Besar (XL - 20px)'
                            : 'Standar (Base - 16px)'}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: 'xs', label: 'XS (12px)' },
                          { id: 'sm', label: 'SM (14px)' },
                          { id: 'base', label: 'Standar' },
                          { id: 'lg', label: 'LG (18px)' },
                          { id: 'xl', label: 'XL (20px)' },
                        ].map((sz) => (
                          <button
                            key={sz.id}
                            type="button"
                            onClick={() => setLoginLeftDescriptionSize(sz.id as any)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                              loginLeftDescriptionSize === sz.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Textarea Input */}
                  <textarea
                    rows={5}
                    value={loginLeftDescription}
                    onChange={(e) => setLoginLeftDescription(e.target.value)}
                    placeholder={'Fitur:\n• Absensi Siswa Manual dan QR\n• Pencatatan Kasus dan Home Visit\n• Pencatatan Kegiatan Ekstrakulikuler'}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-sans"
                  />

                  {/* Live Mini Preview Box */}
                  <div className="rounded-2xl p-4 bg-slate-950 text-slate-200 border border-slate-800 shadow-inner">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Pratinjau Format, Ukuran & Warna Paragraf Deskripsi:</span>
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px]">
                        <span>{loginLeftDescriptionAlign.toUpperCase()}</span>
                        <span>·</span>
                        <span className="uppercase">{loginLeftDescriptionSize}</span>
                      </div>
                    </div>
                    <p
                      style={loginLeftDescriptionColor ? { color: loginLeftDescriptionColor } : undefined}
                      className={`font-medium leading-relaxed whitespace-pre-line drop-shadow-xs transition-all ${
                        loginLeftDescriptionSize === 'xs'
                          ? 'text-[11px]'
                          : loginLeftDescriptionSize === 'sm'
                          ? 'text-xs'
                          : loginLeftDescriptionSize === 'lg'
                          ? 'text-base'
                          : loginLeftDescriptionSize === 'xl'
                          ? 'text-lg font-semibold'
                          : 'text-sm'
                      } ${
                        loginLeftDescriptionAlign === 'center'
                          ? 'text-center'
                          : loginLeftDescriptionAlign === 'right'
                          ? 'text-right'
                          : loginLeftDescriptionAlign === 'justify'
                          ? 'text-justify'
                          : 'text-left'
                      } ${!loginLeftDescriptionColor ? 'text-zinc-300' : ''}`}
                    >
                      {loginLeftDescription || 'Deskripsi sistem akan ditampilkan di sini sesuai format baris dan warna.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CONTAINER KARTU LOGIN                              */}
          {/* ========================================================= */}
          {activeTab === 'container_card' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Tata Letak & Ukuran Container</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Posisi Container</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'left', label: 'Kiri' },
                        { id: 'center', label: 'Tengah' },
                        { id: 'right', label: 'Kanan' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCardLayout(item.id as any)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                            cardLayout === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lebar Maksimal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'compact', label: 'Ringkas' },
                        { id: 'standard', label: 'Standar' },
                        { id: 'wide', label: 'Lebar' },
                        { id: 'large', label: 'Ekstra' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCardMaxWidth(item.id as any)}
                          className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                            cardMaxWidth === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bentuk & Efek Kaca Form */}
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-600" />
                  <span>Bentuk, Efek Kaca & Bayangan Container</span>
                </h4>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sudut Lengkungan (Rounded)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'none', label: 'Kotak' },
                        { id: 'lg', label: 'Halus' },
                        { id: 'xl', label: 'Sedang' },
                        { id: '2xl', label: 'Lengkung' },
                        { id: 'full_pill', label: 'Pill' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCardRounded(item.id as any)}
                          className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                            cardRounded === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Efek Bayangan (Shadow & Glow)</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { id: 'none', label: 'Tanpa' },
                        { id: 'soft', label: 'Halus' },
                        { id: 'medium', label: 'Sedang' },
                        { id: 'glow', label: 'Glow' },
                        { id: 'neon', label: 'Neon' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setCardShadow(item.id as any)}
                          className={`py-2 px-1.5 rounded-xl text-[11px] font-bold border transition cursor-pointer text-center ${
                            cardShadow === item.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LATAR BELAKANG 2 LAPISAN (WALLPAPERS + WARNA FILL)  */}
          {/* ========================================================= */}
          {activeTab === 'background' && (
            <div className="space-y-6">
              {/* CARD 0: CONTROL STATUS 2 LAPISAN */}
              <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white border border-blue-800/60 shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Sistem Background 2 Lapisan</h4>
                      <p className="text-xs text-blue-200/80">Kombinasikan Wallpapers & Foto dengan Warna Fill / Gradasi</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500 text-white shadow-xs">
                    {enableWallpaper && enableFill
                      ? '✨ 2 Lapisan Aktif'
                      : enableWallpaper
                      ? '🖼️ Wallpaper Saja'
                      : enableFill
                      ? '🎨 Warna Fill Saja'
                      : '⚪ Default Minimal'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {/* Toggle Lapisan 1: Wallpaper */}
                  <div
                    onClick={() => setEnableWallpaper(!enableWallpaper)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      enableWallpaper
                        ? 'bg-blue-600/30 border-blue-400 text-white ring-2 ring-blue-400/30'
                        : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ImageIcon className={`w-4 h-4 ${enableWallpaper ? 'text-blue-300' : 'text-slate-500'}`} />
                      <div>
                        <span className="block text-xs font-bold">Lapisan 1: Wallpaper / Foto</span>
                        <span className="block text-[10px] opacity-80">Gedung sekolah, preset & upload</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        enableWallpaper ? 'bg-blue-500 border-blue-400 text-white' : 'border-slate-600'
                      }`}
                    >
                      {enableWallpaper && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Toggle Lapisan 2: Warna Fill */}
                  <div
                    onClick={() => setEnableFill(!enableFill)}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                      enableFill
                        ? 'bg-purple-600/30 border-purple-400 text-white ring-2 ring-purple-400/30'
                        : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Palette className={`w-4 h-4 ${enableFill ? 'text-purple-300' : 'text-slate-500'}`} />
                      <div>
                        <span className="block text-xs font-bold">Lapisan 2: Warna Fill & Pola</span>
                        <span className="block text-[10px] opacity-80">Solid color, gradasi & pattern</span>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                        enableFill ? 'bg-purple-500 border-purple-400 text-white' : 'border-slate-600'
                      }`}
                    >
                      {enableFill && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD LAPISAN 1: WALLPAPER / GAMBAR */}
              {enableWallpaper && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span>Lapisan 1: Pilihan Wallpaper / Gambar</span>
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
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                        isDragging
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
                      }`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileInputChange} accept="image/*" className="hidden" />
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-3 shadow-xs">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isUploading ? 'Memproses Foto...' : 'Klik atau Tarik Foto Gedung Sekolah ke Sini'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">Format JPG, PNG, atau WebP (Maksimal 10MB)</p>
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

                  {/* Fit, Opasitas Wallpaper, Blur & Filter Wallpaper */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fit Mode */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mode Ukuran Wallpaper (Fit)</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: 'cover', label: 'Cover (Penuh)' },
                            { id: 'contain', label: 'Contain' },
                            { id: 'tile', label: 'Tile (Ulang)' },
                          ].map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setWallpaperFit(f.id as any)}
                              className={`py-2 px-2 text-[11px] font-bold rounded-xl border cursor-pointer ${
                                wallpaperFit === f.id
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filter Gambar */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Efek Filter Wallpaper</label>
                        <select
                          value={wallpaperFilter}
                          onChange={(e) => setWallpaperFilter(e.target.value as any)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="none">Normal (Warna Asli Foto)</option>
                          <option value="darken_30">Darken (Redup 30%)</option>
                          <option value="darken_50">Darken Deep (Redup 50%)</option>
                          <option value="grayscale">Grayscale (Hitam Putih Monokrom)</option>
                          <option value="sepia">Sepia (Nuansa Klasik)</option>
                        </select>
                      </div>
                    </div>

                    {/* Slider Opasitas Wallpaper */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Opasitas / Transparansi Wallpaper</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-mono text-xs font-bold">
                          {wallpaperOpacity}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={wallpaperOpacity}
                        onChange={(e) => setWallpaperOpacity(parseInt(e.target.value, 10))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>

                    {/* Tingkat Blur Wallpaper */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tingkat Blur Wallpaper</label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { id: 'none', label: '0px (Tajam)' },
                          { id: 'sm', label: '4px' },
                          { id: 'md', label: '8px' },
                          { id: 'lg', label: '16px' },
                          { id: 'xl', label: '24px' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setWallpaperBlur(b.id as any)}
                            className={`py-2 px-1 text-[11px] font-bold rounded-xl border cursor-pointer ${
                              wallpaperBlur === b.id
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CARD LAPISAN 2: WARNA FILL & POLA */}
              {enableFill && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <Palette className="w-4 h-4 text-purple-600" />
                      <span>Lapisan 2: Pilihan Warna Fill & Pola Dasar</span>
                    </h4>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setFillType('solid')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          fillType === 'solid' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Warna Polos
                      </button>
                      <button
                        type="button"
                        onClick={() => setFillType('gradient')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          fillType === 'gradient' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Gradasi
                      </button>
                      <button
                        type="button"
                        onClick={() => setFillType('pattern')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          fillType === 'pattern' ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-xs' : 'text-slate-500'
                        }`}
                      >
                        Pola Geometris
                      </button>
                    </div>
                  </div>

                  {/* Solid Color Picker */}
                  {fillType === 'solid' && (
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
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs uppercase font-bold"
                      />
                    </div>
                  )}

                  {/* Gradient Presets */}
                  {fillType === 'gradient' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {LOGIN_GRADIENT_PRESETS.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setBgGradient(item.gradient)}
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between h-24 ${
                            bgGradient === item.gradient
                              ? 'border-purple-600 ring-4 ring-purple-500/20 shadow-md'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                          style={{ background: item.gradient }}
                        >
                          <div className="flex justify-end">
                            {bgGradient === item.gradient && (
                              <div className="w-5 h-5 rounded-full bg-white text-purple-600 flex items-center justify-center shadow-md">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <p className="text-white text-xs font-bold drop-shadow-sm">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pattern Presets */}
                  {fillType === 'pattern' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {LOGIN_PATTERN_PRESETS.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setBgPattern(item.id)}
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between h-24 ${
                            bgPattern === item.id
                              ? 'border-purple-600 ring-4 ring-purple-500/20 shadow-md'
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
                              <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-md">
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
                  )}
                </div>
              )}

              {/* CARD BLEND MODE & OVERLAY TINT */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-500" />
                  <span>Penggabungan Blend Mode & Overlay Tint</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mix Blend Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Blend Mode (Penggabungan Wallpaper & Fill)
                    </label>
                    <select
                      value={blendMode}
                      onChange={(e) => setBlendMode(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="normal">Normal (Biasa - Wallpaper di Atas Fill)</option>
                      <option value="multiply">Multiply (Pekat / Tergelap)</option>
                      <option value="overlay">Overlay (Kontras Tinggi)</option>
                      <option value="screen">Screen (Cerah / Terang)</option>
                      <option value="soft-light">Soft Light (Cahaya Lembung Halus)</option>
                      <option value="hard-light">Hard Light (Cahaya Tajam)</option>
                      <option value="darken">Darken (Nuansa Gelap)</option>
                      <option value="color-dodge">Color Dodge (Efek Kilau Gambar)</option>
                    </select>
                  </div>

                  {/* Color Overlay Tint */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Warna Penutup (Overlay Tint)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                      />
                      <input
                        type="text"
                        value={overlayColor}
                        onChange={(e) => setOverlayColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs uppercase font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Opasitas Overlay Tint */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Opasitas Overlay Penutup</span>
                    <span className="text-blue-600 font-mono font-bold">{overlayOpacity}%</span>
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
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: TAUTAN KUSTOM                                      */}
          {/* ========================================================= */}
          {activeTab === 'custom_links' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-600" />
                    <span>Kelola Tautan Kustom & Link Bantuan</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLinkId(null);
                      setLinkFormLabel('');
                      setLinkFormDescription('');
                      setLinkFormUrl('');
                      setLinkFormIcon('Globe');
                      setLinkFormOpenNewTab(true);
                      setIsEditingLink(true);
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Tautan</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {customLinks.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                          <span className="block text-[10px] text-slate-400 font-mono truncate max-w-xs">{item.url}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLinkId(item.id);
                            setLinkFormLabel(item.label);
                            setLinkFormDescription(item.description || '');
                            setLinkFormUrl(item.url);
                            setLinkFormIcon(item.iconName || 'Globe');
                            setLinkFormOpenNewTab(item.openInNewTab !== false);
                            setIsEditingLink(true);
                          }}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLink(item.id, item.label)}
                          className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Tambah/Edit Link */}
              {isEditingLink && (
                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-5 sm:p-6 rounded-3xl border-2 border-blue-400 dark:border-blue-700 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                      {editingLinkId ? 'Edit Tautan' : 'Tambah Tautan Baru'}
                    </h4>
                    <button type="button" onClick={() => setIsEditingLink(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Label Tautan</label>
                      <input
                        type="text"
                        value={linkFormLabel}
                        onChange={(e) => setLinkFormLabel(e.target.value)}
                        placeholder="Website Sekolah"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">URL Alamat</label>
                      <input
                        type="text"
                        value={linkFormUrl}
                        onChange={(e) => setLinkFormUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveLink}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      Simpan Tautan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live Preview (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[580px] text-white">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <span>Live Preview Tampilan Login</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                {liveDetectedDark.isDark ? 'Dark Theme' : 'Light Theme'}
              </span>
            </div>

            {/* PREVIEW CONTAINER CANVAS WITH 2 LAYERS */}
            <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-4">
              {/* LAPISAN 2: WARNA FILL & POLA (BASE LAYER) */}
              {enableFill && (
                <div
                  className="absolute inset-0 transition-all duration-300"
                  style={{
                    ...getFillStyleCSS(),
                    opacity: fillOpacity / 100,
                  }}
                />
              )}

              {/* LAPISAN 1: WALLPAPER / FOTO (TOP LAYER WITH BLEND MODE) */}
              {enableWallpaper && bgImage && (
                <div
                  className="absolute inset-0 transition-all duration-300 bg-no-repeat bg-center"
                  style={{
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: wallpaperFit === 'tile' ? 'auto' : wallpaperFit,
                    backgroundRepeat: wallpaperFit === 'tile' ? 'repeat' : 'no-repeat',
                    opacity: wallpaperOpacity / 100,
                    filter: getWallpaperFilterCSS(wallpaperFilter, wallpaperBlur),
                    mixBlendMode: blendMode,
                    transform: wallpaperBlur !== 'none' ? 'scale(1.05)' : 'none',
                  }}
                />
              )}

              {/* OVERLAY TINT */}
              <div
                className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
                style={{
                  backgroundColor: overlayColor,
                  opacity: overlayOpacity / 100,
                }}
              />

              {/* PREVIEW CARD FORM */}
              <div
                className={`relative z-10 w-full max-w-xs p-5 rounded-2xl shadow-xl border transition-all text-center space-y-3 ${
                  liveDetectedDark.isDark ? 'bg-slate-900/90 text-white border-slate-700' : 'bg-white/95 text-slate-900 border-slate-200'
                }`}
                style={{
                  backdropFilter: cardBlur !== 'none' ? `blur(${cardBlur === 'sm' ? 4 : cardBlur === 'md' ? 8 : 16}px)` : 'none',
                  opacity: cardOpacity / 100,
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white mx-auto flex items-center justify-center shadow-md">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider">{sekolah.nama || 'SMK Negeri 6 Garut'}</h5>
                  <p className="text-[10px] opacity-70 mt-0.5">{cardWelcomeTitle}</p>
                </div>

                <div className="space-y-2 pt-1 text-left">
                  <div className="p-2 rounded-lg border text-[11px] bg-slate-100/50 dark:bg-slate-800/50 font-mono">Username / NISN</div>
                  <div className="p-2 rounded-lg border text-[11px] bg-slate-100/50 dark:bg-slate-800/50 font-mono">••••••••</div>
                  <div className="p-2 rounded-lg bg-blue-600 text-white text-xs font-bold text-center shadow-xs">Masuk ke Sistem</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
