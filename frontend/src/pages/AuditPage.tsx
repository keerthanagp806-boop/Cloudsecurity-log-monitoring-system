import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  User,
  Clock,
  Terminal
} from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs(100);
      setLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(s) ||
      l.actor_name.toLowerCase().includes(s) ||
      l.target_type.toLowerCase().includes(s) ||
      (l.target_id && l.target_id.toLowerCase().includes(s))
    );
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Immutable System & Operator Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-evident log of administrative actions, incident assignments, rule alterations, and authentications.
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="soc-card rounded-xl p-4 border border-slate-800 flex items-center justify-between text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit actions by actor, action keyword, target..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="font-mono text-slate-400">{filteredLogs.length} audit records found</span>
      </div>

      {/* Audit Table */}
      <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-6">Timestamp (UTC)</th>
                <th className="py-3 px-4">Operator / Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Target Identifier</th>
                <th className="py-3 px-6">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    Querying audit trail records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {log.actor_name}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-300 border border-slate-700 text-[10px] font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 capitalize">
                      {log.target_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] max-w-xs truncate">
                      {log.target_id || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-6 font-mono text-[11px] text-slate-400 max-w-sm truncate" title={JSON.stringify(log.metadata_json)}>
                      {log.metadata_json ? JSON.stringify(log.metadata_json) : <span className="text-slate-600">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
