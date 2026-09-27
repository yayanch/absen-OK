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
  Info
} from 'lucide-react';
import { AppData, RoleMenuPermission, UserSession, ViewType } from '../../types';
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
  MenuItemInfo
} from '../../utils/rolePermissionEngine';
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

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string; activeBorder: string; badge: string }> = {
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
  // Get all registered roles
  const roles = useMemo(() => getAllRolePermissions(appData), [appData]);

  // Selected role
  const [selectedRoleId, setSelectedRoleId] = useState<string>(() => {
    return roles.length > 0 ? roles[0].roleId : 'admin';
  });

  // Local draft state of role permissions map (roleId -> allowedMenus)
  const [draftPermissions, setDraftPermissions] = useState<Record<string, ViewType[]>>(() => {
    const map: Record<string, ViewType[]> = {};
    roles.forEach((r) => {
      map[r.roleId] = [...r.allowedMenus];
    });
    return map;
  });

  // Track modified roles
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Search filter for menu items
  const [searchMenuQuery, setSearchMenuQuery] = useState('');

  // Search role filter
  const [searchRoleQuery, setSearchRoleQuery] = useState('');

  // Collapsed categories state (all open by default)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Modals
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

  // Copy permission modal / popover
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sourceCopyRoleId, setSourceCopyRoleId] = useState('guru');

  // Currently active role object
  const currentRole = useMemo(() => {
    return roles.find((r) => r.roleId === selectedRoleId) || roles[0];
  }, [roles, selectedRoleId]);

  const currentAllowedMenus = useMemo(() => {
    return draftPermissions[selectedRoleId] || currentRole?.allowedMenus || [];
  }, [draftPermissions, selectedRoleId, currentRole]);

  // Calculate active users per role
  const userCountPerRole = useMemo(() => {
    const counts: Record<string, number> = {};
    const effectiveWali = appData.waliKelas || [];
    
    // Admin count
    counts['admin'] = 1;

    // Kesiswaan, Wali, Guru, Kurikulum, Staf Jadwal, Hubin
    effectiveWali.forEach((w) => {
      const r = normalizeRoleKey(w.role || 'wali');
      counts[r] = (counts[r] || 0) + 1;
    });

    if (appData.stafJadwal) {
      counts['staf_jadwal'] = (counts['staf_jadwal'] || 0) + 1;
    }

    // Murid
    counts['murid'] = (appData.siswa || []).length;

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

  // Filtered menu items
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

  // Toggle single menu for current selected role
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

  // Toggle all menus in a category
  const handleToggleCategory = (categoryItems: MenuItemInfo[]) => {
    if (readOnly) return;

    const itemIds = categoryItems.map((i) => i.id);
    const allChecked = itemIds.every((id) => currentAllowedMenus.includes(id));

    setDraftPermissions((prev) => {
      const currentList = prev[selectedRoleId] || currentRole?.allowedMenus || [];
      let updatedList: ViewType[];

      if (allChecked) {
        // Uncheck all in this category
        updatedList = currentList.filter((id) => !itemIds.includes(id));
      } else {
        // Check all in this category
        const set = new Set([...currentList, ...itemIds]);
        updatedList = Array.from(set);
      }

      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: updatedList,
      };
    });
  };

  // Select all menus for current role
  const handleSelectAll = () => {
    if (readOnly) return;
    setDraftPermissions((prev) => {
      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: ALL_MENU_ITEMS.map((m) => m.id),
      };
    });
    onShowToast(`Semua menu telah dipilih untuk role "${currentRole.roleName}"`, 'info');
  };

  // Deselect all menus for current role
  const handleDeselectAll = () => {
    if (readOnly) return;
    setDraftPermissions((prev) => {
      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: [],
      };
    });
    onShowToast(`Seluruh menu dinonaktifkan untuk role "${currentRole.roleName}"`, 'warning');
  };

  // Copy permissions from another role
  const handleApplyCopyPermissions = () => {
    const sourcePermissions = draftPermissions[sourceCopyRoleId] || roles.find((r) => r.roleId === sourceCopyRoleId)?.allowedMenus || [];
    setDraftPermissions((prev) => {
      setHasUnsavedChanges(true);
      return {
        ...prev,
        [selectedRoleId]: [...sourcePermissions],
      };
    });
    setShowCopyModal(false);
    onShowToast(`Hak akses berhasil disalin dari "${roles.find((r) => r.roleId === sourceCopyRoleId)?.roleName}"!`, 'success');
  };

  // Save all permissions to AppData
  const handleSaveAll = () => {
    if (readOnly) {
      onShowToast('Akses dibatasi!', 'warning');
      return;
    }

    const updatedPermissions: RoleMenuPermission[] = roles.map((r) => {
      return {
        ...r,
        allowedMenus: draftPermissions[r.roleId] || r.allowedMenus,
      };
    });

    const updatedAppData: AppData = {
      ...appData,
      rolePermissions: updatedPermissions,
    };

    const nextData = addAuditLog(
      updatedAppData,
      'PENGATURAN_ROLE',
      `Memperbarui hak akses menu untuk ${roles.length} role pengguna.`
    );
    onUpdateAppData(nextData);

    setHasUnsavedChanges(false);
    onShowToast('Pengaturan hak akses menu untuk seluruh role berhasil disimpan!', 'success');
  };

  // Reset to default
  const handleResetToDefault = () => {
    if (readOnly) return;

    const doReset = () => {
      const resetData = resetRolePermissionsToDefault(appData);
      const withAudit = addAuditLog(
        resetData,
        'RESET_ROLE',
        'Mereset seluruh hak akses menu ke pengaturan standar sistem.'
      );
      onUpdateAppData(withAudit);

      const defaultMap: Record<string, ViewType[]> = {};
      DEFAULT_ROLE_PERMISSIONS.forEach((d) => {
        defaultMap[d.roleId] = [...d.allowedMenus];
      });
      setDraftPermissions(defaultMap);
      setHasUnsavedChanges(false);

      onShowToast('Hak akses menu seluruh role telah dikembalikan ke standar awal!', 'success');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Reset Hak Akses ke Standar Pabrik',
        'Apakah Anda yakin ingin mereset seluruh hak akses menu untuk semua role ke pengaturan bawaan awal? Penyesuaian khusus yang telah dibuat akan dihapus.',
        'warning',
        doReset
      );
    } else if (window.confirm('Reset seluruh hak akses menu ke pengaturan awal sistem?')) {
      doReset();
    }
  };

  // Create new custom role
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) {
      onShowToast('Nama role tidak boleh kosong!', 'error');
      return;
    }

    const cleanId = newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (roles.some((r) => r.roleId === cleanId || r.roleName.toLowerCase() === newRoleName.trim().toLowerCase())) {
      onShowToast('Role dengan nama atau ID tersebut sudah ada!', 'warning');
      return;
    }

    const sourcePermissions = draftPermissions[copyPermissionFrom] || roles.find((r) => r.roleId === copyPermissionFrom)?.allowedMenus || ['dashboard'];

    const newRoleObj = {
      id: cleanId,
      name: cleanId,
      label: newRoleName.trim(),
      description: newRoleDesc.trim() || `Peran khusus ${newRoleName.trim()}`,
      color: newRoleColor,
      allowedMenus: [...sourcePermissions],
      isSystem: false,
    };

    const newPermissionObj: RoleMenuPermission = {
      roleId: cleanId,
      roleName: newRoleName.trim(),
      description: newRoleDesc.trim() || `Peran khusus ${newRoleName.trim()}`,
      badgeColor: newRoleColor,
      isSystem: false,
      allowedMenus: [...sourcePermissions],
    };

    const updatedCustomRoles = [...(appData.customRoles || []), newRoleObj];
    const updatedPermissions = [...(appData.rolePermissions || roles), newPermissionObj];

    onUpdateAppData({
      ...appData,
      customRoles: updatedCustomRoles,
      rolePermissions: updatedPermissions,
    });

    setDraftPermissions((prev) => ({
      ...prev,
      [cleanId]: [...sourcePermissions],
    }));

    setSelectedRoleId(cleanId);
    setShowAddRoleModal(false);
    setNewRoleName('');
    setNewRoleDesc('');
    setNewRoleColor('indigo');

    onShowToast(`Role kustom "${newRoleName.trim()}" berhasil dibuat dengan ${sourcePermissions.length} menu aktif!`, 'success');
  };

  // Edit custom role
  const handleSaveEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleName.trim()) return;

    const updatedPermissions = roles.map((r) => {
      if (r.roleId === editRoleId) {
        return {
          ...r,
          roleName: editRoleName.trim(),
          description: editRoleDesc.trim(),
          badgeColor: editRoleColor,
        };
      }
      return r;
    });

    const updatedCustomRoles = (appData.customRoles || []).map((cr) => {
      if (cr.id === editRoleId || cr.name === editRoleId) {
        return {
          ...cr,
          label: editRoleName.trim(),
          color: editRoleColor,
          description: editRoleDesc.trim(),
        };
      }
      return cr;
    });

    onUpdateAppData({
      ...appData,
      rolePermissions: updatedPermissions,
      customRoles: updatedCustomRoles,
    });

    setShowEditRoleModal(false);
    onShowToast(`Informasi role "${editRoleName.trim()}" berhasil diperbarui!`, 'success');
  };

  // Delete custom role
  const handleDeleteRole = (roleToDelete: RoleMenuPermission) => {
    if (roleToDelete.isSystem) {
      onShowToast('Role sistem bawaan tidak dapat dihapus!', 'error');
      return;
    }

    const assignedCount = userCountPerRole[roleToDelete.roleId] || 0;

    const doDelete = () => {
      const updatedCustomRoles = (appData.customRoles || []).filter(
        (r) => r.id !== roleToDelete.roleId && r.name !== roleToDelete.roleId
      );
      const updatedPermissions = (appData.rolePermissions || roles).filter(
        (r) => r.roleId !== roleToDelete.roleId
      );

      // Reassign any users with this role to 'guru'
      const updatedWaliKelas = (appData.waliKelas || []).map((w) => {
        if (w.role === roleToDelete.roleId) {
          return { ...w, role: 'guru' };
        }
        return w;
      });

      onUpdateAppData({
        ...appData,
        customRoles: updatedCustomRoles,
        rolePermissions: updatedPermissions,
        waliKelas: updatedWaliKelas,
      });

      setDraftPermissions((prev) => {
        const next = { ...prev };
        delete next[roleToDelete.roleId];
        return next;
      });

      setSelectedRoleId('admin');
      onShowToast(`Role "${roleToDelete.roleName}" berhasil dihapus.`, 'info');
    };

    if (onConfirmModal) {
      onConfirmModal(
        `Hapus Role "${roleToDelete.roleName}"`,
        `Apakah Anda yakin ingin menghapus role "${roleToDelete.roleName}"? ${
          assignedCount > 0
            ? `${assignedCount} pengguna dengan role ini akan dialihkan menjadi Guru.`
            : 'Tidak ada pengguna yang terikat pada role ini.'
        }`,
        'danger',
        doDelete
      );
    } else if (window.confirm(`Hapus role "${roleToDelete.roleName}"?`)) {
      doDelete();
    }
  };

  const activeColorTheme = COLOR_CLASSES[currentRole.badgeColor || 'indigo'] || COLOR_CLASSES.indigo;

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <PageHeader
        icon={ShieldCheck}
        title="Pengaturan Role & Hak Akses Menu"
        description="Atur daftar menu aplikasi apa saja yang dapat dilihat, diakses, dan dibuka oleh masing-masing peran/jabatan pengguna."
        badge="Access Control List (ACL)"
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

          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition flex items-center gap-1.5"
            title="Kembalikan semua hak akses menu ke pengaturan standar"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Standar</span>
          </button>

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
              Total Menu
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {ALL_MENU_ITEMS.length}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {MENU_CATEGORIES.length} Kategori Menu Sistem
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Menu Aktif ({currentRole.roleName})
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {currentAllowedMenus.length}{' '}
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              / {ALL_MENU_ITEMS.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {Math.round((currentAllowedMenus.length / ALL_MENU_ITEMS.length) * 100)}% menu dapat diakses
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pengguna Role Ini
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
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

      {/* Main Container: 2 Columns */}
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              role.roleId === 'admin'
                                ? 'bg-blue-500'
                                : role.roleId === 'kesiswaan'
                                ? 'bg-purple-500'
                                : role.roleId === 'kurikulum'
                                ? 'bg-amber-500'
                                : role.roleId === 'wali'
                                ? 'bg-emerald-500'
                                : role.roleId === 'guru'
                                ? 'bg-indigo-500'
                                : role.roleId === 'staf_jadwal'
                                ? 'bg-cyan-500'
                                : role.roleId === 'murid'
                                ? 'bg-rose-500'
                                : 'bg-teal-500'
                            }`}
                          />
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {role.roleName}
                          </h4>
                          {role.isSystem ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-md">
                              Sistem
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 rounded-md">
                              Kustom
                            </span>
                          )}
                        </div>

                        {role.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 pl-4.5">
                            {role.description}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                          {allowedCount} menu
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {userCount} user
                        </div>
                      </div>
                    </div>

                    {/* Actions for custom role */}
                    {!role.isSystem && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRoleId(role.roleId);
                            setEditRoleName(role.roleName);
                            setEditRoleDesc(role.description || '');
                            setEditRoleColor(role.badgeColor || 'indigo');
                            setShowEditRoleModal(true);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRole(role);
                          }}
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredRoles.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  Tidak ditemukan role dengan kata kunci tersebut.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddRoleModal(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Peran Kustom Baru</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Menu Permission Matrix for Selected Role */}
        <div className="lg:col-span-8 space-y-4">
          {/* Role Header Banner */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activeColorTheme.bg} ${activeColorTheme.text} font-black text-lg shadow-xs`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      {currentRole.roleName}
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeColorTheme.badge}`}>
                      ID: {currentRole.roleId}
                    </span>
                    {currentRole.isSystem && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Default Sistem
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {currentRole.description || 'Pengaturan hak akses tampilan menu dan halaman sistem'}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Pilih Semua</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5 text-rose-500" />
                  <span>Hapus Semua</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCopyModal(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin dari Role...</span>
                </button>
              </div>
            </div>

            {/* Menu Search Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama menu atau fitur (misal: 'presensi', 'rekap', 'jadwal')..."
                  value={searchMenuQuery}
                  onChange={(e) => setSearchMenuQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              {searchMenuQuery && (
                <button
                  type="button"
                  onClick={() => setSearchMenuQuery('')}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Reset Pencarian
                </button>
              )}
            </div>
          </div>

          {/* Categorized Menu Cards */}
          <div className="space-y-4">
            {filteredCategories.map((category) => {
              const isCollapsed = Boolean(collapsedCategories[category.key]);
              const categoryItems = category.items;
              const enabledCount = categoryItems.filter((i) => currentAllowedMenus.includes(i.id)).length;
              const isAllChecked = categoryItems.length > 0 && enabledCount === categoryItems.length;

              return (
                <div
                  key={category.key}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs"
                >
                  {/* Category Header */}
                  <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedCategories((prev) => ({
                          ...prev,
                          [category.key]: !prev[category.key],
                        }))
                      }
                      className="flex items-center gap-3 text-left flex-1 select-none"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        {ICON_MAP[category.iconName] || <Layers className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            {category.title}
                          </h3>
                          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {enabledCount}/{categoryItems.length} Aktif
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {category.description}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(categoryItems)}
                        className={`px-3 py-1.5 text-[11px] font-bold rounded-xl transition ${
                          isAllChecked
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {isAllChecked ? 'Matikan Semua' : 'Aktifkan Semua'}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedCategories((prev) => ({
                            ...prev,
                            [category.key]: !prev[category.key],
                          }))
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90' : 'rotate-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Menu Items Grid */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryItems.map((item) => {
                        const isChecked = currentAllowedMenus.includes(item.id);

                        return (
                          <div
                            key={item.id}
                            onClick={() => handleToggleMenu(item.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                              isChecked
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                                : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                            }`}
                          >
                            {/* Toggle Checkbox Switch */}
                            <div className="pt-0.5 shrink-0">
                              <div
                                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </div>

                            {/* Menu Icon */}
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                isChecked
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {ICON_MAP[item.iconName] || <FileText className="w-4 h-4" />}
                            </div>

                            {/* Menu Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4
                                  className={`text-xs font-bold truncate ${
                                    isChecked
                                      ? 'text-slate-900 dark:text-white'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {item.label}
                                </h4>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                    isChecked
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                  }`}
                                >
                                  {isChecked ? 'Terlihat' : 'Disembunyikan'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                                {item.shortDesc}
                              </p>
                              <div className="text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1">
                                view: #{item.id}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Tidak ditemukan menu dengan kata kunci "{searchMenuQuery}"
                </h4>
                <p className="text-xs text-slate-500">
                  Coba kata kunci lain atau bersihkan kotak pencarian.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchMenuQuery('')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Bersihkan Filter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Save Bar when Changes Exist */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center justify-between gap-4 animate-bounce-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">Ada Perubahan Izin Menu Belum Disimpan</div>
              <div className="text-[11px] text-slate-400">
                Klik simpan agar perubahan hak akses menu langsung diterapkan pada navigasi akun pengguna.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                // Cancel draft changes
                const resetDraft: Record<string, ViewType[]> = {};
                roles.forEach((r) => {
                  resetDraft[r.roleId] = [...r.allowedMenus];
                });
                setDraftPermissions(resetDraft);
                setHasUnsavedChanges(false);
                onShowToast('Perubahan dibatalkan.', 'info');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
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
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Buat Role Kustom Baru</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Tambahkan jabatan atau peran pengguna baru</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddRoleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Nama Role / Jabatan
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembina OSIS, Kepala Bengkel, Guru Piket..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Deskripsi / Keterangan Tugas
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat fungsi dan kewenangan peran ini..."
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Warna Badge
                  </label>
                  <select
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="indigo">Indigo (Ungu Biru)</option>
                    <option value="purple">Purple (Ungu)</option>
                    <option value="blue">Blue (Biru)</option>
                    <option value="emerald">Emerald (Hijau)</option>
                    <option value="amber">Amber (Kuning)</option>
                    <option value="cyan">Cyan (Biru Muda)</option>
                    <option value="teal">Teal (Toska)</option>
                    <option value="rose">Rose (Merah Muda)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                    Salin Izin Awal Dari
                  </label>
                  <select
                    value={copyPermissionFrom}
                    onChange={(e) => setCopyPermissionFrom(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName} ({(draftPermissions[r.roleId] || r.allowedMenus).length} menu)
                      </option>
                    ))}
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
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Role Baru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Role Kustom */}
      {showEditRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">Edit Informasi Role</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">ID: {editRoleId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditRoleModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRole} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Nama Role / Jabatan
                </label>
                <input
                  type="text"
                  required
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Deskripsi / Keterangan Tugas
                </label>
                <textarea
                  rows={2}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 uppercase mb-1">
                  Warna Badge
                </label>
                <select
                  value={editRoleColor}
                  onChange={(e) => setEditRoleColor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="indigo">Indigo (Ungu Biru)</option>
                  <option value="purple">Purple (Ungu)</option>
                  <option value="blue">Blue (Biru)</option>
                  <option value="emerald">Emerald (Hijau)</option>
                  <option value="amber">Amber (Kuning)</option>
                  <option value="cyan">Cyan (Biru Muda)</option>
                  <option value="teal">Teal (Toska)</option>
                  <option value="rose">Rose (Merah Muda)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoleModal(false)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Salin Hak Akses dari Role Lain */}
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
                  onClick={handleApplyCopyPermissions}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  <span>Terapkan Salinan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
