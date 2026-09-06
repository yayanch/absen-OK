import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Check,
  RotateCcw,
  Save,
  Type,
  Sliders,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  School,
  Info,
  SlidersHorizontal,
  Eye,
  X,
  Activity,
  Users,
  UserCheck,
  BarChart3,
  SlidersVertical,
  Maximize2,
  Minimize2,
  Layout,
  LayoutList,
  Grid,
  Zap,
  Calendar,
} from 'lucide-react';
import { AppData, SekolahConfig, ThemeOption, FontThemeOption, SidebarThemeOption, PageHeaderBackgroundOption } from '../../types';
import { PageHeader } from '../common/UIComponents';
import { LoginBackgroundSettings } from './LoginBackgroundSettings';
import { Image as ImageIcon } from 'lucide-react';

interface SidebarColorThemeConfig {
  id: SidebarThemeOption;
  name: string;
  primaryHex: string;
  darkHex: string;
  desc: string;
  isDefault?: boolean;
}

const SIDEBAR_COLOR_THEMES: SidebarColorThemeConfig[] = [
  {
    id: 'royal',
    name: 'Biru Royal',
    primaryHex: '#1646E3',
    darkHex: '#1238B8',
    desc: 'Warna default utama. Modern, energik, dan profesional.',
    isDefault: true,
  },
  {
    id: 'navy',
    name: 'Biru Navy',
    primaryHex: '#193FA3',
    darkHex: '#172E78',
    desc: 'Nuansa lebih tenang, profesional, dan elegan untuk penggunaan lama.',
  },
  {
    id: 'sky',
    name: 'Biru Langit',
    primaryHex: '#168BD6',
    darkHex: '#075985',
    desc: 'Nuansa segar, ringan, modern, dan friendly.',
  },
  {
    id: 'denim',
    name: 'Biru Denim',
    primaryHex: '#2855B5',
    darkHex: '#1E3A8A',
    desc: 'Nuansa stabil, dewasa, dan nyaman untuk aplikasi administrasi.',
  },
  {
    id: 'slate',
    name: 'Biru Slate',
    primaryHex: '#31517A',
    darkHex: '#1E293B',
    desc: 'Nuansa tenang, minimalis, premium, dan saturasi paling rendah.',
  },
];

export interface PageHeaderBgPreset {
  id: PageHeaderBackgroundOption;
  name: string;
  bg: string;
  titleColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  desc: string;
  isDefault?: boolean;
  isLight?: boolean;
}

export const PAGE_HEADER_BG_PRESETS: PageHeaderBgPreset[] = [
  {
    id: 'gradient_royal',
    name: 'Gradient Royal',
    bg: 'linear-gradient(135deg, #1646E3 0%, #4338CA 100%)',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.80)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#FFFFFF',
    desc: 'Gradient resmi SMKN 6 Garut (Biru Royal ke Indigo).',
    isDefault: true,
  },
  {
    id: 'white',
    name: 'Putih',
    bg: '#FFFFFF',
    titleColor: '#0F172A',
    subtitleColor: '#64748B',
    badgeBg: '#FFFFFF',
    badgeBorder: '#E2E8F0',
    badgeText: '#334155',
    desc: 'Minimalis dan netral.',
    isLight: true,
  },
  {
    id: 'royal',
    name: 'Biru Royal',
    bg: '#1646E3',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.80)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#FFFFFF',
    desc: 'Warna identitas Biru Royal SMKN 6 Garut.',
  },
  {
    id: 'deep_blue',
    name: 'Biru Deep',
    bg: '#1E3A8A',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.80)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#FFFFFF',
    desc: 'Biru pekat berkesan elegan & formal.',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    bg: '#4338CA',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.80)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#FFFFFF',
    desc: 'Nuansa teknologi modern.',
  },
  {
    id: 'slate',
    name: 'Slate',
    bg: '#334155',
    titleColor: '#FFFFFF',
    subtitleColor: 'rgba(255, 255, 255, 0.80)',
    badgeBg: 'rgba(255, 255, 255, 0.12)',
    badgeBorder: 'rgba(255, 255, 255, 0.18)',
    badgeText: '#FFFFFF',
    desc: 'Elegan, netral, dan kontras tinggi.',
  },
  {
    id: 'soft_blue',
    name: 'Soft Blue',
    bg: '#EFF6FF',
    titleColor: '#0F172A',
    subtitleColor: '#64748B',
    badgeBg: '#FFFFFF',
    badgeBorder: '#E2E8F0',
    badgeText: '#334155',
    desc: 'Segar, terang, dan bersih.',
    isLight: true,
  },
];

