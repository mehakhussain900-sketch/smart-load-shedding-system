from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_

from ..models import TelemetryRecord, DeviceRecord, AlertRecord, AcTelemetryRecord
from ..schemas import TelemetryCreate, DeviceStatusResponse
from ..config import settings

def process_and_save_telemetry(db: Session, payload: TelemetryCreate, client_ip: Optional[str] = None) -> TelemetryRecord:
    ts = payload.timestamp or datetime.now(timezone.utc)
    if ts.tzinfo is not None:
        # Normalize to naive UTC for SQLite comparison consistency
        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)

    # Calculate solar power: P = V * I
    calculated_power = round(payload.solar_voltage * payload.solar_current, 2)
    # If client submitted power, verify it is within 5% of V*I, otherwise use physical calculation
    if payload.solar_power is not None and abs(payload.solar_power - calculated_power) <= max(0.5, calculated_power * 0.05):
        solar_power = round(payload.solar_power, 2)
    else:
        solar_power = calculated_power

    # Calculate load power if current provided and load_power missing
    load_current = round(payload.load_current, 2) if payload.load_current is not None else None
    load_power = payload.load_power
    if load_power is None and load_current is not None:
        # Default DC load operating near 12V or measured bus voltage
        bus_v = payload.solar_voltage if payload.solar_voltage > 5.0 else 12.0
        load_power = round(bus_v * load_current, 2)
    elif load_power is not None:
        load_power = round(load_power, 2)

    # Trapezoidal Energy Integration
    # Fetch last reading for device with matching simulation flag
    last_record = (
        db.query(TelemetryRecord)
        .filter(
            TelemetryRecord.device_id == payload.device_id,
            TelemetryRecord.is_simulated == payload.is_simulated,
        )
        .order_by(desc(TelemetryRecord.timestamp))
        .first()
    )

    energy_wh = payload.energy_wh
    if energy_wh is None or energy_wh <= 0.0:
        if last_record and last_record.timestamp < ts:
            dt_seconds = (ts - last_record.timestamp).total_seconds()
            # Only integrate if sampling interval is reasonable (<= 300 seconds)
            if 0 < dt_seconds <= 300:
                avg_power = (last_record.solar_power + solar_power) / 2.0
                incremental_wh = avg_power * (dt_seconds / 3600.0)
                previous_energy = last_record.energy_wh or 0.0
                energy_wh = round(previous_energy + incremental_wh, 3)
            else:
                energy_wh = last_record.energy_wh or 0.0
        else:
            energy_wh = 0.0
    else:
        energy_wh = round(energy_wh, 3)

    record = TelemetryRecord(
        device_id=payload.device_id,
        timestamp=ts,
        solar_voltage=round(payload.solar_voltage, 2),
        solar_current=round(payload.solar_current, 2),
        solar_power=solar_power,
        load_current=load_current,
        load_power=load_power,
        temperature=round(payload.temperature, 1),
        humidity=round(payload.humidity, 1),
        energy_wh=energy_wh,
        is_simulated=payload.is_simulated,
    )
    db.add(record)

    # Update or create Device Record
    device = db.query(DeviceRecord).filter(DeviceRecord.device_id == payload.device_id).first()
    if not device:
        device = DeviceRecord(
            device_id=payload.device_id,
            first_seen=ts,
            last_seen=ts,
            total_readings=1,
            last_ip=client_ip,
        )
        db.add(device)
    else:
        device.last_seen = ts
        device.total_readings += 1
        if client_ip:
            device.last_ip = client_ip

    # Automated Explainable Anomaly Check on ingestion
    check_and_create_anomalies(db, record)

    db.commit()
    db.refresh(record)
    return record

