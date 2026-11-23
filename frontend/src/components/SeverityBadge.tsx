import React from 'react';
import { SeverityLevel } from '../types';

interface Props {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'low').toLowerCase();

  const config: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    critical: {
      bg: 'bg-rose-950/40',
      text: 'text-rose-400',
      border: 'border-rose-700/60',
      dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
    },
    high: {
      bg: 'bg-amber-950/40',
      text: 'text-amber-400',
      border: 'border-amber-700/60',
      dot: 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
    },
    medium: {
      bg: 'bg-sky-950/40',
      text: 'text-sky-400',
      border: 'border-sky-700/60',
      dot: 'bg-sky-500 shadow-[0_0_8px_#38bdf8]'
    },
    low: {
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-400',
      border: 'border-emerald-700/60',
      dot: 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
    },
    informational: {
      bg: 'bg-slate-800/60',
      text: 'text-slate-300',
      border: 'border-slate-700',
      dot: 'bg-slate-400'
    }
  };

  const style = config[sev] || config.informational;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium uppercase tracking-wider rounded-md border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {sev}
    </span>
  );
};
