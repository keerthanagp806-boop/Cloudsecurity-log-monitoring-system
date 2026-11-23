from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.core.database import get_db
from app.models.models import Alert, User, SecurityEvent
from app.schemas.schemas import AlertResponse, AlertStatusUpdate
from app.services.audit_service import log_audit_action
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/alerts", tags=["Security Alerts"])

@router.get("", response_model=List[AlertResponse])
def list_alerts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    if severity and severity.lower() != "all":
        query = query.filter(Alert.severity == severity.lower())
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Alert.status == status_filter.lower())
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Alert.title.ilike(s),
                Alert.description.ilike(s),
                Alert.affected_user.ilike(s),
                Alert.affected_ip.ilike(s)
            )
        )

    alerts = query.order_by(Alert.created_at.desc()).all()
    # Populate rule_name for display
    for a in alerts:
        a.rule_name = a.rule.name if a.rule else "Detection Engine"
    return alerts

@router.get("/{alert_id}")
def get_alert_detail(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    events_summary = [
        {
            "id": e.id,
            "timestamp": e.event_timestamp,
            "event_type": e.event_type,
            "action": e.action,
            "username": e.username,
            "source_ip": e.source_ip,
            "resource": e.resource,
            "status": e.status,
            "severity": e.severity,
            "raw_log": e.raw_log
        }
        for e in alert.events
    ]

    return {
        "alert": alert,
        "rule_name": alert.rule.name if alert.rule else "Detection Engine",
        "events": events_summary
    }

@router.patch("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(
    alert_id: str,
    update_in: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    valid_statuses = ["new", "acknowledged", "investigating", "resolved", "false_positive"]
    new_status = update_in.status.lower().strip()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    old_status = alert.status
    alert.status = new_status
    db.commit()
    db.refresh(alert)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="alert_status_change",
        target_type="alert",
        target_id=alert.id,
        metadata_json={
            "old_status": old_status,
            "new_status": new_status,
            "note": update_in.note
        }
    )

    alert.rule_name = alert.rule.name if alert.rule else "Detection Engine"
    return alert
