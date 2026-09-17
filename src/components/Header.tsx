import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  Sun,
  Sunset,
  Moon,
  Wifi,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  QrCode,
  User,
  LogOut,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  BookOpen,
  Settings,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import { SekolahConfig, ViewType, UserSession, ThemeOption, AppData } from '../types';
import { normalizeWeeklyShiftPeriods, generateWeeklyShiftSchedules, getTodayString } from '../utils/helpers';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
  sekolah: Partial<SekolahConfig>;
  appData?: AppData;
  isDarkMode: boolean;
  onToggleTheme?: () => void;
  onToggleDarkMode?: () => void;
  onSelectColorTheme?: (themeId: ThemeOption) => void;
  isOnline?: boolean;
  activeView?: ViewType;
  onNavigate: (view: ViewType) => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'dirty' | 'error' | 'conflict' | 'syncing' | 'offline' | 'unknown';
  currentUser?: UserSession | null;
  onLogout?: () => void;
  onOpenServerQrModal?: () => void;
  onShowServerQrModal?: () => void;
  onOpenChat?: () => void;
  unreadChatCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  isSidebarOpen = false,
  sekolah,
  appData,
  isDarkMode,
  onToggleTheme,
  onToggleDarkMode,
  isOnline = true,
  onNavigate,
  saveStatus = 'idle',
  currentUser,
  onLogout,
  onOpenServerQrModal,
  onShowServerQrModal,
  onOpenChat,
  unreadChatCount = 0,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleToggleDark = onToggleDarkMode || onToggleTheme;
  const handleServerQrModal = onOpenServerQrModal || onShowServerQrModal;

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format user role badge text
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return { label: 'Administrator', icon: ShieldCheck, color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300' };
      case 'kesiswaan':
        return { label: 'Tim Kesiswaan', icon: UserCheck, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300' };
      case 'kurikulum':
        return { label: 'Tim Kurikulum', icon: BookOpen, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300' };
      case 'staf_jadwal':
        return { label: 'Staf Jadwal', icon: BookOpen, color: 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300' };
      case 'wali':
        return { label: 'Wali Kelas', icon: User, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' };
      case 'guru':
        return { label: 'Guru Pengajar', icon: User, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
      case 'murid':
        return { label: 'Siswa', icon: GraduationCap, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300' };
      default:
        return { label: 'Pengguna', icon: User, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const roleInfo = getRoleLabel(currentUser?.role);
  const RoleIcon = roleInfo.icon;

  const freshUser = React.useMemo(() => {
    if (!currentUser) return null;
    const currentData = (currentUser.data || {}) as any;
    if (currentUser.role === 'admin') {
      return appData?.admin || currentData;
    }
    if (currentUser.role === 'murid' || currentUser.role === 'siswa') {
      const found = appData?.siswa?.find((s) => 
        (currentData.id && s.id === currentData.id) || 
        (currentData.nisn && s.nisn === currentData.nisn) || 
        (currentData.username && s.username === currentData.username)
      );
      return found || currentData;
    }
    if (currentUser.role === 'kesiswaan') {
      const found = appData?.waliKelas?.find((w) => 
        (currentData.id && w.id === currentData.id) || 
        (currentData.username && String(w.username).toLowerCase() === String(currentData.username).toLowerCase()) || 
        (currentData.nip && String(w.nip).toLowerCase() === String(currentData.nip).toLowerCase())
      );
      return found || (currentData.username === 'kesiswaan' ? appData?.kesiswaan : null) || currentData;
    }
    if (currentUser.role === 'kurikulum') {
      const found = appData?.waliKelas?.find((w) => 
        (currentData.id && w.id === currentData.id) || 
        (currentData.username && String(w.username).toLowerCase() === String(currentData.username).toLowerCase()) || 
        (currentData.nip && String(w.nip).toLowerCase() === String(currentData.nip).toLowerCase())
      );
      return found || (currentData.username === 'kurikulum' ? appData?.kurikulum : null) || currentData;
    }
    // Wali / Guru / User
    const found = appData?.waliKelas?.find((w) => 
      (currentData.id && w.id === currentData.id) || 
      (currentData.username && String(w.username).toLowerCase() === String(currentData.username).toLowerCase()) || 
      (currentData.nip && String(w.nip).toLowerCase() === String(currentData.nip).toLowerCase()) ||
      (w.nip && currentData.username && String(w.nip).toLowerCase() === String(currentData.username).toLowerCase())
    );
    return found || currentData;
  }, [currentUser, appData]);

  const userData = freshUser || (currentUser?.data as any);
  const userName = userData?.nama || 'Pengguna';
  const userUsername = userData?.username || (userData?.nisn ? `NISN: ${userData.nisn}` : '');
  const userFoto = userData?.foto || (currentUser?.data as any)?.foto || '';

  // Current Weekly Shift calculation for Header
  const shiftInfo = React.useMemo(() => {
    if (!appData) return null;
    const todayStr = getTodayString();
    const rawPeriods = normalizeWeeklyShiftPeriods(appData.shiftConfig?.periods);
    const periods = rawPeriods && rawPeriods.length > 0 ? rawPeriods : generateWeeklyShiftSchedules();

    const matched = periods.find((p) => {
      const s = p.startDate.slice(0, 10);
      const e = p.endDate.slice(0, 10);
      return todayStr >= s && todayStr <= e;
    }) || periods[0];

    if (!matched) return null;

    const getPagiClasses = (k1Type: string, k2Type: string) => {
      if (k1Type === 'pagi' && k2Type === 'pagi') return 'Kelas X, XI & XII';
      if (k1Type === 'pagi') return 'Kelas X & XI';
      if (k2Type === 'pagi') return 'Kelas XII';
      if (k1Type === 'siang' && k2Type === 'siang') return 'Libur';
      if (k1Type === 'siang') return 'Kelas XII';
      if (k2Type === 'siang') return 'Kelas X & XI';
      return 'Kelas XII';
    };

    const getSiangClasses = (k1Type: string, k2Type: string) => {
      if (k1Type === 'siang' && k2Type === 'siang') return 'Kelas X, XI & XII';
      if (k1Type === 'siang') return 'Kelas X & XI';
      if (k2Type === 'siang') return 'Kelas XII';
      if (k1Type === 'pagi' && k2Type === 'pagi') return 'Libur';
      if (k1Type === 'pagi') return 'Kelas XII';
      if (k2Type === 'pagi') return 'Kelas X & XI';
      return 'Kelas X & XI';
    };

    const k1 = matched.kelompok1Type || 'pagi';
    const k2 = matched.kelompok2Type || (k1 === 'pagi' ? 'siang' : 'pagi');

    return {
      pagiClass: getPagiClasses(k1, k2),
      siangClass: getSiangClasses(k1, k2),
    };
  }, [appData]);

  return (
    <header className="w-full bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md text-[#0F172A] dark:text-[#F8FAFC] shadow-xs border-b border-[#E2E8F0] dark:border-[#374151] transition-colors duration-200">
      <div className="w-full px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* LEFT SECTION: TOGGLE & SHIFT SCHEDULE (VISIBLE ON MOBILE & DESKTOP) */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label={isSidebarOpen ? 'Tutup menu sidebar' : 'Buka menu sidebar'}
            title={isSidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
            className="p-1.5 sm:p-2 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] rounded-xl transition focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer shrink-0"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* JADWAL SHIFT PEKAN INI (TERLIHAT DI MOBILE & DESKTOP) */}
          {shiftInfo && (
            <div
              onClick={() => onNavigate('jadwal_shift')}
              className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer select-none shadow-2xs group shrink-0"
              title="Klik untuk melihat Jadwal Shift Lengkap"
            >
              {/* Shift Pagi */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
                <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200">
                  <Sun className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 stroke-[2.2]" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide">PAGI:</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                  {shiftInfo.pagiClass}
                </span>
              </div>

              <span className="text-slate-300 dark:text-slate-600 text-xs font-semibold select-none">|</span>

              {/* Shift Siang */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs">
                <span className="font-bold flex items-center gap-1 text-slate-700 dark:text-slate-200">
                  <Sunset className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 stroke-[2.2]" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide">SIANG:</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] sm:text-xs whitespace-nowrap">
                  {shiftInfo.siangClass}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SECTION: CONTROLS & USER PROFILE */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* SYSTEM STATUS BADGES */}
          <div className="hidden lg:flex items-center gap-2">
            {/* ONLINE / OFFLINE BADGE */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                isOnline
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 animate-pulse'
              }`}
              title={isOnline ? 'Sistem terhubung ke internet' : 'Sistem bekerja dalam mode offline'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Offline</span>
                </>
              )}
            </div>

            {/* SAVE / SYNC / CONFLICT STATUS BADGE */}
            {saveStatus === 'saving' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                <span>Menyimpan...</span>
              </div>
            )}
            {saveStatus === 'syncing' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                <span>Menyinkronkan...</span>
              </div>
            )}
            {saveStatus === 'conflict' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-400 dark:border-amber-700 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Konflik Data</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Tersimpan</span>
              </div>
            )}
            {saveStatus === 'dirty' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Belum disimpan</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Gagal menyimpan</span>
              </div>
            )}
          </div>

          {/* SERVER QR MODAL TRIGGER BUTTON (IF AUTHORIZED) */}
          {handleServerQrModal && (currentUser?.role === 'admin' || currentUser?.role === 'kesiswaan') && (
            <button
              type="button"
              onClick={handleServerQrModal}
              aria-label="Tampilkan QR Server Presensi"
              title="Akses QR Server Presensi"
              className="p-2 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] rounded-xl transition focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}

          {/* LIVE CHAT TRIGGER BUTTON */}
          {onOpenChat && (currentUser?.role === 'admin' || (appData?.enableLiveChat ?? appData?.sekolah?.enableLiveChat ?? true)) && (
            <button
              type="button"
              onClick={onOpenChat}
              aria-label="Buka Live Chat"
              title="Live Chat Bantuan"
              className="relative p-2 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] rounded-xl transition focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
            >
              <MessageSquare className="w-5 h-5" />
              {unreadChatCount > 0 ? (
                <span className="absolute 1 top-1 right-1 min-w-[16px] h-[16px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full shadow-xs flex items-center justify-center animate-pulse border border-white dark:border-slate-900">
                  {unreadChatCount}
                </span>
              ) : (
                <span className="absolute 1.5 top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          )}

          {/* DARK / LIGHT MODE SWITCHER */}
          {handleToggleDark && (
            <button
              type="button"
              onClick={handleToggleDark}
              aria-label={isDarkMode ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
              title={isDarkMode ? 'Mode Terang' : 'Mode Gelap'}
              className="p-2 text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937] rounded-xl transition focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : (
                <Moon className="w-5 h-5 text-[#64748B]" />
              )}
            </button>
          )}

          {/* USER PROFILE DROPDOWN */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-label="Buka menu profil pengguna"
              title="Profil Pengguna"
              className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-[#0F172A] dark:text-white transition border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/40 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                {userFoto ? (
                  <img
                    src={userFoto}
                    alt={userName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{userName ? userName.substring(0, 2).toUpperCase() : 'U'}</span>
                )}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold leading-tight max-w-[120px] truncate text-[#0F172A] dark:text-white">
                  {userName}
                </span>
                <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] leading-tight">
                  {roleInfo.label}
                </span>
              </div>

              <ChevronDown className={`w-4 h-4 text-[#64748B] dark:text-[#94A3B8] transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* PROFILE DROPDOWN MENU */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                    {userFoto ? (
                      <img
                        src={userFoto}
                        alt={userName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{userName ? userName.substring(0, 2).toUpperCase() : 'U'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {userName}
                    </p>
                    {userUsername && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {userUsername.startsWith('NISN:') ? userUsername : `@${userUsername}`}
                      </p>
                    )}
                    <div className={`mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${roleInfo.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      <span>{roleInfo.label}</span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onNavigate('pengaturan_admin');
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                  >
                    <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Pengaturan Akun</span>
                  </button>

                  {currentUser?.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onNavigate('pengaturan_tema');
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition"
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Tema &amp; Tampilan</span>
                    </button>
                  )}
                </div>

                {/* Logout Action */}
                {onLogout && (
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Keluar Aplikasi</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Running Text / Announcement Bar */}
      {sekolah.enableRunningText !== false && (
        (() => {
          // Determine announcement text: either custom runningTextAnnouncement or active pengumuman with pinToRunningText
          let displayText = (sekolah.runningTextAnnouncement || '').trim();
          if (!displayText && appData?.pengumuman) {
            const pinnedList = appData.pengumuman.filter((p) => p.aktif && p.pinToRunningText);
            if (pinnedList.length > 0) {
              displayText = pinnedList.map((p) => `📌 ${p.judul}: ${p.isi}`).join('   •••   ');
            }
          }

          if (!displayText) return null;

          const speedClass =
            sekolah.runningTextSpeed === 'slow'
              ? 'animate-marquee-slow'
              : sekolah.runningTextSpeed === 'fast'
              ? 'animate-marquee-fast'
              : 'animate-marquee';

          return (
            <div className="bg-amber-500/10 dark:bg-amber-950/30 border-t border-amber-200/60 dark:border-amber-900/40 px-4 py-1.5 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200 overflow-hidden select-none">
              <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                <Megaphone className="w-3 h-3" />
                <span>Pengumuman</span>
              </div>
              <div className="overflow-hidden whitespace-nowrap w-full">
                <span className={`inline-block font-semibold ${speedClass}`}>
                  {displayText}
                </span>
              </div>
            </div>
          );
        })()
      )}
    </header>
  );
};
