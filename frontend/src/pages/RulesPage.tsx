import React, { useState, useEffect } from 'react';
import {
  Cpu,
  RefreshCw,
  Edit2,
  Check,
  X,
  Sliders,
  Shield,
  AlertCircle
} from 'lucide-react';
import { SeverityBadge } from '../components/SeverityBadge';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { DetectionRule } from '../types';
import { useAuth } from '../context/AuthContext';

export const RulesPage: React.FC = () => {
  const { user } = useAuth();
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null);
  const [configJson, setConfigJson] = useState('');
  const [defaultSev, setDefaultSev] = useState('high');

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await api.getRules();
      setRules(data);
    } catch (err) {
      console.error('Failed to load rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleToggle = async (ruleId: string) => {
    if (user?.role !== 'admin') {
      alert('RBAC Warning: Only Administrators can modify detection rule states.');
      return;
    }
    try {
      await api.toggleRule(ruleId);
      fetchRules();
    } catch (err: any) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  const openConfigModal = (rule: DetectionRule) => {
    setSelectedRule(rule);
    setConfigJson(JSON.stringify(rule.configuration, null, 2));
    setDefaultSev(rule.default_severity);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule) return;
    if (user?.role !== 'admin') {
      alert('RBAC Warning: Only Administrators can edit rule configurations.');
      return;
    }

    try {
      const parsedConfig = JSON.parse(configJson);
      await api.updateRule(selectedRule.id, {
        configuration: parsedConfig,
        default_severity: defaultSev
      });
      setSelectedRule(null);
      fetchRules();
    } catch (err: any) {
      alert(`Invalid JSON configuration or update error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            Threat Detection Rules Engine
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Explainable, rule-based correlation engines matching behavior thresholds across real-time logs.
          </p>
        </div>

        <button
          onClick={fetchRules}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {user?.role !== 'admin' && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-center gap-3 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            You are logged in as <strong>{user?.role?.toUpperCase()}</strong>. Rule modifications and toggle controls require Administrator role.
          </span>
        </div>
      )}

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`soc-card rounded-xl p-5 border transition-all ${
              rule.is_enabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/50">
                    {rule.rule_code}
                  </span>
                  <SeverityBadge severity={rule.default_severity} size="sm" />
                </div>
                <h3 className="text-base font-bold text-slate-100 mt-1.5">{rule.name}</h3>
              </div>

              {/* Toggle switch */}
              <button
                onClick={() => handleToggle(rule.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  rule.is_enabled ? 'bg-blue-600' : 'bg-slate-800'
                }`}
                title={rule.is_enabled ? 'Disable Rule' : 'Enable Rule'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    rule.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              {rule.description}
            </p>

            {/* Threshold parameters display */}
            <div className="mt-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-slate-400 space-y-1">
              <span className="text-slate-500 block uppercase text-[10px] font-sans font-semibold">Active Threshold Configuration</span>
              <pre className="whitespace-pre-wrap text-blue-300">
                {JSON.stringify(rule.configuration, null, 2)}
              </pre>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">Type: {rule.rule_type}</span>
              <button
                onClick={() => openConfigModal(rule)}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Configure Thresholds</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Modal */}
      <Modal
        isOpen={!!selectedRule}
        onClose={() => setSelectedRule(null)}
        title={`Configure Rule: ${selectedRule?.name}`}
      >
        {selectedRule && (
          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            <p className="text-slate-400">
              Update configurable parameters such as failure thresholds, sliding time window minutes, and detection severity.
            </p>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Default Severity</label>
              <select
                value={defaultSev}
                onChange={(e) => setDefaultSev(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold">Configuration Parameters (JSON)</label>
              <textarea
                rows={6}
                value={configJson}
                onChange={(e) => setConfigJson(e.target.value)}
                className="w-full bg-slate-950 font-mono border border-slate-700 rounded-lg p-3 text-xs text-blue-300 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRule(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-900/30"
              >
                Save Configuration
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
