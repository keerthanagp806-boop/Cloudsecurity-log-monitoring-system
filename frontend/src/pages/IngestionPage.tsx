import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Play,
  RefreshCw,
  FileText,
  Clock,
  ShieldAlert,
  Flame,
  Key,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { IngestionJob } from '../types';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const IngestionPage: React.FC<Props> = ({ onNavigateTab }) => {
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sourceName, setSourceName] = useState('Production Log Pipeline');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getIngestionJobs();
      setJobs(data);
    } catch (err) {
      console.error('Failed to load ingestion jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadSuccess(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source_name', sourceName || file.name);

      const job = await api.uploadLogFile(formData);
      setUploadSuccess(`Ingested "${file.name}": Accepted ${job.accepted_records} records, Rejected ${job.rejected_records}`);
      fetchJobs();
      e.target.value = '';
    } catch (err: any) {
      alert(`Ingestion failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSample = async (scenarioKey: string, scenarioName: string) => {
    try {
      setUploading(true);
      setUploadSuccess(null);
      const job = await api.loadSampleDataset(scenarioKey);
      setUploadSuccess(`Simulated "${scenarioName}": Processed ${job.accepted_records} events and triggered correlation rules.`);
      fetchJobs();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const sampleScenarios = [
    {
      key: 'brute_force',
      name: 'Authentication Brute-Force Attack',
      desc: 'Simulates 6 consecutive failed password attempts against sso-portal from IP 198.51.100.45.',
      icon: Flame,
      color: 'border-amber-700/60 hover:border-amber-500 bg-amber-950/20 text-amber-400'
    },
    {
      key: 'privilege_escalation',
      name: 'Suspicious Cloud IAM Privilege Escalation',
      desc: 'Simulates attaching AdministratorAccess and sudo /bin/bash privilege changes to dev.contractor.',
      icon: Key,
      color: 'border-rose-700/60 hover:border-rose-500 bg-rose-950/20 text-rose-400'
    },
    {
      key: 'cloud_tampering',
      name: 'CloudTrail & Security Control Tampering',
      desc: 'Simulates StopLogging on central audit trail and opening firewall security group to 0.0.0.0/0.',
      icon: ShieldAlert,
      color: 'border-purple-700/60 hover:border-purple-500 bg-purple-950/20 text-purple-400'
    },
    {
      key: 'unauthorized_access',
      name: 'Unauthorized S3 & Secrets Access Denial',
      desc: 'Simulates repeated AccessDenied events against restricted executive payroll and KMS encryption keys.',
      icon: AlertCircle,
      color: 'border-blue-700/60 hover:border-blue-500 bg-blue-950/20 text-blue-400'
    },
    {
      key: 'enterprise_mix',
      name: 'Full Enterprise SIEM Day Mix',
      desc: 'Simulates mixed enterprise operations: benign Azure AD & Okta logins, mixed with subtle multi-vector attacks.',
      icon: ShieldCheck,
      color: 'border-emerald-700/60 hover:border-emerald-500 bg-emerald-950/20 text-emerald-400'
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UploadCloud className="w-6 h-6 text-blue-400" />
            Security Log Ingestion & Threat Simulation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Ingest custom CSV/JSON log files or trigger pre-packaged cyber attack scenarios for live testing.
          </p>
        </div>

        <button
          onClick={fetchJobs}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {uploadSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigateTab('alerts')}
              className="px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs"
            >
              View Alerts
            </button>
            <button
              onClick={() => onNavigateTab('events')}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
            >
              View Events
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: Attack Scenario Launchpad & Custom File Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 1-Click Attack Scenarios */}
        <div className="soc-card rounded-xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Play className="w-4 h-4 text-rose-400" />
                Simulated Cyber Attack Scenarios (1-Click)
              </h2>
              <p className="text-xs text-slate-400">Trigger genuine threat patterns to verify detection rules & alert generation</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {sampleScenarios.map((sc) => {
              const Icon = sc.icon;
              return (
                <div
                  key={sc.key}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${sc.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{sc.name}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{sc.desc}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLoadSample(sc.key, sc.name)}
                    disabled={uploading}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all shrink-0"
                  >
                    Simulate
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: File Upload Area */}
        <div className="soc-card rounded-xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-100">Custom Log File Ingestion</h2>
              <p className="text-xs text-slate-400">Upload JSON or CSV files for automated normalization and detection</p>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold block mb-1">Source System Label</label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. AWS CloudTrail us-east-1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Upload Dropzone */}
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/30">
                <UploadCloud className="w-10 h-10 text-blue-400 mb-3 animate-pulse" />
                <span className="text-xs font-semibold text-slate-200">
                  {uploading ? 'Processing & Normalizing Logs...' : 'Click to select or drag & drop CSV or JSON logs'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supported formats: JSON arrays, CloudTrail records, Standard CSV (up to 20MB)
                </span>
                <input
                  type="file"
                  accept=".json,.csv,.log,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <span className="text-slate-300 font-semibold block">Schema Auto-Normalization:</span>
            <p>
              Normalized fields: <code>timestamp</code>, <code>source</code>, <code>username</code>, <code>source_ip</code>, <code>event_type</code>, <code>action</code>, <code>resource</code>, <code>status</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Ingestion Jobs History Table */}
      <div className="soc-card rounded-xl border border-slate-800 overflow-hidden">
        <div className="p-4 px-6 border-b border-slate-800/80 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Ingestion Audit History</h2>
          <span className="text-xs text-slate-400 font-mono">{jobs.length} jobs tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="py-3 px-6">Started (UTC)</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Source Label</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Accepted Records</th>
                <th className="py-3 px-4">Rejected Records</th>
                <th className="py-3 px-6">Error Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No ingestion jobs logged yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">
                      {new Date(job.started_at).toISOString().replace('T', ' ').substring(0, 19)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {job.file_name}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {job.source_name}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-semibold">
                      {job.accepted_records}
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-400 font-semibold">
                      {job.rejected_records}
                    </td>
                    <td className="py-3 px-6 text-slate-400 text-[11px] max-w-xs truncate" title={job.error_summary || ''}>
                      {job.error_summary || <span className="text-slate-600">None (Clean parse)</span>}
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
