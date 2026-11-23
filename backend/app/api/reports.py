from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.core.database import get_db
from app.models.models import SecurityEvent, Alert, Incident, DetectionRule
from app.services.report_service import generate_events_csv, generate_incidents_csv, generate_security_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports and Analytics"])

@router.get("/security-summary")
def get_security_summary_report(db: Session = Depends(get_db)):
    """Comprehensive aggregated summary of environment threat posture."""
    total_events = db.query(SecurityEvent).count()
    alerts_by_sev = db.query(Alert.severity, func.count(Alert.id)).group_by(Alert.severity).all()
    incidents_by_status = db.query(Incident.status, func.count(Incident.id)).group_by(Incident.status).all()

    top_rules = db.query(
        DetectionRule.name,
        DetectionRule.rule_code,
        func.count(Alert.id).label("alert_count")
    ).join(Alert, Alert.rule_id == DetectionRule.id)\
     .group_by(DetectionRule.id)\
     .order_by(desc("alert_count"))\
     .limit(5).all()

    return {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_events": total_events,
        "alerts_by_severity": {r[0]: r[1] for r in alerts_by_sev},
        "incidents_by_status": {r[0]: r[1] for r in incidents_by_status},
        "top_triggered_rules": [
            {"name": r.name, "rule_code": r.rule_code, "count": r.alert_count}
            for r in top_rules
        ]
    }

@router.get("/events/export")
def export_events_csv(
    severity: Optional[str] = None,
    limit: int = Query(500, ge=1, le=5000),
    db: Session = Depends(get_db)
):
    query = db.query(SecurityEvent)
    if severity and severity.lower() != "all":
        query = query.filter(SecurityEvent.severity == severity.lower())
    events = query.order_by(SecurityEvent.event_timestamp.desc()).limit(limit).all()

    csv_data = generate_events_csv(events)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cloudsentinel_security_events.csv"}
    )

@router.get("/incidents/export")
def export_incidents_csv(db: Session = Depends(get_db)):
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    csv_data = generate_incidents_csv(incidents)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cloudsentinel_incidents.csv"}
    )

@router.get("/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    pdf_bytes = generate_security_pdf_report(db, title="CloudSentinel Security Executive Summary Report")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=cloudsentinel_security_report.pdf"}
    )
