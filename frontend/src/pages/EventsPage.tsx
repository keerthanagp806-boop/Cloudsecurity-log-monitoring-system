import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldAlert,
  FileCode,
  Download
} from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { SecurityEvent } from '../types';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Inspection
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [linkedAlerts, setLinkedAlerts] = useState<any[]>([]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getEvents({
        search: search || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        source_type: sourceFilter !== 'all' ? sourceFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        page,
        limit: 20
      });
      setEvents(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, severityFilter, sourceFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleInspect = async (evt: SecurityEvent) => {
    try {
      const details = await api.getEventDetail(evt.id);
      setSelectedEvent(details.event);
      setLinkedAlerts(details.linked_alerts || []);
    } catch {
      setSelectedEvent(evt);
      setLinkedAlerts([]);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileCode className="w-6 h-6 text-blue-400" />
            Security Event Explorer
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Query and analyze normalized security logs across multi-cloud infrastructure and identities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open(api.downloadEventsCsv(), '_blank')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchEvents}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="soc-card rounded-xl p-4 border border-slate-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by IP, username, event type, action, resource, or raw payload..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="informational">Informational</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Source: All</option>
            <option value="authentication">Authentication</option>
            <option value="cloud_iam">Cloud IAM</option>
            <option value="cloud_storage">Cloud Storage</option>
            <option value="cloud_audit">Cloud Audit</option>
            <option value="system_activity">System Activity</option>
            <option value="network_security">Network Security</option>
            <option value="application_security">App Security</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Outcome: All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="denied">Denied</option>
          </select>

          <span className="ml-auto text-xs font-mono text-slate-400">
            {total} events matching query
          </span>
        </div>
      </div>

      {/* Events Table */}
      <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-6">Timestamp (UTC)</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Source IP</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    Querying normalized event indices...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-500">
                    No matching security logs found.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(evt.event_timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      <span className="font-semibold text-slate-300">{evt.source_name}</span>
                      <span className="block text-[10px] text-slate-500">{evt.source_type}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {evt.event_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {evt.username || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {evt.source_ip || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={evt.resource || ''}>
                      {evt.resource || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      <SeverityBadge severity={evt.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={evt.status} />
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => handleInspect(evt)}
                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 px-6 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-slate-200">{page}</span> of{' '}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Normalized Security Event Telemetry"
      >
        {selectedEvent && (
          <div className="space-y-5 text-xs">
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
                <p className="text-slate-500 uppercase text-[10px] font-semibold">Ingestion Timestamp</p>
                <p className="font-mono text-slate-300 mt-0.5">
                  {new Date(selectedEvent.ingestion_timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                </p>
              </div>
            </div>

            {/* Linked Alerts Notification */}
            {linkedAlerts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-1.5">
                <p className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Correlated with {linkedAlerts.length} Security Alert(s)
                </p>
                {linkedAlerts.map((a) => (
                  <div key={a.id} className="text-[11px] text-slate-300 flex items-center justify-between">
                    <span>{a.title} ({a.rule_name})</span>
                    <SeverityBadge severity={a.severity} size="sm" />
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">User Account:</span>
                <span className="font-mono text-slate-200 font-semibold">{selectedEvent.username || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Source IP Address:</span>
                <span className="font-mono text-slate-200 font-semibold">{selectedEvent.source_ip || 'N/A'}</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Source System:</span>
                <span className="font-mono text-slate-200">{selectedEvent.source_name} ({selectedEvent.source_type})</span>
              </div>
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 block">Action / API Call:</span>
                <span className="font-mono text-slate-200">{selectedEvent.action || selectedEvent.event_type}</span>
              </div>
            </div>

            <div>
              <p className="text-slate-400 font-semibold mb-1">Raw Telemetry & Audit Context</p>
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
