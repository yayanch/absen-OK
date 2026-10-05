import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCheck,
  UserCog,
  Check,
  X,
  Search,
  Plus,
  Edit3,
  Trash2,
  RotateCcw,
  Save,
  Copy,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Sliders,
  Layers,
  PieChart,
  ClipboardCheck,
  Calendar,
  CalendarDays,
  AlertCircle,
  BookOpen,
  DoorOpen,
  GraduationCap,
  Clock,
  CalendarRange,
  Home,
  QrCode,
  CreditCard,
  Server,
  Activity,
  Database,
  FileText,
  MessageSquare,
  School,
  Palette,
  Info,
  Radio,
  Send,
  MessageCircle,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Grid,
  ListFilter
} from 'lucide-react';
import {
  AppData,
  RoleMenuPermission,
  UserSession,
  ViewType,
  ChatTargetPermission,
  RoleChatContactRule,
  ChatContactSettings,
} from '../../types';
import { PageHeader } from '../common/UIComponents';
import {
  ALL_MENU_ITEMS,
  MENU_CATEGORIES,
  DEFAULT_ROLE_PERMISSIONS,
  getAllRolePermissions,
  normalizeRoleKey,
  updateRolePermissionInAppData,
  resetRolePermissionsToDefault,
  MenuCategoryKey,
  MenuItemInfo,
} from '../../utils/rolePermissionEngine';
import {
  CHAT_TARGET_DEFINITIONS,
  DEFAULT_CHAT_CONTACT_RULES,
  getAllRoleChatRules,
  getRoleChatRule,
  updateRoleChatRuleInAppData,
  resetChatContactRulesToDefault,
  getPermittedChatContacts,
  ChatTargetInfo,
} from '../../utils/chatContactEngine';
import { addAuditLog } from '../../utils/helpers';

interface PengaturanRoleViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updated: AppData) => void;
  onConfirmModal?: (
    title: string,
    message: string,
    type: 'danger' | 'warning' | 'info' | 'emerald',
    onConfirm: () => void
  ) => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onNavigateView?: (view: ViewType) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  PieChart: <PieChart className="w-4 h-4" />,
  Users: <Users className="w-4 h-4" />,
  ClipboardCheck: <ClipboardCheck className="w-4 h-4" />,
  Layers: <Layers className="w-4 h-4" />,
  Calendar: <Calendar className="w-4 h-4" />,
  CalendarDays: <CalendarDays className="w-4 h-4" />,
  AlertCircle: <AlertCircle className="w-4 h-4" />,
  FileText: <FileText className="w-4 h-4" />,
  UserCheck: <UserCheck className="w-4 h-4" />,
  BookOpen: <BookOpen className="w-4 h-4" />,
  DoorOpen: <DoorOpen className="w-4 h-4" />,
  GraduationCap: <GraduationCap className="w-4 h-4" />,
  Clock: <Clock className="w-4 h-4" />,
  CalendarRange: <CalendarRange className="w-4 h-4" />,
  ShieldAlert: <ShieldAlert className="w-4 h-4" />,
  Home: <Home className="w-4 h-4" />,
  QrCode: <QrCode className="w-4 h-4" />,
  CreditCard: <CreditCard className="w-4 h-4" />,
  UserCog: <UserCog className="w-4 h-4" />,
  ShieldCheck: <ShieldCheck className="w-4 h-4" />,
  Server: <Server className="w-4 h-4" />,
  Activity: <Activity className="w-4 h-4" />,
  Database: <Database className="w-4 h-4" />,
  MessageSquare: <MessageSquare className="w-4 h-4" />,
  School: <School className="w-4 h-4" />,
  Palette: <Palette className="w-4 h-4" />,
  Sparkles: <Sparkles className="w-4 h-4" />,
  Sliders: <Sliders className="w-4 h-4" />,
};

const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; border: string; activeBorder: string; badge: string }
> = {
  blue: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-900',
    activeBorder: 'border-blue-500',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300',
  },
  purple: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-900',
    activeBorder: 'border-purple-500',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300',
  },
  amber: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-900',
    activeBorder: 'border-amber-500',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300',
  },
  emerald: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-900',
    activeBorder: 'border-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300',
  },
  indigo: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200 dark:border-indigo-900',
    activeBorder: 'border-indigo-500',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300',
  },
  cyan: {
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-900',
    activeBorder: 'border-cyan-500',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300',
  },
  teal: {
    bg: 'bg-teal-500/10 dark:bg-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-900',
    activeBorder: 'border-teal-500',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300',
  },
  rose: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-900',
    activeBorder: 'border-rose-500',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300',
  },
};

