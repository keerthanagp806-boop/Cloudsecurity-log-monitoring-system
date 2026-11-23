from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Incident, Alert, SecurityEvent, IncidentNote, User
from app.schemas.schemas import (
    IncidentCreate, IncidentUpdate, IncidentResponse,
    IncidentNoteCreate, IncidentNoteResponse
)
from app.services.audit_service import log_audit_action
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/incidents", tags=["Incident Management"])

@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Incident)
    if status_filter and status_filter.lower() != "all":
        query = query.filter(Incident.status == status_filter.lower())
    if severity and severity.lower() != "all":
        query = query.filter(Incident.severity == severity.lower())

    incidents = query.order_by(Incident.created_at.desc()).all()
    results = []
    for inc in incidents:
        results.append(IncidentResponse(
            id=inc.id,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            status=inc.status,
            assigned_user_id=inc.assigned_user_id,
            assigned_user_name=inc.assigned_user.name if inc.assigned_user else "Unassigned",
            resolution_summary=inc.resolution_summary,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            resolved_at=inc.resolved_at,
            alerts_count=len(inc.alerts),
            notes_count=len(inc.notes)
        ))
    return results

@router.post("", response_model=IncidentResponse)
def create_incident(
    inc_in: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    now = datetime.now(timezone.utc)
    new_inc = Incident(
        title=inc_in.title,
        description=inc_in.description,
        severity=inc_in.severity,
        status="open",
        assigned_user_id=inc_in.assigned_user_id or current_user.id,
        created_at=now,
        updated_at=now
    )
    db.add(new_inc)
    db.flush()

    # Link alerts
    if inc_in.alert_ids:
        alerts = db.query(Alert).filter(Alert.id.in_(inc_in.alert_ids)).all()
        for a in alerts:
            new_inc.alerts.append(a)
            # update alert status to investigating
            a.status = "investigating"

    db.commit()
    db.refresh(new_inc)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="incident_created",
        target_type="incident",
        target_id=new_inc.id,
        metadata_json={"title": new_inc.title, "severity": new_inc.severity}
    )

    return IncidentResponse(
        id=new_inc.id,
        title=new_inc.title,
        description=new_inc.description,
        severity=new_inc.severity,
        status=new_inc.status,
        assigned_user_id=new_inc.assigned_user_id,
        assigned_user_name=new_inc.assigned_user.name if new_inc.assigned_user else None,
        resolution_summary=new_inc.resolution_summary,
        created_at=new_inc.created_at,
        updated_at=new_inc.updated_at,
        resolved_at=new_inc.resolved_at,
        alerts_count=len(new_inc.alerts),
        notes_count=0
    )

@router.get("/{incident_id}")
def get_incident_detail(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    linked_alerts = [
        {
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "status": a.status,
            "occurrence_count": a.occurrence_count,
            "affected_user": a.affected_user,
            "affected_ip": a.affected_ip,
            "created_at": a.created_at
        }
        for a in inc.alerts
    ]

    notes = [
        {
            "id": n.id,
            "note": n.note,
            "author_name": n.author.name if n.author else "Analyst",
            "created_at": n.created_at
        }
        for n in inc.notes
    ]

    return {
        "incident": IncidentResponse(
            id=inc.id,
            title=inc.title,
            description=inc.description,
            severity=inc.severity,
            status=inc.status,
            assigned_user_id=inc.assigned_user_id,
            assigned_user_name=inc.assigned_user.name if inc.assigned_user else "Unassigned",
            resolution_summary=inc.resolution_summary,
            created_at=inc.created_at,
            updated_at=inc.updated_at,
            resolved_at=inc.resolved_at,
            alerts_count=len(inc.alerts),
            notes_count=len(inc.notes)
        ),
        "alerts": linked_alerts,
        "notes": notes
    }

@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: str,
    update_in: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    up_data = update_in.model_dump(exclude_unset=True)
    for field, val in up_data.items():
        setattr(inc, field, val)

    inc.updated_at = datetime.now(timezone.utc)
    if update_in.status in ["resolved", "closed"] and not inc.resolved_at:
        inc.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(inc)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="incident_updated",
        target_type="incident",
        target_id=inc.id,
        metadata_json=up_data
    )

    return IncidentResponse(
        id=inc.id,
        title=inc.title,
        description=inc.description,
        severity=inc.severity,
        status=inc.status,
        assigned_user_id=inc.assigned_user_id,
        assigned_user_name=inc.assigned_user.name if inc.assigned_user else "Unassigned",
        resolution_summary=inc.resolution_summary,
        created_at=inc.created_at,
        updated_at=inc.updated_at,
        resolved_at=inc.resolved_at,
        alerts_count=len(inc.alerts),
        notes_count=len(inc.notes)
    )

@router.post("/{incident_id}/notes", response_model=IncidentNoteResponse)
def add_incident_note(
    incident_id: str,
    note_in: IncidentNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "analyst"]))
):
    inc = db.query(Incident).filter(Incident.id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found")

    note = IncidentNote(
        incident_id=inc.id,
        author_id=current_user.id,
        note=note_in.note,
        created_at=datetime.now(timezone.utc)
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="incident_note_added",
        target_type="incident",
        target_id=inc.id
    )

    return IncidentNoteResponse(
        id=note.id,
        incident_id=note.incident_id,
        author_id=note.author_id,
        author_name=current_user.name,
        note=note.note,
        created_at=note.created_at
    )
