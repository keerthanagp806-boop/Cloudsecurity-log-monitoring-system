import React from 'react';
import {
  LayoutDashboard,
  FileCode2,
  AlertTriangle,
  Flame,
  Cpu,
  UploadCloud,
  Network,
  FileBarChart2,
  ShieldCheck,
  Bot
} from 'lucide-react';

interface Props {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertCount?: number;
  incidentCount?: number;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  alertCount = 0,
  incidentCount = 0
}) => {
  const navItems = [
    { id: 'overview', label: 'SOC Overview', icon: LayoutDashboard },
    { id: 'events', label: 'Security Events', icon: FileCode2 },
    { id: 'alerts', label: 'Threat Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'incidents', label: 'Incidents', icon: Flame, badge: incidentCount },
    { id: 'rules', label: 'Detection Rules', icon: Cpu },
    { id: 'ingestion', label: 'Log Ingestion', icon: UploadCloud },
    { id: 'analytics', label: 'IP & User Analysis', icon: Network },
    { id: 'reports', label: 'Reports & PDF', icon: FileBarChart2 },
    { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
    { id: 'ai_assistant', label: 'AI Security Agent', icon: Bot, highlight: true }
  ];

  return (
    <aside className="w-64 bg-[#0a0e17] border-r border-slate-800/80 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-3.5 space-y-1">
        <p className="px-3 pt-2 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-500">
          Security Operations
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-semibold'
                  : item.highlight
                  ? 'text-indigo-300 hover:bg-indigo-950/30 hover:text-indigo-200'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : item.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    item.id === 'alerts'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Security Tip / Compliance Badge footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Security Engine</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Deterministic threat correlation running with UTC normalization.
        </p>
      </div>
    </aside>
  );
};
