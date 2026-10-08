import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Trash2,
  HardDriveDownload,
  RotateCcw,
  X,
  ChevronDown,
  ChevronRight,
  AlertCircle,
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
  Search,
} from 'lucide-react';
import { ViewType, UserSession, SekolahConfig, AppData, SidebarThemeOption } from '../types';
import { DEFAULT_TOGA_LOGO } from '../data/initialData';
import { hasMenuAccess } from '../utils/rolePermissionEngine';
import {
  getNavigationLayout,
  getEffectiveMenuLabel,
  getEffectiveMenuIcon,
  isMenuVisibleInLayout,
  renderNavIcon
} from '../utils/navigationLayoutEngine';

interface SidebarProps {
  currentView: ViewType;
  currentUser: UserSession;
  sekolah: SekolahConfig;
  appData?: AppData;
  isOpen: boolean;
  enableLiveChat?: boolean;
  adminPassword?: string;
  onSwitchView: (view: ViewType) => void;
  onCloseMobile: () => void;
  onRestoreDemo?: () => void;
  onResetPresensi?: () => void;
  onResetAll: () => void;
  onOpenBackupModal?: () => void;
  onOpenServerQrModal?: () => void;
  onMouseEnter?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  currentUser,
  sekolah,
  appData,
  isOpen,
  enableLiveChat,
  adminPassword,
  onSwitchView,
  onCloseMobile,
  onRestoreDemo,
  onResetPresensi,
  onResetAll,
  onOpenBackupModal,
  onOpenServerQrModal,
  onMouseEnter,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const isKesiswaan = currentUser.role === 'kesiswaan';
  const isKurikulum = currentUser.role === 'kurikulum';
  const isStafJadwal = currentUser.role === 'staf_jadwal';
  const isHubin = currentUser.role === 'hubin';
  const isUserBiasa = currentUser.role === 'user' || currentUser.role === 'guru' || isKurikulum || isHubin || isStafJadwal;
  const isWali = currentUser.role === 'wali';
  const isMurid = currentUser.role === 'murid';
  const isGuruOnly = (currentUser.role === 'guru' || currentUser.role === 'user') && !isAdmin && !isKesiswaan && !isKurikulum && !isHubin && !isWali && !isStafJadwal;
  const canViewMaster = !isMurid;
  const isLiveChatEnabled = enableLiveChat ?? sekolah.enableLiveChat ?? true;

  const studentId = isMurid ? (currentUser.data as any)?.id : null;
  const currentNama = (currentUser.data as any)?.nama?.trim() || '';
  const currentUsername = String((currentUser.data as any)?.username || (currentUser.data as any)?.nip || '').trim().toLowerCase();

  // Wali kelas's assigned classes (dicari berdasarkan id wali, nip, atau nama wali kelas)
  const waliObj = (currentUser.data as any);
  const waliId = waliObj?.id;
  const waliAssignedClassIds = isWali
    ? (appData?.kelas || [])
        .filter((k) => {
          if (waliId && k.waliKelasId === waliId) return true;
          // Fallback pencocokan jika ada referensi nama wali
          if (currentNama) {
            const matchedWali = (appData?.waliKelas || []).find(
              (w) => w.id === k.waliKelasId && (w.nama?.trim().toLowerCase() === currentNama.toLowerCase() || (w.nip && w.nip === waliObj?.nip))
            );
            if (matchedWali) return true;
          }
          return false;
        })
        .map((k) => k.id)
    : [];

