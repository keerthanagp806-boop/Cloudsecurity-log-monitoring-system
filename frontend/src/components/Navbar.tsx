import React, { useState } from 'react';
import { Shield, ShieldAlert, UserCheck, RefreshCw, ChevronDown, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  onRefresh?: () => void;
  criticalCount?: number;
  onNavigateToTab?: (tab: string) => void;
}

export const Navbar: React.FC<Props> = ({ onRefresh, criticalCount = 0, onNavigateToTab }) => {
  const { user, switchRole } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0d1322]/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand & SOC Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">CLOUD<span className="text-blue-400">SENTINEL</span></span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/50">SIEM v1.0</span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>SOC MONITORING ACTIVE</span>
            </p>
          </div>
        </div>
      </div>

      {/* Middle Alerts / AI indicator */}
      <div className="hidden md:flex items-center gap-3">
        {criticalCount > 0 && (
          <button
            onClick={() => onNavigateToTab && onNavigateToTab('alerts')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs font-medium hover:bg-rose-900/60 transition-all glow-critical"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>{criticalCount} Critical Threat Alert(s) Detected</span>
          </button>
        )}
        <button
          onClick={() => onNavigateToTab && onNavigateToTab('ai_assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-700/50 text-indigo-300 text-xs hover:border-indigo-500 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>AI Threat Triage Ready</span>
        </button>
      </div>

      {/* Right Controls: Role Switcher & User */}
      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh Monitoring Data"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:border-slate-500 transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium capitalize">Role: <span className="text-blue-400 font-semibold">{user?.role || 'Guest'}</span></span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-xl py-1.5 z-50 text-xs">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Role (RBAC Demo)
              </div>
              <button
                onClick={() => { switchRole('admin'); setRoleMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'admin' ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
              >
                <div>
                  <p>Administrator</p>
                  <p className="text-[10px] text-slate-500">Full control & rule config</p>
                </div>
                {user?.role === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
              <button
                onClick={() => { switchRole('analyst'); setRoleMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'analyst' ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
              >
                <div>
                  <p>Security Analyst</p>
                  <p className="text-[10px] text-slate-500">Triage alerts & manage incidents</p>
                </div>
                {user?.role === 'analyst' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
              <button
                onClick={() => { switchRole('viewer'); setRoleMenuOpen(false); }}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 transition-colors ${user?.role === 'viewer' ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}
              >
                <div>
                  <p>Viewer / Auditor</p>
                  <p className="text-[10px] text-slate-500">Read-only dashboard access</p>
                </div>
                {user?.role === 'viewer' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
              </button>
            </div>
          )}
        </div>

        {/* User Badge */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-300">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name || 'Security Lead'}</p>
            <p className="text-[10px] text-slate-400 leading-tight">{user?.email || 'admin@cloudsentinel.io'}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
