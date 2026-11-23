import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  MessageSquare,
  Send,
  AlertTriangle,
  Shield,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { Incident } from '../types';
import { useAuth } from '../context/AuthContext';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [incidentDetail, setIncidentDetail] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSeverity, setNewSeverity] = useState('high');

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const data = await api.getIncidents({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setIncidents(data);
    } catch (err) {
      console.error('Failed to load incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [statusFilter]);

  const handleOpenIncidentDetail = async (inc: Incident) => {
    try {
      const data = await api.getIncidentDetail(inc.id);
      setSelectedIncident(data.incident);
      setIncidentDetail(data);
      setResolutionSummary(data.incident.resolution_summary || '');
    } catch {
      setSelectedIncident(inc);
      setIncidentDetail(null);
    }
  };

  const handleAddNote = async () => {
    if (!selectedIncident || !newNote.trim()) return;
    try {
      await api.addIncidentNote(selectedIncident.id, newNote);
      setNewNote('');
      // refresh details
      const data = await api.getIncidentDetail(selectedIncident.id);
      setSelectedIncident(data.incident);
      setIncidentDetail(data);
    } catch (err: any) {
      alert(`Failed to add note: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedIncident) return;
    try {
      const updated = await api.updateIncident(selectedIncident.id, {
        status,
        resolution_summary: status === 'resolved' || status === 'closed' ? resolutionSummary : undefined
      });
      setSelectedIncident(updated);
      fetchIncidents();
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    }
  };

  const handleCreateNewIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await api.createIncident({
        title: newTitle,
        description: newDescription,
        severity: newSeverity
      });
      setCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      fetchIncidents();
    } catch (err: any) {
      alert(`Failed to create incident: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Flame className="w-6 h-6 text-rose-500" />
            Security Incident Response Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track investigations, document containment timelines, and resolve escalated cyber incidents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-900/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Incident</span>
          </button>
          <button
            onClick={fetchIncidents}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="soc-card rounded-xl p-4 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400">Workflow Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Incidents</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <span className="font-mono text-slate-400">{incidents.length} recorded incident tickets</span>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {loading ? (
          <div className="soc-card rounded-xl py-12 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-rose-400" />
            Loading incident queues...
          </div>
        ) : incidents.length === 0 ? (
          <div className="soc-card rounded-xl p-10 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            No active security incidents under this filter.
          </div>
        ) : (
          incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => handleOpenIncidentDetail(inc)}
              className="soc-card soc-card-hover rounded-xl p-5 border border-slate-800 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={inc.severity} />
                    <StatusBadge status={inc.status} />
                    <span className="text-xs font-mono text-slate-500">ID: {inc.id.substring(0, 8)}...</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100">{inc.title}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Assigned: <strong className="text-slate-200">{inc.assigned_user_name || 'Unassigned'}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>{inc.alerts_count} Linked Alert(s)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inc.notes_count} Note(s)</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Opened: </span>
                      <span className="font-mono text-slate-300">
                        {new Date(inc.created_at).toISOString().replace('T', ' ').substring(0, 16)} UTC
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-blue-400 text-xs font-medium">
                  <span>Manage Investigation</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Incident Detail & Investigation Modal */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title="Incident Investigation & Response Command"
        maxWidth="max-w-4xl"
      >
        {selectedIncident && (
          <div className="space-y-5 text-xs">
            {/* Incident Header Status Bar */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
                <h2 className="text-base font-bold text-slate-100">{selectedIncident.title}</h2>
                <p className="text-slate-400 text-xs mt-1">{selectedIncident.description}</p>
              </div>

              {/* Status transition buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => handleUpdateStatus('investigating')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    selectedIncident.status === 'investigating'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Investigate
                </button>
                <button
                  onClick={() => handleUpdateStatus('contained')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    selectedIncident.status === 'contained'
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Contained
                </button>
                <button
                  onClick={() => handleUpdateStatus('resolved')}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${
                    selectedIncident.status === 'resolved'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Linked Alerts */}
            {incidentDetail?.alerts?.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-slate-300 text-xs">Linked Detection Alerts ({incidentDetail.alerts.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {incidentDetail.alerts.map((al: any) => (
                    <div key={al.id} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-200">{al.title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          User: {al.affected_user || 'N/A'} | IP: {al.affected_ip || 'N/A'}
                        </p>
                      </div>
                      <SeverityBadge severity={al.severity} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Summary Section */}
            {(selectedIncident.status === 'resolved' || selectedIncident.status === 'closed') && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-1.5">
                <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  Resolution Summary & Remediation Documentation
                </p>
                <textarea
                  rows={2}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Record RCA and containment actions taken..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => handleUpdateStatus(selectedIncident.status)}
                  className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Resolution Summary
                </button>
              </div>
            )}

            {/* Analyst Investigation Timeline / Notes */}
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <p className="font-semibold text-slate-200 text-xs">Investigation Activity Timeline</p>

              <div className="max-h-56 overflow-y-auto space-y-2.5 pr-1">
                {incidentDetail?.notes?.length === 0 ? (
                  <p className="text-slate-500 text-xs py-3 text-center">No notes recorded yet. Add your investigation finding below.</p>
                ) : (
                  incidentDetail?.notes?.map((n: any) => (
                    <div key={n.id} className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-blue-400">{n.author_name}</span>
                        <span className="font-mono text-slate-500">
                          {new Date(n.created_at).toISOString().replace('T', ' ').substring(0, 16)} UTC
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap">{n.note}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Note Input */}
              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add analyst investigation note, containment step, or finding..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create New Incident Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open Security Incident Ticket"
      >
        <form onSubmit={handleCreateNewIncident} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Incident Title</label>
            <input
              type="text"
              placeholder="e.g., Compromised IAM Credentials on Production Trail"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Severity Classification</label>
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="critical">Critical (Immediate Outage / Breach Risk)</option>
              <option value="high">High (Strong Indicator of Attack)</option>
              <option value="medium">Medium (Suspicious Access / Needs Triage)</option>
              <option value="low">Low (Policy Deviation)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold">Scope & Description</label>
            <textarea
              rows={4}
              placeholder="Detail observed indicators of compromise (IOCs), affected assets, and recommended containment steps..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-900/30"
            >
              Create Incident Ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