  // Hitung notifikasi catatan pelanggaran berdasarkan hak akses:
  // - Admin & Kesiswaan: semua pelanggaran yang perlu tindak lanjut / proses
  // - Wali Kelas: pelanggaran siswa di kelas binaannya
  // - Guru/Pencatat: pelanggaran yang dicatat/dilaporkan oleh guru tersebut
  // - Murid: tidak ada notif badge pelanggaran (atau hanya miliknya jika diizinkan)
  const violationCount = (appData?.pelanggaran || []).filter((p) => {
    const isPending = p.status === 'perlu_tindak_lanjut' || p.status === 'proses';
    if (!isPending) return false;

    if (isAdmin || isKesiswaan) {
      return true;
    }

    // Jika user adalah Wali Kelas dan siswa yang melanggar ada di kelas binaannya
    if (isWali && (waliAssignedClassIds.includes(p.kelasId) || (waliId && appData?.kelas?.some((k) => k.id === p.kelasId && k.waliKelasId === waliId)))) {
      return true;
    }

    // Guru yang mencatat / pelapor
    const pelaporStr = (p.pelapor || '').trim().toLowerCase();
    if (
      currentNama &&
      (pelaporStr === currentNama.toLowerCase() ||
        pelaporStr.includes(currentNama.toLowerCase()) ||
        (currentUsername && pelaporStr.includes(currentUsername)))
    ) {
      return true;
    }

    return false;
  }).length;

