from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AIStatusResponse
from ..services.ai_service import get_ai_and_health_status

router = APIRouter(prefix="/api/ai", tags=["AI & Health"])

@router.get("/status", response_model=AIStatusResponse)
def ai_status(
    is_simulated: bool = Query(False, description="Filter for simulated or real telemetry AI status"),
    db: Session = Depends(get_db),
):
    return get_ai_and_health_status(db, is_simulated=is_simulated)
