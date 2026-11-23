from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from app.core.database import get_db
from app.models.models import SecurityEvent, Alert

router = APIRouter(prefix="/analytics", tags=["IP and User Analytics"])

@router.get("/ip-activity")
def get_ip_activity(db: Session = Depends(get_db)):
    """Aggregates source IP metrics, failed attempts, and flagged risk indicators."""
    results = db.query(
        SecurityEvent.source_ip,
        func.count(SecurityEvent.id).label("total_events"),
        func.sum(case((SecurityEvent.status.in_(["failed", "denied"]), 1), else_=0)).label("failed_events"),
        func.max(SecurityEvent.event_timestamp).label("last_active")
    ).filter(SecurityEvent.source_ip.isnot(None))\
     .group_by(SecurityEvent.source_ip)\
     .order_by(desc("total_events"))\
     .limit(15).all()

    ip_stats = []
    for r in results:
        tot = r.total_events or 0
        fail = r.failed_events or 0
        fail_pct = round((fail / max(1, tot)) * 100, 1)

        # Count alerts associated with this IP
        alert_count = db.query(Alert).filter(Alert.affected_ip == r.source_ip).count()
        
        # Risk classification heuristic
        if alert_count > 0 or fail >= 5:
            risk = "HIGH"
        elif fail >= 2 or fail_pct > 30:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        ip_stats.append({
            "source_ip": r.source_ip,
            "total_events": tot,
            "failed_events": fail,
            "failure_rate": fail_pct,
            "alert_count": alert_count,
            "risk_score": risk,
            "last_active": r.last_active
        })

    return {
        "items": ip_stats,
        "disclaimer": "Note: An IP address associated with suspicious activity is not automatically malicious. Correlation requires contextual verification."
    }

@router.get("/user-activity")
def get_user_activity(db: Session = Depends(get_db)):
    """Aggregates user account activities, authentication trends, and security alerts."""
    results = db.query(
        SecurityEvent.username,
        func.count(SecurityEvent.id).label("total_events"),
        func.sum(case((SecurityEvent.status.in_(["failed", "denied"]), 1), else_=0)).label("failed_events"),
        func.sum(case((SecurityEvent.status == "success", 1), else_=0)).label("success_events"),
        func.max(SecurityEvent.event_timestamp).label("last_active")
    ).filter(SecurityEvent.username.isnot(None))\
     .group_by(SecurityEvent.username)\
     .order_by(desc("total_events"))\
     .limit(15).all()

    user_stats = []
    for r in results:
        tot = r.total_events or 0
        fail = r.failed_events or 0
        succ = r.success_events or 0
        alert_count = db.query(Alert).filter(Alert.affected_user == r.username).count()

        if alert_count > 0 or fail >= 5:
            risk = "HIGH"
        elif fail >= 2:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        user_stats.append({
            "username": r.username,
            "total_events": tot,
            "failed_attempts": fail,
            "successful_attempts": succ,
            "associated_alerts": alert_count,
            "risk_status": risk,
            "last_active": r.last_active
        })

    return {"items": user_stats}
