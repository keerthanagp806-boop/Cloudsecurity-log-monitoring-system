import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Flame,
  FileCode2,
  Lock,
  Clock,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Download,
  AlertTriangle,
  Play
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { DashboardSummary, SecurityEvent, SeverityCount, SourceCount, TrendPoint } from '../types';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ onNavigateTab }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [severities, setSeverities] = useState<SeverityCount[]>([]);
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [authStats, setAuthStats] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumData, trendData, sevData, srcData, recData, aData] = await Promise.all([
        api.getDashboardSummary(),
        api.getEventTrends(),
        api.getSeverityDistribution(),
        api.getSources(),
        api.getRecentEvents(8),
        api.getAuthStats()
      ]);
      setSummary(sumData);
      setTrends(trendData);
      setSeverities(sevData);
      setSources(srcData);
      setRecentEvents(recData);
      setAuthStats(aData);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            CloudSentinel Command Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time security information and event monitoring across cloud infrastructure and identity systems.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('ingestion')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Attack</span>
          </button>
          <button
            onClick={() => window.open(api.downloadPdfReport(), '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => onNavigateTab('ai_assistant')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/60 text-xs font-semibold transition-all glow-cyan"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Triage</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Total Events"
          value={summary?.total_events || 0}
          subtitle="Ingested logs"
          icon={FileCode2}
          onClick={() => onNavigateTab('events')}
        />
        <MetricCard
          title="Critical Alerts"
          value={summary?.critical_alerts || 0}
          subtitle="Immediate action"
          variant="danger"
          icon={ShieldAlert}
          onClick={() => onNavigateTab('alerts')}
        />
        <MetricCard
          title="High Alerts"
          value={summary?.high_alerts || 0}
          subtitle="Suspicious indicators"
          variant="warning"
          icon={AlertTriangle}
          onClick={() => onNavigateTab('alerts')}
        />
        <MetricCard
          title="Failed Logins"
          value={summary?.failed_logins || 0}
          subtitle="Auth anomalies"
          variant="warning"
          icon={Lock}
          onClick={() => onNavigateTab('analytics')}
        />
        <MetricCard
          title="Open Incidents"
          value={summary?.open_incidents || 0}
          subtitle="Under investigation"
          variant="info"
          icon={Flame}
          onClick={() => onNavigateTab('incidents')}
        />
        <MetricCard
          title="Events Today"
          value={summary?.events_today || 0}
          subtitle="Processed UTC"
          variant="success"
          icon={Clock}
        />
      </div>

      {/* Middle Visual Analytics: Event Trends & Severity / Source Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Trends Chart (2 cols) */}
        <div className="lg:col-span-2 soc-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Security Telemetry Velocity & Anomalies
              </h2>
              <p className="text-xs text-slate-400">Aggregated event volume, failed authentications, and triggered alerts</p>
            </div>
            <span className="text-xs font-mono text-slate-500">Intervals: UTC</span>
          </div>

          <div className="mt-6 space-y-4">
            {trends.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                Awaiting telemetry events...
              </div>
            ) : (
              <div className="space-y-3">
                {trends.map((pt, i) => {
                  const maxEvents = Math.max(...trends.map((t) => t.events), 1);
                  const widthPercent = Math.min(100, Math.round((pt.events / maxEvents) * 100));

                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-300">
                        <span className="font-mono text-slate-400">{pt.time_label}</span>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-blue-400 font-semibold">{pt.events} Events</span>
                          {pt.failed_logins > 0 && (
                            <span className="text-amber-400 font-semibold">{pt.failed_logins} Failed</span>
                          )}
                          {pt.alerts > 0 && (
                            <span className="text-rose-400 font-semibold">{pt.alerts} Alerts</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Severity & Authentication Stats (1 col) */}
        <div className="space-y-6">
          {/* Alerts by Severity Card */}
          <div className="soc-card rounded-xl p-5 border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100 pb-3 border-b border-slate-800/80">
              Severity Distribution
            </h2>
            <div className="mt-4 space-y-2.5">
              {severities.map((s) => {
                const total = severities.reduce((acc, curr) => acc + curr.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.severity} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={s.severity} size="sm" />
                      <span className="text-xs text-slate-400 font-mono">({pct}%)</span>
                    </div>
                    <span className="text-xs font-bold font-mono text-slate-200">{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Authentication Ratio Card */}
          <div className="soc-card rounded-xl p-5 border border-slate-800">
            <h2 className="text-sm font-semibold text-slate-100 pb-3 border-b border-slate-800/80">
              Authentication Health Ratio
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Failed / Total Attempts</span>
                <span className="font-semibold text-amber-400 font-mono">
                  {authStats ? `${authStats.failure_ratio}% Failure Rate` : '0%'}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full"
                  style={{
                    width: `${authStats ? 100 - authStats.failure_ratio : 100}%`
                  }}
                  title="Successful Auth"
                />
                <div
                  className="bg-rose-500 h-full"
                  style={{ width: `${authStats ? authStats.failure_ratio : 0}%` }}
                  title="Failed Auth"
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400 font-mono">
                  ✓ {authStats?.successful_auth || 0} Allowed
                </span>
                <span className="text-rose-400 font-mono">
                  ✗ {authStats?.failed_auth || 0} Blocked / Failed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Events Table */}
      <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Recent Security Activity</h2>
            <p className="text-xs text-slate-400">Live stream of validated and normalized events</p>
          </div>
          <button
            onClick={() => onNavigateTab('events')}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <span>Open Event Explorer</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-6">Timestamp (UTC)</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Source System</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No security events in database. Click "Simulate Attack" or load sample logs in Log Ingestion.
                  </td>
                </tr>
              ) : (
                recentEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">
                      {new Date(evt.event_timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {evt.event_type}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {evt.username || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {evt.source_ip || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {evt.source_name}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={evt.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={evt.status} />
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:underline font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Event Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Security Event Inspector"
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-semibold">Event ID</p>
                <p className="font-mono text-slate-300 mt-0.5 truncate">{selectedEvent.id}</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-semibold">Severity</p>
                <div className="mt-1"><SeverityBadge severity={selectedEvent.severity} size="sm" /></div>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-semibold">Status</p>
                <div className="mt-1"><StatusBadge status={selectedEvent.status} /></div>
              </div>
              <div>
                <p className="text-slate-500 uppercase text-[10px] font-semibold">Detection State</p>
                <p className="font-semibold text-slate-300 mt-1 uppercase">{selectedEvent.detection_status}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">User Principal:</span>
                <span className="font-mono text-slate-200">{selectedEvent.username || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Source IP:</span>
                <span className="font-mono text-slate-200">{selectedEvent.source_ip || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Target Resource:</span>
                <span className="font-mono text-slate-200">{selectedEvent.resource || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800/80">
                <span className="text-slate-500 block">Action / API Call:</span>
                <span className="font-mono text-slate-200">{selectedEvent.action || selectedEvent.event_type}</span>
              </div>
            </div>

            <div>
              <p className="text-slate-400 font-semibold mb-1">Raw Telemetry Record</p>
              <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">
                {selectedEvent.raw_log}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
