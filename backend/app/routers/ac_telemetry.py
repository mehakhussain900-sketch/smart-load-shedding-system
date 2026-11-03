"""
routers/ac_telemetry.py
=======================
API endpoints for AC power telemetry from ZMPT101B + ACS712-30A sensors.

Prefix: /api/ac-telemetry
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..schemas import AcTelemetryCreate, AcTelemetryResponse, AcTelemetryHistoryResponse
from ..models import AcTelemetryRecord
from ..services.load_shed_service import process_ac_telemetry

router = APIRouter(prefix="/api/ac-telemetry", tags=["AC Telemetry"])


@router.get("")
def get_ac_telemetry_info(db: Session = Depends(get_db)):
    """Status endpoint for browsers opening /api/ac-telemetry."""
    latest = db.query(AcTelemetryRecord).order_by(desc(AcTelemetryRecord.timestamp)).first()
    count = db.query(AcTelemetryRecord).count()
    return {
        "status": "online",
        "endpoint": "/api/ac-telemetry",
        "description": "ESP32 AC Telemetry Receiver Endpoint (accepts POST requests from ESP32)",
        "total_records_received": count,
        "latest_device_id": latest.device_id if latest else None,
        "latest_timestamp": latest.timestamp.isoformat() if latest and latest.timestamp else None,
        "latest_voltage": latest.ac_voltage if latest else None,
        "latest_current": latest.ac_current if latest else None,
        "latest_power_w": latest.power_w if latest else None,
    }


@router.post("", response_model=AcTelemetryResponse, status_code=201)
def submit_ac_telemetry(
    payload: AcTelemetryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Receive an AC telemetry reading from the ESP32 node.

    Persists the reading, integrates energy, and evaluates auto-shedding.
    """
    try:
        record = process_ac_telemetry(
            db=db,
            device_id=payload.device_id,
            timestamp=payload.timestamp,
            ac_voltage=payload.ac_voltage,
            ac_current=payload.ac_current,
            power_w=payload.power_w,
            energy_wh_input=payload.energy_wh,
            relay_states_dict=payload.relay_states,
            is_simulated=payload.is_simulated,
        )
        return record
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist AC telemetry: {str(e)}")


@router.get("/latest", response_model=Optional[AcTelemetryResponse])
def latest_ac_telemetry(
    is_simulated: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Return the most recent AC telemetry record."""
    record = (
        db.query(AcTelemetryRecord)
        .filter(AcTelemetryRecord.is_simulated == is_simulated)
        .order_by(desc(AcTelemetryRecord.timestamp))
        .first()
    )
    return record


@router.get("/history", response_model=AcTelemetryHistoryResponse)
def ac_telemetry_history(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    is_simulated: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Return paginated AC telemetry history."""
    query = db.query(AcTelemetryRecord).filter(
        AcTelemetryRecord.is_simulated == is_simulated
    )
    if start_date:
        query = query.filter(AcTelemetryRecord.timestamp >= start_date)
    if end_date:
        query = query.filter(AcTelemetryRecord.timestamp <= end_date)

    total = query.count()
    items = query.order_by(desc(AcTelemetryRecord.timestamp)).offset(offset).limit(limit).all()

    return AcTelemetryHistoryResponse(total=total, limit=limit, offset=offset, items=items)
