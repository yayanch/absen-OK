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
} from 'lucide-react';
import { AppData, SekolahConfig } from '../../types';
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

type BgTypeTab = 'default' | 'image' | 'gradient' | 'pattern' | 'color';

export const LoginBackgroundSettings: React.FC<LoginBackgroundSettingsProps> = ({
  appData,
  readOnly = false,
  onUpdateAppData,
  onShowToast,
  onConfirmModal,
}) => {
  const sekolah: Partial<SekolahConfig> = appData.sekolah || {};

  // Form states
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
      // Compress to ultra high quality full-screen background (2560px max, 0.90 quality)
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
    };

    let updatedAppData: AppData = {
      ...appData,
      sekolah: updatedSekolah,
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Pengaturan Background Login',
      `Memperbarui tampilan latar belakang halaman login (Tipe: ${bgType}).`
    );

    onUpdateAppData(updatedAppData);
    onShowToast('Pengaturan Background Halaman Login berhasil disimpan!', 'success');
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
      };

      const updatedAppData = addAuditLog(
        { ...appData, sekolah: updatedSekolah },
        'Reset Background Login',
        'Mengembalikan latar belakang halaman login ke tema bawaan resmi.'
      );

      onUpdateAppData(updatedAppData);
      onShowToast('Background Login berhasil dikembalikan ke tampilan awal bawaan!', 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Kembalikan Background Login ke Bawaan?',
        'Tampilan latar belakang halaman login akan dikembalikan ke gradasi resmi dan ambient glow bawaan SMKN 6 Garut.',
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
    // Default
    return {
      background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 50%, #e0e7ff 100%)',
    };
  };

  const getBlurFilter = () => {
    switch (blurLevel) {
      case 'sm':
        return 'blur(4px)';
      case 'md':
        return 'blur(8px)';
      case 'lg':
        return 'blur(16px)';
      default:
        return 'none';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-xs">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Kustomisasi Background Halaman Login
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih foto gedung sekolah, upload wallpaper kustom dari perangkat, gradasi warna, atau pola digital.
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
              <span>Simpan Background</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Control Panel + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Controls & Selectors (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
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
                <span className="text-[10px] text-slate-400">Ambient blue aura &amp; grid</span>
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
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  {bgType === 'image' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <span className="text-xs font-bold mt-1">Foto / Wallpaper</span>
                <span className="text-[10px] text-slate-400">Upload atau galeri sekolah</span>
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
                  <Palette className="w-4 h-4 text-blue-600" />
                  {bgType === 'gradient' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <span className="text-xs font-bold mt-1">Gradasi Warna</span>
                <span className="text-[10px] text-slate-400">Gradient halus &amp; elegan</span>
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
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  {bgType === 'pattern' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <span className="text-xs font-bold mt-1">Pola Geometris</span>
                <span className="text-[10px] text-slate-400">Grid, Matrix &amp; Blueprint</span>
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
                  <div
                    className="w-4 h-4 rounded-full border border-slate-300 shadow-xs"
                    style={{ backgroundColor: bgColor }}
                  />
                  {bgType === 'color' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <span className="text-xs font-bold mt-1">Warna Solid</span>
                <span className="text-[10px] text-slate-400">Minimalis satu warna</span>
              </button>
            </div>
          </div>

          {/* SECTION: FOTO / WALLPAPER OPTIONS */}
          {bgType === 'image' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    Sumber Foto / Wallpaper
                  </h4>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setImageSourceTab('preset')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      imageSourceTab === 'preset'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Galeri Sekolah
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSourceTab('upload')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      imageSourceTab === 'upload'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Upload Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSourceTab('url')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      imageSourceTab === 'url'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    URL Tautan
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Gallery Presets */}
              {imageSourceTab === 'preset' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Pilih salah satu dari foto gedung sekolah &amp; ruang edukasi berkualitas tinggi berikut:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {LOGIN_IMAGE_PRESETS.map((preset) => {
                      const isSelected = bgImage === preset.imageUrl;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => {
                            setBgImage(preset.imageUrl);
                            setBgType('image');
                          }}
                          className={`group relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all aspect-4/3 ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-500/30 scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <img
                            src={preset.thumbnailUrl}
                            alt={preset.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2 text-white">
                            <span className="text-[11px] font-bold leading-tight">{preset.name}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Device File Upload */}
              {imageSourceTab === 'upload' && (
                <div className="space-y-3">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {isUploading
                          ? 'Sedang mengoptimasi gambar...'
                          : 'Klik untuk memilih foto atau seret ke sini (Drag & Drop)'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Mendukung format JPG, PNG, atau WebP (Disarankan rasio landscape 16:9 atau 4:3)
                      </p>
                    </div>
                  </div>

                  {bgImage && bgImage.startsWith('data:image') && (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Foto kustom Anda sedang aktif dan siap digunakan
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBgImage('');
                          setBgType('default');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                        title="Hapus foto kustom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab 3: External URL */}
              {imageSourceTab === 'url' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Alamat URL Gambar (Direct Image Link)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Link className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          value={customUrlInput}
                          onChange={(e) => setCustomUrlInput(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full py-2.5 pl-10 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition shrink-0 cursor-pointer"
                      >
                        Terapkan URL
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION: GRADIENT PRESETS */}
          {bgType === 'gradient' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Pilihan Gradasi Warna Elegan</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOGIN_GRADIENT_PRESETS.map((item) => {
                  const isSelected = bgGradient === item.gradient;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setBgGradient(item.gradient)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 shadow-xs border border-white/20"
                        style={{ background: item.gradient }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: PATTERN PRESETS */}
          {bgType === 'pattern' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Pola Geometris &amp; Blueprint Matrix</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LOGIN_PATTERN_PRESETS.map((item) => {
                  const isSelected = bgPattern === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setBgPattern(item.id)}
                      className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl shrink-0 shadow-xs border border-white/20"
                        style={{
                          backgroundColor: item.bgBase,
                          backgroundImage: item.svgPattern,
                          backgroundSize: '16px 16px',
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: SOLID COLOR */}
          {bgType === 'color' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Palette className="w-4 h-4 text-blue-600" />
                <span>Pilih Warna Latar Belakang Solid</span>
              </h4>

              <div className="flex flex-wrap items-center gap-3">
                {[
                  { name: 'Biru Royal', hex: '#1e40af' },
                  { name: 'Biru Navy', hex: '#0f172a' },
                  { name: 'Biru Samudra', hex: '#0284c7' },
                  { name: 'Hijau Zamrud', hex: '#065f46' },
                  { name: 'Nila Indigo', hex: '#3730a3' },
                  { name: 'Abu Slate', hex: '#334155' },
                  { name: 'Hitam Pekat', hex: '#020617' },
                ].map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => setBgColor(swatch.hex)}
                    className={`px-3 py-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                      bgColor.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span>{swatch.name}</span>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Warna Kustom (Hex):</label>
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-9 h-9 rounded-xl border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="w-28 py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          )}

          {/* ADVANCED ADJUSTMENT CONTROLS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Penyesuaian Visual &amp; Efek Overlay Latar</span>
            </h4>

            {/* Slider Kegelapan Lapisan (Overlay Darkness) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-700 dark:text-slate-300">
                  Kegelapan Lapisan Overlay (Tingkat Kontras Teks)
                </label>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono">
                  {overlayOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="85"
                step="5"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                Semakin tinggi nilai persentase, kartu login akan semakin kontras dan mudah dibaca di atas gambar.
              </p>
            </div>

            {/* Efek Blur Level Background */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Efek Blur Latar Belakang (Bokeh / Buram)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Tanpa Blur' },
                  { id: 'sm', label: 'Ringan (4px)' },
                  { id: 'md', label: 'Sedang (8px)' },
                  { id: 'lg', label: 'Kuat (16px)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setBlurLevel(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                      blurLevel === item.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fit Mode for Image */}
            {bgType === 'image' && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Mode Skala Tampilan Foto (Fit Mode)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cover', label: 'Penuh Layar (Cover)' },
                    { id: 'contain', label: 'Proporsional (Contain)' },
                    { id: 'tile', label: 'Berulang (Tile)' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBgFit(item.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer text-center ${
                        bgFit === item.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CARD LOGIN TRANSPARENCY & GLASSMORPHISM SETTINGS */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Pengaturan Transparansi Card Login</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-full">
                Glassmorphism
              </span>
            </div>

            {/* Slider Opacity Card Login */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <label className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Tingkat Transparansi (Opasitas Kartu)</span>
                </label>
                <span className="px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
                  {cardOpacity}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={cardOpacity}
                onChange={(e) => setCardOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />

              {/* Preset Buttons */}
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {[
                  { value: 30, label: '30% Bening' },
                  { value: 50, label: '50% Tipis' },
                  { value: 60, label: '60% Kaca' },
                  { value: 80, label: '80% Tebal' },
                  { value: 100, label: '100% Solid' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setCardOpacity(preset.value)}
                    className={`py-1.5 px-1 rounded-xl text-[10px] font-bold border transition cursor-pointer text-center ${
                      cardOpacity === preset.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Semakin rendah persentase opasitas, latar belakang halaman login akan semakin terlihat tembus pandang di balik form login (efek kaca).
              </p>
            </div>

            {/* Card Blur (Frosting) Level */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Efek Buram Kaca Kartu (Backdrop Blur / Frosting)
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'none', label: 'Biasa' },
                  { id: 'sm', label: 'Halus' },
                  { id: 'md', label: 'Sedang' },
                  { id: 'lg', label: 'Tebal' },
                  { id: '2xl', label: 'Ekstra' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCardBlur(item.id as any)}
                    className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition cursor-pointer text-center ${
                      cardBlur === item.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
            <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner h-[460px] flex flex-col justify-between">
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
                    <p className="font-bold text-[11px] text-slate-900 dark:text-white leading-none">
                      {sekolah.nama || 'SMKN 6 GARUT'}
                    </p>
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 leading-none mt-0.5">
                      {sekolah.headerTitle || 'Sistem Informasi Presensi'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-white/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-md border border-white/50 dark:border-slate-700/60 backdrop-blur-md">
                  {sekolah.appVersion || 'v2.5.0'}
                </span>
              </div>

              {/* Mock Login Card */}
              <div className="relative z-10 px-4 py-2 my-auto flex justify-center">
                <div
                  className={`w-full max-w-[280px] rounded-2xl p-4 shadow-xl border space-y-3 transition-all ${
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
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center font-bold text-xs mb-1">
                      <School className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {sekolah.nama || 'SMKN 6 GARUT'}
                    </p>
                    <p className="text-[10px] font-semibold text-blue-600">
                      Sistem Absensi Siswa
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="h-7 bg-slate-100/80 rounded-lg border border-slate-200/80 flex items-center px-2 text-[10px] text-slate-600 font-medium">
                      Username / NIP / NISN
                    </div>
                    <div className="h-7 bg-slate-100/80 rounded-lg border border-slate-200/80 flex items-center px-2 text-[10px] text-slate-600 font-medium">
                      ••••••••••••
                    </div>
                    <div className="h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                      Masuk ke Sistem
                    </div>
                  </div>
                </div>
              </div>

              {/* Mock Footer */}
              <div className="relative z-10 p-2 text-center text-[9px] text-slate-700 dark:text-slate-300 font-medium">
                © {new Date().getFullYear()} {sekolah.nama || 'SMKN 6 Garut'}. Sistem Presensi Sekolah.
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Tampilan simulasi kartu login di atas menggunakan konfigurasi background yang sedang Anda pilih.
            </p>

            {!readOnly && (
              <button
                type="button"
                onClick={() => handleSave()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Background</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
