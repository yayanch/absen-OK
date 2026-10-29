import React from 'react';
import { Sliders, Sparkles, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppData, UserRole, UserSession, ViewType, DashboardQuickActionItem } from '../../types';
import { cardContainerVariants, cardItemVariants } from '../common/UIComponents';
import {
  getQuickActionColorClasses,
  getRoleQuickActionConfig,
  renderQuickActionIcon,
} from '../../utils/dashboardQuickActionsEngine';

export interface RoleQuickActionsProps {
  role: UserRole;
  appData?: AppData;
  currentUser?: UserSession;
  onNavigateView: (view: ViewType) => void;
  onNavigateToInput?: (kelasId?: string) => void;
  onOpenImportModal?: () => void;
  onOpenWeeklyScheduleModal?: () => void;
  onScrollToClassSubmission?: () => void;
  onOpenBackupModal?: () => void;
  onOpenQuickActionSettings?: (roleKey?: string) => void;
}

interface QuickActionBtnProps {
  onClick: () => void;
  card: DashboardQuickActionItem;
}

const QuickActionBtn: React.FC<QuickActionBtnProps> = ({ onClick, card }) => {
  const colorMeta = getQuickActionColorClasses(card.colorScheme || 'blue');

  return (
    <motion.div
      variants={cardItemVariants}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.18, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:shadow-xl hover:border-blue-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between cursor-pointer group select-none"
    >
      {/* Top Row: Squircle Gradient Icon + UTAMA Badge + Circle Arrow */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${colorMeta.iconGradient}`}>
            {renderQuickActionIcon(card.iconName, 'w-6 h-6')}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {card.isUtama && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-black text-[10px] tracking-wider uppercase shadow-2xs border border-amber-200/60 dark:border-amber-800/60">
                UTAMA
              </span>
            )}
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-all duration-200 shadow-2xs group-hover:shadow-blue-500/30">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-4">
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {card.title}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mt-1">
            {card.subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

interface RoleSectionHeaderProps {
  title: string;
  subtitle: string;
  count?: number;
  onOpenSettings?: () => void;
}

const RoleSectionHeader: React.FC<RoleSectionHeaderProps> = ({
  title,
  subtitle,
  count,
  onOpenSettings,
}) => {
  const formattedTitle = React.useMemo(() => {
    if (title.includes('(Quick Action Cards)')) return title;
    return `${title} (Quick Action Cards)`;
  }, [title]);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-1 mb-3.5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
          <Sparkles className="w-5 h-5 fill-white stroke-none" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
            {formattedTitle}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {count !== undefined && (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Menampilkan {count} kartu aktif
          </span>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Atur kartu cepat dashboard untuk peran ini"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Atur Kartu Cepat</span>
          </button>
        )}
      </div>
    </div>
  );
};

export const RoleQuickActions: React.FC<RoleQuickActionsProps> = ({
  role,
  appData,
  currentUser,
  onNavigateView,
  onNavigateToInput,
  onOpenBackupModal,
  onOpenQuickActionSettings,
}) => {
  // Check if current user has admin privileges (only admin can customize quick action cards)
  const isAdmin = React.useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    if (r === 'admin' || r === 'superadmin') return true;
    if (Array.isArray(currentUser.roles) && currentUser.roles.some((roleItem) => ['admin', 'superadmin'].includes(roleItem.toLowerCase()))) {
      return true;
    }
    const userData = currentUser.data as any;
    if (userData?.role && ['admin', 'superadmin'].includes(String(userData.role).toLowerCase())) return true;
    if (Array.isArray(userData?.roles) && userData.roles.some((roleItem: string) => ['admin', 'superadmin'].includes(String(roleItem).toLowerCase()))) {
      return true;
    }
    return false;
  }, [currentUser]);

  // Resolve configuration dynamically for the specified role
  const config = React.useMemo(() => {
    return getRoleQuickActionConfig(appData, role);
  }, [appData, role]);

  // If the section is disabled by admin for this role, return null
  if (config.enabled === false) {
    return null;
  }

  const activeCards = (config.cards || []).filter((c) => c.enabled);
  if (activeCards.length === 0 && (!isAdmin || !onOpenQuickActionSettings)) {
    return null;
  }

  const handleCardClick = (card: DashboardQuickActionItem) => {
    if (card.specialAction === 'open_class_submission') {
      onNavigateView('rekap_pengisian_kelas');
      return;
    }
    if (card.specialAction === 'open_backup_modal') {
      if (onOpenBackupModal) {
        onOpenBackupModal();
      } else {
        onNavigateView('audit_logs');
      }
      return;
    }
    if (card.specialAction === 'navigate_to_input') {
      if (onNavigateToInput) {
        onNavigateToInput();
      } else {
        onNavigateView('presensi_input');
      }
      return;
    }
    onNavigateView(card.view);
  };

  // Determine grid columns dynamically based on card count
  const getGridColsClass = (count: number) => {
    if (count <= 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
    if (count === 4) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
    if (count === 5) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4';
    if (count === 6) return 'grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4';
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4';
  };

  return (
    <div className="space-y-2">
      <RoleSectionHeader
        title={config.sectionTitle || `Kartu Cepat ${config.roleLabel || role}`}
        subtitle={config.sectionSubtitle || 'Akses langsung 1-klik untuk fitur utama di dashboard'}
        count={activeCards.length}
        onOpenSettings={
          isAdmin && onOpenQuickActionSettings
            ? () => onOpenQuickActionSettings(role)
            : undefined
        }
      />

      <motion.div
        className={getGridColsClass(activeCards.length)}
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        {activeCards.map((card) => (
          <QuickActionBtn
            key={card.id}
            onClick={() => handleCardClick(card)}
            card={card}
          />
        ))}
      </motion.div>
    </div>
  );
};

