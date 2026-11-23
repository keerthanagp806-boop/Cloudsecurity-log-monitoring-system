import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { api } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await api.getReportsSummary();
      setReport(data);
    } catch (err) {
      console.error('Failed to load report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileBarChart2 className="w-6 h-6 text-blue-400" />
            Security Compliance & Incident Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export executive summaries, forensic CSV event logs, and downloadable compliance PDF dossiers.
          </p>
        </div>

        <button
          onClick={fetchReport}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PDF Card */}
        <div className="soc-card rounded-xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-400 w-fit">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Executive PDF Security Dossier</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formatted executive briefing including threat volume KPI cards, recent high-risk alerts, and incident resolutions.
            </p>
          </div>
          <a
            href={api.downloadPdfReport()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF Report</span>
          </a>
        </div>

        {/* CSV Events */}
        <div className="soc-card rounded-xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-400 w-fit">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Export Security Events (CSV)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Raw forensic log telemetry with normalized columns for integration with external SIEM, SOAR, or Excel analysis.
            </p>
          </div>
          <a
            href={api.downloadEventsCsv()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Export Events CSV</span>
          </a>
        </div>

        {/* CSV Incidents */}
        <div className="soc-card rounded-xl p-5 border border-slate-800 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-indigo-400 w-fit">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-100">Export Incidents (CSV)</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Structured incident ticket log with assigned investigators, resolution summaries, containment timestamps, and severity levels.
            </p>
          </div>
          <a
            href={api.downloadIncidentsCsv()}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Export Incidents CSV</span>
          </a>
        </div>
      </div>

      {/* Aggregated Posture Summary */}
      <div className="soc-card rounded-xl p-6 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Live Security Telemetry Aggregation
            </h2>
            <p className="text-xs text-slate-400">Environment status calculated from database records</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Report Timestamp: {report?.generated_at ? new Date(report.generated_at).toISOString().replace('T', ' ').substring(0, 19) : 'N/A'} UTC
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Top Detection Rules Triggered */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-slate-200">Most Frequently Triggered Detection Rules</h3>
            <div className="space-y-2">
              {report?.top_triggered_rules?.length === 0 ? (
                <p className="text-slate-500">No rule triggers recorded.</p>
              ) : (
                report?.top_triggered_rules?.map((r: any) => (
                  <div key={r.rule_code} className="flex items-center justify-between text-slate-300">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{r.rule_code}</p>
                    </div>
                    <span className="font-mono font-bold text-rose-400">{r.count} alert(s)</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident Status Breakdown */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-slate-200">Incident Lifecycle Distribution</h3>
            <div className="space-y-2">
              {report?.incidents_by_status && Object.entries(report.incidents_by_status).map(([st, cnt]) => (
                <div key={st} className="flex items-center justify-between text-slate-300">
                  <span className="uppercase font-semibold text-slate-400">{st}</span>
                  <span className="font-mono font-bold text-slate-100">{String(cnt)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts by Severity */}
          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <h3 className="font-semibold text-slate-200">Alerts by Threat Severity</h3>
            <div className="space-y-2">
              {report?.alerts_by_severity && Object.entries(report.alerts_by_severity).map(([sev, cnt]) => (
                <div key={sev} className="flex items-center justify-between text-slate-300">
                  <span className="uppercase font-semibold text-slate-400">{sev}</span>
                  <span className="font-mono font-bold text-slate-100">{String(cnt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
