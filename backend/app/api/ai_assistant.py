from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import User
from app.schemas.schemas import AIAssistantRequest, AIAssistantResponse
from app.services.ai_service import analyze_security_context
from app.api.auth import get_current_user

router = APIRouter(prefix="/ai", tags=["AI Security Assistant"])

@router.post("/analyze", response_model=AIAssistantResponse)
def analyze_security(
    request: AIAssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates structured, MITRE-aligned AI security triage and runbooks with safety guardrails."""
    result = analyze_security_context(
        db=db,
        query_type=request.query_type,
        target_id=request.target_id,
        custom_prompt=request.custom_prompt
    )
    return result
