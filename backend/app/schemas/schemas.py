from datetime import datetime
from typing import Optional, Any, List, Dict
from pydantic import BaseModel, EmailStr, Field

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "analyst"  # admin, analyst, viewer
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class LoginRequest(BaseModel):
    email: str
    password: str

# Security Event Schemas
class SecurityEventBase(BaseModel):
    event_timestamp: datetime
    source_type: str
    source_name: str
    username: Optional[str] = None
    source_ip: Optional[str] = None
    event_type: str
    action: Optional[str] = None
    resource: Optional[str] = None
    status: str  # success, failed, denied
    severity: str = "low"  # critical, high, medium, low, informational
    details: Optional[str] = None

class SecurityEventResponse(SecurityEventBase):
    id: str
    ingestion_timestamp: datetime
    raw_log: Optional[str] = None
    fingerprint: Optional[str] = None
    detection_status: str

    class Config:
        from_attributes = True

class PaginatedEventsResponse(BaseModel):
    items: List[SecurityEventResponse]
    total: int
    page: int
    limit: int
    total_pages: int

# Detection Rule Schemas
class DetectionRuleBase(BaseModel):
    rule_code: str
    name: str
    description: Optional[str] = None
    rule_type: str
    configuration: Dict[str, Any] = Field(default_factory=dict)
    default_severity: str = "high"
    is_enabled: bool = True

class DetectionRuleCreate(DetectionRuleBase):
    pass

class DetectionRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    default_severity: Optional[str] = None
    is_enabled: Optional[bool] = None

class DetectionRuleResponse(DetectionRuleBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Alert Schemas
class AlertResponse(BaseModel):
    id: str
    rule_id: Optional[str] = None
    title: str
    description: str
    severity: str
    status: str
    first_seen: datetime
    last_seen: datetime
    occurrence_count: int
    affected_user: Optional[str] = None
    affected_ip: Optional[str] = None
    recommended_action: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    rule_name: Optional[str] = None

    class Config:
        from_attributes = True

class AlertStatusUpdate(BaseModel):
    status: str  # new, acknowledged, investigating, resolved, false_positive
    note: Optional[str] = None

# Incident Schemas
class IncidentNoteCreate(BaseModel):
    note: str

class IncidentNoteResponse(BaseModel):
    id: str
    incident_id: str
    author_id: Optional[str] = None
    author_name: Optional[str] = "Analyst"
    note: str
    created_at: datetime

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "high"
    alert_ids: Optional[List[str]] = Field(default_factory=list)
    event_ids: Optional[List[str]] = Field(default_factory=list)
    assigned_user_id: Optional[str] = None

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None  # open, investigating, contained, resolved, closed
    assigned_user_id: Optional[str] = None
    resolution_summary: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    assigned_user_id: Optional[str] = None
    assigned_user_name: Optional[str] = None
    resolution_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    alerts_count: int = 0
    notes_count: int = 0

    class Config:
        from_attributes = True

# Ingestion Job Schemas
class IngestionJobResponse(BaseModel):
    id: str
    source_name: str
    file_name: str
    status: str
    total_records: int
    accepted_records: int
    rejected_records: int
    error_summary: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_name: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# Dashboard Schemas
class SummaryMetrics(BaseModel):
    total_events: int
    critical_alerts: int
    high_alerts: int
    failed_logins: int
    open_incidents: int
    events_today: int

class TrendPoint(BaseModel):
    time_label: str
    events: int
    failed_logins: int
    alerts: int

class SeverityCount(BaseModel):
    severity: str
    count: int

class SourceCount(BaseModel):
    source: str
    count: int

class EventTypeCount(BaseModel):
    event_type: str
    count: int

# AI Assistant
class AIAssistantRequest(BaseModel):
    query_type: str = "incident_summary"  # incident_summary, alert_analysis, event_explanation, log_translator
    target_id: Optional[str] = None  # incident_id, alert_id, or event_id
    custom_prompt: Optional[str] = None

class AIAssistantResponse(BaseModel):
    analysis_title: str
    summary: str
    technical_breakdown: List[str]
    mitre_attack_technique: Optional[str] = None
    risk_level: str
    recommended_actions: List[str]
    disclaimer: str = "Recommendation generated by CloudSentinel Security Intelligence Engine. Human verification required."
