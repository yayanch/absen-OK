import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Layout,
  Edit3,
  MoveUp,
  MoveDown,
  ArrowRightLeft,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  Sparkles,
  Info,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { AppData, NavigationLayoutConfig, NavigationSectionConfig, NavigationMenuItemOverride, UserSession, ViewType } from '../../types';
import { PageHeader } from '../common/UIComponents';
import {
  AVAILABLE_NAV_ICONS,
  DEFAULT_NAVIGATION_SECTIONS,
  DEFAULT_MENU_LABELS,
  getNavigationLayout,
  getEffectiveMenuLabel,
  getEffectiveMenuIcon,
  isMenuVisibleInLayout,
  reorderSections,
  reorderMenuItems,
  moveMenuItemToSection,
  renderNavIcon,
  ICON_MAP
} from '../../utils/navigationLayoutEngine';
import { ALL_MENU_ITEMS, MenuItemInfo } from '../../utils/rolePermissionEngine';
import { addAuditLog } from '../../utils/helpers';

interface PengaturanMenuViewProps {
  appData: AppData;
  currentUser: UserSession;
  readOnly?: boolean;
  onUpdateAppData: (updater: (prev: AppData) => AppData) => void;
  onConfirmModal?: (title: string, message: string, type: 'danger' | 'warning' | 'info' | 'emerald', onConfirm: () => void) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', text: string) => void;
  onNavigateView?: (view: ViewType) => void;
}