export const PengaturanRoleView: React.FC<PengaturanRoleViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onConfirmModal,
  onShowToast,
  onNavigateView,
}) => {
  // Main Tab: 'menus' | 'chat_contacts' | 'chat_matrix'
  const [activeMainTab, setActiveMainTab] = useState<'menus' | 'chat_contacts' | 'chat_matrix'>('chat_contacts');

  // Get all registered roles for menus
  const roles = useMemo(() => getAllRolePermissions(appData), [appData]);

  // Selected role for editing
  const [selectedRoleId, setSelectedRoleId] = useState<string>(() => {
    return roles.length > 0 ? roles[0].roleId : 'admin';
  });

  // Local draft state of role menu permissions map (roleId -> allowedMenus)
  const [draftPermissions, setDraftPermissions] = useState<Record<string, ViewType[]>>(() => {
    const map: Record<string, ViewType[]> = {};
    roles.forEach((r) => {
      map[r.roleId] = [...r.allowedMenus];
    });
    return map;
  });

  // Local draft state of role chat contact rules map (roleKey -> allowedTargets)
  const [draftChatRules, setDraftChatRules] = useState<Record<string, ChatTargetPermission[]>>(() => {
    const map: Record<string, ChatTargetPermission[]> = {};
    const allChatRules = getAllRoleChatRules(appData);
    allChatRules.forEach((rule) => {
      map[rule.roleKey] = [...rule.allowedTargets];
    });
    return map;
  });

  // Local draft state of allowBroadcast map (roleKey -> boolean)
  const [draftBroadcastRules, setDraftBroadcastRules] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    const allChatRules = getAllRoleChatRules(appData);
    allChatRules.forEach((rule) => {
      map[rule.roleKey] = Boolean(rule.allowBroadcast);
    });
    return map;
  });

  // Track modified status
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedChatChanges, setHasUnsavedChatChanges] = useState(false);

  // Search filter for menu items
  const [searchMenuQuery, setSearchMenuQuery] = useState('');

  // Search role filter
  const [searchRoleQuery, setSearchRoleQuery] = useState('');

  // Search chat target filter
  const [searchChatTargetQuery, setSearchChatTargetQuery] = useState('');

  // Collapsed categories state for menus
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Modals for Role Management
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('indigo');
  const [copyPermissionFrom, setCopyPermissionFrom] = useState('guru');

  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editRoleId, setEditRoleId] = useState('');
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');
  const [editRoleColor, setEditRoleColor] = useState('indigo');

  // Copy modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sourceCopyRoleId, setSourceCopyRoleId] = useState('guru');

  // Copy Chat Rules modal
  const [showCopyChatModal, setShowCopyChatModal] = useState(false);
  const [sourceCopyChatRoleId, setSourceCopyChatRoleId] = useState('guru');

  // Currently active role object
  const currentRole = useMemo(() => {
    return roles.find((r) => r.roleId === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  const currentAllowedMenus = useMemo(() => {
    return draftPermissions[selectedRoleId] || currentRole?.allowedMenus || [];
  }, [draftPermissions, selectedRoleId, currentRole]);

  const currentAllowedChatTargets = useMemo(() => {
    const normKey = normalizeRoleKey(selectedRoleId);
    if (draftChatRules[normKey]) return draftChatRules[normKey];
    const fallback = getRoleChatRule(appData, normKey);
    return fallback.allowedTargets;
  }, [draftChatRules, selectedRoleId, appData]);

  const isCurrentRoleBroadcastAllowed = useMemo(() => {
    const normKey = normalizeRoleKey(selectedRoleId);
    if (draftBroadcastRules[normKey] !== undefined) return draftBroadcastRules[normKey];
    const fallback = getRoleChatRule(appData, normKey);
    return Boolean(fallback.allowBroadcast);
  }, [draftBroadcastRules, selectedRoleId, appData]);

  // Calculate active users per role
  const userCountPerRole = useMemo(() => {
    const counts: Record<string, number> = {};
    const effectiveWali = appData.waliKelas || [];

    counts['admin'] = 1;

    effectiveWali.forEach((w) => {
      const r = normalizeRoleKey(w.role || 'wali');
      counts[r] = (counts[r] || 0) + 1;
    });

    if (appData.stafJadwal) {
      counts['staf_jadwal'] = (counts['staf_jadwal'] || 0) + 1;
    }

    counts['murid'] = (appData.siswa || []).length;
    counts['siswa'] = (appData.siswa || []).length;
    counts['piket'] = (appData.petugasPiket || []).length;

    return counts;
  }, [appData]);

  // Filtered roles list
  const filteredRoles = useMemo(() => {
    const q = searchRoleQuery.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.roleName.toLowerCase().includes(q) ||
        r.roleId.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q))
    );
  }, [roles, searchRoleQuery]);

  // Filtered menu categories
  const filteredCategories = useMemo(() => {
    const q = searchMenuQuery.trim().toLowerCase();
    if (!q) return MENU_CATEGORIES;

    return MENU_CATEGORIES.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.shortDesc.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [searchMenuQuery]);

  // Filtered chat target definitions
  const filteredChatTargets = useMemo(() => {
    const q = searchChatTargetQuery.trim().toLowerCase();
    if (!q) return CHAT_TARGET_DEFINITIONS;
    return CHAT_TARGET_DEFINITIONS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.shortDesc.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q)
    );
  }, [searchChatTargetQuery]);

  // Grouped chat targets by category
  const chatTargetGroups = useMemo(() => {
    const groups: { key: string; title: string; desc: string; icon: any; items: ChatTargetInfo[] }[] = [
      {
        key: 'admin_mgmt',
        title: '1. Pusat Bantuan & Manajemen Sekolah',
        desc: 'Kontak pimpinan manajemen sekolah, helpdesk sistem, dan koordinator akademik/kesiswaan',
        icon: ShieldCheck,
        items: filteredChatTargets.filter((t) => ['admin', 'kurikulum', 'kesiswaan', 'staf_jadwal'].includes(t.id)),
      },
      {
        key: 'guru_pendidik',
        title: '2. Wali Kelas & Tenaga Pendidik (Guru)',
        desc: 'Kontak seluruh wali kelas, wali kelas binaan khusus, atau seluruh dewan guru pengajar',
        icon: UserCheck,
        items: filteredChatTargets.filter((t) => ['wali_all', 'wali_binaan', 'guru_all'].includes(t.id)),
      },
      {
        key: 'piket_lapangan',
        title: '3. Petugas Piket Harian',
        desc: 'Kontak guru piket harian, piket kesiswaan, atau pengurus piket absensi',
        icon: ClipboardCheck,
        items: filteredChatTargets.filter((t) => ['piket'].includes(t.id)),
      },
      {
        key: 'siswa_peserta',
        title: '4. Siswa / Peserta Didik',
        desc: 'Izin akses menghubungi siswa binaan di kelasnya atau seluruh siswa sekolah',
        icon: Users,
        items: filteredChatTargets.filter((t) => ['siswa_binaan', 'siswa_all'].includes(t.id)),
      },
      {
        key: 'fitur_khusus',
        title: '5. Fitur Siaran Massal (Broadcast)',
        desc: 'Hak akses pengiriman pesan siaran pengumuman ke seluruh pengguna sistem sekaligus',
        icon: Radio,
        items: filteredChatTargets.filter((t) => ['broadcast'].includes(t.id)),
      },
    ];

    return groups.filter((g) => g.items.length > 0);
  }, [filteredChatTargets]);

  // ===================== MENU ACL HANDLERS =====================
  const handleToggleMenu = (menuId: ViewType) => {
    if (readOnly) {
      onShowToast('Akses terbatas! Hanya Administrator yang dapat mengubah hak akses role.', 'warning');
      return;
    }

    setDraftPermissions((prev) => {
      const currentList = prev[selectedRoleId] || currentRole?.allowedMenus || [];
      const isAlreadyAllowed = currentList.includes(menuId);
      const updatedList = isAlreadyAllowed
        ? currentList.filter((id) => id !== menuId)
        : [...currentList, menuId];

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: updatedList,
      };
    });
  };

  const handleToggleCategory = (categoryItems: MenuItemInfo[]) => {
    if (readOnly) return;

    const itemIds = categoryItems.map((i) => i.id);
    const allChecked = itemIds.every((id) => currentAllowedMenus.includes(id));

    setDraftPermissions((prev) => {
      const currentList = prev[selectedRoleId] || currentRole?.allowedMenus || [];
      let updatedList: ViewType[];

      if (allChecked) {
        updatedList = currentList.filter((id) => !itemIds.includes(id));
      } else {
        const toAdd = itemIds.filter((id) => !currentList.includes(id));
        updatedList = [...currentList, ...toAdd];
      }

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: updatedList,
      };
    });
  };

  const handleSelectAllMenus = () => {
    if (readOnly) return;
    const allIds = ALL_MENU_ITEMS.map((i) => i.id);
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: allIds,
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeselectAllMenus = () => {
    if (readOnly) return;
    setDraftPermissions((prev) => ({
      ...prev,
      [selectedRoleId]: ['dashboard'],
    }));
    setHasUnsavedChanges(true);
  };

  const handleSaveMenuPermissions = () => {
    if (readOnly) return;

    let updated = { ...appData };
    Object.entries(draftPermissions).forEach(([rId, allowed]) => {
      updated = updateRolePermissionInAppData(updated, rId, allowed);
    });

    updated = addAuditLog(
      updated,
      'Ubah Hak Akses Menu Role',
      `Memperbarui hak akses menu untuk ${Object.keys(draftPermissions).length} role.`
    );

    onUpdateAppData(updated);
    setHasUnsavedChanges(false);
    onShowToast(`Hak akses menu berhasil disimpan ke database sistem!`, 'success');
  };

  // ===================== CHAT CONTACT HANDLERS =====================
  const handleToggleChatTarget = (targetId: ChatTargetPermission) => {
    if (readOnly) {
      onShowToast('Akses terbatas! Hanya Administrator yang dapat mengubah izin kontak chat.', 'warning');
      return;
    }

    const normKey = normalizeRoleKey(selectedRoleId);
    setDraftChatRules((prev) => {
      const currentList = prev[normKey] || currentAllowedChatTargets;
      const isAlreadyAllowed = currentList.includes(targetId);
      const updatedList = isAlreadyAllowed
        ? currentList.filter((id) => id !== targetId)
        : [...currentList, targetId];

      setHasUnsavedChatChanges(true);
      return {
        ...prev,
        [normKey]: updatedList,
      };
    });

    if (targetId === 'broadcast') {
      setDraftBroadcastRules((prev) => ({
        ...prev,
        [normKey]: !prev[normKey],
      }));
    }
  };

  const handleSelectAllChatTargets = () => {
    if (readOnly) return;
    const normKey = normalizeRoleKey(selectedRoleId);
    const allTargets = CHAT_TARGET_DEFINITIONS.map((t) => t.id);
    setDraftChatRules((prev) => ({
      ...prev,
      [normKey]: allTargets,
    }));
    setDraftBroadcastRules((prev) => ({
      ...prev,
      [normKey]: true,
    }));
    setHasUnsavedChatChanges(true);
  };

  const handleSelectHelpdeskOnly = () => {
    if (readOnly) return;
    const normKey = normalizeRoleKey(selectedRoleId);
    setDraftChatRules((prev) => ({
      ...prev,
      [normKey]: ['admin'],
    }));
    setDraftBroadcastRules((prev) => ({
      ...prev,
      [normKey]: false,
    }));
    setHasUnsavedChatChanges(true);
  };

  const handleResetChatRoleToPreset = () => {
    if (readOnly) return;
    const normKey = normalizeRoleKey(selectedRoleId);
    const defaultRule = DEFAULT_CHAT_CONTACT_RULES[normKey] || {
      roleKey: normKey,
      roleLabel: currentRole.roleName,
      allowedTargets: ['admin'],
      allowBroadcast: false,
    };

    setDraftChatRules((prev) => ({
      ...prev,
      [normKey]: [...defaultRule.allowedTargets],
    }));
    setDraftBroadcastRules((prev) => ({
      ...prev,
      [normKey]: Boolean(defaultRule.allowBroadcast),
    }));
    setHasUnsavedChatChanges(true);
    onShowToast(`Pengaturan kontak role "${currentRole.roleName}" dikembalikan ke preset standar.`, 'info');
  };

  const handleSaveChatRules = () => {
    if (readOnly) return;

    let updated = { ...appData };
    const allCustomRules: Record<string, RoleChatContactRule> = {
      ...(appData.chatContactSettings?.rules || DEFAULT_CHAT_CONTACT_RULES),
    };

    Object.entries(draftChatRules).forEach(([rKey, targets]) => {
      const isBroadcast = draftBroadcastRules[rKey] ?? targets.includes('broadcast');
      const rObj = roles.find((r) => normalizeRoleKey(r.roleId) === rKey);
      allCustomRules[rKey] = {
        roleKey: rKey,
        roleLabel: rObj?.roleName || rKey.toUpperCase(),
        allowedTargets: targets,
        allowBroadcast: isBroadcast,
        updatedAt: new Date().toISOString(),
      };
    });

    const newChatSettings: ChatContactSettings = {
      enabled: appData.chatContactSettings?.enabled ?? true,
      rules: allCustomRules,
      updatedAt: new Date().toISOString(),
      updatedBy: (currentUser.data as any)?.nama || 'Administrator',
    };

    updated = {
      ...updated,
      chatContactSettings: newChatSettings,
    };

    updated = addAuditLog(
      updated,
      'Ubah Pengaturan Kontak Chat Role',
      `Memperbarui hak akses kontak chat antar-role (siapa saja yang dapat dihubungi) untuk ${Object.keys(draftChatRules).length} role.`
    );

    onUpdateAppData(updated);
    setHasUnsavedChatChanges(false);
    onShowToast(`Pengaturan kontak chat antar-role berhasil disimpan & langsung aktif!`, 'success');
  };

  const handleResetAllChatRulesToDefault = () => {
    if (readOnly) return;

    const doReset = () => {
      const resetAppData = resetChatContactRulesToDefault(appData);
      onUpdateAppData(resetAppData);

      const map: Record<string, ChatTargetPermission[]> = {};
      const broadcastMap: Record<string, boolean> = {};
      Object.entries(DEFAULT_CHAT_CONTACT_RULES).forEach(([k, v]) => {
        map[k] = [...v.allowedTargets];
        broadcastMap[k] = Boolean(v.allowBroadcast);
      });
      setDraftChatRules(map);
      setDraftBroadcastRules(broadcastMap);
      setHasUnsavedChatChanges(false);

      onShowToast('Seluruh aturan kontak chat role berhasil di-reset ke standar pabrik!', 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Reset Pengaturan Kontak Chat',
        'Apakah Anda yakin ingin mengembalikan seluruh izin kontak chat semua role ke pengaturan rekomendasi sistem bawaan?',
        'warning',
        doReset
      );
    } else if (window.confirm('Reset seluruh pengaturan kontak chat ke standar?')) {
      doReset();
    }
  };

  // Copy chat rules
  const handleApplyCopyChatRules = () => {
    const sourceKey = normalizeRoleKey(sourceCopyChatRoleId);
    const targetKey = normalizeRoleKey(selectedRoleId);
    const sourceTargets = draftChatRules[sourceKey] || getRoleChatRule(appData, sourceKey).allowedTargets;
    const sourceBroadcast = draftBroadcastRules[sourceKey] ?? getRoleChatRule(appData, sourceKey).allowBroadcast;

    setDraftChatRules((prev) => ({
      ...prev,
      [targetKey]: [...sourceTargets],
    }));
    setDraftBroadcastRules((prev) => ({
      ...prev,
      [targetKey]: Boolean(sourceBroadcast),
    }));
    setHasUnsavedChatChanges(true);
    setShowCopyChatModal(false);

    const sourceObj = roles.find((r) => normalizeRoleKey(r.roleId) === sourceKey);
    onShowToast(
      `Berhasil menyalin aturan kontak chat dari "${sourceObj?.roleName || sourceKey}" ke "${currentRole.roleName}"!`,
      'success'
    );
  };

  // Preview simulation of contacts for selected role
  const simulatedContactsForRole = useMemo(() => {
    const normKey = normalizeRoleKey(selectedRoleId);
    const simulatedSession: UserSession = {
      role: normKey,
      data: {
        id: 'sim_user',
        username: 'sim_user',
        nama: `Pengguna Simulasi (${currentRole.roleName})`,
        kelasId: appData.kelas?.[0]?.id || '1',
      },
    };

    // Temporarily create a mock appData with current draft settings
    const tempRules: Record<string, RoleChatContactRule> = {
      ...(appData.chatContactSettings?.rules || DEFAULT_CHAT_CONTACT_RULES),
      [normKey]: {
        roleKey: normKey,
        roleLabel: currentRole.roleName,
        allowedTargets: currentAllowedChatTargets,
        allowBroadcast: isCurrentRoleBroadcastAllowed,
      },
    };

    const tempAppData: AppData = {
      ...appData,
      chatContactSettings: {
        enabled: true,
        rules: tempRules,
      },
    };

    const contacts = getPermittedChatContacts(tempAppData, simulatedSession);
    return Object.values(contacts);
  }, [selectedRoleId, currentRole, currentAllowedChatTargets, isCurrentRoleBroadcastAllowed, appData]);

  // Handle Create Role
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const baseId = newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const roleId = `custom_${baseId}_${Date.now().toString().slice(-4)}`;

    const templateAllowed = draftPermissions[copyPermissionFrom] || DEFAULT_ROLE_PERMISSIONS.find((r) => r.roleId === copyPermissionFrom)?.allowedMenus || ['dashboard'];
    const templateChatTargets = draftChatRules[copyPermissionFrom] || getRoleChatRule(appData, copyPermissionFrom).allowedTargets;

    const newCustomRole = {
      id: roleId,
      name: roleId,
      label: newRoleName.trim(),
      color: newRoleColor,
      description: newRoleDesc.trim() || `Role kustom ${newRoleName.trim()}`,
      allowedMenus: [...templateAllowed],
      isSystem: false,
    };

    const newPermission: RoleMenuPermission = {
      roleId: roleId,
      roleName: newRoleName.trim(),
      allowedMenus: [...templateAllowed],
      description: newRoleDesc.trim() || `Role kustom ${newRoleName.trim()}`,
      badgeColor: newRoleColor,
      isSystem: false,
    };

    const updatedPermissions = [...(appData.rolePermissions || roles), newPermission];
    const updatedCustomRoles = [...(appData.customRoles || []), newCustomRole];

    const updatedChatRules = {
      ...(appData.chatContactSettings?.rules || DEFAULT_CHAT_CONTACT_RULES),
      [roleId]: {
        roleKey: roleId,
        roleLabel: newRoleName.trim(),
        allowedTargets: [...templateChatTargets],
        allowBroadcast: false,
        customDescription: newRoleDesc.trim(),
      },
    };

    let updatedAppData: AppData = {
      ...appData,
      customRoles: updatedCustomRoles,
      rolePermissions: updatedPermissions,
      chatContactSettings: {
        enabled: appData.chatContactSettings?.enabled ?? true,
        rules: updatedChatRules,
        updatedAt: new Date().toISOString(),
      },
    };

    updatedAppData = addAuditLog(
      updatedAppData,
      'Buat Role Kustom Baru',
      `Menambahkan role "${newRoleName.trim()}" (ID: ${roleId}).`
    );

    onUpdateAppData(updatedAppData);

    setDraftPermissions((prev) => ({
      ...prev,
      [roleId]: [...templateAllowed],
    }));

    setDraftChatRules((prev) => ({
      ...prev,
      [roleId]: [...templateChatTargets],
    }));

    setSelectedRoleId(roleId);
    setShowAddRoleModal(false);
    setNewRoleName('');
    setNewRoleDesc('');
    onShowToast(`Role baru "${newRoleName.trim()}" berhasil dibuat!`, 'success');
  };

  const handleResetToDefault = () => {
    if (readOnly) return;
    const doReset = () => {
      const reset = resetRolePermissionsToDefault(appData);
      onUpdateAppData(reset);

      const map: Record<string, ViewType[]> = {};
      DEFAULT_ROLE_PERMISSIONS.forEach((p) => {
        map[p.roleId] = [...p.allowedMenus];
      });
      setDraftPermissions(map);
      setHasUnsavedChanges(false);
      onShowToast('Semua hak akses menu role berhasil di-reset ke standar!', 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Reset Hak Akses Role',
        'Apakah Anda yakin ingin mengembalikan seluruh hak akses menu semua role ke pengaturan bawaan pabrik?',
        'warning',
        doReset
      );
    } else if (window.confirm('Reset seluruh pengaturan menu role ke standar?')) {
      doReset();
    }
  };

  const activeColorTheme = COLOR_CLASSES[currentRole.badgeColor || 'indigo'] || COLOR_CLASSES.indigo;

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        icon={ShieldCheck}
        title="Pengaturan Role, Hak Akses Menu & Kontak Chat"
        description="Kelola hak akses menu navigasi dan konfigurasi direktori kontak chat untuk masing-masing peran/jabatan (siapa saja yang dapat dihubungi)."
        badge="Role Access & Chat Directory ACL"
      >
        <div className="flex flex-wrap items-center gap-2">
          {onNavigateView && (
            <button
              type="button"
              onClick={() => onNavigateView('pengaturan_menu')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition flex items-center gap-1.5"
              title="Atur teks judul bagian, nama menu, dan urutan posisinya"
            >
              <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Atur Teks & Posisi Menu</span>
            </button>
          )}

          {activeMainTab === 'menus' && (
            <button
              type="button"
              onClick={handleResetToDefault}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition flex items-center gap-1.5"
              title="Kembalikan semua hak akses menu ke pengaturan standar"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Standar Menu</span>
            </button>
          )}

          {activeMainTab !== 'menus' && (
            <button
              type="button"
              onClick={handleResetAllChatRulesToDefault}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition flex items-center gap-1.5"
              title="Kembalikan semua aturan kontak chat ke preset rekomendasi"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Standar Kontak</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddRoleModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Role Baru</span>
          </button>
        </div>
      </PageHeader>

      {/* Main Mode Navigation Tabs */}
      <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMainTab('chat_contacts')}
          className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'chat_contacts'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Pengaturan Kontak Chat Role (Siapa yang Dihubungi)</span>
          {hasUnsavedChatChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('chat_matrix')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'chat_matrix'
              ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Tabel Matriks Kontak Antar-Role (Overview)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('menus')}
          className={`flex-1 min-w-[180px] px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
            activeMainTab === 'menus'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Hak Akses Menu & Navigasi</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Role
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {roles.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {roles.filter((r) => r.isSystem).length} Sistem • {roles.filter((r) => !r.isSystem).length} Kustom
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Target Kontak Chat
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {CHAT_TARGET_DEFINITIONS.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Grup target & direktori percakapan
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Kontak Aktif ({currentRole.roleName})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {currentAllowedChatTargets.length}{' '}
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              / {CHAT_TARGET_DEFINITIONS.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {simulatedContactsForRole.length} kontak terlihat di aplikasi
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pengguna Role Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {userCountPerRole[currentRole.roleId] || 0}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Akun aktif terhubung
          </p>
        </div>
      </div>

      {/* ===================== TAB 1: PENGATURAN KONTAK CHAT ROLE ===================== */}
      {activeMainTab === 'chat_contacts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Role Selector */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pilih Role Pengguna</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Atur siapa saja yang dapat dihubungi oleh role ini</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(true)}
                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 transition"
                  title="Tambah Role Baru"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Role */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari role..."
                  value={searchRoleQuery}
                  onChange={(e) => setSearchRoleQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              {/* Role List Cards */}
              <div className="space-y-2 max-h-[620px] overflow-y-auto no-scrollbar pr-0.5">
                {filteredRoles.map((role) => {
                  const isSelected = role.roleId === selectedRoleId;
                  const normKey = normalizeRoleKey(role.roleId);
                  const allowedTargets = draftChatRules[normKey] || getRoleChatRule(appData, normKey).allowedTargets;
                  const isBroadcast = draftBroadcastRules[normKey] ?? getRoleChatRule(appData, normKey).allowBroadcast;
                  const userCount = userCountPerRole[role.roleId] || 0;
                  const colorMeta = COLOR_CLASSES[role.badgeColor || 'indigo'] || COLOR_CLASSES.indigo;

                  return (
                    <div
                      key={role.roleId}
                      onClick={() => setSelectedRoleId(role.roleId)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? `bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-1 ring-blue-500/30`
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {role.roleName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colorMeta.badge}`}
                        >
                          {allowedTargets.length} Kontak
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {role.description || `Pengaturan kontak untuk role ${role.roleName}`}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {userCount} Pengguna
                        </span>
                        <div className="flex items-center gap-2">
                          {isBroadcast && (
                            <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-0.5">
                              <Radio className="w-3 h-3" /> Broadcast
                            </span>
                          )}
                          <span className="font-mono text-[9px] uppercase tracking-wider">
                            {role.roleId}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Information Card */}
            <div className="p-4 rounded-3xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Prinsip Keamanan Kontak Chat</span>
              </div>
              <p className="text-[11px] text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
                Pengaturan kontak membatasi penerima yang dapat dicari dan dihubungi oleh pengguna. Kontak di luar daftar izin tidak akan tampil pada laci percakapan (*chat drawer*).
              </p>
            </div>
          </div>

          {/* Right Column: Chat Target Permissions Matrix & Live Preview */}
          <div className="lg:col-span-8 space-y-4">
            {/* Header for Selected Role */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${activeColorTheme.bg} ${activeColorTheme.text} flex items-center justify-center font-black text-lg shadow-inner`}
                  >
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 dark:text-white">
                        {currentRole.roleName}
                      </h2>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${activeColorTheme.badge}`}>
                        Role Key: {selectedRoleId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Pilih grup kontak yang dapat dihubungi oleh pengguna dengan role <strong>{currentRole.roleName}</strong>
                    </p>
                  </div>
                </div>

                {/* Quick Presets & Copy */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCopyChatModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                    title="Salin aturan dari role lain"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Role</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetChatRoleToPreset}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                    title="Kembalikan ke preset rekomendasi role ini"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Preset Standar</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions Filter / Bulk Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllChatTargets}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 transition"
                  >
                    Centang Semua Kontak
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectHelpdeskOnly}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition"
                  >
                    Hanya Helpdesk
                  </button>
                </div>

                {/* Search Target */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter grup target..."
                    value={searchChatTargetQuery}
                    onChange={(e) => setSearchChatTargetQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Target Groups & Checkboxes */}
              <div className="space-y-4 pt-2">
                {chatTargetGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const allInGroupChecked = group.items.every((item) =>
                    currentAllowedChatTargets.includes(item.id)
                  );
                  const someInGroupChecked = group.items.some((item) =>
                    currentAllowedChatTargets.includes(item.id)
                  );

                  return (
                    <div
                      key={group.key}
                      className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                            <GroupIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {group.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {group.desc}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {group.items.filter((i) => currentAllowedChatTargets.includes(i.id)).length} / {group.items.length} Aktif
                        </span>
                      </div>

                      {/* Items Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {group.items.map((target) => {
                          const isChecked = currentAllowedChatTargets.includes(target.id);
                          const isSpecialBroadcast = target.id === 'broadcast';

                          return (
                            <div
                              key={target.id}
                              onClick={() => handleToggleChatTarget(target.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                isChecked
                                  ? isSpecialBroadcast
                                    ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs'
                                    : 'bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-500 shadow-xs'
                                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="pt-0.5">
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-xs font-bold leading-tight ${
                                      isChecked
                                        ? 'text-slate-900 dark:text-white'
                                        : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    {target.label}
                                  </span>
                                  {isSpecialBroadcast && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      Siaran
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                                  {target.shortDesc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Simulation Live Preview of Contact Drawer */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Simulasi Tampilan Kontak Pengguna ({currentRole.roleName})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {simulatedContactsForRole.length} Kontak Terlihat
                  </span>
                </div>

                <div className="text-[11px] text-slate-400">
                  Berikut adalah daftar thread kontak percakapan yang akan muncul di laci pesan saat pengguna login dengan role ini:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 max-h-52 overflow-y-auto no-scrollbar">
                  {simulatedContactsForRole.length === 0 ? (
                    <div className="col-span-full p-4 rounded-xl bg-slate-800/60 text-center text-xs text-slate-400">
                      Tidak ada kontak yang diizinkan untuk role ini.
                    </div>
                  ) : (
                    simulatedContactsForRole.map((contact) => (
                      <div
                        key={contact.username}
                        className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2.5"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                          {contact.username === 'all' ? (
                            <Radio className="w-4 h-4" />
                          ) : (
                            contact.nama.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {contact.nama}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center justify-between">
                            <span className="truncate">{contact.badge || contact.role}</span>
                            <span className="font-mono text-[9px] text-slate-500">
                              @{contact.username}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Save Bar for Chat Rules */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  {hasUnsavedChatChanges ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Ada perubahan kontak yang belum disimpan
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Pengaturan kontak role ini tersimpan & sinkron
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveChatRules}
                    disabled={readOnly}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan Kontak Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: OVERVIEW TABEL MATRIKS KONTAK ===================== */}
      {activeMainTab === 'chat_matrix' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Grid className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span>Tabel Matriks Hak Akses Kontak Antar-Role (Overview)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Peta relasi komunikasi: Baris mewakili <strong>Role Pengirim</strong>, kolom mewakili <strong>Target Kontak</strong> yang dapat dihubungi.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveChatRules}
                disabled={readOnly}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Matriks</span>
              </button>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3.5 sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 min-w-[180px]">
                    Role Pengirim
                  </th>
                  {CHAT_TARGET_DEFINITIONS.map((target) => (
                    <th
                      key={target.id}
                      className="p-3 text-center min-w-[110px] text-[11px] font-bold border-l border-slate-200 dark:border-slate-700"
                      title={target.shortDesc}
                    >
                      <div className="truncate">{target.label}</div>
                      <div className="text-[9px] font-mono font-normal text-slate-400 mt-0.5">
                        {target.id}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {roles.map((role) => {
                  const normKey = normalizeRoleKey(role.roleId);
                  const allowed = draftChatRules[normKey] || getRoleChatRule(appData, normKey).allowedTargets;
                  const colorMeta = COLOR_CLASSES[role.badgeColor || 'indigo'] || COLOR_CLASSES.indigo;

                  return (
                    <tr
                      key={role.roleId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3.5 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {role.roleName}
                        </div>
                        <span className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded font-semibold ${colorMeta.badge}`}>
                          {role.roleId}
                        </span>
                      </td>

                      {CHAT_TARGET_DEFINITIONS.map((target) => {
                        const isChecked = allowed.includes(target.id);
                        return (
                          <td
                            key={target.id}
                            onClick={() => {
                              setSelectedRoleId(role.roleId);
                              handleToggleChatTarget(target.id);
                            }}
                            className="p-2 text-center border-l border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                          >
                            <div className="flex items-center justify-center">
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-40 hover:opacity-100'
                                }`}
                              >
                                {isChecked ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <X className="w-3 h-3 text-slate-400 opacity-40" />
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: HAK AKSES MENU (ACL LAMA) ===================== */}
      {activeMainTab === 'menus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Role Selector / List */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Daftar Role</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pilih role untuk mengatur izin menu</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(true)}
                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 transition"
                  title="Tambah Role Baru"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Search Role */}
              <div className="relative mb-3">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari role pengguna..."
                  value={searchRoleQuery}
                  onChange={(e) => setSearchRoleQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              {/* Role List Cards */}
              <div className="space-y-2 max-h-[620px] overflow-y-auto no-scrollbar pr-0.5">
                {filteredRoles.map((role) => {
                  const isSelected = role.roleId === selectedRoleId;
                  const allowedCount = (draftPermissions[role.roleId] || role.allowedMenus).length;
                  const userCount = userCountPerRole[role.roleId] || 0;
                  const colorMeta = COLOR_CLASSES[role.badgeColor || 'indigo'] || COLOR_CLASSES.indigo;

                  return (
                    <div
                      key={role.roleId}
                      onClick={() => setSelectedRoleId(role.roleId)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                        isSelected
                          ? `bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-1 ring-blue-500/30`
                          : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                            }`}
                          />
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {role.roleName}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colorMeta.badge}`}
                        >
                          {allowedCount} Menu
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {role.description || `Pengaturan izin menu untuk role ${role.roleName}`}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {userCount} Akun
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-wider">
                          {role.roleId}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Menu Permission Checkboxes */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl ${activeColorTheme.bg} ${activeColorTheme.text} flex items-center justify-center font-black text-lg shadow-inner`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900 dark:text-white">
                        {currentRole.roleName}
                      </h2>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${activeColorTheme.badge}`}>
                        Role ID: {selectedRoleId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Daftar menu aplikasi yang diizinkan untuk dibuka oleh akun dengan role ini
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCopyModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Menu</span>
                  </button>
                </div>
              </div>

              {/* Action bar for menus */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllMenus}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 hover:bg-blue-100 transition"
                  >
                    Pilih Semua Menu
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllMenus}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition"
                  >
                    Kosongkan Pilihan
                  </button>
                </div>

                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter menu..."
                    value={searchMenuQuery}
                    onChange={(e) => setSearchMenuQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Categories & Menu Checkboxes */}
              <div className="space-y-4 pt-2">
                {filteredCategories.map((category) => {
                  const allCatChecked = category.items.every((i) => currentAllowedMenus.includes(i.id));

                  return (
                    <div
                      key={category.key}
                      className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {category.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {category.description}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(category.items)}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {allCatChecked ? 'Batal Semua' : 'Pilih Semua'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {category.items.map((item) => {
                          const isChecked = currentAllowedMenus.includes(item.id);
                          return (
                            <div
                              key={item.id}
                              onClick={() => handleToggleMenu(item.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                isChecked
                                  ? 'bg-white dark:bg-slate-800 border-blue-500 dark:border-blue-500 shadow-xs'
                                  : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="pt-0.5">
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  {item.label}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                                  {item.shortDesc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Bar for Menu Permissions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {hasUnsavedChanges ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" /> Ada perubahan menu yang belum disimpan
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Seluruh hak akses menu sinkron
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveMenuPermissions}
                  disabled={readOnly}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Hak Akses Menu</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Salin Kontak Chat Role */}
      {showCopyChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Salin Aturan Kontak Chat</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Terapkan ke: {currentRole.roleName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopyChatModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Pilih Role Sumber
                </label>
                <select
                  value={sourceCopyChatRoleId}
                  onChange={(e) => setSourceCopyChatRoleId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles
                    .filter((r) => r.roleId !== selectedRoleId)
                    .map((r) => {
                      const norm = normalizeRoleKey(r.roleId);
                      const targetCount = (draftChatRules[norm] || getRoleChatRule(appData, norm).allowedTargets).length;
                      return (
                        <option key={r.roleId} value={r.roleId}>
                          {r.roleName} ({targetCount} target aktif)
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tindakan ini akan menduplikasi seluruh izin target kontak chat dari role sumber ke role{' '}
                  <strong>{currentRole.roleName}</strong>.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyChatModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyCopyChatRules}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Terapkan Salinan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Salin Menu (ACL) */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Salin Hak Akses Menu</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Terapkan ke: {currentRole.roleName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCopyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Pilih Role Sumber
                </label>
                <select
                  value={sourceCopyRoleId}
                  onChange={(e) => setSourceCopyRoleId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles
                    .filter((r) => r.roleId !== selectedRoleId)
                    .map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName} ({(draftPermissions[r.roleId] || r.allowedMenus).length} menu aktif)
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tindakan ini akan menimpa seluruh pilihan menu pada role{' '}
                  <strong>{currentRole.roleName}</strong> dengan daftar menu yang aktif pada role sumber.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const sourceAllowed = draftPermissions[sourceCopyRoleId] || roles.find((r) => r.roleId === sourceCopyRoleId)?.allowedMenus || [];
                    setDraftPermissions((prev) => ({
                      ...prev,
                      [selectedRoleId]: [...sourceAllowed],
                    }));
                    setHasUnsavedChanges(true);
                    setShowCopyModal(false);
                    onShowToast(`Hak akses menu disalin dari role sumber ke "${currentRole.roleName}"!`, 'success');
                  }}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>Terapkan Salinan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Tambah Role Baru */}
      {showAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Buat Role Baru</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tambahkan kelompok wewenang kustom</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Nama Role Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Staf Keuangan, Tim Lab, Koordinator PKL"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Deskripsi / Keterangan Wewenang
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan singkat peran dan tanggung jawab role ini..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Salin Izin Dari
                  </label>
                  <select
                    value={copyPermissionFrom}
                    onChange={(e) => setCopyPermissionFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Warna Label Badge
                  </label>
                  <select
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="indigo">Indigo (Ungu Biru)</option>
                    <option value="blue">Blue (Biru)</option>
                    <option value="purple">Purple (Ungu)</option>
                    <option value="emerald">Emerald (Hijau)</option>
                    <option value="amber">Amber (Kuning)</option>
                    <option value="cyan">Cyan (Biru Muda)</option>
                    <option value="teal">Teal (Toska)</option>
                    <option value="rose">Rose (Merah Muda)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Role Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
