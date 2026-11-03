from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import DeviceStatusResponse
from ..services.telemetry_service import get_device_status

router = APIRouter(prefix="/api/device", tags=["Device"])

@router.get("/status", response_model=DeviceStatusResponse)
def device_status(
    device_id: str = Query("ESP32-PV-01", description="Device ID identifier"),
    db: Session = Depends(get_db),
):
    return get_device_status(db, device_id=device_id)
