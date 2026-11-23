import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Table, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

# Association table between Alerts and SecurityEvents
alert_events_table = Table(
    "alert_events",
    Base.metadata,
    Column("alert_id", String(36), ForeignKey("alerts.id", ondelete="CASCADE"), primary_key=True),
    Column("event_id", String(36), ForeignKey("security_events.id", ondelete="CASCADE"), primary_key=True),
)

# Association table between Incidents and Alerts
incident_alerts_table = Table(
    "incident_alerts",
    Base.metadata,
    Column("incident_id", String(36), ForeignKey("incidents.id", ondelete="CASCADE"), primary_key=True),
    Column("alert_id", String(36), ForeignKey("alerts.id", ondelete="CASCADE"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="analyst")  # admin, analyst, viewer
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    assigned_incidents = relationship("Incident", back_populates="assigned_user")
    notes = relationship("IncidentNote", back_populates="author")

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_timestamp = Column(DateTime, index=True, nullable=False)
    ingestion_timestamp = Column(DateTime, default=utc_now, nullable=False)
    source_type = Column(String(50), index=True, nullable=False)  # authentication, cloud_iam, cloud_storage, system_activity, network_security, application_security
    source_name = Column(String(100), index=True, nullable=False)  # okta-idp, aws-cloudtrail, etc.
    username = Column(String(100), index=True, nullable=True)
    source_ip = Column(String(64), index=True, nullable=True)
    event_type = Column(String(100), index=True, nullable=False)  # login, role_modification, StopLogging, etc.
    action = Column(String(100), nullable=True)
    resource = Column(String(255), nullable=True)
    status = Column(String(50), index=True, nullable=False)  # success, failed, denied
    severity = Column(String(20), index=True, nullable=False, default="low")  # critical, high, medium, low, informational
    raw_log = Column(Text, nullable=True)
    fingerprint = Column(String(128), index=True, nullable=True)
    detection_status = Column(String(50), default="processed")  # processed, flagged, clean

    alerts = relationship("Alert", secondary=alert_events_table, back_populates="events")

class DetectionRule(Base):
    __tablename__ = "detection_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    rule_type = Column(String(50), nullable=False)  # brute_force, auth_failure, privilege_change, unauthorized_access, admin_tampering, off_hours_anomaly
    configuration = Column(JSON, nullable=False, default=dict)  # {"threshold": 5, "window_minutes": 5, ...}
    default_severity = Column(String(20), nullable=False, default="high")
    is_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    alerts = relationship("Alert", back_populates="rule")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_id = Column(String(36), ForeignKey("detection_rules.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), index=True, nullable=False)  # critical, high, medium, low, informational
    status = Column(String(30), index=True, default="new", nullable=False)  # new, acknowledged, investigating, resolved, false_positive
    first_seen = Column(DateTime, default=utc_now, nullable=False)
    last_seen = Column(DateTime, default=utc_now, nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)
    affected_user = Column(String(100), index=True, nullable=True)
    affected_ip = Column(String(64), index=True, nullable=True)
    recommended_action = Column(Text, nullable=True)
    dedup_key = Column(String(255), index=True, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    rule = relationship("DetectionRule", back_populates="alerts")
    events = relationship("SecurityEvent", secondary=alert_events_table, back_populates="alerts")
    incidents = relationship("Incident", secondary=incident_alerts_table, back_populates="alerts")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), index=True, nullable=False)  # critical, high, medium, low
    status = Column(String(30), index=True, default="open", nullable=False)  # open, investigating, contained, resolved, closed
    assigned_user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolution_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    assigned_user = relationship("User", back_populates="assigned_incidents")
    alerts = relationship("Alert", secondary=incident_alerts_table, back_populates="incidents")
    notes = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan")

class IncidentNote(Base):
    __tablename__ = "incident_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    incident = relationship("Incident", back_populates="notes")
    author = relationship("User", back_populates="notes")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True)
    actor_name = Column(String(100), nullable=False, default="System")
    action = Column(String(100), index=True, nullable=False)
    target_type = Column(String(50), nullable=False)
    target_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)

class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_name = Column(String(100), nullable=False)
    file_name = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="processing")  # processing, completed, failed
    total_records = Column(Integer, default=0, nullable=False)
    accepted_records = Column(Integer, default=0, nullable=False)
    rejected_records = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)
