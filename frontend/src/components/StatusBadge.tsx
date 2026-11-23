import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const st = (status || '').toLowerCase();

  const getStyle = () => {
    switch (st) {
      case 'new':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'open':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'acknowledged':
      case 'investigating':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'contained':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'resolved':
      case 'closed':
      case 'success':
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'failed':
      case 'denied':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'false_positive':
        return 'bg-slate-700/30 text-slate-400 border-slate-600/40';
      default:
        return 'bg-slate-800/40 text-slate-300 border-slate-700';
    }
  };

  const formatText = (text: string) => {
    if (text === 'false_positive') return 'FALSE POSITIVE';
    return text.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${getStyle()}`}>
      {formatText(st)}
    </span>
  );
};
