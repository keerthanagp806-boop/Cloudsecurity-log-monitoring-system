import React, { useState, useEffect } from 'react';
import {
  Network,
  Users,
  RefreshCw,
  ShieldAlert,
  Info,
  TrendingDown,
  Activity
} from 'lucide-react';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [ipData, setIpData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [ipRes, userRes] = await Promise.all([
        api.getIpActivity(),
        api.getUserActivity()
      ]);
      setIpData(ipRes.items || []);
      setDisclaimer(ipRes.disclaimer || '');
      setUserData(userRes.items || []);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-400" />
            IP & Identity Behavioral Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Correlate source IP threat exposure, account authentication failure rates, and high-risk identities.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Limitation Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-200">Analytical Limitations & Contextual Ethics</p>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
            {disclaimer || 'An IP address associated with suspicious activity is not automatically malicious. The system does not claim that an IP address identifies a specific person.'}
          </p>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source IP Analytics Table */}
        <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-100">Top Active Source IPs</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{ipData.length} IPs indexed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-6">Source IP</th>
                  <th className="py-3 px-4">Total Events</th>
                  <th className="py-3 px-4">Failures</th>
                  <th className="py-3 px-4">Alerts</th>
                  <th className="py-3 px-6">Risk Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {ipData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No IP data recorded.
                    </td>
                  </tr>
                ) : (
                  ipData.map((ip) => (
                    <tr key={ip.source_ip} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-6 font-mono text-slate-200 font-semibold">
                        {ip.source_ip}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {ip.total_events}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={ip.failed_events > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                          {ip.failed_events} ({ip.failure_rate}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={ip.alert_count > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                          {ip.alert_count}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            ip.risk_score === 'HIGH'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                              : ip.risk_score === 'MEDIUM'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                          }`}
                        >
                          {ip.risk_score}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Activity Table */}
        <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-4 px-6 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-100">User Identity Exposure</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{userData.length} accounts indexed</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-6">Username / Principal</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Success</th>
                  <th className="py-3 px-4">Failures</th>
                  <th className="py-3 px-6">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {userData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No user identity activity recorded.
                    </td>
                  </tr>
                ) : (
                  userData.map((u) => (
                    <tr key={u.username} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-6 font-mono text-slate-200 font-semibold">
                        {u.username}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {u.total_events}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">
                        {u.successful_attempts}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={u.failed_attempts > 0 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                          {u.failed_attempts}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            u.risk_status === 'HIGH'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                              : u.risk_status === 'MEDIUM'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                          }`}
                        >
                          {u.risk_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
