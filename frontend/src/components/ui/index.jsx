import React from 'react';
import { clsx, initials, capacityColor } from '@/utils';

/**
 * ─── Button ────────────────────────────────────────────────────────────────
 * variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
 * size:    'sm' | 'md' | 'lg'
 */
export const Button = ({
  children, variant = 'primary', size = 'md',
  className = '', disabled, loading, onClick, type = 'button', ...rest
}) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-primary text-white hover:bg-primary-hover active:scale-[0.99]',
    secondary: 'bg-brand-50 text-primary hover:bg-brand-100',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    ghost:     'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
    outline:   'border border-gray-200 text-gray-700 hover:bg-gray-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  );
};

/**
 * ─── Badge ─────────────────────────────────────────────────────────────────
 * color: any badge-* class or explicit class string
 */
export const Badge = ({ children, color = 'badge-gray', dot, className = '' }) => (
  <span className={clsx(
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
    color, className
  )}>
    {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />}
    {children}
  </span>
);

/**
 * ─── Card ──────────────────────────────────────────────────────────────────
 */
export const Card = ({ children, className = '', padding = true }) => (
  <div className={clsx('card', padding && 'p-6', className)}>
    {children}
  </div>
);

/**
 * ─── StatCard ──────────────────────────────────────────────────────────────
 * Used for dashboard metric cards
 */
export const StatCard = ({ label, value, sub, trend, icon: Icon, dark, className = '' }) => (
  <div className={clsx(
    'rounded-2xl p-6 flex flex-col gap-2 shadow-card',
    dark ? 'bg-primary text-white' : 'bg-white border border-gray-100',
    className
  )}>
    <div className="flex items-start justify-between">
      <p className={clsx('text-sm font-medium', dark ? 'text-green-200' : 'text-gray-500')}>{label}</p>
      {Icon && (
        <span className={clsx('p-2 rounded-xl', dark ? 'bg-white/10' : 'bg-brand-50')}>
          <Icon size={18} className={dark ? 'text-green-200' : 'text-primary'} />
        </span>
      )}
    </div>
    <p className={clsx('text-2xl font-bold leading-tight', dark ? 'text-white' : 'text-gray-900')}>
      {value}
    </p>
    {(sub || trend) && (
      <div className="flex items-center gap-2 mt-1">
        {sub  && <span className={clsx('text-xs', dark ? 'text-green-300' : 'text-gray-500')}>{sub}</span>}
        {trend && <span className={clsx('text-xs font-semibold', trend.startsWith('+') ? 'text-green-400' : 'text-red-400')}>{trend}</span>}
      </div>
    )}
  </div>
);

/**
 * ─── Avatar ────────────────────────────────────────────────────────────────
 */
export const Avatar = ({ name = '', size = 'md', className = '' }) => {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  const colors = ['bg-brand-600','bg-blue-600','bg-purple-600','bg-orange-600','bg-pink-600'];
  const color = colors[name.charCodeAt(0) % colors.length] || colors[0];
  return (
    <span className={clsx(
      'inline-flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0',
      sizes[size], color, className
    )}>
      {initials(name)}
    </span>
  );
};

/**
 * ─── Spinner ───────────────────────────────────────────────────────────────
 */
export const Spinner = ({ size = 20, className = '' }) => (
  <svg
    className={clsx('animate-spin text-primary', className)}
    width={size} height={size} fill="none" viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
);

/**
 * ─── EmptyState ────────────────────────────────────────────────────────────
 */
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
    {Icon && <Icon size={48} className="text-gray-300" strokeWidth={1} />}
    <p className="text-base font-semibold text-gray-700">{title}</p>
    {description && <p className="text-sm text-gray-500 max-w-xs">{description}</p>}
    {action}
  </div>
);

/**
 * ─── LoadingState ──────────────────────────────────────────────────────────
 */
export const LoadingState = ({ text = 'Memuat data…' }) => (
  <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
    <Spinner size={20} />
    <span className="text-sm">{text}</span>
  </div>
);

/**
 * ─── Input ─────────────────────────────────────────────────────────────────
 */
