import csv
import json
import hashlib
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from app.models.models import SecurityEvent, IngestionJob
from app.services.detection_engine import evaluate_events

def parse_iso_timestamp(ts_str: Any) -> datetime:
    """Safely parse various datetime formats to UTC datetime."""
    if isinstance(ts_str, datetime):
        return ts_str if ts_str.tzinfo else ts_str.replace(tzinfo=timezone.utc)
    
    if not ts_str:
        return datetime.now(timezone.utc)

    s = str(ts_str).strip()
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:
        pass
    
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%d/%b/%Y:%H:%M:%S %z",
        "%Y/%m/%d %H:%M:%S"
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s, fmt)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            continue
            
    return datetime.now(timezone.utc)

def compute_fingerprint(data: Dict[str, Any]) -> str:
    key_fields = [
        str(data.get("timestamp") or data.get("event_timestamp") or ""),
        str(data.get("username") or ""),
        str(data.get("source_ip") or ""),
        str(data.get("event_type") or ""),
        str(data.get("action") or ""),
        str(data.get("resource") or "")
    ]
    return hashlib.sha256("|".join(key_fields).encode("utf-8")).hexdigest()

def normalize_status(raw_status: Any) -> str:
    st = str(raw_status or "").lower().strip()
    if any(w in st for w in ["fail", "error", "401", "unauthorized"]):
        return "failed"
    if any(w in st for w in ["deny", "denied", "403", "forbidden"]):
        return "denied"
    if any(w in st for w in ["success", "200", "ok", "allow"]):
        return "success"
    return "success" if not st else st

def normalize_severity(raw_sev: Any, status: str, event_type: str) -> str:
    s = str(raw_sev or "").lower().strip()
    if s in ["critical", "high", "medium", "low", "informational"]:
        return s
    # Default heuristics if not provided
    if "tamper" in event_type.lower() or "privilege" in event_type.lower():
        return "critical"
    if status in ["failed", "denied"]:
        return "medium"
    return "informational"

def process_single_record(record: Dict[str, Any]) -> Tuple[Optional[SecurityEvent], Optional[str]]:
    """Validates and converts a dictionary into a normalized SecurityEvent model."""
    try:
        # Check required fields
        event_type = record.get("event_type") or record.get("action") or record.get("eventType")
        if not event_type:
            return None, "Missing required event_type or action field"

        source_type = record.get("source") or record.get("source_type") or record.get("sourceType") or "cloud_security"
        source_name = record.get("source_system") or record.get("source_name") or record.get("service") or "cloud-sentinel-agent"
        
        timestamp = parse_iso_timestamp(record.get("timestamp") or record.get("event_timestamp") or record.get("eventTime"))
        username = record.get("username") or record.get("user") or record.get("userId") or record.get("principal")
        source_ip = record.get("source_ip") or record.get("sourceIPAddress") or record.get("ip") or record.get("client_ip")
        action = record.get("action") or record.get("eventName") or event_type
        resource = record.get("resource") or record.get("target") or record.get("arn") or record.get("resource_name")
        status = normalize_status(record.get("status") or record.get("result") or record.get("errorCode"))
        severity = normalize_severity(record.get("severity"), status, str(event_type))
        details = record.get("details") or record.get("message") or record.get("errorMessage")

        raw_str = json.dumps(record, default=str)
        fp = compute_fingerprint(record)

        event = SecurityEvent(
            event_timestamp=timestamp,
            ingestion_timestamp=datetime.now(timezone.utc),
            source_type=str(source_type)[:50],
            source_name=str(source_name)[:100],
            username=str(username)[:100] if username else None,
            source_ip=str(source_ip)[:64] if source_ip else None,
            event_type=str(event_type)[:100],
            action=str(action)[:100] if action else None,
            resource=str(resource)[:255] if resource else None,
            status=status[:50],
            severity=severity[:20],
            raw_log=details if details else raw_str,
            fingerprint=fp,
            detection_status="processed"
        )
        return event, None
    except Exception as e:
        return None, f"Parsing exception: {str(e)}"

def process_log_content(
    db: Session,
    content: str,
    file_name: str,
    source_name: str
) -> IngestionJob:
    """Ingests log content (JSON or CSV), normalizes records, and triggers detection."""
    now = datetime.now(timezone.utc)
    job = IngestionJob(
        source_name=source_name,
        file_name=file_name,
        status="processing",
        total_records=0,
        accepted_records=0,
        rejected_records=0,
        error_summary="",
        started_at=now
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    records: List[Dict[str, Any]] = []
    errors: List[str] = []

    # Detect JSON vs CSV
    clean_content = content.strip()
    if clean_content.startswith("[") or clean_content.startswith("{"):
        try:
            parsed = json.loads(clean_content)
            if isinstance(parsed, list):
                records = parsed
            elif isinstance(parsed, dict):
                # might be single object or {"events": [...]} or CloudTrail {"Records": [...]}
                if "Records" in parsed and isinstance(parsed["Records"], list):
                    records = parsed["Records"]
                elif "events" in parsed and isinstance(parsed["events"], list):
                    records = parsed["events"]
                else:
                    records = [parsed]
        except Exception as e:
            job.status = "failed"
            job.error_summary = f"Invalid JSON syntax: {str(e)}"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return job
    else:
        # CSV parsing
        try:
            reader = csv.DictReader(io.StringIO(clean_content))
            for row in reader:
                records.append(dict(row))
        except Exception as e:
            job.status = "failed"
            job.error_summary = f"Invalid CSV structure: {str(e)}"
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            return job

    job.total_records = len(records)
    accepted_events: List[SecurityEvent] = []

    for idx, raw_record in enumerate(records):
        event, err = process_single_record(raw_record)
        if event:
            db.add(event)
            accepted_events.append(event)
        else:
            job.rejected_records += 1
            if len(errors) < 10:
                errors.append(f"Row {idx+1}: {err}")

    job.accepted_records = len(accepted_events)
    if errors:
        job.error_summary = "\n".join(errors)
        if job.accepted_records == 0:
            job.status = "failed"
        else:
            job.status = "completed_with_warnings"
    else:
        job.status = "completed"

    db.commit()

    # Trigger threat detection engine on accepted events
    if accepted_events:
        evaluate_events(db, accepted_events)

    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)
    return job
