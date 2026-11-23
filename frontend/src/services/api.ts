const envApiUrl = import.meta.env.VITE_API_URL;
const API_BASE = envApiUrl ? `${envApiUrl.replace(/\/+$/, '')}/api` : '/api';

export function getStoredToken(): string | null {
  return localStorage.getItem('cloudsentinel_token');
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('cloudsentinel_token', token);
  } else {
    localStorage.removeItem('cloudsentinel_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail || errorDetail;
    } catch {
      // not json
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ access_token: string; token_type: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  getMe: () => request<any>('/auth/me'),
  getUsers: () => request<any[]>('/auth/users'),

  // Dashboard
  getDashboardSummary: () => request<any>('/dashboard/summary'),
  getEventTrends: () => request<any[]>('/dashboard/event-trends'),
  getSeverityDistribution: () => request<any[]>('/dashboard/severity-distribution'),
  getSources: () => request<any[]>('/dashboard/sources'),
  getAuthStats: () => request<any>('/dashboard/auth-stats'),
  getRecentEvents: (limit: number = 8) => request<any[]>(`/dashboard/recent-events?limit=${limit}`),

  // Events
  getEvents: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request<{ items: any[]; total: number; page: number; limit: number; total_pages: number }>(`/events?${query.toString()}`);
  },
  getEventDetail: (id: string) => request<any>(`/events/${id}`),

  // Alerts
  getAlerts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request<any[]>(`/alerts?${query.toString()}`);
  },
  getAlertDetail: (id: string) => request<any>(`/alerts/${id}`),
  updateAlertStatus: (id: string, status: string, note?: string) =>
    request<any>(`/alerts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note })
    }),

  // Incidents
  getIncidents: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return request<any[]>(`/incidents?${query.toString()}`);
  },
  getIncidentDetail: (id: string) => request<any>(`/incidents/${id}`),
  createIncident: (data: { title: string; description: string; severity?: string; alert_ids?: string[]; assigned_user_id?: string }) =>
    request<any>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateIncident: (id: string, data: any) =>
    request<any>(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  addIncidentNote: (id: string, note: string) =>
    request<any>(`/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    }),

  // Detection Rules
  getRules: () => request<any[]>('/rules'),
  createRule: (rule: any) => request<any>('/rules', { method: 'POST', body: JSON.stringify(rule) }),
  updateRule: (id: string, rule: any) => request<any>(`/rules/${id}`, { method: 'PATCH', body: JSON.stringify(rule) }),
  toggleRule: (id: string) => request<any>(`/rules/${id}/toggle`, { method: 'POST' }),

  // Logs Ingestion
  uploadLogFile: (formData: FormData) =>
    request<any>('/logs/upload', {
      method: 'POST',
      body: formData
    }),
  getIngestionJobs: () => request<any[]>('/logs/ingestion-jobs'),
  loadSampleDataset: (sampleName: string) =>
    request<any>(`/logs/load-sample/${sampleName}`, { method: 'POST' }),

  // Analytics
  getIpActivity: () => request<{ items: any[]; disclaimer: string }>('/analytics/ip-activity'),
  getUserActivity: () => request<{ items: any[] }>('/analytics/user-activity'),

  // Reports
  getReportsSummary: () => request<any>('/reports/security-summary'),
  downloadEventsCsv: () => `${API_BASE}/reports/events/export`,
  downloadIncidentsCsv: () => `${API_BASE}/reports/incidents/export`,
  downloadPdfReport: () => `${API_BASE}/reports/pdf`,

  // Audit
  getAuditLogs: (limit: number = 50) => request<any[]>(`/audit-logs?limit=${limit}`),

  // AI Assistant
  analyzeWithAI: (queryType: string, targetId?: string, customPrompt?: string) =>
    request<any>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ query_type: queryType, target_id: targetId, custom_prompt: customPrompt })
    })
};
