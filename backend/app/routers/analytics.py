from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import AnalyticsSummaryResponse
from ..services.analytics_service import get_analytics_summary

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def analytics_summary(
    is_simulated: bool = Query(False, description="Filter for simulated or real telemetry summary"),
    db: Session = Depends(get_db),
):
    return get_analytics_summary(db, is_simulated=is_simulated)
