import React from 'react';
import { Sliders, Sparkles } from 'lucide-react';
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
  iconBgClass: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bgCardClass?: string;
  textColorClass?: string;
  subtextColorClass?: string;
}

const QuickActionBtn: React.FC<QuickActionBtnProps> = ({
  onClick,
  iconBgClass,
  icon,
  title,
  subtitle,
  bgCardClass = 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200/80 dark:border-slate-800',
  textColorClass = '',
  subtextColorClass = 'text-slate-500 dark:text-slate-400',
}) => (
  <motion.button
    type="button"
    variants={cardItemVariants}
    whileHover={{ y: -3, scale: 1.015, transition: { duration: 0.18, ease: 'easeOut' } }}
    whileTap={{ scale: 0.975 }}
    onClick={onClick}
    className={`flex items-center gap-3 p-3.5 rounded-2xl transition text-left cursor-pointer group border shadow-xs ${bgCardClass}`}
  >
    <div className={`p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition shadow-xs ${iconBgClass}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className={`font-extrabold text-xs truncate ${textColorClass}`}>{title}</div>
      <div className={`text-[10px] truncate ${subtextColorClass}`}>{subtitle}</div>
    </div>
  </motion.button>
);

interface RoleSectionHeaderProps {
  title: string;
  subtitle: string;
  dotColorClass: string;
  count?: number;
  onOpenSettings?: () => void;
}

const RoleSectionHeader: React.FC<RoleSectionHeaderProps> = ({
  title,
  subtitle,
  dotColorClass,
  count,
  onOpenSettings,
}) => (
  <div className="flex items-center justify-between flex-wrap gap-2 px-1 mb-2.5">
    <div>
      <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${dotColorClass} animate-pulse`} />
        <span>{title}</span>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
    </div>

    <div className="flex items-center gap-2">
      {count !== undefined && (
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
          {count} kartu aksi
        </span>
      )}

      {onOpenSettings && (
        <button
          type="button"
          onClick={onOpenSettings}
          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900/60 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Atur kartu cepat dashboard untuk peran ini"
        >
          <Sliders className="w-3 h-3" />
          <span>Atur Kartu Cepat</span>
        </button>
      )}
    </div>
  </div>
);

export const RoleQuickActions: React.FC<RoleQuickActionsProps> = ({
  role,
  appData,
  currentUser,
  onNavigateView,
  onNavigateToInput,
  onOpenBackupModal,
  onOpenQuickActionSettings,
}) => {
  // Resolve configuration dynamically for the specified role
  const config = React.useMemo(() => {
    return getRoleQuickActionConfig(appData, role);
  }, [appData, role]);

  // If the section is disabled by admin for this role, return null
  if (config.enabled === false) {
    return null;
  }

  const activeCards = (config.cards || []).filter((c) => c.enabled);
  if (activeCards.length === 0 && !onOpenQuickActionSettings) {
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
    if (count <= 3) return 'grid grid-cols-1 sm:grid-cols-3 gap-3';
    if (count === 4) return 'grid grid-cols-2 sm:grid-cols-4 gap-3';
    if (count === 5) return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3';
    if (count === 6) return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3';
    return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3';
  };

  return (
    <div className="space-y-2">
      <RoleSectionHeader
        title={config.sectionTitle || `Kartu Cepat ${config.roleLabel || role}`}
        subtitle={config.sectionSubtitle || 'Akses langsung 1-klik untuk fitur utama di dashboard'}
        dotColorClass={config.dotColorClass || 'bg-blue-600'}
        count={activeCards.length}
        onOpenSettings={
          onOpenQuickActionSettings
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
        {activeCards.map((card) => {
          const colorMeta = getQuickActionColorClasses(card.colorScheme || 'blue');
          return (
            <QuickActionBtn
              key={card.id}
              onClick={() => handleCardClick(card)}
              iconBgClass={colorMeta.iconBg}
              icon={renderQuickActionIcon(card.iconName, 'w-4 h-4')}
              title={card.title}
              subtitle={card.subtitle}
              bgCardClass={card.bgCardClass}
              textColorClass={card.textColorClass}
              subtextColorClass={card.subtextColorClass}
            />
          );
        })}
      </motion.div>
    </div>
  );
};
