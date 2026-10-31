import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCcw,
  Save,
  Check,
  Sliders,
  Copy,
  Layers,
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import {
  AppData,
  DashboardQuickActionItem,
  RoleQuickActionConfig,
  QuickActionColor,
  ViewType,
  UserSession,
} from '../../types';
import {
  AVAILABLE_QUICK_ACTION_ICONS,
  getAvailableRolesForConfig,
  getDefaultRoleQuickActionConfig,
  getQuickActionColorClasses,
  getRoleQuickActionConfig,
  KnownRoleOption,
  renderQuickActionIcon,
  updateRoleQuickActionConfig,
  resetRoleQuickActionToDefault,
  resetAllRoleQuickActionsToDefault,
} from '../../utils/dashboardQuickActionsEngine';
import { ALL_MENU_ITEMS, MENU_CATEGORIES, MenuCategoryKey, MenuItemInfo } from '../../utils/rolePermissionEngine';
import { addAuditLog } from '../../utils/helpers';

export const getCategoryDefaultColor = (category?: string): QuickActionColor => {
  switch (category) {
    case 'dashboard':
      return 'blue';
    case 'presensi':
      return 'emerald';
    case 'laporan':
      return 'amber';
    case 'master':
      return 'indigo';
    case 'kegiatan':
      return 'rose';
    case 'qr':
      return 'cyan';
    case 'sistem':
      return 'purple';
    case 'pengaturan':
      return 'slate';
    default:
      return 'blue';
  }
};

interface PengaturanKartuCepatModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppData;
  currentUser: UserSession;
  onUpdateAppData: (updated: AppData) => void;
  onShowToast?: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  initialRole?: string;
}

