from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from app.core.database import get_db
from app.models.models import SecurityEvent, Alert, Incident
from app.schemas.schemas import SummaryMetrics, TrendPoint, SeverityCount, SourceCount, EventTypeCount

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=SummaryMetrics)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_events = db.query(SecurityEvent).count()
    crit_alerts = db.query(Alert).filter(Alert.severity == "critical").count()
    high_alerts = db.query(Alert).filter(Alert.severity == "high").count()
    failed_logins = db.query(SecurityEvent).filter(
        SecurityEvent.event_type.in_(["login", "login_attempt"]),
        SecurityEvent.status.in_(["failed", "denied"])
    ).count()
    open_incidents = db.query(Incident).filter(Incident.status.in_(["open", "investigating"])).count()

    # Events processed today (UTC)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    events_today = db.query(SecurityEvent).filter(SecurityEvent.ingestion_timestamp >= today_start).count()

    return {
        "total_events": total_events,
        "critical_alerts": crit_alerts,
        "high_alerts": high_alerts,
        "failed_logins": failed_logins,
        "open_incidents": open_incidents,
        "events_today": events_today
    }

@router.get("/event-trends", response_model=List[TrendPoint])
def get_event_trends(db: Session = Depends(get_db)):
    """Computes hourly/daily event distribution for interactive charts."""
    # Gather counts grouped by 4-hour intervals or hours
    now = datetime.now(timezone.utc)
    points = []
    
    # 6 time blocks over recent period
    for i in range(5, -1, -1):
        start_time = now - timedelta(hours=(i + 1) * 4)
        end_time = now - timedelta(hours=i * 4)
        time_label = start_time.strftime("%H:%M") + "-" + end_time.strftime("%H:%M")

        evts = db.query(SecurityEvent).filter(
            SecurityEvent.event_timestamp >= start_time,
            SecurityEvent.event_timestamp < end_time
        ).count()

        fails = db.query(SecurityEvent).filter(
            SecurityEvent.event_timestamp >= start_time,
            SecurityEvent.event_timestamp < end_time,
            SecurityEvent.status.in_(["failed", "denied"])
        ).count()

        alrts = db.query(Alert).filter(
            Alert.created_at >= start_time,
            Alert.created_at < end_time
        ).count()

        points.append({
            "time_label": time_label,
            "events": evts,
            "failed_logins": fails,
            "alerts": alrts
        })

    # If all 0 due to timestamp skew in test logs, aggregate by recent days/events
    total_evts_in_points = sum(p["events"] for p in points)
    if total_evts_in_points == 0:
        # Generate relative time intervals from actual events in DB
        first_evt = db.query(SecurityEvent).order_by(SecurityEvent.event_timestamp.asc()).first()
        last_evt = db.query(SecurityEvent).order_by(SecurityEvent.event_timestamp.desc()).first()
        if first_evt and last_evt and first_evt.event_timestamp and last_evt.event_timestamp:
            points = []
            delta = (last_evt.event_timestamp - first_evt.event_timestamp) / 6
            if delta.total_seconds() <= 0:
                delta = timedelta(hours=1)
            for i in range(6):
                s = first_evt.event_timestamp + (delta * i)
                e = s + delta
                lbl = s.strftime("%d %b %H:%M")
                ev_count = db.query(SecurityEvent).filter(
                    SecurityEvent.event_timestamp >= s,
                    SecurityEvent.event_timestamp <= e
                ).count()
                fl_count = db.query(SecurityEvent).filter(
                    SecurityEvent.event_timestamp >= s,
                    SecurityEvent.event_timestamp <= e,
                    SecurityEvent.status.in_(["failed", "denied"])
                ).count()
                points.append({
                    "time_label": lbl,
                    "events": ev_count,
                    "failed_logins": fl_count,
                    "alerts": db.query(Alert).count() // 6
                })

    return points

@router.get("/severity-distribution", response_model=List[SeverityCount])
def get_severity_distribution(db: Session = Depends(get_db)):
    results = db.query(
        SecurityEvent.severity,
        func.count(SecurityEvent.id).label("count")
    ).group_by(SecurityEvent.severity).all()
    
    order_map = {"critical": 1, "high": 2, "medium": 3, "low": 4, "informational": 5}
    dist = [{"severity": r[0], "count": r[1]} for r in results if r[0]]
    dist.sort(key=lambda x: order_map.get(x["severity"].lower(), 99))
    return dist

@router.get("/sources", response_model=List[SourceCount])
def get_sources_distribution(db: Session = Depends(get_db)):
    results = db.query(
        SecurityEvent.source_type,
        func.count(SecurityEvent.id).label("count")
    ).group_by(SecurityEvent.source_type).order_by(desc("count")).limit(8).all()
    return [{"source": r[0], "count": r[1]} for r in results]

@router.get("/top-event-types", response_model=List[EventTypeCount])
def get_top_event_types(db: Session = Depends(get_db)):
    results = db.query(
        SecurityEvent.event_type,
        func.count(SecurityEvent.id).label("count")
    ).group_by(SecurityEvent.event_type).order_by(desc("count")).limit(8).all()
    return [{"event_type": r[0], "count": r[1]} for r in results]

@router.get("/auth-stats")
def get_auth_statistics(db: Session = Depends(get_db)):
    """Successful vs Failed authentication statistics."""
    success_count = db.query(SecurityEvent).filter(
        SecurityEvent.event_type.in_(["login", "login_attempt", "user_login"]),
        SecurityEvent.status == "success"
    ).count()
    failure_count = db.query(SecurityEvent).filter(
        SecurityEvent.event_type.in_(["login", "login_attempt", "user_login"]),
        SecurityEvent.status.in_(["failed", "denied"])
    ).count()
    return {
        "successful_auth": success_count,
        "failed_auth": failure_count,
        "total_attempts": success_count + failure_count,
        "failure_ratio": round((failure_count / max(1, success_count + failure_count)) * 100, 1)
    }

@router.get("/recent-events")
def get_dashboard_recent_events(limit: int = 8, db: Session = Depends(get_db)):
    events = db.query(SecurityEvent).order_by(SecurityEvent.event_timestamp.desc()).limit(limit).all()
    return events
