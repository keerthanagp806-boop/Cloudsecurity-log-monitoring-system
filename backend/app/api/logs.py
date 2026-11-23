import os
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import IngestionJob, User
from app.schemas.schemas import IngestionJobResponse
from app.services.ingestion_service import process_log_content
from app.services.audit_service import log_audit_action
from app.api.auth import get_current_user

router = APIRouter(prefix="/logs", tags=["Log Ingestion"])

@router.post("/upload", response_model=IngestionJobResponse)
async def upload_log_file(
    file: UploadFile = File(...),
    source_name: Optional[str] = Form("Custom Upload"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Handles CSV and JSON log uploads, normalizes them, and runs detection engine."""
    # Check file size & extension
    if not file.filename.lower().endswith((".json", ".csv", ".log", ".txt")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload a .json or .csv log file."
        )

    content_bytes = await file.read()
    if len(content_bytes) > 20 * 1024 * 1024:  # 20MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit of 20MB."
        )

    try:
        content_str = content_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file encoding: {str(e)}")

    job = process_log_content(
        db=db,
        content=content_str,
        file_name=file.filename,
        source_name=source_name or "Custom Ingest"
    )

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="log_upload",
        target_type="ingestion_job",
        target_id=job.id,
        metadata_json={
            "file_name": file.filename,
            "accepted": job.accepted_records,
            "rejected": job.rejected_records
        }
    )

    return job

@router.get("/ingestion-jobs", response_model=List[IngestionJobResponse])
def list_ingestion_jobs(db: Session = Depends(get_db)):
    return db.query(IngestionJob).order_by(IngestionJob.started_at.desc()).limit(50).all()

@router.get("/ingestion-jobs/{job_id}", response_model=IngestionJobResponse)
def get_ingestion_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(IngestionJob).filter(IngestionJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Ingestion job not found")
    return job

@router.post("/load-sample/{sample_name}", response_model=IngestionJobResponse)
def load_sample_dataset(
    sample_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Loads one of the pre-built security attack scenarios for instant demonstration."""
    sample_files = {
        "brute_force": "auth_bruteforce_attack.json",
        "privilege_escalation": "privilege_escalation.csv",
        "cloud_tampering": "cloudtrail_tampering.json",
        "unauthorized_access": "unauthorized_access.csv",
        "enterprise_mix": "enterprise_siem_mix.json"
    }

    if sample_name not in sample_files:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sample scenario. Available: {list(sample_files.keys())}"
        )

    file_name = sample_files[sample_name]
    sample_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "sample_data", file_name)
    
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail=f"Sample file {file_name} not found on disk")

    with open(sample_path, "r", encoding="utf-8") as f:
        content = f.read()

    job = process_log_content(
        db=db,
        content=content,
        file_name=file_name,
        source_name=f"Sample: {sample_name.replace('_', ' ').title()}"
    )

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="load_sample_data",
        target_type="ingestion_job",
        target_id=job.id,
        metadata_json={"sample": sample_name, "accepted": job.accepted_records}
    )

    return job
