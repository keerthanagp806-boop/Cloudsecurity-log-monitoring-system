from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from app.core.database import get_db
from app.models.models import SecurityEvent, Alert
from app.schemas.schemas import SecurityEventResponse, PaginatedEventsResponse

router = APIRouter(prefix="/events", tags=["Security Events"])

@router.get("", response_model=PaginatedEventsResponse)
def list_events(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    username: Optional[str] = None,
    source_ip: Optional[str] = None,
    event_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityEvent)

    # Search filter across multiple fields
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                SecurityEvent.username.ilike(s),
                SecurityEvent.source_ip.ilike(s),
                SecurityEvent.event_type.ilike(s),
                SecurityEvent.action.ilike(s),
                SecurityEvent.resource.ilike(s),
                SecurityEvent.raw_log.ilike(s)
            )
        )

    if severity and severity.lower() != "all":
        query = query.filter(SecurityEvent.severity == severity.lower())
    if source_type and source_type.lower() != "all":
        query = query.filter(SecurityEvent.source_type == source_type)
    if status and status.lower() != "all":
        query = query.filter(SecurityEvent.status == status.lower())
    if username:
        query = query.filter(SecurityEvent.username.ilike(f"%{username.strip()}%"))
    if source_ip:
        query = query.filter(SecurityEvent.source_ip == source_ip.strip())
    if event_type:
        query = query.filter(SecurityEvent.event_type == event_type.strip())

    if start_date:
        try:
            dt_start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            query = query.filter(SecurityEvent.event_timestamp >= dt_start)
        except Exception:
            pass

    if end_date:
        try:
            dt_end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            query = query.filter(SecurityEvent.event_timestamp <= dt_end)
        except Exception:
            pass

    total = query.count()
    total_pages = (total + limit - 1) // limit if total > 0 else 1

    if order == "desc":
        query = query.order_by(SecurityEvent.event_timestamp.desc())
    else:
        query = query.order_by(SecurityEvent.event_timestamp.asc())

    items = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@router.get("/{event_id}")
def get_event_details(event_id: str, db: Session = Depends(get_db)):
    event = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Security event not found")

    # Get linked alerts if any
    linked_alerts = [
        {
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "status": a.status,
            "rule_name": a.rule.name if a.rule else "Rule"
        }
        for a in event.alerts
    ]

    return {
        "event": event,
        "linked_alerts": linked_alerts
    }
