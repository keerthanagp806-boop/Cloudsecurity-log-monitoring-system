import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  ShieldAlert,
  Terminal,
  Send,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Flame,
  FileCode2,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { AIAssistantResponse, Alert, Incident, SecurityEvent } from '../types';

export const AIAssistantPage: React.FC = () => {
  const [queryType, setQueryType] = useState('incident_summary');
  const [targetId, setTargetId] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<AIAssistantResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Entities for target dropdowns
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  useEffect(() => {
    const loadEntities = async () => {
      try {
        const [incData, alData, evData] = await Promise.all([
          api.getIncidents(),
          api.getAlerts(),
          api.getRecentEvents(10)
        ]);
        setIncidents(incData);
        setAlerts(alData);
        setEvents(evData);

        if (incData.length > 0) {
          setTargetId(incData[0].id);
        }
      } catch (err) {
        console.error('Error fetching entities for AI triage:', err);
      }
    };
    loadEntities();
    handleRunAnalysis('incident_summary', targetId);
  }, []);

  const handleRunAnalysis = async (type = queryType, id = targetId) => {
    try {
      setLoading(true);
      const res = await api.analyzeWithAI(type, id || undefined, customPrompt || undefined);
      setResult(res);
    } catch (err: any) {
      alert(`AI Assistant analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-indigo-400" />
            AI Security Intelligence Assistant
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            MITRE ATT&CK correlation, explainable alert forensics, and automated SOC investigation runbooks.
          </p>
        </div>

        <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-700/50 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Safety Guardrails Enforced</span>
        </span>
      </div>

      {/* Query Selector Panel */}
      <div className="soc-card rounded-xl p-5 border border-slate-800 space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Query Type Buttons */}
          <button
            onClick={() => {
              setQueryType('incident_summary');
              if (incidents.length > 0) setTargetId(incidents[0].id);
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              queryType === 'incident_summary'
                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Incident Investigation</span>
            </div>
            <p className="text-[11px] text-slate-400">Synthesize multi-alert scope and recommend containment steps</p>
          </button>

          <button
            onClick={() => {
              setQueryType('alert_analysis');
              if (alerts.length > 0) setTargetId(alerts[0].id);
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              queryType === 'alert_analysis'
                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Threat Alert Breakdown</span>
            </div>
            <p className="text-[11px] text-slate-400">Explain rule rationale and identify attack techniques</p>
          </button>

          <button
            onClick={() => {
              setQueryType('event_explanation');
              if (events.length > 0) setTargetId(events[0].id);
            }}
            className={`p-3 rounded-lg border text-left transition-all ${
              queryType === 'event_explanation'
                ? 'bg-indigo-950/40 border-indigo-500 text-indigo-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold mb-1">
              <FileCode2 className="w-4 h-4 text-blue-400" />
              <span>Log Telemetry Translator</span>
            </div>
            <p className="text-[11px] text-slate-400">Translate complex cloud audit parameters into clear SOC guidance</p>
          </button>
        </div>

        {/* Target Entity Selector */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-800">
          <div className="flex-1">
            <label className="text-slate-400 font-semibold block mb-1">Select Target Record</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {queryType === 'incident_summary' &&
                incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.severity.toUpperCase()}] {inc.title} ({inc.status})
                  </option>
                ))}

              {queryType === 'alert_analysis' &&
                alerts.map((al) => (
                  <option key={al.id} value={al.id}>
                    [{al.severity.toUpperCase()}] {al.title} ({al.rule_name})
                  </option>
                ))}

              {queryType === 'event_explanation' &&
                events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.event_type} - {ev.username || 'System'} ({ev.source_name})
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={() => handleRunAnalysis()}
            disabled={loading}
            className="self-end px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-900/40 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Synthesizing...' : 'Generate Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Analysis Output Result Card */}
      {result && (
        <div className="soc-card rounded-xl p-6 border border-indigo-700/50 space-y-5 glow-cyan">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold block mb-0.5">
                Automated Triage Output
              </span>
              <h2 className="text-lg font-bold text-slate-100">{result.analysis_title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 font-bold font-mono">
                RISK: {result.risk_level}
              </span>
              {result.mitre_attack_technique && (
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-mono">
                  MITRE: {result.mitre_attack_technique}
                </span>
              )}
            </div>
          </div>

          {/* Narrative Summary */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Forensic Narrative</h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/70 p-4 rounded-xl border border-slate-800">
              {result.summary}
            </p>
          </div>

          {/* Technical Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Technical Findings & Indicators</h3>
            <div className="grid grid-cols-1 gap-2">
              {result.technical_breakdown.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-relaxed font-mono">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended SOC Runbook Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recommended SOC Response Runbook</h3>
            <div className="space-y-2">
              {result.recommended_actions.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200 bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg">
                  <span className="font-bold text-blue-400 font-mono">{idx + 1}.</span>
                  <span className="leading-relaxed">{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Safety Disclaimer Footer */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-500">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
};