def check_and_create_anomalies(db: Session, record: TelemetryRecord):
    # Rule 1: Voltage over Voc (21.4V for Jakson JP-12x100)
    if record.solar_voltage > settings.PANEL_VOC_V:
        alert = AlertRecord(
            timestamp=record.timestamp,
            severity="MEDIUM",
            parameter="Solar Voltage (V)",
            expected_value=f"<= {settings.PANEL_VOC_V} V (Voc)",
            actual_value=f"{record.solar_voltage} V",
            deviation=f"+{round(record.solar_voltage - settings.PANEL_VOC_V, 2)} V",
            possible_cause="Voltage abnormality / sensor calibration drift",
            status="ACTIVE",
            is_potential=record.is_simulated,
        )
        db.add(alert)

    # Rule 2: Current over Isc (6.2A)
    if record.solar_current > settings.PANEL_ISC_A:
        alert = AlertRecord(
            timestamp=record.timestamp,
            severity="HIGH",
            parameter="Solar Current (A)",
            expected_value=f"<= {settings.PANEL_ISC_A} A (Isc)",
            actual_value=f"{record.solar_current} A",
            deviation=f"+{round(record.solar_current - settings.PANEL_ISC_A, 2)} A",
            possible_cause="Current abnormality / ACS712 overcurrent",
            status="ACTIVE",
            is_potential=record.is_simulated,
        )
        db.add(alert)

    # Rule 3: High Temperature threshold (DHT22 > 65°C)
    if record.temperature > 65.0:
        alert = AlertRecord(
            timestamp=record.timestamp,
            severity="MEDIUM",
            parameter="Temperature (°C)",
            expected_value="< 60 °C",
            actual_value=f"{record.temperature} °C",
            deviation=f"+{round(record.temperature - 60.0, 1)} °C",
            possible_cause="Thermal derating / High ambient operating temperature",
            status="ACTIVE",
            is_potential=record.is_simulated,
        )
        db.add(alert)

def get_latest_telemetry(db: Session, is_simulated: bool = False) -> Optional[TelemetryRecord]:
    return (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.is_simulated == is_simulated)
        .order_by(desc(TelemetryRecord.timestamp))
        .first()
    )

def get_telemetry_history(
    db: Session,
    limit: int = 50,
    offset: int = 0,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    is_simulated: bool = False,
) -> Tuple[int, List[TelemetryRecord]]:
    query = db.query(TelemetryRecord).filter(TelemetryRecord.is_simulated == is_simulated)

    if start_date:
        query = query.filter(TelemetryRecord.timestamp >= start_date)
    if end_date:
        query = query.filter(TelemetryRecord.timestamp <= end_date)

    total = query.count()
    items = query.order_by(desc(TelemetryRecord.timestamp)).offset(offset).limit(limit).all()
    return total, items

def get_device_status(db: Session, device_id: str = "ESP32-PV-01") -> DeviceStatusResponse:
    device = db.query(DeviceRecord).filter(DeviceRecord.device_id == device_id).first()
    latest_real = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.device_id == device_id, TelemetryRecord.is_simulated == False)
        .order_by(desc(TelemetryRecord.timestamp))
        .first()
    )

    if not latest_real:
        # Check for AC Load Shedding Telemetry if DC solar telemetry is absent
        ac_query = db.query(AcTelemetryRecord).filter(AcTelemetryRecord.is_simulated == False)
        latest_ac = (
            ac_query.filter(AcTelemetryRecord.device_id == device_id)
            .order_by(desc(AcTelemetryRecord.timestamp))
            .first()
        )
        if not latest_ac:
            latest_ac = ac_query.order_by(desc(AcTelemetryRecord.timestamp)).first()

        if latest_ac:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            seconds_ago = int((now - latest_ac.timestamp).total_seconds())
            status = "Disconnected" if seconds_ago > settings.STALE_TIMEOUT_SECONDS else "Live"
            total_readings = ac_query.count()
            return DeviceStatusResponse(
                device_id=latest_ac.device_id,
                connection_status=status,
                last_seen=latest_ac.timestamp,
                last_seen_seconds_ago=max(0, seconds_ago),
                total_readings=total_readings,
                data_source="Real Hardware AC Telemetry",
                stale_timeout_seconds=settings.STALE_TIMEOUT_SECONDS,
            )

        return DeviceStatusResponse(
            device_id=device_id,
            connection_status="Waiting for ESP32",
            last_seen=None,
            last_seen_seconds_ago=None,
            total_readings=0,
            data_source="Waiting for ESP32 telemetry. No real readings have been received yet.",
            stale_timeout_seconds=settings.STALE_TIMEOUT_SECONDS,
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    seconds_ago = int((now - latest_real.timestamp).total_seconds())

    if seconds_ago > settings.STALE_TIMEOUT_SECONDS:
        status = "Disconnected"
    else:
        status = "Live"

    return DeviceStatusResponse(
        device_id=device_id,
        connection_status=status,
        last_seen=latest_real.timestamp,
        last_seen_seconds_ago=max(0, seconds_ago),
        total_readings=device.total_readings if device else 1,
        data_source="Real Hardware Telemetry",
        stale_timeout_seconds=settings.STALE_TIMEOUT_SECONDS,
    )
