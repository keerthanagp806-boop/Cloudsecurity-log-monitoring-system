export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export type UserRole = 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_timestamp: string;
  ingestion_timestamp: string;
  source_type: string;
  source_name: string;
  username?: string | null;
  source_ip?: string | null;
  event_type: string;
  action?: string | null;
  resource?: string | null;
  status: string;
  severity: SeverityLevel;
  raw_log?: string | null;
  fingerprint?: string | null;
  detection_status: string;
}

export interface DetectionRule {
  id: string;
  rule_code: string;
  name: string;
  description: string;
  rule_type: string;
  configuration: Record<string, any>;
  default_severity: SeverityLevel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  rule_id?: string | null;
  rule_name?: string | null;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
  first_seen: string;
  last_seen: string;
  occurrence_count: number;
  affected_user?: string | null;
  affected_ip?: string | null;
  recommended_action?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  resolution_summary?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  alerts_count: number;
  notes_count: number;
}

export interface IncidentNote {
  id: string;
  incident_id: string;
  author_id?: string | null;
  author_name: string;
  note: string;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  source_name: string;
  file_name: string;
  status: string;
  total_records: number;
  accepted_records: number;
  rejected_records: number;
  error_summary?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_name: string;
  action: string;
  target_type: string;
  target_id?: string | null;
  metadata_json?: Record<string, any> | null;
  timestamp: string;
}

export interface DashboardSummary {
  total_events: number;
  critical_alerts: number;
  high_alerts: number;
  failed_logins: number;
  open_incidents: number;
  events_today: number;
}

export interface TrendPoint {
  time_label: string;
  events: number;
  failed_logins: number;
  alerts: number;
}

export interface SeverityCount {
  severity: string;
  count: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface AIAssistantResponse {
  analysis_title: string;
  summary: string;
  technical_breakdown: string[];
  mitre_attack_technique?: string;
  risk_level: string;
  recommended_actions: string[];
  disclaimer: string;
}
