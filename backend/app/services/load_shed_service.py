"""
load_shed_service.py
====================
Business logic for:
  - Seeding default load configurations on first startup
  - Retrieving / updating load configs and demand settings
  - Tracking current relay states via the event log
  - Evaluating automatic load-shedding decisions
  - Recording manual relay commands
  - Persisting AC telemetry readings

The shedding algorithm is stateless-per-call (no background thread) so it is
safe to call from any request handler.  Cooldown is enforced by querying the
last event timestamp from the database.
"""

import json
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..models import (
    LoadConfig,
    LoadSheddingEvent,
    DemandSettings,
    AcTelemetryRecord,
)
from ..config import settings

# ---------------------------------------------------------------------------
# Default load configuration seed data (Initial defaults: 5 loads @ 100W, L1-L3 Essential, L4-L5 Heavy)
# ---------------------------------------------------------------------------

DEFAULT_LOADS = [
    dict(id="L1", name="L1 - Essential Load 1", rated_power_w=100.0, priority=1, is_essential=True,  category="Essential", relay_channel=1, is_enabled=True, gpio_pin=26, relay_active_low=True),
    dict(id="L2", name="L2 - Essential Load 2", rated_power_w=100.0, priority=2, is_essential=True,  category="Essential", relay_channel=2, is_enabled=True, gpio_pin=27, relay_active_low=True),
    dict(id="L3", name="L3 - Essential Load 3", rated_power_w=100.0, priority=3, is_essential=True,  category="Essential", relay_channel=3, is_enabled=True, gpio_pin=25, relay_active_low=True),
    dict(id="L4", name="L4 - Heavy Load 1",     rated_power_w=100.0, priority=4, is_essential=False, category="Heavy",     relay_channel=4, is_enabled=True, gpio_pin=33, relay_active_low=True),
    dict(id="L5", name="L5 - Heavy Load 2",     rated_power_w=100.0, priority=5, is_essential=False, category="Heavy",     relay_channel=5, is_enabled=True, gpio_pin=32, relay_active_low=True),
]


def seed_load_configs(db: Session) -> None:
    """Insert default load configurations and demand settings if not already present."""
    existing_ids = {row[0] for row in db.query(LoadConfig.id).all()}
    for load_data in DEFAULT_LOADS:
        if load_data["id"] not in existing_ids:
            db.add(LoadConfig(**load_data))
            existing_ids.add(load_data["id"])
    db.commit()

    if not db.query(DemandSettings).first():
        db.add(DemandSettings(
            threshold_w=settings.DEMAND_THRESHOLD_W,
            confirmation_sec=settings.SHED_CONFIRMATION_SEC,
            cooldown_sec=settings.SHED_COOLDOWN_SEC,
            restoration_hysteresis_w=settings.RESTORATION_HYSTERESIS_W,
            auto_mode=True,
            auto_restore_enabled=True,
            transformer_rating_va=settings.TRANSFORMER_RATING_VA,
            power_factor=settings.DEFAULT_POWER_FACTOR,
            device_id=settings.DEVICE_ID,
            telemetry_interval_sec=settings.TELEMETRY_INTERVAL_SEC,
        ))
        db.commit()


# ---------------------------------------------------------------------------
# Load configuration helpers
# ---------------------------------------------------------------------------

def get_load_configs(db: Session) -> List[LoadConfig]:
    # Auto-seed if table is empty (handles test isolation cleanups)
    if db.query(LoadConfig).count() == 0:
        seed_load_configs(db)
    return db.query(LoadConfig).order_by(LoadConfig.priority).all()


def get_load_config(db: Session, load_id: str) -> Optional[LoadConfig]:
    return db.query(LoadConfig).filter(LoadConfig.id == load_id).first()


def update_load_config(db: Session, load_id: str, updates: dict) -> Optional[LoadConfig]:
    load = get_load_config(db, load_id)
    if not load:
        return None

    # Handle Category & Essential bidirectional synchronization
    if "category" in updates and updates["category"]:
        cat = str(updates["category"]).strip()
        load.category = cat
        load.is_essential = (cat.lower() == "essential")
    elif "is_essential" in updates and updates["is_essential"] is not None:
        is_ess = bool(updates["is_essential"])
        load.is_essential = is_ess
        load.category = "Essential" if is_ess else "Heavy"

    for key, value in updates.items():
        if key in ("category", "is_essential"):
            continue
        if hasattr(load, key) and value is not None:
            # Validate numeric bounds
            if key == "rated_power_w":
                value = max(0.0, float(value))
            elif key == "priority":
                value = max(1, int(value))
            setattr(load, key, value)

    db.commit()
    db.refresh(load)
    return load