interface PengaturanTemaViewProps {
  appData: AppData;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

// Preset Themes Configuration
interface PresetThemeConfig {
  id: string;
  name: string;
  tagline: string;
  primaryHex: string;
  darkHex: string;
  lightHex: string;
  font: FontThemeOption;
  desc: string;
  isDefault?: boolean;
}

const THEME_PRESETS: PresetThemeConfig[] = [
  {
    id: 'school_blue',
    name: 'SMKN 6 Garut (School Blue)',
    tagline: 'Default Sekolah — Profesional & Tepercaya',
    primaryHex: '#1646E3',
    darkHex: '#1238B8',
    lightHex: '#DBEAFE',
    font: 'inter',
    desc: 'Warna biru resmi SMKN 6 Garut. Dirancang khusus untuk operasional presensi sekolah yang bersih, tepercaya, dan nyaman di mata.',
    isDefault: true,
  },
  {
    id: 'professional',
    name: 'Professional Enterprise',
    tagline: 'Netral, Tenang & Minimalis Korporat',
    primaryHex: '#2563EB',
    darkHex: '#1E293B',
    lightHex: '#E2E8F0',
    font: 'inter',
    desc: 'Tema netral resolusi tinggi cocok untuk manajemen instansi pendidikan dengan aksen kontras yang seimbang.',
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    tagline: 'Samudra Cerah & Segar',
    primaryHex: '#0284C7',
    darkHex: '#0369A1',
    lightHex: '#E0F2FE',
    font: 'modern',
    desc: 'Nuansa biru samudra yang memberikan kesan segar, dinamis, dan intuitif untuk penggunaan sehari-hari.',
  },
  {
    id: 'emerald',
    name: 'Emerald Education',
    tagline: 'Hijau Zamrud Alam & Harmonis',
    primaryHex: '#059669',
    darkHex: '#047857',
    lightHex: '#D1FAE5',
    font: 'inter',
    desc: 'Nuansa hijau alami yang memberikan suasana tenang, sejuk, dan terstruktur untuk lingkungan pendidikan.',
  },
  {
    id: 'indigo',
    name: 'Modern Indigo',
    tagline: 'Nila Modern & Elegan',
    primaryHex: '#4F46E5',
    darkHex: '#4338CA',
    lightHex: '#E0E7FF',
    font: 'modern',
    desc: 'Aksen indigo futuristik yang menghadirkan nuansa digital modern tanpa mengorbankan kenyamanan keterbacaan.',
  },
  {
    id: 'violet',
    name: 'Creative Violet',
    tagline: 'Ungu Kreatif & Inspiratif',
    primaryHex: '#7C3AED',
    darkHex: '#6D28D9',
    lightHex: '#EDE9FE',
    font: 'poppins',
    desc: 'Warna ungu berkelas yang menginspirasi kreativitas dan memberikan tampilan visual unik.',
  },
  {
    id: 'slate',
    name: 'Slate Monochrome',
    tagline: 'Monokrom Rapi & Elegan',
    primaryHex: '#475569',
    darkHex: '#334155',
    lightHex: '#F1F5F9',
    font: 'inter',
    desc: 'Nuansa abu-abu slate monokromatik yang elegan, minimalis, dan sangat fokus pada data.',
  },
];

// Color Palette Swatches
const COLOR_SWATCHES = [
  { id: 'school_blue', name: 'School Blue', hex: '#2563EB', desc: 'Warna Utama SMKN 6 Garut' },
  { id: 'indigo', name: 'Indigo', hex: '#4F46E5', desc: 'Nila Modern' },
  { id: 'emerald', name: 'Emerald', hex: '#059669', desc: 'Hijau Zamrud' },
  { id: 'violet', name: 'Violet', hex: '#7C3AED', desc: 'Ungu Kreatif' },
  { id: 'rose', name: 'Rose', hex: '#E11D48', desc: 'Merah Mawar' },
  { id: 'amber', name: 'Amber', hex: '#D97706', desc: 'Kuning Amber' },
  { id: 'slate', name: 'Slate', hex: '#475569', desc: 'Abu Slate Netral' },
];

// Typography Options
const FONT_OPTIONS: { id: FontThemeOption; name: string; isRecommended?: boolean; desc: string }[] = [
  { id: 'inter', name: 'Inter UI', isRecommended: true, desc: 'Standar UI profesional korporat, keterbacaan terbaik' },
  { id: 'modern', name: 'Plus Jakarta Sans', desc: 'Modern, kontemporer, tajam, dan elegan' },
  { id: 'poppins', name: 'Poppins', desc: 'Geometris, ramah, dinamis, dan seimbang' },
  { id: 'nunito', name: 'Nunito', desc: 'Bulat, lembut, bersahabat, dan sangat bersih' },
  { id: 'montserrat', name: 'Montserrat', desc: 'Ekspresif, tegas, dan bergaya modern' },
];

export const PengaturanTemaView: React.FC<PengaturanTemaViewProps> = ({
  appData,
  readOnly,
  onUpdateAppData,
  onShowToast,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};

  // Local state initialized from appData.sekolah
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(
    sekolah.themeMode || 'system'
  );
  const [activePreset, setActivePreset] = useState<string>(
    sekolah.themePreset || sekolah.theme || 'school_blue'
  );
  const [sidebarTheme, setSidebarTheme] = useState<SidebarThemeOption>(
    sekolah.sidebarTheme || 'royal'
  );
  const [pageHeaderBackground, setPageHeaderBackground] = useState<PageHeaderBackgroundOption>(
    sekolah.pageHeaderBackground || 'gradient_royal'
  );
  const [primaryColor, setPrimaryColor] = useState<string>(
    sekolah.primaryColor || '#1646E3'
  );
  const [fontTheme, setFontTheme] = useState<FontThemeOption>(
    sekolah.fontTheme || 'inter'
  );
  const [density, setDensity] = useState<'compact' | 'comfortable' | 'spacious'>(
    sekolah.density || 'comfortable'
  );
  const [componentRadius, setComponentRadius] = useState<'standard' | 'rounded' | 'soft'>(
    sekolah.componentRadius || 'standard'
  );
  const [shadowStyle, setShadowStyle] = useState<'minimal' | 'default' | 'elevated'>(
    sekolah.shadowStyle || 'minimal'
  );
  const [sidebarBehavior, setSidebarBehavior] = useState<'expanded' | 'collapsed'>(
    sekolah.sidebarBehavior || 'collapsed'
  );
  const [dashboardStyle, setDashboardStyle] = useState<'standard' | 'analytics' | 'compact'>(
    sekolah.dashboardStyle || 'standard'
  );
  const [enableAnimations, setEnableAnimations] = useState<boolean>(
    sekolah.enableAnimations !== false
  );

  // Auto-save notification status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Sync state if external appData changes
  useEffect(() => {
    setThemeMode(sekolah.themeMode || 'system');
    setActivePreset(sekolah.themePreset || sekolah.theme || 'school_blue');
    setSidebarTheme(sekolah.sidebarTheme || 'royal');
    setPageHeaderBackground(sekolah.pageHeaderBackground || 'gradient_royal');
    setPrimaryColor(sekolah.primaryColor || '#1646E3');
    setFontTheme(sekolah.fontTheme || 'inter');
    setDensity(sekolah.density || 'comfortable');
    setComponentRadius(sekolah.componentRadius || 'standard');
    setShadowStyle(sekolah.shadowStyle || 'minimal');
    setSidebarBehavior(sekolah.sidebarBehavior || 'expanded');
    setDashboardStyle(sekolah.dashboardStyle || 'standard');
    setEnableAnimations(sekolah.enableAnimations !== false);
  }, [appData.sekolah]);

  // Live preview attribute applier (temporary live reaction)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', activePreset);
    document.documentElement.setAttribute('data-sidebar-theme', sidebarTheme);
    document.documentElement.setAttribute('data-font', fontTheme);
    document.documentElement.setAttribute('data-density', density);
    document.documentElement.setAttribute('data-radius', componentRadius);
    document.documentElement.setAttribute('data-shadow', shadowStyle);
    document.documentElement.setAttribute('data-page-header-bg', pageHeaderBackground);

    if (primaryColor) {
      document.documentElement.style.setProperty('--theme-primary', primaryColor);
    }

    const matchedPreset = PAGE_HEADER_BG_PRESETS.find((p) => p.id === pageHeaderBackground) || PAGE_HEADER_BG_PRESETS[0];
    document.documentElement.style.setProperty('--page-header-bg', matchedPreset.bg);
    document.documentElement.style.setProperty('--page-header-title', matchedPreset.titleColor);
    document.documentElement.style.setProperty('--page-header-subtitle', matchedPreset.subtitleColor);
    document.documentElement.style.setProperty('--page-header-badge-bg', matchedPreset.badgeBg);
    document.documentElement.style.setProperty('--page-header-badge-border', matchedPreset.badgeBorder);
    document.documentElement.style.setProperty('--page-header-badge-text', matchedPreset.badgeText);

    // Backward compatibility tokens
    document.documentElement.style.setProperty('--page-title-color', matchedPreset.titleColor);
    document.documentElement.style.setProperty('--page-subtitle-color', matchedPreset.subtitleColor);
  }, [activePreset, sidebarTheme, fontTheme, density, componentRadius, shadowStyle, primaryColor, pageHeaderBackground]);

  // Handle Select Theme Preset
  const handleSelectPreset = (preset: PresetThemeConfig) => {
    setActivePreset(preset.id);
    setPrimaryColor(preset.primaryHex);
    setFontTheme(preset.font);
  };

  // Handle Save All Settings
  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (readOnly) {
      onShowToast('Mode Pratinjau: Perubahan tidak dapat disimpan.', 'warning');
      return;
    }

    setSaveStatus('saving');

    const updatedSekolah: SekolahConfig = {
      ...appData.sekolah,
      themeMode,
      themePreset: activePreset as any,
      theme: activePreset as any,
      sidebarTheme,
      pageHeaderBackground,
      primaryColor,
      fontTheme,
      density,
      componentRadius,
      shadowStyle,
      sidebarBehavior,
      dashboardStyle,
      enableAnimations,
    };

    const updatedAppData: AppData = {
      ...appData,
      sekolah: updatedSekolah,
    };

    onUpdateAppData(updatedAppData);

    setTimeout(() => {
      setSaveStatus('saved');
      onShowToast('Pengaturan Tema & Tampilan berhasil disimpan!', 'success');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }, 400);
  };

  // Handle Reset to Default (SMKN 6 Garut Preset)
  const handleConfirmReset = () => {
    setThemeMode('system');
    setActivePreset('school_blue');
    setSidebarTheme('royal');
    setPageHeaderBackground('gradient_royal');
    setPrimaryColor('#1646E3');
    setFontTheme('inter');
    setDensity('comfortable');
    setComponentRadius('standard');
    setShadowStyle('minimal');
    setSidebarBehavior('expanded');
    setDashboardStyle('standard');
    setEnableAnimations(true);

    const updatedSekolah: SekolahConfig = {
      ...appData.sekolah,
      themeMode: 'system',
      themePreset: 'school_blue',
      theme: 'school_blue',
      sidebarTheme: 'royal',
      pageHeaderBackground: 'gradient_royal',
      primaryColor: '#1646E3',
      fontTheme: 'inter',
      density: 'comfortable',
      componentRadius: 'standard',
      shadowStyle: 'minimal',
      sidebarBehavior: 'expanded',
      dashboardStyle: 'standard',
      enableAnimations: true,
    };

    const updatedAppData: AppData = {
      ...appData,
      sekolah: updatedSekolah,
    };

    onUpdateAppData(updatedAppData);
    setIsResetModalOpen(false);
    onShowToast('Tema & Tampilan telah di-reset ke preset resmi SMKN 6 Garut!', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      <PageHeader
        icon={Palette}
        title="Tema & Tampilan"
        description="Pusat pengaturan tampilan, skema warna, tipografi, dan preset brand SMKN 6 Garut."
        badge="Theme Center"
        actions={
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 animate-pulse flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Menyimpan...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Tersimpan
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Default</span>
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={handleSaveAll}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            )}
          </div>
        }
      />

      {/* BRANDING CARD SMKN 6 GARUT */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-blue-200">
            <School className="w-3.5 h-3.5" /> Preset Utama Aplikasi
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Identitas Visual SMKN 6 Garut
          </h2>
          <p className="text-xs text-blue-100/80 leading-relaxed">
            Tema resmi yang dirancang berdasarkan standar brand sekolah. Kombinasi <strong className="text-white">School Blue (#2563EB)</strong> dengan font <strong className="text-white">Inter</strong> dan kepadatan <strong className="text-white">Comfortable</strong> untuk kenyamanan operasional staf &amp; siswa.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          {sekolah.logo ? (
            <img src={sekolah.logo} alt="Logo Sekolah" className="w-16 h-16 object-contain bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-md" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-600/40 border border-white/20 flex items-center justify-center font-bold text-lg">
              SMK6
            </div>
          )}
          <div className="text-xs">
            <div className="font-bold text-white text-sm">{sekolah.nama || 'SMKN 6 GARUT'}</div>
            <div className="text-blue-200/80 text-[11px]">Primary: #2563EB • Font: Inter</div>
            <button
              type="button"
              onClick={() => handleSelectPreset(THEME_PRESETS[0])}
              className="mt-2 text-[11px] font-bold text-blue-300 hover:text-white underline flex items-center gap-1"
            >
              Gunakan Preset SMKN 6 Garut &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* MAIN 2-COLUMN GRID (SETTINGS & LIVE PREVIEW) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: CONTROLS (8 COLS) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 1. MODE TAMPILAN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Mode Tampilan
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih skema pencahayaan antarmuka aplikasi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', desc: 'Terang', icon: Sun, color: 'text-amber-500' },
                { id: 'dark', label: 'Dark', desc: 'Gelap', icon: Moon, color: 'text-indigo-400' },
                { id: 'system', label: 'System', desc: 'Otomatis OS', icon: Laptop, color: 'text-blue-500' },
              ].map((item) => {
                const IconComp = item.icon;
                const isActive = themeMode === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setThemeMode(item.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComp className={`w-5 h-5 ${item.color}`} />
                      {isActive && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="mt-3">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. WARNA SIDEBAR */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layout className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Warna Sidebar
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih warna sidebar yang paling nyaman untuk Anda. Header dan area konten akan selalu tetap netral.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {SIDEBAR_COLOR_THEMES.map((item) => {
                const isActive = sidebarTheme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSidebarTheme(item.id as SidebarThemeOption)}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Mini preview */}
                      <div className="w-full h-16 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden mb-3 flex flex-col bg-white dark:bg-slate-950">
                        {/* Mini Neutral Header */}
                        <div className="h-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center px-1.5 justify-between">
                          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
                        </div>
                        {/* Mini Body */}
                        <div className="flex-1 flex">
                          {/* Mini Sidebar with exact primaryHex */}
                          <div
                            className="w-10 h-full p-1 flex flex-col gap-1"
                            style={{ backgroundColor: item.primaryHex }}
                          >
                            <div className="w-full h-1 bg-white/40 rounded-xs" />
                            <div className="w-full h-2 bg-white/20 border-l border-white rounded-xs" />
                            <div className="w-full h-1 bg-white/20 rounded-xs" />
                          </div>
                          {/* Mini Content Area (Neutral) */}
                          <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-1.5 space-y-1">
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-xs" />
                            <div className="grid grid-cols-2 gap-1">
                              <div className="h-4 bg-white dark:bg-slate-800 rounded-xs border border-slate-200/60 dark:border-slate-700" />
                              <div className="h-4 bg-white dark:bg-slate-800 rounded-xs border border-slate-200/60 dark:border-slate-700" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: item.primaryHex }} />
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</span>
                        </div>
                        {item.isDefault && (
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-md">
                            ✓ Default
                          </span>
                        )}
                        {isActive && !item.isDefault && (
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2.5 BACKGROUND HEADER HALAMAN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Background Header Halaman
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih warna / gradient background untuk area Page Header / Hero Header. Warna teks dan badge disesuaikan secara otomatis untuk kontras maksimal.
                </p>
              </div>
              <span className="self-start sm:self-auto px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-extrabold border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                Preset Selector
              </span>
            </div>

            {/* LIVE PAGE HEADER HERO PREVIEW CARD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> Pratinjau Hero Header Real-Time
                </span>
                <span className="text-[10px] text-slate-400">Tampilan Langsung di Aplikasi</span>
              </div>

              {(() => {
                const currentPreset = PAGE_HEADER_BG_PRESETS.find((p) => p.id === pageHeaderBackground) || PAGE_HEADER_BG_PRESETS[0];
                return (
                  <div
                    className="rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden transition-all duration-300 border border-slate-200/30"
                    style={{ background: currentPreset.bg }}
                  >
                    <div className="absolute right-3 top-3 bottom-3 opacity-10 pointer-events-none flex items-center pr-2">
                      <Calendar className="w-32 h-32 text-current" style={{ color: currentPreset.titleColor }} />
                    </div>
                    <div className="relative z-10 space-y-2">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border transition-colors"
                        style={{
                          backgroundColor: currentPreset.badgeBg,
                          borderColor: currentPreset.badgeBorder,
                          color: currentPreset.badgeText,
                        }}
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-300" />
                        <span>Presensi Hari Ini (Jumat, 21 Agt 2026)</span>
                      </div>
                      <h1
                        className="text-xl md:text-2xl font-black tracking-tight transition-colors duration-200"
                        style={{ color: currentPreset.titleColor }}
                      >
                        Halaman Input &amp; Kelola Presensi Siswa
                      </h1>
                      <p
                        className="text-xs md:text-sm max-w-xl leading-relaxed transition-colors duration-200"
                        style={{ color: currentPreset.subtitleColor }}
                      >
                        Kelola data siswa dan pencatatan kehadiran harian secara cepat dan akurat.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ACCESSIBILITY & CONTRAST NOTICE */}
            <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-800/60 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-300">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">✓ Kontras Otomatis:</span> Warna teks judul, deskripsi, dan badge dihitung secara otomatis (Putih pada background gelap / Gelap pada background terang) untuk menjamin standar keterbacaan WCAG AAA.
              </div>
            </div>

            {/* COLOR PRESETS GRID (7 PRESETS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PAGE_HEADER_BG_PRESETS.map((preset) => {
                const isActive = pageHeaderBackground === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPageHeaderBackground(preset.id)}
                    className={`p-3.5 rounded-2xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Mini Background Swatch Box */}
                      <div
                        className="w-full h-12 rounded-xl mb-3 border border-slate-200/80 dark:border-slate-700 shadow-xs relative overflow-hidden flex items-center justify-center p-2"
                        style={{ background: preset.bg }}
                      >
                        <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-md" style={{ color: preset.titleColor, backgroundColor: preset.badgeBg }}>
                          Header Text
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {preset.name}
                        </span>
                        <div className="flex items-center gap-1">
                          {preset.isDefault && (
                            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 rounded-md">
                              Default
                            </span>
                          )}
                          {isActive && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[120px]">{preset.bg.startsWith('linear') ? 'Gradient' : preset.bg}</span>
                      <span className="font-bold px-1 rounded text-[9px]" style={{ color: preset.titleColor, backgroundColor: preset.isLight ? '#334155' : 'transparent' }}>
                        Teks: {preset.isLight ? 'Gelap' : 'Putih'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. PRESET TEMA */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Preset Tema
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih kombinasi warna dan gaya instan yang telah dikurasi secara profesional.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {THEME_PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-4 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {preset.name}
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full shadow-xs border border-white/20" style={{ backgroundColor: preset.primaryHex }} />
                        <span className="w-4 h-4 rounded-full shadow-xs border border-white/20" style={{ backgroundColor: preset.darkHex }} />
                        <span className="w-4 h-4 rounded-full shadow-xs border border-white/20" style={{ backgroundColor: preset.lightHex }} />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{preset.primaryHex}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. WARNA UTAMA & SEMANTIC COLORS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Warna Utama
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih aksen warna brand utama aplikasi.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {COLOR_SWATCHES.map((swatch) => {
                const isActive = primaryColor.toLowerCase() === swatch.hex.toLowerCase();
                return (
                  <button
                    key={swatch.id}
                    type="button"
                    onClick={() => setPrimaryColor(swatch.hex)}
                    className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition ${
                      isActive
                        ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-xs flex items-center justify-center text-white"
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {isActive && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span className="text-xs text-slate-800 dark:text-slate-200">{swatch.name}</span>
                  </button>
                );
              })}
            </div>

            {/* SEMANTIC COLORS EXPLANATION BOX */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Info className="w-4 h-4 text-blue-500" />
                <span>Indikator Warna Semantik Presensi (Tetap &amp; Konsisten)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Warna status presensi tidak berubah ketika warna utama diganti demi kepatuhan visual standar:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <span>Hadir</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
                  <span>Sakit</span>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                </div>
                <div className="p-2 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 rounded-xl flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-300">
                  <span>Izin</span>
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                </div>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
                  <span>Alpa</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                </div>
              </div>
            </div>
          </div>

          {/* 4. TYPOGRAPHY */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Tipografi (Font)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pilih keluarga font antarmuka aplikasi.
              </p>
            </div>

            <div className="space-y-2.5">
              {FONT_OPTIONS.map((font) => {
                const isActive = fontTheme === font.id;
                return (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setFontTheme(font.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 dark:border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-200">
                        Aa
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{font.name}</span>
                          {font.isRecommended && (
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-full">
                              Rekomendasi
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{font.desc}</div>
                      </div>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. DENSITY, RADIUS & SHADOW */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Bentuk &amp; Kepadatan UI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur kepadatan tata letak, kebulatan sudut komponen, dan tingkat kedalaman bayangan.
              </p>
            </div>

            {/* DENSITY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Kepadatan Layout (Density)</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'compact', name: 'Compact', desc: 'Padding Ringkas' },
                  { id: 'comfortable', name: 'Comfortable', desc: 'Default Seimbang' },
                  { id: 'spacious', name: 'Spacious', desc: 'Padding Lapang' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDensity(item.id as any)}
                    className={`p-3 rounded-xl border text-center transition ${
                      density === item.id
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* RADIUS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Bentuk Komponent (Radius)</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'standard', name: 'Standard', desc: '8px Standard' },
                  { id: 'rounded', name: 'Rounded', desc: '12px Membulat' },
                  { id: 'soft', name: 'Soft', desc: '16px Sangat Lembut' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setComponentRadius(item.id as any)}
                    className={`p-3 rounded-xl border text-center transition ${
                      componentRadius === item.id
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* SHADOW */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Gaya Bayangan (Shadow)</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'minimal', name: 'Minimal', desc: 'Flat & Subtle' },
                  { id: 'default', name: 'Default', desc: 'Sedang Normal' },
                  { id: 'elevated', name: 'Elevated', desc: 'Tinggi Melayang' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setShadowStyle(item.id as any)}
                    className={`p-3 rounded-xl border text-center transition ${
                      shadowStyle === item.id
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{item.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 6. LAYOUT PREFERENCES & ANIMATION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layout className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Preferensi Layout &amp; Animasi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur perilaku sidebar desktop, tampilan widget dashboard, dan transisi animasi.
              </p>
            </div>

            {/* INFORMASI SOFT SLATE SIDEBAR */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Layout className="w-4 h-4 text-blue-500" />
                <span>Standar Navigasi Sidebar: Soft Slate (Terkunci Netral)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Sidebar menggunakan warna netral <strong>Soft Slate (#F8FAFC / #111827)</strong> secara konsisten pada semua preset tema agar pengguna dapat bekerja berjam-jam tanpa kelelahan mata. Header tetap terkunci pada <strong>School Blue (#2563EB)</strong> sebagai identitas utama SMKN 6 Garut.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SIDEBAR BEHAVIOR */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Sidebar Desktop Default</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarBehavior('expanded')}
                    className={`flex-1 p-2.5 rounded-xl border text-xs text-center transition ${
                      sidebarBehavior === 'expanded'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Expanded (Terbuka)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarBehavior('collapsed')}
                    className={`flex-1 p-2.5 rounded-xl border text-xs text-center transition ${
                      sidebarBehavior === 'collapsed'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Collapsed (Ramping)
                  </button>
                </div>
              </div>

              {/* ANIMATIONS */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Animasi Micro-Interaksi</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEnableAnimations(true)}
                    className={`flex-1 p-2.5 rounded-xl border text-xs text-center transition ${
                      enableAnimations
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    On (Aktif)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnableAnimations(false)}
                    className={`flex-1 p-2.5 rounded-xl border text-xs text-center transition ${
                      !enableAnimations
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Off (Matikan)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 7. BACKGROUND HALAMAN LOGIN */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Background Halaman Login
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Atur foto latar belakang, wallpaper sekolah, gradasi warna, atau pola digital halaman login.
              </p>
            </div>

            <LoginBackgroundSettings
              appData={appData}
              readOnly={readOnly}
              onUpdateAppData={onUpdateAppData}
              onShowToast={onShowToast}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & COMPONENT SHOWCASE (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6 space-y-6">
            
            {/* MINI DASHBOARD LIVE PREVIEW CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Live Dashboard Preview</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-mono text-slate-500">
                  Real-Time
                </span>
              </div>

              {/* MINI SIMULATED DASHBOARD */}
              <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
                {/* 1. Neutral Header */}
                <div className="bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                      <School className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-none">{sekolah.nama || 'SMKN 6 GARUT'}</div>
                      <div className="text-[9px] text-[#64748B] dark:text-[#94A3B8]">Header Netral</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md border border-slate-200 dark:border-slate-700">
                    Mode: {themeMode.toUpperCase()}
                  </span>
                </div>

                {/* Body (Sidebar + Content) */}
                <div className="flex h-56">
                  {/* 2. Active Sidebar Theme */}
                  <div
                    className="w-24 p-2 flex flex-col justify-between shrink-0 text-white transition-colors duration-200"
                    style={{
                      backgroundColor:
                        SIDEBAR_COLOR_THEMES.find((st) => st.id === sidebarTheme)?.primaryHex || '#2563EB',
                    }}
                  >
                    <div className="space-y-2">
                      <div className="text-[9px] font-bold text-white/60 uppercase tracking-wider">Menu</div>
                      <div className="space-y-1">
                        <div className="px-1.5 py-1 rounded bg-white/15 text-[10px] font-bold text-white border-l-[3px] border-white/90">
                          Dashboard
                        </div>
                        <div className="px-1.5 py-1 rounded text-[10px] text-white/75 hover:bg-white/10">
                          Presensi
                        </div>
                        <div className="px-1.5 py-1 rounded text-[10px] text-white/75 hover:bg-white/10">
                          Laporan
                        </div>
                        <div className="px-1.5 py-1 rounded text-[10px] text-white/75 hover:bg-white/10">
                          Siswa
                        </div>
                      </div>
                    </div>
                    <div className="text-[8px] text-white/70 font-mono">
                      Sidebar: {SIDEBAR_COLOR_THEMES.find((st) => st.id === sidebarTheme)?.name}
                    </div>
                  </div>

                  {/* 3. Neutral Soft Slate Content Area */}
                  <div className="flex-1 bg-[#F8FAFC] dark:bg-slate-950 p-2.5 space-y-2.5 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100">Presensi Real-Time</div>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/60">
                        96.8% Hadir
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="text-[8px] text-slate-400 font-medium">Hadir</div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">1,248</div>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="text-[8px] text-slate-400 font-medium">Alpha</div>
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400">12</div>
                      </div>
                    </div>

                    {/* Table Sample */}
                    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 overflow-hidden text-[10px]">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        <div className="p-1.5 flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">Ahmad Fauzi</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded">
                            Hadir
                          </span>
                        </div>
                        <div className="p-1.5 flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">Siti Rahma</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded">
                            Sakit
                          </span>
                        </div>
                        <div className="p-1.5 flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">Budi Santoso</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 rounded">
                            Izin
                          </span>
                        </div>
                        <div className="p-1.5 flex items-center justify-between">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[90px]">Riki Pratama</span>
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 rounded">
                            Alpa
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMPONENT SHOWCASE */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Pratinjau Komponen UI</span>
                <span className="text-[10px] text-slate-400">Design Tokens</span>
              </div>

              <div className="space-y-3">
                {/* BUTTONS SHOWCASE */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tombol (Buttons)</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Primary
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl"
                    >
                      Secondary
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-xl"
                    >
                      Success
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-xl"
                    >
                      Danger
                    </button>
                  </div>
                </div>

                {/* INPUT SHOWCASE */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Form Input</span>
                  <input
                    type="text"
                    readOnly
                    value="Cari NIS, Nama, atau Kelas..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 focus:outline-none"
                  />
                </div>

                {/* BADGES SHOWCASE */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lencana &amp; Tag Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 rounded-lg">
                      Hadir (Success)
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 rounded-lg">
                      Sakit (Warning)
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300 rounded-lg">
                      Izin (Info)
                    </span>
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 rounded-lg">
                      Alpa (Danger)
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL CONFIRMATION RESET */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold">Reset Tampilan ke Default?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pengaturan warna, preset, font, dan kepadatan akan dikembalikan ke standar resmi SMKN 6 Garut.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <div>• Preset: <strong>SMKN 6 Garut (School Blue)</strong></div>
              <div>• Primary: <strong>#2563EB</strong></div>
              <div>• Font: <strong>Inter UI</strong></div>
              <div>• Density: <strong>Comfortable</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