const COLOR_OPTIONS: { key: QuickActionColor; label: string; bgClass: string }[] = [
  { key: 'blue', label: 'Biru', bgClass: 'bg-blue-500' },
  { key: 'emerald', label: 'Hijau', bgClass: 'bg-emerald-500' },
  { key: 'amber', label: 'Kuning / Emas', bgClass: 'bg-amber-500' },
  { key: 'rose', label: 'Merah / Rose', bgClass: 'bg-rose-500' },
  { key: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-500' },
  { key: 'cyan', label: 'Cyan', bgClass: 'bg-cyan-500' },
  { key: 'purple', label: 'Ungu', bgClass: 'bg-purple-500' },
  { key: 'teal', label: 'Teal', bgClass: 'bg-teal-500' },
  { key: 'sky', label: 'Sky', bgClass: 'bg-sky-500' },
  { key: 'slate', label: 'Abu-abu', bgClass: 'bg-slate-500' },
];

export const PengaturanKartuCepatModal: React.FC<PengaturanKartuCepatModalProps> = ({
  isOpen,
  onClose,
  appData,
  currentUser,
  onUpdateAppData,
  onShowToast,
  initialRole = 'admin',
}) => {
  const availableRoles = useMemo(() => getAvailableRolesForConfig(appData), [appData]);

  // Selected role for editing
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>(() => {
    return initialRole || 'admin';
  });

  // Local draft configs map: roleKey -> RoleQuickActionConfig
  const [draftRolesConfig, setDraftRolesConfig] = useState<Record<string, RoleQuickActionConfig>>(() => {
    const map: Record<string, RoleQuickActionConfig> = {};
    availableRoles.forEach((r) => {
      map[r.key] = getRoleQuickActionConfig(appData, r.key);
    });
    return map;
  });

  // Keep track of unsaved modifications
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Active role config being edited
  const currentRoleConfig = useMemo(() => {
    if (draftRolesConfig[selectedRoleKey]) {
      return draftRolesConfig[selectedRoleKey];
    }
    return getRoleQuickActionConfig(appData, selectedRoleKey);
  }, [draftRolesConfig, selectedRoleKey, appData]);

  // Editing single card form state (null if not editing or adding)
  const [editingCard, setEditingCard] = useState<DashboardQuickActionItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Copy modal state
  const [showCopyFromModal, setShowCopyFromModal] = useState<boolean>(false);
  const [sourceCopyRoleKey, setSourceCopyRoleKey] = useState<string>('admin');

  // Search filter and Bagian filter for menu items in Add modal
  const [menuSearchQuery, setMenuSearchQuery] = useState<string>('');
  const [selectedBagianFilter, setSelectedBagianFilter] = useState<string>('semua');

  // Bulk add cards from Bagian modal state
  const [showBulkBagianModal, setShowBulkBagianModal] = useState<boolean>(false);
  const [bulkSelectedMenuIds, setBulkSelectedMenuIds] = useState<Set<string>>(new Set());
  const [bulkSearchQuery, setBulkSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const currentRoleMeta = availableRoles.find((r) => r.key === selectedRoleKey) || {
    key: selectedRoleKey,
    label: selectedRoleKey.toUpperCase(),
    description: '',
    dotColor: 'bg-blue-600',
    isSystem: false,
  };

  // Helper to mutate draft for selected role
  const updateCurrentRoleDraft = (updater: (prev: RoleQuickActionConfig) => RoleQuickActionConfig) => {
    setDraftRolesConfig((prev) => {
      const existing = prev[selectedRoleKey] || getRoleQuickActionConfig(appData, selectedRoleKey);
      const updated = updater(existing);
      return {
        ...prev,
        [selectedRoleKey]: updated,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Toggle enable entire section for selected role
  const handleToggleSectionEnabled = () => {
    updateCurrentRoleDraft((cfg) => ({
      ...cfg,
      enabled: !cfg.enabled,
    }));
  };

  // Move card up
  const handleMoveCardUp = (index: number) => {
    if (index <= 0) return;
    updateCurrentRoleDraft((cfg) => {
      const newCards = [...cfg.cards];
      const temp = newCards[index - 1];
      newCards[index - 1] = newCards[index];
      newCards[index] = temp;
      return { ...cfg, cards: newCards };
    });
  };

  // Move card down
  const handleMoveCardDown = (index: number) => {
    updateCurrentRoleDraft((cfg) => {
      if (index >= cfg.cards.length - 1) return cfg;
      const newCards = [...cfg.cards];
      const temp = newCards[index + 1];
      newCards[index + 1] = newCards[index];
      newCards[index] = temp;
      return { ...cfg, cards: newCards };
    });
  };

  // Toggle card enabled/disabled
  const handleToggleCardEnabled = (cardId: string) => {
    updateCurrentRoleDraft((cfg) => ({
      ...cfg,
      cards: cfg.cards.map((c) => (c.id === cardId ? { ...c, enabled: !c.enabled } : c)),
    }));
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    updateCurrentRoleDraft((cfg) => ({
      ...cfg,
      cards: cfg.cards.filter((c) => c.id !== cardId),
    }));
  };

  // Open Edit Card
  const handleOpenEditCard = (card: DashboardQuickActionItem) => {
    setEditingCard({ ...card });
    setIsAddingNew(false);
    setSelectedBagianFilter('semua');
  };

  // Open Add Card
  const handleOpenAddCard = () => {
    setEditingCard({
      id: `qa_${selectedRoleKey}_${Date.now().toString().slice(-5)}`,
      view: 'presensi_input',
      title: 'Aksi Cepat Baru',
      subtitle: 'Deskripsi singkat kartu',
      iconName: 'ClipboardCheck',
      colorScheme: 'blue',
      enabled: true,
    });
    setIsAddingNew(true);
    setMenuSearchQuery('');
    setSelectedBagianFilter('semua');
  };

  // Save Card (after editing or adding)
  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard || !editingCard.title.trim()) return;

    updateCurrentRoleDraft((cfg) => {
      let updatedCards: DashboardQuickActionItem[];
      if (isAddingNew) {
        updatedCards = [...cfg.cards, editingCard];
      } else {
        updatedCards = cfg.cards.map((c) => (c.id === editingCard.id ? editingCard : c));
      }
      return { ...cfg, cards: updatedCards };
    });

    setEditingCard(null);
    setIsAddingNew(false);
  };

  // Quick pick from menu item in edit/add form
  const handleSelectMenuItem = (menuItem: MenuItemInfo) => {
    if (!editingCard) return;
    setEditingCard({
      ...editingCard,
      view: menuItem.id,
      title: menuItem.label,
      subtitle: menuItem.shortDesc,
      iconName: menuItem.iconName || 'FileText',
      colorScheme: getCategoryDefaultColor(menuItem.category),
    });
  };

  // Open Bulk Add Modal for Bagian
  const handleOpenBulkBagianModal = () => {
    // Pre-select all menu items that are not yet in current role's cards
    const existingViews = new Set(currentRoleConfig.cards.map((c) => c.view));
    const toSelect = new Set<string>();
    ALL_MENU_ITEMS.forEach((m) => {
      if (!existingViews.has(m.id)) {
        toSelect.add(m.id);
      }
    });
    setBulkSelectedMenuIds(toSelect.size > 0 ? toSelect : new Set(ALL_MENU_ITEMS.map((m) => m.id)));
    setBulkSearchQuery('');
    setShowBulkBagianModal(true);
  };

  // Bulk toggle single menu item
  const handleToggleBulkMenu = (menuId: string) => {
    setBulkSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  // Bulk toggle all items in a category/bagian
  const handleToggleBulkCategory = (categoryKey: string) => {
    const catItems = ALL_MENU_ITEMS.filter((m) => m.category === categoryKey);
    const catItemIds = catItems.map((m) => m.id);
    const allSelected = catItemIds.every((id) => bulkSelectedMenuIds.has(id));

    setBulkSelectedMenuIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        catItemIds.forEach((id) => next.delete(id));
      } else {
        catItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // Select all menus across all Bagian
  const handleSelectAllBulkMenus = () => {
    const allIds = new Set(ALL_MENU_ITEMS.map((m) => m.id));
    setBulkSelectedMenuIds(allIds);
  };

  // Deselect all
  const handleDeselectAllBulkMenus = () => {
    setBulkSelectedMenuIds(new Set());
  };

  // Confirm and insert bulk selected items into current role cards
  const handleConfirmBulkAddBagian = () => {
    if (bulkSelectedMenuIds.size === 0) {
      setShowBulkBagianModal(false);
      return;
    }

    const existingViews = new Set(currentRoleConfig.cards.map((c) => c.view));
    const newCards: DashboardQuickActionItem[] = [];

    ALL_MENU_ITEMS.forEach((item, idx) => {
      if (bulkSelectedMenuIds.has(item.id)) {
        // If not already existing or user wants full set
        newCards.push({
          id: `qa_${selectedRoleKey}_${item.id}_${idx}_${Date.now().toString().slice(-4)}`,
          view: item.id,
          title: item.label,
          subtitle: item.shortDesc,
          iconName: item.iconName || 'FileText',
          colorScheme: getCategoryDefaultColor(item.category),
          enabled: true,
        });
      }
    });

    updateCurrentRoleDraft((cfg) => ({
      ...cfg,
      cards: [...cfg.cards, ...newCards],
    }));

    setShowBulkBagianModal(false);
    if (onShowToast) {
      onShowToast(
        `Berhasil memasukkan ${newCards.length} kartu cepat dari bagian sistem ke peran "${currentRoleMeta.label}"!`,
        'success'
      );
    }
  };

  // Reset selected role to default
  const handleResetCurrentRole = () => {
    const defaultCfg = getDefaultRoleQuickActionConfig(selectedRoleKey);
    setDraftRolesConfig((prev) => ({
      ...prev,
      [selectedRoleKey]: JSON.parse(JSON.stringify(defaultCfg)),
    }));
    setHasUnsavedChanges(true);
    if (onShowToast) {
      onShowToast(`Kartu cepat role "${currentRoleMeta.label}" dikembalikan ke preset standar bawaan.`, 'info');
    }
  };

  // Reset all roles
  const handleResetAllRoles = () => {
    if (!window.confirm('Kembalikan kartu cepat dashboard untuk SEMUA peran ke standar pabrik?')) {
      return;
    }
    const map: Record<string, RoleQuickActionConfig> = {};
    availableRoles.forEach((r) => {
      map[r.key] = getDefaultRoleQuickActionConfig(r.key);
    });
    setDraftRolesConfig(map);
    setHasUnsavedChanges(true);
    if (onShowToast) {
      onShowToast('Semua peran berhasil di-reset ke standar kartu cepat.', 'info');
    }
  };

  // Apply copy from another role
  const handleApplyCopyFromRole = () => {
    const sourceCfg = draftRolesConfig[sourceCopyRoleKey] || getRoleQuickActionConfig(appData, sourceCopyRoleKey);
    const sourceMeta = availableRoles.find((r) => r.key === sourceCopyRoleKey);

    const clonedCards = sourceCfg.cards.map((c, idx) => ({
      ...c,
      id: `qa_${selectedRoleKey}_${idx}_${Date.now().toString().slice(-4)}`,
    }));

    updateCurrentRoleDraft((cfg) => ({
      ...cfg,
      cards: clonedCards,
      sectionSubtitle: sourceCfg.sectionSubtitle || cfg.sectionSubtitle,
    }));

    setShowCopyFromModal(false);
    if (onShowToast) {
      onShowToast(
        `Berhasil menyalin ${clonedCards.length} kartu cepat dari role "${sourceMeta?.label || sourceCopyRoleKey}"!`,
        'success'
      );
    }
  };

  // Save all changes to AppData
  const handleSaveAll = () => {
    let updated = { ...appData };
    const currentRolesConfig = { ...(appData.dashboardQuickActions?.rolesConfig || {}) };

    Object.entries(draftRolesConfig).forEach(([rKey, cfg]) => {
      currentRolesConfig[rKey] = cfg;
    });

    updated = {
      ...updated,
      dashboardQuickActions: {
        rolesConfig: currentRolesConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: (currentUser.data as any)?.nama || 'Administrator',
      },
    };

    updated = addAuditLog(
      updated,
      'Ubah Pengaturan Kartu Cepat Dashboard',
      `Memperbarui konfigurasi kartu cepat dashboard untuk ${Object.keys(draftRolesConfig).length} role.`
    );

    onUpdateAppData(updated);
    setHasUnsavedChanges(false);
    if (onShowToast) {
      onShowToast('Pengaturan kartu cepat dashboard berhasil disimpan & langsung aktif!', 'success');
    }
    onClose();
  };

  // Filtered menu items for picker (Add / Edit Card modal)
  const filteredMenuItems = useMemo(() => {
    return ALL_MENU_ITEMS.filter((item) => {
      if (selectedBagianFilter !== 'semua' && item.category !== selectedBagianFilter) {
        return false;
      }
      if (!menuSearchQuery) return true;
      const q = menuSearchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.shortDesc.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [selectedBagianFilter, menuSearchQuery]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-850/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Pengaturan Kartu Cepat Dashboard Tiap Peran
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Per-Role Dashboard Quick Action
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sesuaikan kartu aksi 1-klik di dashboard untuk masing-masing peran pengguna (Admin, Guru, Wali, dsb.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. ROLE SELECTOR TABS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Pilih Peran / Jabatan yang Dikonfigurasi:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyFromModal(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin dari Peran Lain</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleResetCurrentRole}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Peran Ini</span>
                </button>
              </div>
            </div>

            {/* Horizontal scrollable role pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {availableRoles.map((r) => {
                const isSelected = r.key === selectedRoleKey;
                const rCfg = draftRolesConfig[r.key] || getRoleQuickActionConfig(appData, r.key);
                const activeCardsCount = (rCfg.cards || []).filter((c) => c.enabled).length;

                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setSelectedRoleKey(r.key);
                      setEditingCard(null);
                      setIsAddingNew(false);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 border cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/25'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : r.dotColor}`} />
                    <span>{r.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {activeCardsCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. ROLE HEADER & TOGGLE SECTION */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${currentRoleMeta.dotColor} animate-pulse`} />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Konfigurasi Kartu: {currentRoleMeta.label}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentRoleMeta.description}
                </p>
              </div>

              {/* Master Toggle for this role */}
              <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={currentRoleConfig.enabled}
                  onChange={handleToggleSectionEnabled}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {currentRoleConfig.enabled ? 'Seksi Kartu Aktif' : 'Seksi Kartu Disembunyikan'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Judul Seksi di Dashboard:
                </label>
                <input
                  type="text"
                  value={currentRoleConfig.sectionTitle || ''}
                  onChange={(e) =>
                    updateCurrentRoleDraft((cfg) => ({ ...cfg, sectionTitle: e.target.value }))
                  }
                  placeholder={`Contoh: Kartu Cepat ${currentRoleMeta.label}`}
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Subjudul / Deskripsi Seksi:
                </label>
                <input
                  type="text"
                  value={currentRoleConfig.sectionSubtitle || ''}
                  onChange={(e) =>
                    updateCurrentRoleDraft((cfg) => ({ ...cfg, sectionSubtitle: e.target.value }))
                  }
                  placeholder="Keterangan singkat fungsi kartu aksi..."
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. LIST OF CARDS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Kartu Aksi Cepat ({currentRoleConfig.cards.length} Total • {currentRoleConfig.cards.filter((c) => c.enabled).length} Aktif)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenBulkBagianModal}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  title="Pilih dan masukkan menu dari seluruh bagian aplikasi sekaligus"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pilih dari Semua Bagian</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddCard}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Tambah Kartu Baru</span>
                </button>
              </div>
            </div>

            {currentRoleConfig.cards.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Belum ada kartu cepat untuk peran ini.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Klik tombol "Tambah Kartu Baru" atau "Salin dari Peran Lain" untuk mengisi kartu cepat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentRoleConfig.cards.map((card, idx) => {
                  const colorMeta = getQuickActionColorClasses(card.colorScheme || 'blue');
                  const isFirst = idx === 0;
                  const isLast = idx === currentRoleConfig.cards.length - 1;

                  return (
                    <div
                      key={card.id}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-3 ${
                        card.enabled
                          ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-xs'
                          : 'bg-slate-100/60 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                      }`}
                    >
                      {/* Left Side: Order, Icon, Title & View */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Order controls */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleMoveCardUp(idx)}
                            disabled={isFirst}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                              isFirst ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Pindah ke Atas"
                          >
                            <MoveUp className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-black text-slate-400">{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleMoveCardDown(idx)}
                            disabled={isLast}
                            className={`p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                              isLast ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Pindah ke Bawah"
                          >
                            <MoveDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Icon preview */}
                        <div className={`p-2.5 rounded-xl shrink-0 ${colorMeta.iconBg}`}>
                          {renderQuickActionIcon(card.iconName, 'w-4 h-4')}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {card.title}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${colorMeta.badge}`}
                            >
                              {card.view}
                            </span>
                            {card.specialAction && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Aksi: {card.specialAction}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {card.subtitle || 'Tidak ada deskripsi'}
                          </p>
                        </div>
                      </div>

                      {/* Right Side: Toggle & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle active */}
                        <button
                          type="button"
                          onClick={() => handleToggleCardEnabled(card.id)}
                          className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                            card.enabled
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                          title={card.enabled ? 'Aktif (Tampil)' : 'Nonaktif (Disembunyikan)'}
                        >
                          {card.enabled ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Aktif</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Off</span>
                            </>
                          )}
                        </button>

                        {/* Edit card */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditCard(card)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        >
                          Edit
                        </button>

                        {/* Delete card */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title="Hapus Kartu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. LIVE DASHBOARD PREVIEW */}
          <div className="p-4 rounded-3xl bg-slate-100/70 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Pratinjau Tampilan Dashboard ({currentRoleMeta.label})
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {currentRoleConfig.cards.filter((c) => c.enabled).length} kartu aktif
              </span>
            </div>

            <div className="p-3.5 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4 fill-white stroke-none" />
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {currentRoleConfig.sectionTitle || `Kartu Cepat ${currentRoleMeta.label}`} (Quick Action Cards)
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500">
                  Menampilkan {currentRoleConfig.cards.filter((c) => c.enabled).length} kartu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {currentRoleConfig.cards
                  .filter((c) => c.enabled)
                  .map((c) => {
                    const colorMeta = getQuickActionColorClasses(c.colorScheme || 'blue');
                    return (
                      <div
                        key={c.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between gap-3 select-none"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${colorMeta.iconGradient}`}>
                              {renderQuickActionIcon(c.iconName, 'w-4 h-4')}
                            </div>
                            <div className="flex items-center gap-1">
                              {c.isUtama && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-black text-[9px] uppercase">
                                  UTAMA
                                </span>
                              )}
                              <div className="w-6 h-6 rounded-full bg-slate-100/70 dark:bg-slate-800/50 text-slate-400 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-center shadow-2xs">
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-2.5">
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {c.title}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                              {c.subtitle}
                            </div>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold truncate max-w-[130px] ${colorMeta.pillTag}`}>
                            {c.badgeText || c.title}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllRoles}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Semua Peran ke Default</span>
            </button>
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Ada perubahan belum disimpan
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: Add / Edit Card */}
      {editingCard && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>{isAddingNew ? 'Tambah Kartu Cepat Baru' : 'Edit Kartu Cepat'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Quick Pick From Menu */}
              <div className="space-y-2 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pilih Cepat dari Menu Sistem (Otomatis Isi Judul, Icon & Warna):
                  </label>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    {filteredMenuItems.length} Menu Tersedia
                  </span>
                </div>

                {/* Bagian Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedBagianFilter('semua')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer ${
                      selectedBagianFilter === 'semua'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Semua Bagian ({ALL_MENU_ITEMS.length})
                  </button>
                  {MENU_CATEGORIES.map((cat) => {
                    const isSelected = selectedBagianFilter === cat.key;
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setSelectedBagianFilter(cat.key)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{cat.title.split('&')[0].trim()}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-md ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {cat.items.length}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari menu atau bagian (cth: Mapel, Siswa, Absen, Presensi, Backup)..."
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {menuSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grid of ALL menu items without slicing */}
                <div className="max-h-52 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                  {filteredMenuItems.length === 0 ? (
                    <div className="col-span-full py-6 text-center text-slate-400 text-xs">
                      Tidak ada menu yang sesuai dengan filter atau kata kunci.
                    </div>
                  ) : (
                    filteredMenuItems.map((m) => {
                      const catInfo = MENU_CATEGORIES.find((c) => c.key === m.category);
                      const isSelected = editingCard.view === m.id;

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleSelectMenuItem(m)}
                          className={`text-left p-2.5 rounded-xl text-xs transition border cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}>
                            {renderQuickActionIcon(m.iconName, 'w-3.5 h-3.5')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate font-bold text-xs text-slate-900 dark:text-white">
                                {m.label}
                              </span>
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                                {catInfo?.title.split('&')[0].trim() || m.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-normal">
                              {m.shortDesc}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Judul Kartu:
                  </label>
                  <input
                    type="text"
                    required
                    value={editingCard.title}
                    onChange={(e) => setEditingCard({ ...editingCard, title: e.target.value })}
                    placeholder="Contoh: Input Presensi Kelas"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Subjudul / Deskripsi:
                  </label>
                  <input
                    type="text"
                    value={editingCard.subtitle}
                    onChange={(e) => setEditingCard({ ...editingCard, subtitle: e.target.value })}
                    placeholder="Contoh: Pencatatan absensi harian"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* isUtama & badgeText */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                    Teks Pill Badge (Bawah Kartu):
                  </label>
                  <input
                    type="text"
                    value={editingCard.badgeText || ''}
                    onChange={(e) => setEditingCard({ ...editingCard, badgeText: e.target.value })}
                    placeholder="Contoh: 4 Sesi Mengajar Hari Ini"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!editingCard.isUtama}
                      onChange={(e) => setEditingCard({ ...editingCard, isUtama: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Tandai Kartu "UTAMA" (Tampil Badge Emas)
                    </span>
                  </label>
                </div>
              </div>

              {/* Target View & Special Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Halaman (Menu ID):
                  </label>
                  <select
                    value={editingCard.view}
                    onChange={(e) => setEditingCard({ ...editingCard, view: e.target.value as ViewType })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
                  >
                    {MENU_CATEGORIES.map((cat) => (
                      <optgroup key={cat.key} label={`Bagian: ${cat.title}`}>
                        {cat.items.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label} ({m.id})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Aksi Khusus (Opsional):
                  </label>
                  <select
                    value={editingCard.specialAction || ''}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        specialAction: (e.target.value as any) || undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Standar (Buka Navigasi Halaman)</option>
                    <option value="open_class_submission">Buka Modal Rekap Pengisian Kelas</option>
                    <option value="navigate_to_input">Langsung Buka Form Input Presensi</option>
                    <option value="open_backup_modal">Buka Modal Backup & Restore</option>
                  </select>
                </div>
              </div>

              {/* Icon & Color Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Pilih Ikon Kartu:
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-32 overflow-y-auto no-scrollbar p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40">
                  {AVAILABLE_QUICK_ACTION_ICONS.map((ic) => {
                    const isSelected = editingCard.iconName === ic.name;
                    return (
                      <button
                        key={ic.name}
                        type="button"
                        onClick={() => setEditingCard({ ...editingCard, iconName: ic.name })}
                        className={`p-2 rounded-xl flex flex-col items-center justify-center transition border cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400'
                        }`}
                        title={ic.label}
                      >
                        {renderQuickActionIcon(ic.name, 'w-4 h-4')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tema Warna Badge Ikon:
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = (editingCard.colorScheme || 'blue') === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setEditingCard({ ...editingCard, colorScheme: c.key })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 dark:border-white ring-2 ring-blue-500/40 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${c.bgClass}`} />
                        <span>{c.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal form footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isAddingNew ? 'Tambahkan ke Kartu' : 'Simpan Perubahan Kartu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Pilih & Masukan dari Semua Bagian */}
      {showBulkBagianModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Masukan Menu dari Semua Bagian Sistem ke Kartu Cepat</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Pilih menu dari seluruh 8 bagian aplikasi untuk langsung ditambahkan ke Kartu Cepat peran <strong className="text-slate-800 dark:text-slate-200">"{currentRoleMeta.label}"</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkBagianModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick controls bar */}
            <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllBulkMenus}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Pilih Semua Bagian (38 Menu)</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllBulkMenus}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <span>Batal Pilih Semua</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  {bulkSelectedMenuIds.size} menu dipilih
                </span>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari bagian atau menu..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
                  />
                  {bulkSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBulkSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of all 8 Bagian */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {MENU_CATEGORIES.map((cat) => {
                const filteredItems = cat.items.filter((item) => {
                  if (!bulkSearchQuery) return true;
                  const q = bulkSearchQuery.toLowerCase();
                  return (
                    item.label.toLowerCase().includes(q) ||
                    item.shortDesc.toLowerCase().includes(q) ||
                    cat.title.toLowerCase().includes(q) ||
                    item.id.toLowerCase().includes(q)
                  );
                });

                if (filteredItems.length === 0) return null;

                const allInCatSelected = filteredItems.every((item) => bulkSelectedMenuIds.has(item.id));
                const someInCatSelected = filteredItems.some((item) => bulkSelectedMenuIds.has(item.id));

                return (
                  <div
                    key={cat.key}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-850/40"
                  >
                    {/* Bagian Header */}
                    <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-white dark:bg-slate-900">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                          {renderQuickActionIcon(cat.iconName, 'w-4 h-4')}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              Bagian: {cat.title}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 shrink-0">
                              {cat.items.length} Menu
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate">
                            {cat.description}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleBulkCategory(cat.key)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition border cursor-pointer shrink-0 ${
                          allInCatSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : someInCatSelected
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                            : 'bg-white text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {allInCatSelected ? 'Batalkan Bagian Ini' : 'Pilih Semua di Bagian Ini'}
                      </button>
                    </div>

                    {/* Menu items in this Bagian */}
                    <div className="p-2 sm:p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredItems.map((m) => {
                        const isSelected = bulkSelectedMenuIds.has(m.id);
                        const isAlreadyCard = currentRoleConfig.cards.some((c) => c.view === m.id);

                        return (
                          <div
                            key={m.id}
                            onClick={() => handleToggleBulkMenu(m.id)}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 select-none ${
                              isSelected
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 shadow-2xs'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                            />
                            <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                              {renderQuickActionIcon(m.iconName, 'w-3.5 h-3.5')}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                  {m.label}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {m.shortDesc}
                              </p>
                              {isAlreadyCard && (
                                <span className="inline-block mt-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-md">
                                  ✓ Sudah ada di kartu saat ini
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total {bulkSelectedMenuIds.size} menu dari semua bagian akan dimasukkan ke kartu cepat peran {currentRoleMeta.label}.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkBagianModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkAddBagian}
                  disabled={bulkSelectedMenuIds.size === 0}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                    bulkSelectedMenuIds.size === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 cursor-pointer'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Masukan {bulkSelectedMenuIds.size} Menu ke Kartu Cepat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: Copy from another role */}
      {showCopyFromModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Copy className="w-4 h-4 text-indigo-600" />
                <span>Salin Kartu Cepat dari Peran Lain</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCopyFromModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pilih peran sumber untuk disalin ke peran{' '}
              <strong className="text-slate-800 dark:text-slate-200">"{currentRoleMeta.label}"</strong>. Seluruh susunan kartu akan ditimpa dengan milik peran sumber.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Pilih Peran Sumber:
              </label>
              <select
                value={sourceCopyRoleKey}
                onChange={(e) => setSourceCopyRoleKey(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {availableRoles
                  .filter((r) => r.key !== selectedRoleKey)
                  .map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.label} ({r.key})
                    </option>
                  ))}
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCopyFromModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyCopyFromRole}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/25 transition cursor-pointer"
              >
                Terapkan Salin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