def reset_default_configs(db: Session) -> Tuple[DemandSettings, List[LoadConfig]]:
    """Restore the system configuration back to initial baseline defaults."""
    db.query(LoadConfig).delete()
    for load_data in DEFAULT_LOADS:
        db.add(LoadConfig(**load_data))

    settings_row = get_or_seed_settings(db)
    settings_row.threshold_w = 250.0
    settings_row.confirmation_sec = 2.0
    settings_row.cooldown_sec = 3.0
    settings_row.restoration_hysteresis_w = 20.0
    settings_row.auto_mode = True
    settings_row.auto_restore_enabled = True
    settings_row.transformer_rating_va = 1000.0
    settings_row.power_factor = 0.8
    settings_row.device_id = "ESP32_LOAD_SHEDDING_01"
    settings_row.telemetry_interval_sec = 2.0
    settings_row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)

    db.commit()
    db.refresh(settings_row)
    loads = get_load_configs(db)
    return settings_row, loads


# ---------------------------------------------------------------------------
# Demand settings helpers
# ---------------------------------------------------------------------------

def get_or_seed_settings(db: Session) -> DemandSettings:
    row = db.query(DemandSettings).first()
    if row is None:
        seed_load_configs(db)
        row = db.query(DemandSettings).first()
    return row


def update_demand_settings(db: Session, updates: dict) -> DemandSettings:
    row = get_or_seed_settings(db)
    for key, value in updates.items():
        if hasattr(row, key) and value is not None:
            setattr(row, key, value)
    row.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Relay state tracking via event log
# ---------------------------------------------------------------------------

def get_relay_states(db: Session, is_simulated: bool = False) -> Dict[str, bool]:
    """
    Determine ON/OFF state of each load by looking at the most recent
    LoadSheddingEvent per load_id.

    Default assumption: all enabled loads start ON (True).
    """
    loads = get_load_configs(db)
    states: Dict[str, bool] = {l.id: l.is_enabled for l in loads}  # default

    for load in loads:
        last_event = (
            db.query(LoadSheddingEvent)
            .filter(
                LoadSheddingEvent.load_id == load.id,
                LoadSheddingEvent.is_simulated == is_simulated,
            )
            .order_by(desc(LoadSheddingEvent.timestamp))
            .first()
        )
        if last_event:
            states[load.id] = last_event.action in ("RESTORE", "MANUAL_ON")

    return states


def get_pending_relay_commands(db: Session, esp32_relay_states: Optional[dict]) -> dict:
    """
    Compare what the dashboard has commanded (latest event per load) against
    the relay_states the ESP32 just reported.
    Returns a dict of commands that haven't been executed yet:
        {"L4": "on", "L5": "off"}
    Only MANUAL_ON / MANUAL_OFF events are considered. Once the hardware
    reports matching the manual command, it is marked fulfilled and not resent.
    """
    if esp32_relay_states is None:
        return {}

    pending: dict = {}
    loads = get_load_configs(db)

    for load in loads:
        last_event = (
            db.query(LoadSheddingEvent)
            .filter(
                LoadSheddingEvent.load_id == load.id,
                LoadSheddingEvent.is_simulated == False,
                LoadSheddingEvent.action.in_(["MANUAL_ON", "MANUAL_OFF"]),
            )
            .order_by(desc(LoadSheddingEvent.timestamp))
            .first()
        )
        if not last_event:
            continue

        desired_on = last_event.action == "MANUAL_ON"
        current_on = esp32_relay_states.get(load.id, None)

        # If ESP32 state doesn't match desired state, check if it was already fulfilled
        if current_on is not None and current_on != desired_on:
            prior_fulfilled = (
                db.query(AcTelemetryRecord)
                .filter(
                    AcTelemetryRecord.timestamp >= last_event.timestamp,
                    AcTelemetryRecord.is_simulated == False,
                )
                .all()
            )
            was_fulfilled = False
            for r in prior_fulfilled:
                if r.relay_states:
                    try:
                        states_map = json.loads(r.relay_states)
                        if states_map.get(load.id) == desired_on:
                            was_fulfilled = True
                            break
                    except Exception:
                        pass

            if not was_fulfilled:
                pending[load.id] = "on" if desired_on else "off"

    return pending