export const PengaturanMenuView: React.FC<PengaturanMenuViewProps> = ({
  appData,
  currentUser,
  readOnly = false,
  onUpdateAppData,
  onConfirmModal,
  onShowToast,
  onNavigateView
}) => {
  // Local active layout state initialized from appData
  const [layout, setLayout] = useState<NavigationLayoutConfig>(() => getNavigationLayout(appData));
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'posisi' | 'teks' | 'preview'>('posisi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    getNavigationLayout(appData).sections.forEach((sec) => {
      init[sec.id] = true;
    });
    return init;
  });

  // Modal states
  const [editingSection, setEditingSection] = useState<NavigationSectionConfig | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<{
    id: ViewType;
    sectionId: string;
    customLabel: string;
    customIcon: string;
    visible: boolean;
  } | null>(null);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState<boolean>(false);
  const [newSectionTitle, setNewSectionTitle] = useState<string>('');
  const [newSectionIcon, setNewSectionIcon] = useState<string>('Folder');
  const [newSectionIsAccordion, setNewSectionIsAccordion] = useState<boolean>(true);

  // Icon picker popover helper state
  const [iconPickerTarget, setIconPickerTarget] = useState<'section' | 'item' | 'newSection' | null>(null);

  // Map of ViewType to default item info for quick lookup
  const menuItemMap = useMemo(() => {
    const map = new Map<ViewType, MenuItemInfo>();
    ALL_MENU_ITEMS.forEach((item) => map.set(item.id, item));
    return map;
  }, []);

  // Update layout helper
  const handleUpdateLayout = (newLayout: NavigationLayoutConfig) => {
    setLayout(newLayout);
    setHasChanges(true);
  };

  // Toggle expand/collapse section card
  const toggleExpand = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Move Section Up/Down
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = reorderSections(layout.sections, index, targetIndex);
    handleUpdateLayout({
      ...layout,
      sections: reordered
    });
  };

  // Move Menu item Up/Down inside its section
  const handleMoveMenuItem = (sectionId: string, menuIndex: number, direction: 'up' | 'down') => {
    if (readOnly) return;
    const sectionIndex = layout.sections.findIndex((s) => s.id === sectionId);
    if (sectionIndex === -1) return;

    const section = layout.sections[sectionIndex];
    const targetIndex = direction === 'up' ? menuIndex - 1 : menuIndex + 1;
    const updatedSection = reorderMenuItems(section, menuIndex, targetIndex);

    const updatedSections = [...layout.sections];
    updatedSections[sectionIndex] = updatedSection;

    handleUpdateLayout({
      ...layout,
      sections: updatedSections
    });
  };

  // Move Menu item to another section
  const handleMoveMenuItemToSection = (menuId: ViewType, currentSectionId: string, newSectionId: string) => {
    if (readOnly || currentSectionId === newSectionId) return;
    const updatedSections = moveMenuItemToSection(layout.sections, menuId, currentSectionId, newSectionId);
    handleUpdateLayout({
      ...layout,
      sections: updatedSections
    });
    if (onShowToast) {
      const targetSec = layout.sections.find((s) => s.id === newSectionId);
      const label = getEffectiveMenuLabel(menuId, layout);
      onShowToast('info', `Menu "${label}" dipindahkan ke bagian "${targetSec?.title || newSectionId}".`);
    }
  };

  // Toggle Section Visibility
  const handleToggleSectionVisibility = (sectionId: string) => {
    if (readOnly) return;
    const updatedSections = layout.sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          visible: s.visible === false ? true : false
        };
      }
      return s;
    });
    handleUpdateLayout({
      ...layout,
      sections: updatedSections
    });
  };

  // Toggle Menu Item Visibility
  const handleToggleMenuVisibility = (viewId: ViewType) => {
    if (readOnly) return;
    const currentVis = isMenuVisibleInLayout(viewId, layout);
    const existingOverride = layout.itemOverrides?.[viewId] || { id: viewId };

    handleUpdateLayout({
      ...layout,
      itemOverrides: {
        ...layout.itemOverrides,
        [viewId]: {
          ...existingOverride,
          visible: !currentVis
        }
      }
    });
  };

  // Open Edit Section modal
  const handleStartEditSection = (section: NavigationSectionConfig) => {
    if (readOnly) return;
    setEditingSection({ ...section });
  };

  // Save Section Edit
  const handleSaveSectionEdit = () => {
    if (!editingSection) return;
    const trimmedTitle = editingSection.title.trim();
    if (!trimmedTitle) {
      if (onShowToast) onShowToast('warning', 'Judul bagian tidak boleh kosong.');
      return;
    }

    const updatedSections = layout.sections.map((s) => (s.id === editingSection.id ? editingSection : s));
    handleUpdateLayout({
      ...layout,
      sections: updatedSections
    });
    setEditingSection(null);
    if (onShowToast) onShowToast('success', `Bagian "${trimmedTitle}" berhasil diperbarui.`);
  };

  // Open Edit Menu item modal
  const handleStartEditMenuItem = (viewId: ViewType, sectionId: string) => {
    if (readOnly) return;
    const currentLabel = getEffectiveMenuLabel(viewId, layout);
    const currentIcon = getEffectiveMenuIcon(viewId, layout);
    const currentVis = isMenuVisibleInLayout(viewId, layout);

    setEditingMenuItem({
      id: viewId,
      sectionId,
      customLabel: currentLabel,
      customIcon: currentIcon,
      visible: currentVis
    });
  };

  // Save Menu Item Edit
  const handleSaveMenuItemEdit = () => {
    if (!editingMenuItem) return;
    const trimmedLabel = editingMenuItem.customLabel.trim();
    const defaultLabel = DEFAULT_MENU_LABELS[editingMenuItem.id] || editingMenuItem.id;
    const defaultItem = menuItemMap.get(editingMenuItem.id);
    const defaultIcon = defaultItem?.iconName || 'Sliders';

    // Check if custom label differs from default
    const isCustomText = trimmedLabel !== '' && trimmedLabel !== defaultLabel;
    const isCustomIcon = editingMenuItem.customIcon !== '' && editingMenuItem.customIcon !== defaultIcon;

    const existingOverride = layout.itemOverrides?.[editingMenuItem.id] || { id: editingMenuItem.id };
    const updatedOverride: NavigationMenuItemOverride = {
      ...existingOverride,
      customLabel: isCustomText ? trimmedLabel : undefined,
      customIcon: isCustomIcon ? editingMenuItem.customIcon : undefined,
      visible: editingMenuItem.visible
    };

    handleUpdateLayout({
      ...layout,
      itemOverrides: {
        ...layout.itemOverrides,
        [editingMenuItem.id]: updatedOverride
      }
    });

    setEditingMenuItem(null);
    if (onShowToast) onShowToast('success', `Item menu "${trimmedLabel || defaultLabel}" berhasil diperbarui.`);
  };

  // Reset single menu item to factory default label & icon
  const handleResetSingleMenuItem = (viewId: ViewType) => {
    if (readOnly) return;
    const existing = layout.itemOverrides?.[viewId];
    if (!existing) return;

    const newOverrides = { ...layout.itemOverrides };
    delete newOverrides[viewId];

    handleUpdateLayout({
      ...layout,
      itemOverrides: newOverrides
    });
    if (onShowToast) onShowToast('info', 'Teks dan ikon menu dikembalikan ke bawaan.');
  };

  // Add new Custom Section
  const handleAddCustomSection = () => {
    if (readOnly) return;
    const trimmed = newSectionTitle.trim();
    if (!trimmed) {
      if (onShowToast) onShowToast('warning', 'Nama bagian baru wajib diisi.');
      return;
    }

    const newId = `custom_${Date.now()}_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 32);
    const newSection: NavigationSectionConfig = {
      id: newId,
      title: trimmed.toUpperCase(),
      iconName: newSectionIcon,
      order: layout.sections.length + 1,
      visible: true,
      isAccordion: newSectionIsAccordion,
      isCustom: true,
      description: 'Bagian navigasi kustom baru',
      menuIds: []
    };

    handleUpdateLayout({
      ...layout,
      sections: [...layout.sections, newSection]
    });

    setIsAddSectionOpen(false);
    setNewSectionTitle('');
    setNewSectionIcon('Folder');
    setExpandedSections((prev) => ({ ...prev, [newId]: true }));
    if (onShowToast) onShowToast('success', `Bagian baru "${trimmed}" berhasil dibuat.`);
  };

  // Delete Custom Section
  const handleDeleteCustomSection = (section: NavigationSectionConfig) => {
    if (readOnly) return;
    const doDelete = () => {
      // Reassign any menu in this section to 'pengaturan' or first section
      const targetSec = layout.sections.find((s) => s.id === 'pengaturan') || layout.sections[0];
      const updatedSections = layout.sections
        .filter((s) => s.id !== section.id)
        .map((s) => {
          if (s.id === targetSec?.id && section.menuIds.length > 0) {
            return {
              ...s,
              menuIds: [...s.menuIds, ...section.menuIds.filter((m) => !s.menuIds.includes(m))]
            };
          }
          return s;
        })
        .map((s, idx) => ({ ...s, order: idx + 1 }));

      handleUpdateLayout({
        ...layout,
        sections: updatedSections
      });
      if (onShowToast) onShowToast('info', `Bagian "${section.title}" telah dihapus.`);
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Hapus Bagian Kustom',
        `Apakah Anda yakin ingin menghapus bagian "${section.title}"? Menu di dalamnya akan otomatis dipindahkan ke bagian lain agar tidak hilang.`,
        'danger',
        doDelete
      );
    } else {
      doDelete();
    }
  };

  // Reset ALL layout to factory defaults
  const handleResetToDefault = () => {
    if (readOnly) return;
    const doReset = () => {
      const defaultLayout: NavigationLayoutConfig = {
        sections: JSON.parse(JSON.stringify(DEFAULT_NAVIGATION_SECTIONS)),
        itemOverrides: {},
        version: 1,
        updatedAt: new Date().toISOString()
      };
      setLayout(defaultLayout);
      setHasChanges(true);

      // Auto save or notify
      onUpdateAppData((prev) => {
        const next: AppData = {
          ...prev,
          navigationLayout: defaultLayout
        };
        return addAuditLog(
          next,
          'RESET_NAVIGATION_LAYOUT',
          'Mengembalikan seluruh teks bagian, judul menu, dan urutan navigasi ke bawaan sistem'
        );
      });

      setHasChanges(false);
      if (onShowToast) onShowToast('success', 'Tata letak dan teks navigasi berhasil dikembalikan ke standar awal.');
    };

    if (onConfirmModal) {
      onConfirmModal(
        'Kembalikan ke Susunan Standar?',
        'Tindakan ini akan mengembalikan seluruh judul bagian, teks menu, ikon, dan urutan posisi kembali ke tata letak bawaan SMKN 6 Garut. Lanjutkan?',
        'warning',
        doReset
      );
    } else {
      doReset();
    }
  };

  // Save changes to AppData
  const handleSaveAllChanges = () => {
    if (readOnly) return;
    const finalizedLayout: NavigationLayoutConfig = {
      ...layout,
      updatedAt: new Date().toISOString(),
      version: (layout.version || 1) + 1
    };

    onUpdateAppData((prev) => {
      const next: AppData = {
        ...prev,
        navigationLayout: finalizedLayout
      };
      return addAuditLog(
        next,
        'UPDATE_NAVIGATION_LAYOUT',
        `Memperbarui susunan tata letak menu dan teks bagian (${layout.sections.length} bagian)`
      );
    });

    setHasChanges(false);
    if (onShowToast) onShowToast('success', 'Perubahan teks bagian, menu, dan posisi tata letak berhasil disimpan!');
  };

  // Filtered sections and menus by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return layout.sections;
    const q = searchQuery.toLowerCase().trim();

    return layout.sections
      .map((sec) => {
        const matchesSectionTitle = sec.title.toLowerCase().includes(q);
        const filteredMenuIds = sec.menuIds.filter((viewId) => {
          const effectiveLabel = getEffectiveMenuLabel(viewId, layout).toLowerCase();
          const defaultItem = menuItemMap.get(viewId);
          const defaultLabel = (defaultItem?.label || '').toLowerCase();
          const desc = (defaultItem?.shortDesc || '').toLowerCase();
          return effectiveLabel.includes(q) || defaultLabel.includes(q) || desc.includes(q) || viewId.includes(q);
        });

        if (matchesSectionTitle || filteredMenuIds.length > 0) {
          return {
            ...sec,
            menuIds: matchesSectionTitle ? sec.menuIds : filteredMenuIds
          };
        }
        return null;
      })
      .filter(Boolean) as NavigationSectionConfig[];
  }, [layout, searchQuery, menuItemMap]);

  // Count total customized items
  const customItemsCount = useMemo(() => {
    const overrides = layout.itemOverrides || {};
    return Object.values(overrides).filter((o) => o.customLabel || o.customIcon || o.visible === false).length;
  }, [layout]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      {/* 1. PAGE HEADER */}
      <PageHeader
        icon={Sliders}
        title="Pengaturan Menu & Tata Letak"
        description="Sesuaikan teks judul bagian, ubah nama menu, ganti ikon, serta atur posisi dan penempatan menu di sidebar."
        badge={hasChanges ? 'Ada Perubahan Belum Disimpan' : 'Tersinkronisasi'}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetToDefault}
              disabled={readOnly}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ke Default
            </button>

            <button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={readOnly || !hasChanges}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60'
              }`}
            >
              <Save className="w-4 h-4" />
              {hasChanges ? 'Simpan Perubahan' : 'Tersimpan'}
            </button>
          </div>
        }
      />

      {/* 2. SUMMARY STATS BANNER */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Bagian (Seksi)
          </div>
          <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mt-1">
            {layout.sections.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {layout.sections.filter((s) => s.visible !== false).length} Aktif di Sidebar
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Menu Terdaftar
          </div>
          <div className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {ALL_MENU_ITEMS.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Seluruh modul sistem</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Kustomisasi Teks & Ikon
          </div>
          <div className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {customItemsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Item menu diubah</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Hak Akses Role
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => onNavigateView && onNavigateView('pengaturan_role')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Kelola Role & Hak Akses &rarr;
            </button>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Sinkron dengan permission</div>
        </div>
      </div>

      {/* 3. TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('posisi')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'posisi'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Tata Letak & Posisi
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('teks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'teks'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Kustomisasi Teks & Ikon
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Pratinjau Sidebar
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari bagian atau menu..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAddSectionOpen(true)}
            disabled={readOnly}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 transition whitespace-nowrap"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Tambah Bagian
          </button>
        </div>
      </div>

      {/* 4. MAIN CONTENT BASED ON TAB */}
      {activeTab === 'posisi' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
              <strong className="font-semibold">Petunjuk Pengaturan Posisi:</strong> Gunakan tombol panah{' '}
              <span className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-blue-200">
                ▲ Atas
              </span>{' '}
              dan{' '}
              <span className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-blue-200">
                ▼ Bawah
              </span>{' '}
              untuk memindahkan urutan bagian atau menu. Anda juga dapat memindahkan suatu menu ke bagian lain menggunakan menu pilihan seksi.
            </div>
          </div>

          {filteredSections.map((section, sIndex) => {
            const isFirst = sIndex === 0;
            const isLast = sIndex === filteredSections.length - 1;
            const isExpanded = expandedSections[section.id] !== false;
            const isVisible = section.visible !== false;

            return (
              <div
                key={section.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                  isVisible
                    ? 'border-slate-200 dark:border-slate-800 shadow-xs'
                    : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60 bg-slate-50/50 dark:bg-slate-900/50'
                }`}
              >
                {/* SECTION HEADER ROW */}
                <div className="p-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(section.id)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition"
                      title={isExpanded ? 'Ciutkan bagian' : 'Perluas bagian'}
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>

                    <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      {renderNavIcon(section.iconName, 'w-4 h-4')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
                          #{section.order}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                          {section.title}
                        </h3>
                        {section.isCustom && (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-300 rounded-full border border-purple-200 dark:border-purple-800">
                            Kustom
                          </span>
                        )}
                        {!isVisible && (
                          <span className="px-2 py-0.5 text-[9px] font-extrabold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full">
                            Disembunyikan
                          </span>
                        )}
                        {section.isAccordion && (
                          <span className="px-2 py-0.5 text-[9px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                            Accordion
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {section.menuIds.length} Menu di dalam bagian ini {section.description ? `• ${section.description}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* SECTION ACTION BUTTONS */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Move Up */}
                    <button
                      type="button"
                      disabled={isFirst || readOnly}
                      onClick={() => handleMoveSection(sIndex, 'up')}
                      title="Pindahkan bagian ke atas"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 transition"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down */}
                    <button
                      type="button"
                      disabled={isLast || readOnly}
                      onClick={() => handleMoveSection(sIndex, 'down')}
                      title="Pindahkan bagian ke bawah"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 transition"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleToggleSectionVisibility(section.id)}
                      title={isVisible ? 'Sembunyikan bagian dari sidebar' : 'Tampilkan bagian di sidebar'}
                      className={`p-1.5 rounded-lg border transition ${
                        isVisible
                          ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                          : 'border-amber-300 bg-amber-50 dark:bg-amber-950/50 text-amber-600'
                      }`}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Edit Section */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => handleStartEditSection(section)}
                      title="Edit judul & ikon bagian"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Custom Section */}
                    {section.isCustom && (
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() => handleDeleteCustomSection(section)}
                        title="Hapus bagian kustom ini"
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* SECTION MENU ITEMS LIST */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40 divide-y divide-slate-100 dark:divide-slate-800/80">
                    {section.menuIds.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        Belum ada menu di bagian ini. Pindahkan menu dari bagian lain ke bagian ini.
                      </div>
                    ) : (
                      section.menuIds.map((menuId, mIndex) => {
                        const effectiveLabel = getEffectiveMenuLabel(menuId, layout);
                        const effectiveIcon = getEffectiveMenuIcon(menuId, layout);
                        const isMenuVisible = isMenuVisibleInLayout(menuId, layout);
                        const defaultItem = menuItemMap.get(menuId);
                        const defaultLabel = defaultItem?.label || menuId;
                        const isRenamed = effectiveLabel !== defaultLabel;
                        const isMFirst = mIndex === 0;
                        const isMLast = mIndex === section.menuIds.length - 1;

                        return (
                          <div
                            key={menuId}
                            className={`py-2 px-3 flex items-center justify-between gap-3 rounded-xl transition ${
                              isMenuVisible
                                ? 'hover:bg-white dark:hover:bg-slate-800/70'
                                : 'opacity-50 bg-slate-100/50 dark:bg-slate-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-[10px] font-mono font-semibold text-slate-400 w-5 shrink-0">
                                {mIndex + 1}.
                              </span>

                              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                                {renderNavIcon(effectiveIcon, 'w-3.5 h-3.5')}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                    {effectiveLabel}
                                  </span>
                                  {isRenamed && (
                                    <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                                      (Asli: {defaultLabel})
                                    </span>
                                  )}
                                  {!isMenuVisible && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                                      Tersembunyi
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">
                                  ID: {menuId}
                                </div>
                              </div>
                            </div>

                            {/* ITEM ACTIONS: MOVE UP, MOVE DOWN, MOVE TO SECTION, EDIT */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Move to another section dropdown */}
                              <div className="relative inline-block">
                                <select
                                  disabled={readOnly}
                                  value={section.id}
                                  onChange={(e) => handleMoveMenuItemToSection(menuId, section.id, e.target.value)}
                                  className="text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                  title="Pindahkan menu ke bagian lain"
                                >
                                  <option value={section.id} disabled>
                                    Pindah ke seksi...
                                  </option>
                                  {layout.sections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      &rarr; {s.title}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={isMFirst || readOnly}
                                onClick={() => handleMoveMenuItem(section.id, mIndex, 'up')}
                                title="Pindahkan menu ke atas"
                                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition"
                              >
                                <MoveUp className="w-3 h-3" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={isMLast || readOnly}
                                onClick={() => handleMoveMenuItem(section.id, mIndex, 'down')}
                                title="Pindahkan menu ke bawah"
                                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 transition"
                              >
                                <MoveDown className="w-3 h-3" />
                              </button>

                              {/* Toggle visibility */}
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleToggleMenuVisibility(menuId)}
                                title={isMenuVisible ? 'Sembunyikan menu' : 'Tampilkan menu'}
                                className={`p-1 rounded-md border transition ${
                                  isMenuVisible
                                    ? 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    : 'border-amber-300 bg-amber-50 dark:bg-amber-950/50 text-amber-600'
                                }`}
                              >
                                {isMenuVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                              </button>

                              {/* Edit Text & Icon */}
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleStartEditMenuItem(menuId, section.id)}
                                title="Edit judul teks & ikon menu"
                                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. TAB: KUSTOMISASI TEKS & IKON */}
      {activeTab === 'teks' && (
        <div className="space-y-6">
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
              <strong className="font-semibold">Personalisasi Teks & Ikon:</strong> Anda dapat mengganti teks judul bagian dan nama item menu agar sesuai dengan tata bahasa atau kebutuhan operasional sekolah Anda (misal: "Buku Pelanggaran", "Presensi Pagi", dsb.). Perubahan teks akan otomatis tampil di sidebar!
            </div>
          </div>

          {/* TABLE OF SECTIONS TEXT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Teks Judul Bagian (Seksi Navigasi)
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah teks judul header bagian dan ikon yang ditampilkan pada navigasi utama
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {layout.sections.map((section) => (
                <div key={section.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      {renderNavIcon(section.iconName, 'w-4 h-4')}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {section.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        ID: {section.id} • {section.menuIds.length} Menu
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartEditSection(section)}
                    disabled={readOnly}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Ubah Teks & Ikon
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* TABLE OF MENU ITEMS TEXT */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Teks Label Item Menu
                </h3>
                <p className="text-xs text-slate-500">
                  Ubah nama teks yang tertera di tombol menu sidebar dan sesuaikan ikonnya
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {ALL_MENU_ITEMS.map((item) => {
                const effectiveLabel = getEffectiveMenuLabel(item.id, layout);
                const effectiveIcon = getEffectiveMenuIcon(item.id, layout);
                const isCustom = effectiveLabel !== item.label || effectiveIcon !== item.iconName;
                const assignedSection = layout.sections.find((s) => s.menuIds.includes(item.id));

                if (searchQuery.trim()) {
                  const q = searchQuery.toLowerCase().trim();
                  const match =
                    effectiveLabel.toLowerCase().includes(q) ||
                    item.label.toLowerCase().includes(q) ||
                    item.id.toLowerCase().includes(q);
                  if (!match) return null;
                }

                return (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        {renderNavIcon(effectiveIcon, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {effectiveLabel}
                          </span>
                          {isCustom && (
                            <span className="px-2 py-0.5 text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 rounded-full border border-amber-200 dark:border-amber-800">
                              Dikustomisasi
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Bawaan: <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span> • Seksi:{' '}
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {assignedSection ? assignedSection.title : 'Tidak Terpasang'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleResetSingleMenuItem(item.id)}
                          disabled={readOnly}
                          className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                          title="Kembalikan nama ke bawaan"
                        >
                          Reset Teks
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleStartEditMenuItem(item.id, assignedSection?.id || 'pengaturan')}
                        disabled={readOnly}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Ubah Teks
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB: LIVE SIDEBAR PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/60 rounded-2xl flex items-start gap-3">
            <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
            <div className="text-xs text-purple-950 dark:text-purple-200 leading-relaxed">
              <strong className="font-semibold">Simulasi Tampilan Sidebar:</strong> Pratinjau langsung navigasi berdasarkan urutan posisi dan penyesuaian teks yang sedang aktif. Anda dapat menguji bagaimana tampilan menu tersusun rapi.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Expanded Sidebar Simulation */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl max-h-[700px] overflow-y-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Sidebar Normal (Diperluas)</span>
                <span className="text-[10px] text-emerald-400 font-mono">LIVE PREVIEW</span>
              </div>

              <div className="space-y-4">
                {layout.sections
                  .filter((sec) => sec.visible !== false)
                  .map((sec) => (
                    <div key={sec.id} className="space-y-1">
                      <div className="text-[10px] font-bold tracking-wider text-slate-400 px-2 py-1 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {sec.title}
                      </div>

                      <div className="space-y-1 pl-1">
                        {sec.menuIds
                          .filter((m) => isMenuVisibleInLayout(m, layout))
                          .map((m) => {
                            const label = getEffectiveMenuLabel(m, layout);
                            const icon = getEffectiveMenuIcon(m, layout);
                            return (
                              <div
                                key={m}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition cursor-pointer"
                              >
                                {renderNavIcon(icon, 'w-4 h-4 text-slate-400')}
                                <span className="truncate">{label}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Collapsed Sidebar Simulation */}
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-2xl max-h-[700px] overflow-y-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>Sidebar Mini (Diciutkan)</span>
                <span className="text-[10px] text-cyan-400 font-mono">ICON MODE</span>
              </div>

              <div className="w-16 mx-auto space-y-3 py-2">
                {layout.sections
                  .filter((sec) => sec.visible !== false)
                  .map((sec) => (
                    <div key={sec.id} className="space-y-2">
                      <div className="border-t border-slate-800 mx-2" />
                      {sec.menuIds
                        .filter((m) => isMenuVisibleInLayout(m, layout))
                        .map((m) => {
                          const icon = getEffectiveMenuIcon(m, layout);
                          const label = getEffectiveMenuLabel(m, layout);
                          return (
                            <div
                              key={m}
                              title={label}
                              className="w-10 h-10 mx-auto rounded-xl bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                            >
                              {renderNavIcon(icon, 'w-4 h-4')}
                            </div>
                          );
                        })}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: EDIT SECTION TEXT & PROPERTIES */}
      {editingSection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ubah Teks & Properti Bagian
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {editingSection.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Judul Bagian (Teks Tampil di Sidebar) *
                </label>
                <input
                  type="text"
                  value={editingSection.title}
                  onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
                  placeholder="Misal: PRESENSI & KBM"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Keterangan Singkat
                </label>
                <input
                  type="text"
                  value={editingSection.description || ''}
                  onChange={(e) => setEditingSection({ ...editingSection, description: e.target.value })}
                  placeholder="Keterangan singkat fungsi bagian ini..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ikon Bagian
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                  {AVAILABLE_NAV_ICONS.map((ico) => {
                    const isSelected = editingSection.iconName === ico.name;
                    return (
                      <button
                        key={ico.name}
                        type="button"
                        onClick={() => setEditingSection({ ...editingSection, iconName: ico.name })}
                        title={ico.label}
                        className={`p-2 rounded-xl flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <ico.icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accordion toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Format Accordion (Dapat Dilipat)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bila aktif, seksi ini dapat dibuka-tutup dengan klik judul seksi.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(editingSection.isAccordion)}
                  onChange={(e) => setEditingSection({ ...editingSection, isAccordion: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSectionEdit}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: EDIT MENU ITEM TEXT & ICON */}
      {editingMenuItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ubah Teks Label & Ikon Menu
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">ID: {editingMenuItem.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMenuItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Menu (Teks di Sidebar) *
                </label>
                <input
                  type="text"
                  value={editingMenuItem.customLabel}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, customLabel: e.target.value })}
                  placeholder={DEFAULT_MENU_LABELS[editingMenuItem.id] || editingMenuItem.id}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Nama bawaan: <em>{DEFAULT_MENU_LABELS[editingMenuItem.id] || editingMenuItem.id}</em>
                </p>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ikon Menu
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                  {AVAILABLE_NAV_ICONS.map((ico) => {
                    const isSelected = editingMenuItem.customIcon === ico.name;
                    return (
                      <button
                        key={ico.name}
                        type="button"
                        onClick={() => setEditingMenuItem({ ...editingMenuItem, customIcon: ico.name })}
                        title={ico.label}
                        className={`p-2 rounded-xl flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <ico.icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Status Visibilitas Menu
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bila dinonaktifkan, menu ini tidak akan tampil di sidebar.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={editingMenuItem.visible}
                  onChange={(e) => setEditingMenuItem({ ...editingMenuItem, visible: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingMenuItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveMenuItemEdit}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition"
              >
                Simpan Teks Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: ADD CUSTOM SECTION */}
      {isAddSectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Tambah Bagian (Seksi) Baru
                  </h3>
                  <p className="text-xs text-slate-400">Buat kategori/seksi baru untuk mengelompokkan menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSectionOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Bagian Baru *
                </label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="Misal: AKADEMIK & KURIKULUM"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pilih Ikon Bagian
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                  {AVAILABLE_NAV_ICONS.map((ico) => {
                    const isSelected = newSectionIcon === ico.name;
                    return (
                      <button
                        key={ico.name}
                        type="button"
                        onClick={() => setNewSectionIcon(ico.name)}
                        title={ico.label}
                        className={`p-2 rounded-xl flex items-center justify-center transition ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600'
                        }`}
                      >
                        <ico.icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accordion toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Format Accordion (Dapat Dilipat)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Bila aktif, seksi ini dapat dibuka-tutup dengan klik judul seksi.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newSectionIsAccordion}
                  onChange={(e) => setNewSectionIsAccordion(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddSectionOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleAddCustomSection}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
              >
                Buat Bagian Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