  // Hitung notifikasi Home Visit berdasarkan hak akses & relevansi:
  // - Admin & Kesiswaan: semua Home Visit yang berstatus 'perlu_followup' atau 'proses'
  // - Wali Kelas: Home Visit siswa yang berada di kelas binaan wali kelas tersebut (pasti tampil notifnya)
  // - Guru/Petugas Pencatat: Home Visit yang tercatat petugasnya sesuai nama/akun pengguna
  // - Pengguna lain yang tidak berkepentingan: tidak mendapatkan notifikasi (count = 0)
  const homeVisitCount = (appData?.homeVisits || []).filter((h) => {
    const isPending = h.status === 'perlu_followup' || h.status === 'proses';
    if (!isPending) return false;

    // 1. Admin & Tim Kesiswaan
    if (isAdmin || isKesiswaan) {
      return true;
    }

    // 2. Wali Kelas dari murid/kelas binaan (selalu muncul notif jika ada home visit ke murid binaannya)
    if (
      isWali &&
      (waliAssignedClassIds.includes(h.kelasId) ||
        (waliId && appData?.kelas?.some((k) => k.id === h.kelasId && k.waliKelasId === waliId)))
    ) {
      return true;
    }

    // 3. Guru / Petugas yang mencatat kunjungan rumah
    const petugasStr = (h.petugas || '').trim().toLowerCase();
    if (
      currentNama &&
      (petugasStr === currentNama.toLowerCase() ||
        petugasStr.includes(currentNama.toLowerCase()) ||
        (currentUsername && petugasStr.includes(currentUsername)))
    ) {
      return true;
    }

    return false;
  }).length;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    dashboard: true,
    presensi: true,
    laporan: false,
    masterData: false,
    kegiatan: false,
    qrKartu: false,
    sistem: false,
    pengaturan: false,
    reset: false,
  });

  const [isResetUnlocked, setIsResetUnlocked] = useState(false);
  const [showResetAuthModal, setShowResetAuthModal] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetAuthError, setResetAuthError] = useState('');

  const handleVerifyResetPassword = () => {
    const correctPass = 'Lupa12345^';
    if (resetPasswordInput.trim() === correctPass) {
      setIsResetUnlocked(true);
      setShowResetAuthModal(false);
      toggleSection('reset');
      setResetPasswordInput('');
      setResetAuthError('');
    } else {
      setResetAuthError('Password salah! Silakan masukkan Lupa12345^.');
    }
  };

  const toggleSection = (sectionKey: string) => {
    setOpenSections((prev) => {
      const willOpen = !prev[sectionKey];
      if (willOpen) {
        return {
          dashboard: false,
          presensi: false,
          laporan: false,
          masterData: false,
          kegiatan: false,
          qrKartu: false,
          sistem: false,
          pengaturan: false,
          reset: false,
          [sectionKey]: true,
        };
      } else {
        return {
          ...prev,
          [sectionKey]: false,
        };
      }
    });
  };

  const getSidebarStyles = () => {
    const activeThemeKey = (sekolah.sidebarTheme || 'royal') as SidebarThemeOption;

    switch (activeThemeKey) {
      case 'navy':
        return {
          aside: 'bg-[#193FA3] dark:bg-[#172E78] text-white border-r border-blue-800/30 dark:border-blue-950/40 shadow-xs',
          header: 'bg-white/10 dark:bg-black/20 text-white border-b border-white/10',
          itemNormal: 'text-white/85 hover:bg-white/[0.08] hover:text-white border-transparent',
          sectionHeading: 'text-white/60 font-bold text-[11px] uppercase tracking-wider',
          activeBg: 'bg-white text-blue-600 font-bold shadow-xs',
        };
      case 'sky':
        return {
          aside: 'bg-[#168BD6] dark:bg-[#075985] text-white border-r border-sky-700/30 dark:border-sky-900/40 shadow-xs',
          header: 'bg-white/10 dark:bg-black/20 text-white border-b border-white/10',
          itemNormal: 'text-white/90 hover:bg-white/[0.08] hover:text-white border-transparent',
          sectionHeading: 'text-white/65 font-bold text-[11px] uppercase tracking-wider',
          activeBg: 'bg-white text-blue-600 font-bold shadow-xs',
        };
      case 'denim':
        return {
          aside: 'bg-[#2855B5] dark:bg-[#1E3A8A] text-white border-r border-blue-800/30 dark:border-slate-900/40 shadow-xs',
          header: 'bg-white/10 dark:bg-black/20 text-white border-b border-white/10',
          itemNormal: 'text-white/85 hover:bg-white/[0.08] hover:text-white border-transparent',
          sectionHeading: 'text-white/60 font-bold text-[11px] uppercase tracking-wider',
          activeBg: 'bg-white text-blue-600 font-bold shadow-xs',
        };
      case 'slate':
        return {
          aside: 'bg-[#31517A] dark:bg-[#1E293B] text-white border-r border-slate-700/30 dark:border-slate-800/40 shadow-xs',
          header: 'bg-white/10 dark:bg-black/20 text-white border-b border-white/10',
          itemNormal: 'text-white/85 hover:bg-white/[0.08] hover:text-white border-transparent',
          sectionHeading: 'text-white/60 font-bold text-[11px] uppercase tracking-wider',
          activeBg: 'bg-white text-blue-600 font-bold shadow-xs',
        };
      case 'royal':
      default:
        return {
          aside: 'bg-[#1646E3] dark:bg-[#1238B8] text-white border-r border-blue-700/30 dark:border-blue-900/40 shadow-xs',
          header: 'bg-white/10 dark:bg-black/20 text-white border-b border-white/10',
          itemNormal: 'text-white/85 hover:bg-white/[0.08] hover:text-white border-transparent',
          sectionHeading: 'text-white/60 font-bold text-[11px] uppercase tracking-wider',
          activeBg: 'bg-white text-blue-600 font-bold shadow-xs',
        };
    }
  };

  const styles = getSidebarStyles();
  const activeBgClass = styles.activeBg;
  const itemNormalClass = styles.itemNormal;
  const sectionHeadingClass = styles.sectionHeading;

  const handleNavClick = (view: ViewType) => {
    onSwitchView(view);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      onCloseMobile();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCloseMobile]);

  return (
    <>
      <aside
        style={{ opacity: 'var(--sidebar-opacity, 1)' }}
        className={`fixed md:sticky md:top-0 inset-y-0 left-0 z-50 md:z-30 ${styles.aside} overflow-hidden transition-all duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] flex flex-col shrink-0 h-screen h-[100dvh] min-h-screen ${
          isOpen
            ? 'w-[250px] translate-x-0 opacity-100'
            : '-translate-x-full md:translate-x-0 md:w-16 md:opacity-100 md:pointer-events-auto w-[250px]'
        }`}
      >
        <div className={`flex flex-col h-full min-h-full overflow-hidden relative z-10 transition-all duration-300 ${isOpen ? 'w-[250px]' : 'w-16'}`}>
          <div className={`p-3 sm:p-4 flex items-center justify-between ${styles.header} relative overflow-hidden shrink-0`}>
            <button
              type="button"
              onClick={() => handleNavClick('dashboard')}
              className={`flex items-center gap-3 min-w-0 z-10 text-left cursor-pointer hover:opacity-90 transition group ${
                !isOpen ? 'justify-center w-full' : ''
              }`}
              title="Ke Dashboard Utama"
            >
              <div className="w-8 h-8 rounded-lg bg-white p-1 shadow-xs border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img src={sekolah.logo || DEFAULT_TOGA_LOGO} alt="Logo Sekolah" className="w-full h-full object-contain" />
              </div>
              {isOpen && (
                <div className="min-w-0">
                  <h1 className="font-bold text-xs text-white truncate tracking-tight group-hover:text-blue-100 transition-colors">{sekolah.headerTitle || sekolah.nama || 'Absensi Siswa'}</h1>
                  <p className="text-[10px] text-white/80 font-medium truncate">{sekolah.headerSubtitle || sekolah.alamat || 'SMKN 6 GARUT'}</p>
                </div>
              )}
            </button>
            {isOpen && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="md:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition shrink-0 z-10 cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-2 sm:p-3.5 space-y-3 bg-transparent">
            {(() => {
              const navLayout = getNavigationLayout(appData);

              const userRoles = [
                currentUser.role,
                ...((currentUser.data as any)?.additionalRoles || [])
              ].filter(Boolean);

              const hasAnyMenuAccess = (views: ViewType[]) => {
                return views.some(
                  (v) =>
                    hasMenuAccess(userRoles, v, appData) &&
                    isMenuVisibleInLayout(v, navLayout)
                );
              };

              const renderItem = (
                view: ViewType,
                icon: React.ReactNode,
                label: string,
                badgeCount?: number,
                customOnClick?: () => void,
                isSubItem?: boolean,
                bypassPermission?: boolean
              ) => {
                if (!bypassPermission && !hasMenuAccess(userRoles, view, appData)) {
                  return null;
                }
                const isActive = currentView === view || (view === 'dashboard' && currentView === 'portal_murid');
                const handleClick = customOnClick || (() => handleNavClick(view));
                return (
                  <button
                    key={view + label}
                    type="button"
                    onClick={handleClick}
                    title={!isOpen ? label : undefined}
                    className={`relative flex items-center transition border ${
                      isOpen
                        ? `w-full gap-3 px-3 py-2 rounded-lg text-xs font-semibold ${
                            isActive ? `${activeBgClass} border-transparent` : itemNormalClass
                          }`
                        : isSubItem
                        ? `w-9 h-9 mx-auto justify-center rounded-lg text-xs font-semibold ${
                            isActive ? `${activeBgClass} border-transparent shadow-xs` : `${itemNormalClass} bg-white/5`
                          }`
                        : `w-10 h-10 mx-auto justify-center rounded-xl text-xs font-semibold ${
                            isActive ? `${activeBgClass} border-transparent` : itemNormalClass
                          }`
                    }`}
                  >
                    <span className="shrink-0 flex items-center justify-center">{icon}</span>
                    {isOpen && <span className="truncate">{label}</span>}
                    {isOpen && badgeCount !== undefined && badgeCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                        {badgeCount}
                      </span>
                    )}
                    {!isOpen && badgeCount !== undefined && badgeCount > 0 && (
                      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-blue-900 animate-pulse" />
                    )}
                  </button>
                );
              };

              const renderAccordionSection = (
                title: string,
                sectionKey: string,
                sectionIcon: React.ReactNode,
                viewsInThisSection: ViewType[],
                children: React.ReactNode,
                customOnClick?: () => void
              ) => {
                if (viewsInThisSection.length > 0 && !hasAnyMenuAccess(viewsInThisSection)) {
                  return null;
                }
                const isSectionOpen = Boolean(openSections[sectionKey]);
                const isAnyChildActive = viewsInThisSection.includes(currentView);

                if (!isOpen) {
                  return (
                    <div key={sectionKey} className="space-y-1">
                      {/* Button Parent Icon dengan Indikator Dot Sub-Menu */}
                      <button
                        type="button"
                        onClick={customOnClick || (() => toggleSection(sectionKey))}
                        title={`${title} (Memiliki Sub Menu - Klik untuk ${isSectionOpen ? 'tutup' : 'buka'})`}
                        className={`relative group flex items-center justify-center w-10 h-10 mx-auto rounded-xl text-xs font-semibold transition border ${
                          isAnyChildActive || isSectionOpen
                            ? `${activeBgClass} border-transparent`
                            : itemNormalClass
                        }`}
                      >
                        <span className="shrink-0 flex items-center justify-center">{sectionIcon}</span>
                        
                        {/* Lingkaran kecil/dot penanda memiliki sub menu */}
                        <span
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 shadow-xs transition-transform group-hover:scale-125 ${
                            isAnyChildActive
                              ? 'bg-amber-400 ring-blue-900 animate-pulse'
                              : isSectionOpen
                              ? 'bg-cyan-300 ring-blue-900'
                              : 'bg-white/90 ring-blue-900/80'
                          }`}
                        />
                      </button>

                      {/* Tampilkan sub-menu hanya jika section ini sedang dibuka */}
                      {isSectionOpen && (
                        <div className="space-y-1.5 py-1.5 px-1 bg-black/15 dark:bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
                          {children}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <div key={sectionKey}>
                    <button
                      type="button"
                      onClick={customOnClick || (() => toggleSection(sectionKey))}
                      className={`w-full flex items-center justify-between text-[10px] ${sectionHeadingClass} mb-1.5 px-3 py-1.5 rounded-lg transition select-none group hover:bg-white/5`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            isAnyChildActive
                              ? 'bg-amber-400'
                              : isSectionOpen
                              ? 'bg-cyan-400'
                              : 'bg-white/40 group-hover:bg-white/70'
                          }`}
                        />
                        <span className="tracking-wider">{title}</span>
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-transform duration-200 ${
                          isSectionOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {isSectionOpen && (
                      <nav className="space-y-1 pb-1 pl-1">
                        {children}
                      </nav>
                    )}
                  </div>
                );
              };

              const renderSimpleHeading = (title: string) => {
                if (!isOpen) {
                  return <div className="my-1.5 border-t border-white/15 mx-2" />;
                }
                return (
                  <div className={`text-[10px] ${sectionHeadingClass} mb-1.5 px-3`}>
                    {title}
                  </div>
                );
              };

              const renderConfiguredMenuItem = (
                view: ViewType,
                isSubItem?: boolean,
                customOnClick?: () => void,
                customBadge?: number
              ) => {
                if (!isMenuVisibleInLayout(view, navLayout)) {
                  return null;
                }

                // If user is murid and menu is dashboard, direct to portal_murid
                const actualView = view === 'dashboard' && isMurid ? 'portal_murid' : view;
                const effectiveLabel = getEffectiveMenuLabel(actualView, navLayout);
                const effectiveIconName = getEffectiveMenuIcon(actualView, navLayout);
                const iconComp = renderNavIcon(effectiveIconName, 'w-4 h-4 shrink-0');

                let badge = customBadge;
                let clickHandler = customOnClick;

                if (actualView === 'catatan_pelanggaran') {
                  badge = violationCount > 0 ? violationCount : undefined;
                } else if (actualView === 'home_visit') {
                  badge = homeVisitCount > 0 ? homeVisitCount : undefined;
                } else if (actualView === 'intrusion_detection') {
                  const activeIncidents = (appData?.securityIncidents || []).filter((i) => i.status === 'active').length;
                  if (activeIncidents > 0) badge = activeIncidents;
                } else if (actualView === 'monitoring_login') {
                  const activeSessions = (appData?.activeUserSessions || []).filter(
                    (s) =>
                      !s.id.startsWith('sess-srv-') &&
                      !s.id.startsWith('sess-guru-') &&
                      !s.id.startsWith('sess-kesiswaan-') &&
                      !s.id.startsWith('sess-siswa-') &&
                      s.id !== 'sess-admin-active'
                  ).length;
                  if (activeSessions > 0) badge = activeSessions || undefined;
                } else if (actualView === 'absen_qr' && !isMurid && onOpenServerQrModal) {
                  clickHandler = () => onOpenServerQrModal();
                }

                return renderItem(actualView, iconComp, effectiveLabel, badge, clickHandler, isSubItem);
              };

              return (
                <>

                  {/* Dynamic sections configured from Navigation Layout */}
                  {navLayout.sections
                    .filter((sec) => sec.visible !== false)
                    .map((sec) => {
                      if (sec.menuIds.length > 0 && !hasAnyMenuAccess(sec.menuIds)) {
                        return null;
                      }

                      if (sec.isAccordion) {
                        return renderAccordionSection(
                          sec.title,
                          sec.id,
                          renderNavIcon(sec.iconName || 'Folder', 'w-4 h-4 text-cyan-300 shrink-0'),
                          sec.menuIds,
                          (
                            <>
                              {sec.menuIds.map((m) => (
                                <React.Fragment key={sec.id + m}>
                                  {renderConfiguredMenuItem(m, true)}
                                </React.Fragment>
                              ))}

                              {/* Backup modal shortcut in sistem section */}
                              {sec.id === 'sistem' && hasMenuAccess(currentUser.role, 'audit_logs', appData) && onOpenBackupModal && (
                                renderItem(
                                  'audit_logs' as ViewType,
                                  <HardDriveDownload className="w-4 h-4 text-blue-300 shrink-0" />,
                                  'Backup & Restore Data',
                                  undefined,
                                  () => {
                                    onOpenBackupModal();
                                    if (typeof window !== 'undefined' && window.innerWidth < 768) onCloseMobile();
                                  },
                                  true
                                )
                              )}
                            </>
                          )
                        );
                      }

                      // Flat section with simple heading
                      return (
                        <div key={sec.id}>
                          {renderSimpleHeading(sec.title)}
                          <nav className="space-y-1">
                            {sec.menuIds.map((m) => (
                              <React.Fragment key={sec.id + m}>
                                {renderConfiguredMenuItem(m, false)}
                              </React.Fragment>
                            ))}
                          </nav>
                        </div>
                      );
                    })}

                  {/* RESET (Admin Only) */}
                  {isAdmin && (
                    renderAccordionSection(
                      'RESET',
                      'reset',
                      <RotateCcw className="w-4 h-4 text-rose-400 shrink-0" />,
                      [],
                      (
                        <>
                          {onResetPresensi && renderItem('jadwal_shift' as ViewType, <RotateCcw className="w-3.5 h-3.5 shrink-0 text-amber-400" />, 'Reset Data Presensi', undefined, () => {
                            onResetPresensi();
                            if (typeof window !== 'undefined' && window.innerWidth < 768) onCloseMobile();
                          }, true)}
                          {renderItem('jadwal_shift' as ViewType, <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-400" />, 'Reset Seluruh Data', undefined, () => {
                            onResetAll();
                            if (typeof window !== 'undefined' && window.innerWidth < 768) onCloseMobile();
                          }, true)}
                        </>
                      ),
                      () => {
                        if (isResetUnlocked) {
                          toggleSection('reset');
                        } else {
                          setShowResetAuthModal(true);
                          setResetPasswordInput('');
                          setResetAuthError('');
                        }
                      }
                    )
                  )}
                </>
              );
            })()}
          </div>

          {/* MINIMALIST FOOTER */}
          {isOpen && (
            <div className="p-3 border-t border-white/10 mt-auto shrink-0 bg-black/10 text-[11px] text-white/80 text-center font-medium">
              <div>SMKN 6 Garut • Presensi Siswa</div>
              <div className="text-[10px] text-white/60 mt-0.5">Navigasi System • v3.5</div>
            </div>
          )}
        </div>
      </aside>

      {/* Password Protection Modal for Reset Menu */}
      {showResetAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <button 
                type="button"
                onClick={() => setShowResetAuthModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Proteksi Menu Reset</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Masukkan password Admin untuk membuka akses menu Reset Data.</p>
            </div>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Masukkan password khusus..."
                value={resetPasswordInput}
                onChange={(e) => {
                  setResetPasswordInput(e.target.value);
                  setResetAuthError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleVerifyResetPassword();
                  }
                }}
                autoFocus
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              {resetAuthError && (
                <div className="text-[11px] font-bold text-rose-500">{resetAuthError}</div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetAuthModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleVerifyResetPassword}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition"
              >
                Buka Akses
              </button>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 md:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
};