# ---------------------------------------------------------------------------
# Auto-shedding algorithm
# ---------------------------------------------------------------------------

def _seconds_since_last_event(db: Session, is_simulated: bool) -> Optional[float]:
    """Return seconds elapsed since the most recent shedding event, or None if no events."""
    last = (
        db.query(LoadSheddingEvent)
        .filter(LoadSheddingEvent.is_simulated == is_simulated)
        .order_by(desc(LoadSheddingEvent.timestamp))
        .first()
    )
    if not last:
        return None
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    return (now - last.timestamp).total_seconds()


def evaluate_auto_shedding(
    db: Session,
    power_w: float,
    is_simulated: bool = False,
) -> List[str]:
    """
    Evaluate whether any load should be shed or restored given current power.

    Returns a list of action strings describing what was done (may be empty).
    Does NOT commit — caller must commit after calling this.
    """
    demand_cfg = get_or_seed_settings(db)
    if not demand_cfg.auto_mode:
        return []

    threshold = demand_cfg.threshold_w
    hysteresis = demand_cfg.restoration_hysteresis_w
    cooldown = demand_cfg.cooldown_sec

    # Enforce cooldown
    seconds_since = _seconds_since_last_event(db, is_simulated)
    if seconds_since is not None and seconds_since < cooldown:
        return []

    relay_states = get_relay_states(db, is_simulated)
    loads = get_load_configs(db)
    actions: List[str] = []

    if power_w > threshold:
        # Shed: find the lowest-priority enabled non-essential load that is currently ON
        shed_candidates = [
            l for l in loads
            if l.is_enabled
            and not l.is_essential
            and relay_states.get(l.id, True)  # currently ON
        ]
        # Sort by priority descending (highest number = lowest priority = shed first)
        shed_candidates.sort(key=lambda l: -l.priority)

        if shed_candidates:
            target = shed_candidates[0]
            event = LoadSheddingEvent(
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                action="SHED",
                load_id=target.id,
                load_name=target.name,
                reason=f"Power {power_w:.1f}W exceeded threshold {threshold:.1f}W",
                power_w_at_event=round(power_w, 2),
                threshold_w=threshold,
                is_automatic=True,
                is_simulated=is_simulated,
            )
            db.add(event)
            actions.append(f"SHED {target.id} ({target.name}): power={power_w:.1f}W > threshold={threshold:.1f}W")

    elif getattr(demand_cfg, "auto_restore_enabled", True) and power_w < (threshold - hysteresis):
        # Restore: find the highest-priority enabled non-essential load that is currently OFF
        restore_candidates = [
            l for l in loads
            if l.is_enabled
            and not l.is_essential
            and not relay_states.get(l.id, True)  # currently OFF
        ]
        restore_candidates.sort(key=lambda l: l.priority)

        # Safety: Respect manually switched OFF loads during automatic restoration.
        # Only restore loads whose most recent action was 'SHED'.
        eligible_for_restore = []
        for l in restore_candidates:
            last_ev = (
                db.query(LoadSheddingEvent)
                .filter(
                    LoadSheddingEvent.load_id == l.id,
                    LoadSheddingEvent.is_simulated == is_simulated,
                )
                .order_by(desc(LoadSheddingEvent.timestamp))
                .first()
            )
            # If last event was MANUAL_OFF, user manually turned it off; do not auto-restore!
            if last_ev is not None and last_ev.action == "MANUAL_OFF":
                continue

            # Check headroom: verify restoring target will not immediately re-overload
            if (power_w + l.rated_power_w) <= (threshold - hysteresis):
                eligible_for_restore.append(l)

        if eligible_for_restore:
            target = eligible_for_restore[0]
            event = LoadSheddingEvent(
                timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
                action="RESTORE",
                load_id=target.id,
                load_name=target.name,
                reason=f"Power {power_w:.1f}W + rated {target.rated_power_w:.1f}W <= restore limit {threshold - hysteresis:.1f}W",
                power_w_at_event=round(power_w, 2),
                threshold_w=threshold,
                is_automatic=True,
                is_simulated=is_simulated,
            )
            db.add(event)
            actions.append(f"RESTORE {target.id} ({target.name}): power={power_w:.1f}W < restore_threshold={threshold - hysteresis:.1f}W")

    return actions


