from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_audit_action(
    db: Session,
    actor_id: Optional[str],
    actor_name: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None
) -> AuditLog:
    """Records an immutable audit entry in the database."""
    entry = AuditLog(
        actor_id=actor_id,
        actor_name=actor_name,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        metadata_json=metadata_json or {},
        timestamp=datetime.now(timezone.utc)
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
