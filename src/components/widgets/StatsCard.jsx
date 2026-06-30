/**
 * components/widgets/StatsCard.jsx — KPI Statistics Card
 * ─────────────────────────────────────────────
 */

import clsx from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const StatsCard = ({
  title,
  value,
  subValue,
  growth,
  icon: Icon,
  iconBg = 'bg-primary-100',
  iconColor = 'text-primary-500',
  prefix = '',
  suffix = '',
  loading = false,
}) => {
  const isPositive = growth > 0;
  const isNeutral = growth === 0 || growth === null || growth === undefined;

  return (
    <div className="stat-card hover:shadow-card-hover transition-shadow">
      {/* Icon */}
      <div className={clsx('stat-icon', iconBg)}>
        {Icon && <Icon size={22} className={iconColor} />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-surface-400 uppercase tracking-wide mb-1">{title}</p>
        {loading ? (
          <div className="h-7 w-24 bg-surface-200 rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-heading font-bold text-primary-700 dark:text-surface-50 leading-none">
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
          </p>
        )}

        {/* Growth indicator */}
        {!loading && growth !== undefined && growth !== null && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={clsx(
              'flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
              isNeutral ? 'bg-surface-100 text-surface-500'
                : isPositive ? 'bg-success-50 text-success-600'
                : 'bg-danger-50 text-danger-600'
            )}>
              {isNeutral ? <Minus size={10} />
                : isPositive ? <TrendingUp size={10} />
                : <TrendingDown size={10} />}
              {Math.abs(growth)}%
            </div>
            <span className="text-xs text-surface-400">{subValue || 'vs last month'}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
