from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import DemandAnalysisResponse
from ..services.demand_service import get_demand_analysis

router = APIRouter(prefix="/api/demand", tags=["Demand Analysis"])

@router.get("/summary", response_model=DemandAnalysisResponse)
def demand_analysis(
    is_simulated: bool = Query(False, description="Filter for simulated or real load telemetry"),
    db: Session = Depends(get_db),
):
    return get_demand_analysis(db, is_simulated=is_simulated)
