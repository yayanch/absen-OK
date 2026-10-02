import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Search,
  DoorOpen,
  Users,
  Phone,
  ArrowRight,
  CornerDownLeft,
  Command,
  ExternalLink,
  Layers,
  Sparkles,
  Check,
  Info,
} from 'lucide-react';
import { SekolahConfig, ViewType, UserSession, ThemeOption, AppData, Siswa, Kelas, WaliKelas, SiswaPresensiItem } from '../types';
import { normalizeWeeklyShiftPeriods, generateWeeklyShiftSchedules, getTodayString } from '../utils/helpers';
import { getRoleBadgeMeta } from '../utils/rolePermissionEngine';

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
  onNavigateToInput?: (kelasId: string) => void;
  onNavigateToMasterSiswa?: (searchQuery?: string, kelasId?: string) => void;
  onNavigateToMasterGuru?: (searchQuery?: string) => void;
  onNavigateToMasterKelas?: (searchQuery?: string) => void;
  onOpenModal?: (title: string, content: React.ReactNode, maxWidth?: string) => void;
  onCloseModal?: () => void;
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
  onNavigateToInput,
  onNavigateToMasterSiswa,
  onNavigateToMasterGuru,
  onNavigateToMasterKelas,
  onOpenModal,
  onCloseModal,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState<'semua' | 'siswa' | 'guru'>('semua');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const handleToggleDark = onToggleDarkMode || onToggleTheme;
  const handleServerQrModal = onOpenServerQrModal || onShowServerQrModal;

  // Global shortcut: Ctrl+K / Cmd+K to open and focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setIsMobileSearchExpanded(true);
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            searchInputRef.current.select();
          } else if (mobileSearchInputRef.current) {
            mobileSearchInputRef.current.focus();
            mobileSearchInputRef.current.select();
          }
        }, 50);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        setIsMobileSearchExpanded(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen]);

  // Close search dropdown and profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format user role badge text
  const getRoleLabel = (role?: string) => {
    if (!role) {
      return { label: 'Pengguna', icon: User, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
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
      case 'piket_kesiswaan':
        return { label: 'Piket Kesiswaan', icon: UserCheck, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
      case 'piket_guru':
        return { label: 'Piket Guru', icon: UserCheck, color: 'bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300' };
      case 'piket_kelas':
        return { label: 'Piket Kelas', icon: UserCheck, color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300' };
      case 'guru':
        return { label: 'Guru Pengajar', icon: User, color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300' };
      case 'murid':
        return { label: 'Siswa', icon: GraduationCap, color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300' };
      default: {
        const meta = getRoleBadgeMeta(role, appData);
        return { label: meta.label, icon: User, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300' };
      }
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
  const userFoto = userData?.foto !== undefined ? (userData.foto || '') : ((currentUser?.data as any)?.foto || '');

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

  // -------------------------------------------------------------
  // GLOBAL SEARCH ENGINE: STUDENTS, CLASSES, TEACHERS
  // -------------------------------------------------------------
  const kelasMap = useMemo(() => {
    const map = new Map<string, Kelas>();
    (appData?.kelas || []).forEach((k) => map.set(k.id, k));
    return map;
  }, [appData?.kelas]);

  const jurusanMap = useMemo(() => {
    const map = new Map<string, { kode: string; nama: string }>();
    (appData?.jurusan || []).forEach((j) => map.set(j.id, { kode: j.kode, nama: j.nama }));
    return map;
  }, [appData?.jurusan]);

  const waliMap = useMemo(() => {
    const map = new Map<string, WaliKelas>();
    (appData?.waliKelas || []).forEach((w) => map.set(w.id, w));
    return map;
  }, [appData?.waliKelas]);

  const studentCountPerClass = useMemo(() => {
    const map = new Map<string, { total: number; l: number; p: number }>();
    (appData?.siswa || []).forEach((s) => {
      if (s.kelasId) {
        const cur = map.get(s.kelasId) || { total: 0, l: 0, p: 0 };
        cur.total += 1;
        if (s.gender === 'P') cur.p += 1;
        else cur.l += 1;
        map.set(s.kelasId, cur);
      }
    });
    return map;
  }, [appData?.siswa]);

  // Compute role-based authorized class IDs for global search (strictly binaan & ampunan for wali/guru)
  const authorizedClassIds = useMemo(() => {
    const userRole = currentUser?.role || 'admin';
    const currentUserData = (currentUser?.data as any) || {};
    const currentGuruId = String(currentUserData.id || '');
    const currentUsername = String(currentUserData.username || '').toLowerCase();
    const currentNip = String(currentUserData.nip || '').toLowerCase();
    const currentNama = String(currentUserData.nama || '').toLowerCase();
    const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : [userRole];

    const isAdminLike = userRole === 'admin' || userRole === 'kesiswaan' || userRole === 'kurikulum' || userRole === 'hubin' || userRole === 'staf_jadwal';
    if (isAdminLike) {
      return null; // Full school-wide access for admin & management
    }

    const isWali = userRole === 'wali' || userRoles.includes('wali');
    const isGuru = userRole === 'guru' || userRole === 'user' || userRoles.includes('guru');
    const isMurid = userRole === 'murid' || userRole === 'siswa' || userRoles.includes('murid');

    // Find teacher matching records
    const matchedGuru = (appData?.waliKelas || []).find((g) => {
      return (
        (g.id && g.id === currentGuruId) ||
        (g.username && g.username.toLowerCase() === currentUsername) ||
        (g.nip && currentNip && g.nip.toLowerCase() === currentNip) ||
        (g.nama && currentNama && g.nama.toLowerCase() === currentNama)
      );
    });

    const teacherIds = new Set<string>();
    if (currentGuruId) teacherIds.add(currentGuruId);
    if (matchedGuru?.id) teacherIds.add(matchedGuru.id);

    const teacherUsernames = new Set<string>();
    if (currentUsername) teacherUsernames.add(currentUsername);
    if (matchedGuru?.username) teacherUsernames.add(matchedGuru.username.toLowerCase());

    const teacherNips = new Set<string>();
    if (currentNip) teacherNips.add(currentNip);
    if (matchedGuru?.nip) teacherNips.add(matchedGuru.nip.toLowerCase());

    if (isWali || isGuru) {
      const ids = new Set<string>();

      // 1. Kelas Binaan (Wali Kelas)
      (appData?.kelas || []).forEach((k) => {
        if (teacherIds.has(k.waliKelasId)) {
          ids.add(k.id);
        }
      });

      // 2. Kelas yang Diampu (Guru Mapel Kelas)
      (appData?.guruMapelKelas || []).forEach((gmk) => {
        const isMatch =
          teacherIds.has(gmk.guruId) ||
          (gmk.guruUsername && teacherUsernames.has(gmk.guruUsername.toLowerCase())) ||
          (gmk.guruNip && teacherNips.has(gmk.guruNip.toLowerCase()));

        if (isMatch && Array.isArray(gmk.kelasIds)) {
          gmk.kelasIds.forEach((cid) => ids.add(cid));
        }
      });

      // 3. Kelas dari Jadwal Mengajar
      (appData?.jadwalMengajar || []).forEach((jm: any) => {
        const isMatch =
          teacherIds.has(jm.guruId) ||
          (jm.guruUsername && teacherUsernames.has(jm.guruUsername?.toLowerCase())) ||
          (jm.guruNip && teacherNips.has(jm.guruNip?.toLowerCase()));
        if (isMatch && jm.kelasId) {
          ids.add(jm.kelasId);
        }
      });

      return ids; // Strictly restricted to these classes
    }

    if (isMurid) {
      const studentClassId = String(currentUserData.kelasId || '');
      return studentClassId ? new Set([studentClassId]) : new Set<string>();
    }

    return null;
  }, [currentUser, appData?.kelas, appData?.guruMapelKelas, appData?.waliKelas, appData?.jadwalMengajar]);

  // Compute class IDs that are strictly "Kelas Binaan" (wali kelas binaan or admin/kesiswaan)
  const binaanClassIds = useMemo(() => {
    const userRole = currentUser?.role || 'admin';
    const currentUserData = (currentUser?.data as any) || {};
    const currentGuruId = String(currentUserData.id || '');
    const currentUsername = String(currentUserData.username || '').toLowerCase();
    const currentNip = String(currentUserData.nip || '').toLowerCase();
    const currentNama = String(currentUserData.nama || '').toLowerCase();

    const isAdminLike = userRole === 'admin' || userRole === 'kesiswaan' || userRole === 'kurikulum' || userRole === 'hubin';
    if (isAdminLike) {
      return null; // Full management rights
    }

    const matchedGuru = (appData?.waliKelas || []).find((g) => {
      return (
        (g.id && g.id === currentGuruId) ||
        (g.username && g.username.toLowerCase() === currentUsername) ||
        (g.nip && currentNip && g.nip.toLowerCase() === currentNip) ||
        (g.nama && currentNama && g.nama.toLowerCase() === currentNama)
      );
    });

    const teacherIds = new Set<string>();
    if (currentGuruId) teacherIds.add(currentGuruId);
    if (matchedGuru?.id) teacherIds.add(matchedGuru.id);

    const ids = new Set<string>();
    (appData?.kelas || []).forEach((k) => {
      if (teacherIds.has(k.waliKelasId)) {
        ids.add(k.id);
      }
    });

    return ids;
  }, [currentUser, appData?.kelas, appData?.waliKelas]);

  const totalAuthorizedSiswaCount = useMemo(() => {
    if (authorizedClassIds === null) return appData?.siswa?.length || 0;
    return (appData?.siswa || []).filter((s) => s.kelasId && authorizedClassIds.has(s.kelasId)).length;
  }, [appData?.siswa, authorizedClassIds]);

  const totalAuthorizedKelasCount = useMemo(() => {
    if (authorizedClassIds === null) return appData?.kelas?.length || 0;
    return (appData?.kelas || []).filter((k) => authorizedClassIds.has(k.id)).length;
  }, [appData?.kelas, authorizedClassIds]);

  const { matchedSiswa, matchedKelas, matchedGuru, totalResultCount } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        matchedSiswa: [],
        matchedKelas: [],
        matchedGuru: [],
        totalResultCount: 0,
      };
    }

    // 1. Siswa (Role-scoped for Wali Kelas, Guru, and Murid)
    const siswaList = appData?.siswa || [];
    const filteredSiswa = siswaList
      .filter((s) => {
        if (authorizedClassIds !== null && (!s.kelasId || !authorizedClassIds.has(s.kelasId))) {
          return false;
        }
        const k = kelasMap.get(s.kelasId);
        const kelasName = k?.nama || '';
        return (
          s.nama.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.toLowerCase().includes(q)) ||
          (s.noWa && s.noWa.toLowerCase().includes(q)) ||
          kelasName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aStarts = a.nama.toLowerCase().startsWith(q) || (a.nisn && a.nisn.startsWith(q));
        const bStarts = b.nama.toLowerCase().startsWith(q) || (b.nisn && b.nisn.startsWith(q));
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      });

    // 2. Kelas (Role-scoped for Wali Kelas, Guru, and Murid)
    const kelasList = appData?.kelas || [];
    const filteredKelas = kelasList
      .filter((k) => {
        if (authorizedClassIds !== null && !authorizedClassIds.has(k.id)) {
          return false;
        }
        const jur = jurusanMap.get(k.jurusanId);
        const wali = waliMap.get(k.waliKelasId);
        return (
          k.nama.toLowerCase().includes(q) ||
          (jur?.nama && jur.nama.toLowerCase().includes(q)) ||
          (jur?.kode && jur.kode.toLowerCase().includes(q)) ||
          (wali?.nama && wali.nama.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aStarts = a.nama.toLowerCase().startsWith(q);
        const bStarts = b.nama.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.nama.localeCompare(b.nama, 'id', { numeric: true });
      });

    // 3. Guru (Hanya menampilkan nama dan no WA)
    const guruList = appData?.waliKelas || [];
    const filteredGuru = guruList
      .filter((g) => {
        return (
          g.nama.toLowerCase().includes(q) ||
          (g.noHp && g.noHp.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aStarts = a.nama.toLowerCase().startsWith(q) || (a.noHp && a.noHp.startsWith(q));
        const bStarts = b.nama.toLowerCase().startsWith(q) || (b.noHp && b.noHp.startsWith(q));
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
      });

    return {
      matchedSiswa: filteredSiswa,
      matchedKelas: [],
      matchedGuru: filteredGuru,
      totalResultCount: filteredSiswa.length + filteredGuru.length,
    };
  }, [searchQuery, appData, kelasMap, jurusanMap, waliMap, authorizedClassIds]);

  // Flattened items for keyboard arrow navigation
  const flattenedItems = useMemo(() => {
    const items: Array<{
      type: 'siswa' | 'guru';
      id: string;
      data: any;
    }> = [];

    if (searchCategory === 'semua' || searchCategory === 'siswa') {
      const limit = searchCategory === 'semua' ? 5 : 25;
      matchedSiswa.slice(0, limit).forEach((s) => {
        items.push({ type: 'siswa', id: s.id, data: s });
      });
    }

    if (searchCategory === 'semua' || searchCategory === 'guru') {
      const limit = searchCategory === 'semua' ? 5 : 25;
      matchedGuru.slice(0, limit).forEach((g) => {
        items.push({ type: 'guru', id: g.id, data: g });
      });
    }

    return items;
  }, [searchCategory, matchedSiswa, matchedGuru]);

  const handleSelectItem = (item: { type: 'siswa' | 'guru'; data: any }) => {
    setIsSearchOpen(false);
    setIsMobileSearchExpanded(false);
    if (item.type === 'siswa') {
      handleOpenStudentDetail(item.data);
    } else if (item.type === 'guru') {
      if (onNavigateToMasterGuru) {
        onNavigateToMasterGuru(item.data.nama);
      } else {
        onNavigate('master_guru');
      }
    }
  };

  const handleOpenStudentDetail = (siswa: Siswa) => {
    setIsSearchOpen(false);
    setIsMobileSearchExpanded(false);
    const kelas = kelasMap.get(siswa.kelasId);
    const wali = kelas ? waliMap.get(kelas.waliKelasId) : undefined;
    const todayStr = getTodayString();
    const presensiKey = `${todayStr}_${siswa.kelasId}`;
    const presensiItems: SiswaPresensiItem[] = (appData?.presensi || {})[presensiKey] || [];
    const myPresensi = presensiItems.find((p) => p.siswaId === siswa.id);
    const isBinaan = binaanClassIds === null || (siswa.kelasId ? binaanClassIds.has(siswa.kelasId) : false);

    if (onOpenModal) {
      onOpenModal(
        `Informasi Lengkap Siswa: ${siswa.nama}`,
        <div className="space-y-4 text-xs text-left">
          {/* Header Info */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {siswa.foto ? (
              <img
                src={siswa.foto}
                alt={siswa.nama}
                className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
              />
            ) : (
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-xs shrink-0 ${
                  siswa.gender === 'P' ? 'bg-pink-600' : 'bg-blue-600'
                }`}
              >
                {siswa.nama.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{siswa.nama}</h4>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                NISN: {siswa.nisn || '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                <span>
                  Kelas: <strong className="text-slate-900 dark:text-white">{kelas?.nama || '-'}</strong>
                </span>
                <span>·</span>
                <span>
                  Gender: <strong>{siswa.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Today's Presensi Status */}
          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1">
              Status Presensi Hari Ini ({todayStr})
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                  myPresensi?.status === 'H'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : myPresensi?.status === 'S'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : myPresensi?.status === 'I'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : myPresensi?.status === 'A'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {myPresensi?.status === 'H'
                  ? 'Hadir'
                  : myPresensi?.status === 'S'
                  ? 'Sakit'
                  : myPresensi?.status === 'I'
                  ? 'Izin'
                  : myPresensi?.status === 'A'
                  ? 'Alpha'
                  : 'Belum Presensi'}
              </span>
              {myPresensi?.time && (
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  Masuk: <strong>{myPresensi.time}</strong>
                </span>
              )}
              {myPresensi?.pulangTime && (
                <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                  · Pulang: <strong>{myPresensi.pulangTime}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Kontak WhatsApp Siswa</div>
              <div className="font-semibold text-slate-800 dark:text-slate-200 mt-1">
                {siswa.noWa || 'Nomor WA belum tercatat'}
              </div>
              {siswa.noWa && (
                <a
                  href={`https://wa.me/${siswa.noWa.replace(/\D/g, '').replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{siswa.noWa}</span>
                </a>
              )}
            </div>

            <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Orang Tua / Wali</div>
              <div className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                {siswa.namaOrangTua || '-'}
              </div>
              <div className="text-slate-500 mt-0.5">{siswa.noWaOrangTua || 'No WA orang tua: -'}</div>
              {siswa.noWaOrangTua && (
                <a
                  href={`https://wa.me/${siswa.noWaOrangTua.replace(/\D/g, '').replace(/^0/, '62')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WA Orang Tua</span>
                </a>
              )}
            </div>
          </div>

          {/* Homeroom teacher */}
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <div>
              <span className="text-slate-400 text-[10px] block uppercase font-bold">Wali Kelas:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{wali?.nama || 'Belum Ditentukan'}</span>
            </div>
            {wali?.noHp && (
              <a
                href={`https://wa.me/${wali.noHp.replace(/\D/g, '').replace(/^0/, '62')}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline flex items-center gap-1 text-[11px] font-bold"
              >
                <Phone className="w-3 h-3" />
                <span>Hubungi Wali</span>
              </a>
            )}
          </div>

          {/* Action buttons (only for binaan students or admin) */}
          {isBinaan && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
              {onNavigateToInput && kelas && (
                <button
                  type="button"
                  onClick={() => {
                    if (onCloseModal) onCloseModal();
                    onNavigateToInput(kelas.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs transition cursor-pointer"
                >
                  Input Presensi Kelas Ini
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (onCloseModal) onCloseModal();
                  if (onNavigateToMasterSiswa) {
                    onNavigateToMasterSiswa(siswa.nama, siswa.kelasId);
                  } else {
                    onNavigate('master_siswa');
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>Buka di Master Siswa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>,
        'max-w-md'
      );
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim() || !text) return text;
    const q = query.trim().toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="font-extrabold text-blue-600 dark:text-blue-400 bg-blue-100/80 dark:bg-blue-950/90 rounded-xs px-0.5">
          {match}
        </span>
        {after}
      </>
    );
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flattenedItems.length) {
        handleSelectItem(flattenedItems[selectedIndex]);
      } else if (flattenedItems.length > 0) {
        handleSelectItem(flattenedItems[0]);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setIsMobileSearchExpanded(false);
      searchInputRef.current?.blur();
      mobileSearchInputRef.current?.blur();
    }
  };

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

          {/* JADWAL SHIFT PEKAN INI (TERLIHAT DI LAYAR LEBAR) */}
          {shiftInfo && (
            <div
              onClick={() => onNavigate('jadwal_shift')}
              className="hidden xl:flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 dark:hover:bg-slate-700/90 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer select-none shadow-2xs group shrink-0"
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

        {/* CENTER SECTION: GLOBAL SEARCH BAR ACROSS STUDENTS, CLASSES, AND TEACHERS */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl mx-1 sm:mx-2 lg:mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setIsSearchOpen(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) {
                  setIsSearchOpen(true);
                }
              }}
              onClick={() => {
                if (searchQuery.trim()) {
                  setIsSearchOpen(true);
                }
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Cari siswa, guru..."
              aria-label="Cari data sekolah"
              className="w-full pl-9 pr-10 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200/70 focus:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-800 dark:focus:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition shadow-2xs cursor-pointer"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                  setIsSearchOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition cursor-pointer"
                title="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* POPUP DROPDOWN SEARCH PALETTE */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              ref={searchResultsRef}
              className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] flex flex-col text-xs animate-in fade-in zoom-in-95 duration-150"
            >
              {/* CATEGORY FILTER TABS */}
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 bg-slate-50/80 dark:bg-slate-800/50 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSearchCategory('semua')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                    searchCategory === 'semua'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  Semua ({totalResultCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory('siswa')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                    searchCategory === 'siswa'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  Siswa ({matchedSiswa.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCategory('guru')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 ${
                    searchCategory === 'guru'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  Guru ({matchedGuru.length})
                </button>
              </div>

              {/* SEARCH RESULTS SCROLLABLE LIST */}
              <div className="overflow-y-auto p-2 space-y-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                {totalResultCount === 0 && (
                  <div className="py-8 text-center text-slate-400">
                    <Search className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <span>Tidak ditemukan hasil untuk "{searchQuery}"</span>
                  </div>
                )}

                {/* SISWA RESULTS */}
                {searchQuery.trim() && (searchCategory === 'semua' || searchCategory === 'siswa') && matchedSiswa.length > 0 && (
                  <div className="space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                        <span>Siswa ({matchedSiswa.length})</span>
                      </span>
                      {searchCategory === 'semua' && matchedSiswa.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setSearchCategory('siswa')}
                          className="hover:underline font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
                        >
                          Lihat semua {matchedSiswa.length} siswa →
                        </button>
                      )}
                    </div>

                    <div className="space-y-1">
                      {(searchCategory === 'semua' ? matchedSiswa.slice(0, 5) : matchedSiswa.slice(0, 25)).map((siswa) => {
                        const kelas = kelasMap.get(siswa.kelasId);
                        const isBinaan = binaanClassIds !== null && (siswa.kelasId ? binaanClassIds.has(siswa.kelasId) : false);

                        return (
                          <div
                            key={siswa.id}
                            onClick={() => handleSelectItem({ type: 'siswa', data: siswa })}
                            className="p-2 sm:p-2.5 rounded-xl transition flex items-center justify-between gap-2.5 cursor-pointer border bg-slate-50/40 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/70 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {siswa.foto ? (
                                <img
                                  src={siswa.foto}
                                  alt={siswa.nama}
                                  className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 shadow-2xs ${
                                    siswa.gender === 'P' ? 'bg-pink-600' : 'bg-blue-600'
                                  }`}
                                >
                                  {siswa.nama.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {highlightMatch(siswa.nama, searchQuery)}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono">{highlightMatch(siswa.nisn || '-', searchQuery)}</span>
                                  <span>·</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    Kelas {highlightMatch(kelas?.nama || '-', searchQuery)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {(() => {
                                const phoneNum = siswa.noWa || siswa.noWaOrangTua;
                                if (!phoneNum) return null;
                                return (
                                  <a
                                    href={`https://wa.me/${phoneNum.replace(/\D/g, '').replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300/80 dark:border-emerald-800 transition"
                                    title={`Hubungi ${siswa.noWa ? 'Siswa' : 'Orang Tua'} via WhatsApp`}
                                  >
                                    <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span className="font-mono">{phoneNum}</span>
                                  </a>
                                );
                              })()}
                              {isBinaan && (
                                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                                  Binaan
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* GURU RESULTS */}
                {searchQuery.trim() && (searchCategory === 'semua' || searchCategory === 'guru') && matchedGuru.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="px-2.5 py-1 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Guru &amp; Staf ({matchedGuru.length})</span>
                      </span>
                    </div>
                    <div className="space-y-1">
                      {matchedGuru.map((guru) => (
                        <div
                          key={guru.id}
                          onClick={() => handleSelectItem({ type: 'guru', data: guru })}
                          className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white">
                              {highlightMatch(guru.nama, searchQuery)}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              {guru.mataPelajaran || guru.jabatan || 'Guru'}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {guru.noHp ? (
                              <a
                                href={`https://wa.me/${guru.noHp.replace(/\D/g, '').replace(/^0/, '62')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-300/80 dark:border-emerald-800 transition"
                                title="Hubungi Guru via WhatsApp"
                              >
                                <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-mono">{guru.noHp}</span>
                              </a>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400 italic">
                                Belum ada WA
                              </span>
                            )}
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50/90 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
                <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                  <span className="absolute inset-0 rounded-full border-2 border-amber-500/20 border-t-amber-600 dark:border-t-amber-400 animate-spin" />
                  <RefreshCw className="w-2 h-2 text-amber-600 dark:text-amber-400 animate-spin" style={{ animationDuration: '2.5s' }} />
                </div>
                <span className="tracking-tight">Menyimpan...</span>
              </div>
            )}
            {saveStatus === 'syncing' && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 shadow-2xs">
                <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
                  <span className="absolute inset-0 rounded-full border-2 border-blue-500/20 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
                  <RefreshCw className="w-2 h-2 text-blue-600 dark:text-blue-400 animate-spin" style={{ animationDuration: '2.5s' }} />
                </div>
                <span className="tracking-tight">Menyinkronkan...</span>
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
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${roleInfo.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        <span>{roleInfo.label}</span>
                      </div>
                      {Array.isArray(userData?.additionalRoles) &&
                        userData.additionalRoles.map((addRole: string) => {
                          const addMeta = getRoleBadgeMeta(addRole, appData);
                          return (
                            <span
                              key={addRole}
                              className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            >
                              +{addMeta.label}
                            </span>
                          );
                        })}
                      {Array.isArray(userData?.tugasTambahanList) &&
                        userData.tugasTambahanList.map((tugas: string) => (
                          <span
                            key={tugas}
                            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          >
                            {tugas}
                          </span>
                        ))}
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