export const Input = React.forwardRef(({
  label, error, helper, prefix, suffix, className = '', ...props
}, ref) => (
  <div className={clsx('flex flex-col gap-1', className)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <div className="relative flex items-center">
      {prefix && <span className="absolute left-3 text-gray-400 text-sm">{prefix}</span>}
      <input
        ref={ref}
        className={clsx(
          'w-full rounded-xl border px-3 py-2 text-sm outline-none transition',
          'focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300',
          prefix && 'pl-9',
          suffix && 'pr-9',
        )}
        {...props}
      />
      {suffix && <span className="absolute right-3 text-gray-400 text-sm">{suffix}</span>}
    </div>
    {error  && <p className="text-xs text-red-600">{error}</p>}
    {helper && !error && <p className="text-xs text-gray-500">{helper}</p>}
  </div>
));
Input.displayName = 'Input';

/**
 * ─── Select ────────────────────────────────────────────────────────────────
 */
export const Select = React.forwardRef(({ label, error, options = [], className = '', ...props }, ref) => (
  <div className={clsx('flex flex-col gap-1', className)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      ref={ref}
      className={clsx(
        'w-full rounded-xl border px-3 py-2 text-sm bg-white outline-none transition',
        'focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300',
      )}
      {...props}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Select.displayName = 'Select';

/**
 * ─── Textarea ──────────────────────────────────────────────────────────────
 */
export const Textarea = React.forwardRef(({ label, error, className = '', rows = 3, ...props }, ref) => (
  <div className={clsx('flex flex-col gap-1', className)}>
    {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      ref={ref}
      rows={rows}
      className={clsx(
        'w-full rounded-xl border px-3 py-2 text-sm bg-white outline-none transition resize-none',
        'focus:ring-2 focus:ring-brand-500 focus:border-transparent',
        error ? 'border-red-400' : 'border-gray-200 hover:border-gray-300',
      )}
      {...props}
    />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Textarea.displayName = 'Textarea';

/**
 * ─── Modal ─────────────────────────────────────────────────────────────────
 */
export const Modal = ({ open, onClose, title, children, size = 'md', footer }) => {
  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={clsx(
        'relative bg-white rounded-2xl shadow-2xl w-full animate-fade-in flex flex-col max-h-[90vh]',
        sizes[size]
      )}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * ─── Pagination ────────────────────────────────────────────────────────────
 */
export const Pagination = ({ current, total, perPage, onChange }) => {
  const pages    = Math.ceil(total / perPage);
  const from     = (current - 1) * perPage + 1;
  const to       = Math.min(current * perPage, total);

  if (pages <= 1) return null;

  const getPages = () => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
    if (current <= 4) return [1,2,3,4,5,'…',pages];
    if (current >= pages - 3) return [1,'…',pages-4,pages-3,pages-2,pages-1,pages];
    return [1,'…',current-1,current,current+1,'…',pages];
  };

  return (
    <div className="flex items-center justify-between px-2 py-3 text-sm">
      <span className="text-gray-500">Menampilkan {from}–{to} dari {total} data</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(current - 1)}
          disabled={current === 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={clsx(
                'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                p === current ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-700'
              )}
            >{p}</button>
          )
        )}
        <button
          onClick={() => onChange(current + 1)}
          disabled={current === pages}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

/**
 * ─── Tabs ──────────────────────────────────────────────────────────────────
 */
export const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={clsx('flex items-center gap-1 bg-gray-100 rounded-xl p-1', className)}>
    {tabs.map(t => (
      <button
        key={t.value}
        onClick={() => onChange(t.value)}
        className={clsx(
          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
          active === t.value
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        )}
      >
        {t.label}
        {t.count !== undefined && (
          <span className={clsx(
            'ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-semibold',
            active === t.value ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
          )}>{t.count}</span>
        )}
      </button>
    ))}
  </div>
);

/**
 * ─── ProgressBar ───────────────────────────────────────────────────────────
 */
export const ProgressBar = ({ value, max = 100, colorClass, className = '' }) => {
  const pct = Math.min((value / max) * 100, 100);
  const color = colorClass || capacityColor(pct);
  return (
    <div className={clsx('h-1.5 bg-gray-100 rounded-full overflow-hidden', className)}>
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  );
};

/**
 * ─── Divider ───────────────────────────────────────────────────────────────
 */
export const Divider = ({ className = '' }) => (
  <hr className={clsx('border-gray-100', className)} />
);
