from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import TelemetryCreate, TelemetryResponse, TelemetryHistoryResponse
from ..services.telemetry_service import (
    process_and_save_telemetry,
    get_latest_telemetry,
    get_telemetry_history,
)

router = APIRouter(prefix="/api/telemetry", tags=["Telemetry"])

@router.post("", response_model=TelemetryResponse, status_code=201)
def submit_telemetry(payload: TelemetryCreate, request: Request, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else None
    try:
        record = process_and_save_telemetry(db, payload, client_ip=client_ip)
        return record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist telemetry reading: {str(e)}")

@router.get("/latest", response_model=Optional[TelemetryResponse])
def latest_telemetry(
    is_simulated: bool = Query(False, description="Whether to fetch simulated or real hardware telemetry"),
    db: Session = Depends(get_db),
):
    record = get_latest_telemetry(db, is_simulated=is_simulated)
    return record

@router.get("/history", response_model=TelemetryHistoryResponse)
def telemetry_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    is_simulated: bool = Query(False),
    db: Session = Depends(get_db),
):
    total, items = get_telemetry_history(
        db, limit=limit, offset=offset, start_date=start_date, end_date=end_date, is_simulated=is_simulated
    )
    return TelemetryHistoryResponse(total=total, limit=limit, offset=offset, items=items)