# ---------------------------------------------------------------------------
# Manual relay command
# ---------------------------------------------------------------------------

def manual_relay_command(
    db: Session,
    load_id: str,
    action: str,  # "on" | "off"
    reason: str = "Manual command",
    is_simulated: bool = False,
) -> Optional[LoadSheddingEvent]:
    load = get_load_config(db, load_id)
    if not load:
        return None

    action_label = "MANUAL_ON" if action.lower() == "on" else "MANUAL_OFF"
    event = LoadSheddingEvent(
        timestamp=datetime.now(timezone.utc).replace(tzinfo=None),
        action=action_label,
        load_id=load.id,
        load_name=load.name,
        reason=reason,
        power_w_at_event=None,
        threshold_w=None,
        is_automatic=False,
        is_simulated=is_simulated,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


# ---------------------------------------------------------------------------
# Shedding event history
# ---------------------------------------------------------------------------

def get_shedding_events(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    is_simulated: Optional[bool] = None,
) -> Tuple[int, List[LoadSheddingEvent]]:
    query = db.query(LoadSheddingEvent)
    if is_simulated is not None:
        query = query.filter(LoadSheddingEvent.is_simulated == is_simulated)
    total = query.count()
    items = query.order_by(desc(LoadSheddingEvent.timestamp)).offset(offset).limit(limit).all()
    return total, items


# ---------------------------------------------------------------------------
# Shed status summary
# ---------------------------------------------------------------------------

def get_shed_status(db: Session, is_simulated: bool = False) -> dict:
    demand_cfg = get_or_seed_settings(db)
    relay_states = get_relay_states(db, is_simulated)
    loads = get_load_configs(db)

    active_loads = [l.id for l in loads if l.is_enabled and relay_states.get(l.id, True)]
    shed_loads = [l.id for l in loads if l.is_enabled and not relay_states.get(l.id, True)]

    last_event = (
        db.query(LoadSheddingEvent)
        .filter(LoadSheddingEvent.is_simulated == is_simulated)
        .order_by(desc(LoadSheddingEvent.timestamp))
        .first()
    )

    latest_ac = (
        db.query(AcTelemetryRecord)
        .filter(AcTelemetryRecord.is_simulated == is_simulated)
        .order_by(desc(AcTelemetryRecord.timestamp))
        .first()
    )

    current_power = latest_ac.power_w if latest_ac else None
    utilization = round((current_power / demand_cfg.threshold_w) * 100, 1) if current_power is not None else None

    if current_power is None:
        msg = "Awaiting telemetry from ESP32 node."
    elif current_power > demand_cfg.threshold_w:
        msg = f"⚠ OVER THRESHOLD: {current_power:.1f}W exceeds {demand_cfg.threshold_w:.1f}W"
    elif current_power > demand_cfg.threshold_w * 0.8:
        msg = f"Approaching threshold: {current_power:.1f}W ({utilization:.0f}% of {demand_cfg.threshold_w:.0f}W)"
    else:
        msg = f"Normal: {current_power:.1f}W ({utilization:.0f}% of {demand_cfg.threshold_w:.0f}W)"

    return dict(
        auto_mode=demand_cfg.auto_mode,
        threshold_w=demand_cfg.threshold_w,
        current_power_w=current_power,
        utilization_pct=utilization,
        loads_shed_count=len(shed_loads),
        active_loads=active_loads,
        shed_loads=shed_loads,
        last_event_at=last_event.timestamp if last_event else None,
        status_message=msg,
    )


# ---------------------------------------------------------------------------
# AC Telemetry persistence
# ---------------------------------------------------------------------------

def process_ac_telemetry(
    db: Session,
    device_id: str,
    timestamp: Optional[datetime],
    ac_voltage: float,
    ac_current: float,
    power_w: Optional[float],
    energy_wh_input: Optional[float],
    relay_states_dict: Optional[dict],
    is_simulated: bool,
) -> AcTelemetryRecord:
    ts = timestamp or datetime.now(timezone.utc)
    if ts.tzinfo is not None:
        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)

    # Real power: use submitted value or estimate (V*I*0.85 power factor)
    real_power = round(power_w, 2) if power_w is not None else round(ac_voltage * ac_current * 0.85, 2)

    # Energy integration (trapezoidal)
    last_record = (
        db.query(AcTelemetryRecord)
        .filter(
            AcTelemetryRecord.device_id == device_id,
            AcTelemetryRecord.is_simulated == is_simulated,
        )
        .order_by(desc(AcTelemetryRecord.timestamp))
        .first()
    )

    if energy_wh_input is not None and energy_wh_input > 0:
        energy_wh = round(energy_wh_input, 3)
    elif last_record and last_record.timestamp < ts:
        dt_seconds = (ts - last_record.timestamp).total_seconds()
        if 0 < dt_seconds <= 300:
            avg_power = (last_record.power_w + real_power) / 2.0
            incremental = avg_power * (dt_seconds / 3600.0)
            energy_wh = round((last_record.energy_wh or 0.0) + incremental, 3)
        else:
            energy_wh = last_record.energy_wh or 0.0
    else:
        energy_wh = 0.0

    relay_json = json.dumps(relay_states_dict) if relay_states_dict else None

    record = AcTelemetryRecord(
        device_id=device_id,
        timestamp=ts,
        ac_voltage=round(ac_voltage, 2),
        ac_current=round(ac_current, 3),
        power_w=real_power,
        energy_wh=energy_wh,
        relay_states=relay_json,
        is_simulated=is_simulated,
    )
    db.add(record)

    # Run auto-shedding evaluation (actions added to session, not yet committed)
    evaluate_auto_shedding(db, real_power, is_simulated)

    # Synchronize ESP32 hardware shedding / restoration with backend event log
    if relay_states_dict and not is_simulated:
        loads_list = get_load_configs(db)
        settings_row = get_or_seed_settings(db)
        for ld in loads_list:
            hw_state = relay_states_dict.get(ld.id)
            if hw_state is None:
                continue
            last_ev = (
                db.query(LoadSheddingEvent)
                .filter(
                    LoadSheddingEvent.load_id == ld.id,
                    LoadSheddingEvent.is_simulated == False,
                )
                .order_by(desc(LoadSheddingEvent.timestamp))
                .first()
            )
            was_on = last_ev.action in ("RESTORE", "MANUAL_ON") if last_ev else ld.is_enabled
            if was_on and not hw_state and (not last_ev or last_ev.action != "MANUAL_OFF"):
                db.add(LoadSheddingEvent(
                    timestamp=ts,
                    action="SHED",
                    load_id=ld.id,
                    load_name=ld.name,
                    reason=f"ESP32 auto-shed load at {real_power:.1f}W",
                    power_w_at_event=real_power,
                    threshold_w=settings_row.threshold_w,
                    is_automatic=True,
                    is_simulated=False,
                ))
            elif not was_on and hw_state and (not last_ev or last_ev.action != "MANUAL_ON"):
                db.add(LoadSheddingEvent(
                    timestamp=ts,
                    action="RESTORE",
                    load_id=ld.id,
                    load_name=ld.name,
                    reason=f"ESP32 auto-restored load at {real_power:.1f}W",
                    power_w_at_event=real_power,
                    threshold_w=settings_row.threshold_w,
                    is_automatic=True,
                    is_simulated=False,
                ))

    db.commit()
    db.refresh(record)

    # Attach live active system configuration for ESP32 and frontend synchronization
    active_cfg = get_or_seed_settings(db)
    record.config = {
        "threshold_w": active_cfg.threshold_w,
        "restoration_margin_w": active_cfg.restoration_hysteresis_w,
        "overload_confirm_ms": int(active_cfg.confirmation_sec * 1000),
        "settle_ms": int(active_cfg.cooldown_sec * 1000),
        "auto_mode": active_cfg.auto_mode,
        "auto_restore": getattr(active_cfg, "auto_restore_enabled", True),
        "transformer_rating_va": active_cfg.transformer_rating_va,
        "power_factor": active_cfg.power_factor,
        "device_id": getattr(active_cfg, "device_id", "ESP32_LOAD_SHEDDING_01"),
        "telemetry_interval_ms": int(getattr(active_cfg, "telemetry_interval_sec", 2.0) * 1000),
    }

    # Include pending relay commands so ESP32 can actuate them on next telemetry receipt
    record.pending_relay_commands = get_pending_relay_commands(db, relay_states_dict)

    return record
