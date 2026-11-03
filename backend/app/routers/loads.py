"""
routers/loads.py
================
API endpoints for load configuration, relay commands, demand settings,
shedding events, and shed status.

Prefix: /api/loads
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import (
    LoadConfigResponse,
    LoadConfigUpdate,
    RelayCommandRequest,
    LoadSheddingEventResponse,
    DemandSettingsResponse,
    DemandSettingsUpdate,
    ShedStatusResponse,
    FullSystemConfigResponse,
    FullSystemConfigUpdate,
)
from ..services.load_shed_service import (
    get_load_configs,
    get_load_config,
    update_load_config,
    manual_relay_command,
    get_shedding_events,
    get_or_seed_settings,
    update_demand_settings,
    get_shed_status,
    get_relay_states,
    reset_default_configs,
)

router = APIRouter(prefix="/api/loads", tags=["Load Management"])


# NOTE: Literal-path routes MUST come before parameterized routes
# so FastAPI does not match "settings" or "events" as a load_id.

@router.get("/config", response_model=FullSystemConfigResponse)
def get_full_config(db: Session = Depends(get_db)):
    """Retrieve full consolidated system configuration (settings + all load configs)."""
    settings_data = get_or_seed_settings(db)
    loads_data = get_load_configs(db)
    return FullSystemConfigResponse(settings=settings_data, loads=loads_data)


@router.put("/config", response_model=FullSystemConfigResponse)
def update_full_config(body: FullSystemConfigUpdate, db: Session = Depends(get_db)):
    """Update settings and/or multiple load configs atomically."""
    if body.settings:
        update_demand_settings(db, body.settings.model_dump(exclude_none=True))
    if body.loads:
        for load_update in body.loads:
            if load_update.id:
                update_load_config(db, load_update.id.upper(), load_update.model_dump(exclude_none=True))
    settings_data = get_or_seed_settings(db)
    loads_data = get_load_configs(db)
    return FullSystemConfigResponse(settings=settings_data, loads=loads_data)


@router.post("/reset-defaults", response_model=FullSystemConfigResponse)
def reset_to_defaults(db: Session = Depends(get_db)):
    """Reset system configuration and loads back to initial baseline defaults."""
    settings_data, loads_data = reset_default_configs(db)
    return FullSystemConfigResponse(settings=settings_data, loads=loads_data)


@router.get("/settings", response_model=DemandSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retrieve current demand threshold and shedding parameters."""
    return get_or_seed_settings(db)


@router.put("/settings", response_model=DemandSettingsResponse)
def update_settings(body: DemandSettingsUpdate, db: Session = Depends(get_db)):
    """Update demand threshold, cooldown, hysteresis, or auto-mode."""
    return update_demand_settings(db, body.model_dump(exclude_none=True))


@router.get("/events", response_model=list[LoadSheddingEventResponse])
def list_events(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    is_simulated: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    """Retrieve load shedding / restoration event history."""
    _, items = get_shedding_events(db, limit=limit, offset=offset, is_simulated=is_simulated)
    return items


@router.get("/status", response_model=ShedStatusResponse)
def shed_status(
    is_simulated: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Return current shed status: power utilization, active/shed loads, last event."""
    return get_shed_status(db, is_simulated=is_simulated)


@router.get("/relay-states")
def relay_states(
    is_simulated: bool = Query(False),
    db: Session = Depends(get_db),
):
    """Return confirmed ON/OFF state for each load derived from the event log."""
    return get_relay_states(db, is_simulated=is_simulated)


@router.get("", response_model=list[LoadConfigResponse])
def list_loads(db: Session = Depends(get_db)):
    """Return all 6 load/relay configurations ordered by priority."""
    return get_load_configs(db)


@router.put("/{load_id}", response_model=LoadConfigResponse)
def update_load(load_id: str, body: LoadConfigUpdate, db: Session = Depends(get_db)):
    """Update name, rated power, priority, essential flag, or enabled state of a load."""
    updated = update_load_config(db, load_id.upper(), body.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Load '{load_id}' not found")
    return updated


@router.post("/{load_id}/command", response_model=LoadSheddingEventResponse, status_code=201)
def relay_command(load_id: str, body: RelayCommandRequest, db: Session = Depends(get_db)):
    """Issue a manual ON/OFF command to a relay channel."""
    if body.action.lower() not in ("on", "off"):
        raise HTTPException(status_code=422, detail="action must be 'on' or 'off'")
    load = get_load_config(db, load_id.upper())
    if not load:
        raise HTTPException(status_code=404, detail=f"Load '{load_id}' not found")
    event = manual_relay_command(
        db=db,
        load_id=load_id.upper(),
        action=body.action,
        reason=body.reason or "Manual command via dashboard",
        is_simulated=body.is_simulated,
    )
    return event
