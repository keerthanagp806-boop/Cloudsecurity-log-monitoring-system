from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import DetectionRule, User
from app.schemas.schemas import DetectionRuleResponse, DetectionRuleCreate, DetectionRuleUpdate
from app.services.audit_service import log_audit_action
from app.api.auth import get_current_user, require_role

router = APIRouter(prefix="/rules", tags=["Detection Rules"])

@router.get("", response_model=List[DetectionRuleResponse])
def list_detection_rules(db: Session = Depends(get_db)):
    return db.query(DetectionRule).order_by(DetectionRule.created_at.asc()).all()

@router.get("/{rule_id}", response_model=DetectionRuleResponse)
def get_detection_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Detection rule not found")
    return rule

@router.post("", response_model=DetectionRuleResponse)
def create_detection_rule(
    rule_in: DetectionRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    existing = db.query(DetectionRule).filter(DetectionRule.rule_code == rule_in.rule_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Rule code already exists")

    new_rule = DetectionRule(**rule_in.model_dump())
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="rule_created",
        target_type="detection_rule",
        target_id=new_rule.id,
        metadata_json={"rule_code": new_rule.rule_code, "name": new_rule.name}
    )

    return new_rule

@router.patch("/{rule_id}", response_model=DetectionRuleResponse)
def update_detection_rule(
    rule_id: str,
    rule_update: DetectionRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Detection rule not found")

    update_data = rule_update.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="rule_updated",
        target_type="detection_rule",
        target_id=rule.id,
        metadata_json=update_data
    )

    return rule

@router.post("/{rule_id}/toggle", response_model=DetectionRuleResponse)
def toggle_detection_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    rule = db.query(DetectionRule).filter(DetectionRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Detection rule not found")

    rule.is_enabled = not rule.is_enabled
    db.commit()
    db.refresh(rule)

    log_audit_action(
        db=db,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action="rule_toggle",
        target_type="detection_rule",
        target_id=rule.id,
        metadata_json={"is_enabled": rule.is_enabled}
    )

    return rule
