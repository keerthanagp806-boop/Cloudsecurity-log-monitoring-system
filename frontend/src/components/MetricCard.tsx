import React from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'default';
  onClick?: () => void;
}

export const MetricCard: React.FC<Props> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          accent: 'hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
          textColor: 'text-rose-400'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          accent: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
          textColor: 'text-amber-400'
        };
      case 'info':
        return {
          iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          accent: 'hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
          textColor: 'text-blue-400'
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          accent: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
          textColor: 'text-emerald-400'
        };
      default:
        return {
          iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
          accent: 'hover:border-slate-600',
          textColor: 'text-slate-100'
        };
    }
  };

  const v = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`soc-card rounded-xl p-5 transition-all duration-300 ${v.accent} ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className={`mt-2 text-3xl font-bold tracking-tight ${v.textColor}`}>{value}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg border ${v.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
