import React from 'react';
import { LucideIcon, AlertCircle, RefreshCw, Check, AlertTriangle, Info, X } from 'lucide-react';

/* ==========================================================================
   1. PAGE HEADER COMPONENT
   ========================================================================== */
export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
}) => {
  return (
    <div
      className="rounded-2xl md:rounded-3xl p-5 md:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors"
      style={{ background: 'var(--page-header-bg)' }}
    >
      <div className="flex items-start md:items-center gap-3.5">
        {Icon && (
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/10 dark:bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/20">
            <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--page-header-title)' }} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-lg md:text-xl font-bold tracking-tight"
              style={{ color: 'var(--page-header-title)' }}
            >
              {title}
            </h1>
            {badge && (
              <span
                className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border transition-colors"
                style={{
                  backgroundColor: 'var(--page-header-badge-bg)',
                  borderColor: 'var(--page-header-badge-border)',
                  color: 'var(--page-header-badge-text)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p
              className="text-xs mt-0.5 leading-relaxed"
              style={{ color: 'var(--page-header-subtitle)' }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {(actions || children) && (
        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-auto shrink-0">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
   2. BUTTON COMPONENT
   ========================================================================== */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  isLoading = false,
  fullWidth = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-hidden focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 cursor-pointer select-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 h-8',
    md: 'px-4 py-2 text-xs md:text-sm gap-2 h-10',
    lg: 'px-5 py-2.5 text-sm md:text-base gap-2.5 h-12',
  };

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs focus:ring-blue-500/50 dark:bg-blue-600 dark:hover:bg-blue-500',
    secondary:
      'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 focus:ring-slate-400/50',
    success:
      'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs focus:ring-emerald-500/50',
    warning:
      'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white shadow-xs focus:ring-amber-500/50',
    danger:
      'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs focus:ring-rose-500/50',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 focus:ring-slate-400/50',
    outline:
      'bg-transparent border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-slate-400/50',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />
      )}
      {children && <span>{children}</span>}
      {!isLoading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0" />
      )}
    </button>
  );
};

/* ==========================================================================
   3. INPUT & FORM GROUP COMPONENTS
   ========================================================================== */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon: Icon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-10 ${
              Icon ? 'pl-9' : 'pl-3.5'
            } pr-3.5 text-xs md:text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-800 ${
              error
                ? 'border-rose-500 dark:border-rose-500 ring-rose-500/20'
                : 'border-slate-200 dark:border-slate-800'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {helperText && !error && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ==========================================================================
   4. SELECT COMPONENT
   ========================================================================== */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, icon: Icon, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`w-full h-10 ${
              Icon ? 'pl-9' : 'pl-3.5'
            } pr-8 text-xs md:text-sm rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white transition focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 dark:focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-50 dark:disabled:bg-slate-800 ${
              error
                ? 'border-rose-500 dark:border-rose-500'
                : 'border-slate-200 dark:border-slate-800'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
        </div>
        {error && (
          <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {helperText && !error && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

/* ==========================================================================
   5. CARD & STAT CARD COMPONENTS
   ========================================================================== */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  hoverable = false,
  padding = 'md',
  children,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 md:p-6',
    lg: 'p-6 md:p-8',
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-200 ${
        hoverable ? 'hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700' : ''
      } ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface StatCardProps {
  title?: string;
  label?: string;
  value: string | number;
  subtitle?: string;
  description?: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  badge?: { label: string; type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' };
  accentColor?: string;
  trend?: { value: string | number; isPositive?: boolean; label?: string };
  loading?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  label,
  value,
  subtitle,
  description,
  icon: Icon,
  variant = 'primary',
  badge,
  accentColor,
  trend,
  loading = false,
  onClick,
}) => {
  const displayTitle = label || title || '';
  const displaySubtitle = description || subtitle || '';

  const variantColors: Record<string, string> = {
    primary: 'var(--theme-primary)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
    info: 'var(--color-info)',
    neutral: 'var(--color-text-secondary)',
  };

  const effectiveColor = accentColor || variantColors[variant] || variantColors.primary;

  const badgeColors = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    info: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  };

  return (
    <Card
      hoverable={!!onClick}
      padding="sm"
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{displayTitle}</p>
          {loading ? (
            <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md my-1" />
          ) : (
            <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {value}
            </p>
          )}
          {displaySubtitle && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">{displaySubtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  trend.isPositive !== false
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                {trend.isPositive !== false ? '+' : ''}
                {trend.value}
              </span>
              {trend.label && (
                <span className="text-[10px] text-slate-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: effectiveColor }}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          {badge && (
            <span
              className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                badgeColors[badge.type || 'neutral']
              }`}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ==========================================================================
   6. BADGE & ATTENDANCE BADGE COMPONENTS
   ========================================================================== */
export interface BadgeProps {
  type?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  type = 'neutral',
  size = 'md',
  icon: Icon,
  children,
}) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
    danger: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
    info: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-800/60',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60',
    neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200/60 dark:border-slate-700/60',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-bold rounded-md border ${styles[type]} ${sizeStyles[size]}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export interface AttendanceBadgeProps {
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa' | 'Terlambat' | 'Belum' | string;
  size?: 'sm' | 'md';
}

export const AttendanceBadge: React.FC<AttendanceBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  if (normalized.includes('hadir')) {
    return (
      <Badge type="success" size={size} icon={Check}>
        Hadir
      </Badge>
    );
  }
  if (normalized.includes('sakit')) {
    return (
      <Badge type="warning" size={size} icon={AlertTriangle}>
        Sakit
      </Badge>
    );
  }
  if (normalized.includes('izin')) {
    return (
      <Badge type="info" size={size} icon={Info}>
        Izin
      </Badge>
    );
  }
  if (normalized.includes('alpa') || normalized.includes('alpha')) {
    return (
      <Badge type="danger" size={size} icon={X}>
        Alpa
      </Badge>
    );
  }

  return (
    <Badge type="neutral" size={size}>
      {status}
    </Badge>
  );
};

/* ==========================================================================
   7. EMPTY STATE COMPONENT
   ========================================================================== */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = AlertCircle,
  title,
  description,
  action,
}) => {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
      <div className="max-w-md space-y-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h4>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};

/* ==========================================================================
   8. LOADING & SKELETON COMPONENTS
   ========================================================================== */
export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => (
  <div className={`bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg ${className}`} />
);

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Memuat data...',
}) => (
  <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
    <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{message}</p>
  </div>
);

/* ==========================================================================
   9. ERROR STATE COMPONENT
   ========================================================================== */
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal Memuat Data',
  message = 'Terjadi kesalahan sistem saat mengambil data. Silakan coba beberapa saat lagi.',
  onRetry,
}) => (
  <div className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200/80 dark:border-rose-900/50">
    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
      <AlertCircle className="w-5 h-5" />
    </div>
    <div className="max-w-md space-y-1">
      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-300">{title}</h4>
      <p className="text-xs text-rose-700/80 dark:text-rose-400/80">{message}</p>
    </div>
    {onRetry && (
      <Button variant="danger" size="sm" onClick={onRetry} icon={RefreshCw}>
        Coba Lagi
      </Button>
    )}
  </div>
);
