from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Text, Index
from .database import Base

# ---------------------------------------------------------------------------
# NOTE: All original solar PV models (TelemetryRecord, DeviceRecord,
# AlertRecord) are preserved below. New load-shedding models are ADDITIVE.
# ---------------------------------------------------------------------------

def utc_now():
    return datetime.now(timezone.utc)

class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)

    # Solar PV measurements (Jakson JP-12x100 100 Wp panel)
    solar_voltage = Column(Float, nullable=False)   # Volts
    solar_current = Column(Float, nullable=False)   # Amperes
    solar_power = Column(Float, nullable=False)     # Watts (V * I)

    # DC Load measurements
    load_current = Column(Float, nullable=True)     # Amperes
    load_power = Column(Float, nullable=True)       # Watts

    # Environmental sensors (DHT22)
    temperature = Column(Float, nullable=False)     # °C
    humidity = Column(Float, nullable=False)        # %

    # Energy in Wh (calculated / integrated)
    energy_wh = Column(Float, nullable=True, default=0.0)

    # Data provenance: False for physical ESP32 data, True for simulated test
    is_simulated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_device_timestamp", "device_id", "timestamp"),
        Index("idx_simulated_timestamp", "is_simulated", "timestamp"),
    )

class DeviceRecord(Base):
    __tablename__ = "device_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(64), unique=True, nullable=False, index=True)
    first_seen = Column(DateTime, nullable=False, default=utc_now)
    last_seen = Column(DateTime, nullable=False, default=utc_now, index=True)
    total_readings = Column(Integer, default=0, nullable=False)
    last_ip = Column(String(45), nullable=True)
    firmware_version = Column(String(32), nullable=True)

class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=utc_now, index=True)
    severity = Column(String(16), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    parameter = Column(String(64), nullable=False)
    expected_value = Column(String(64), nullable=False)
    actual_value = Column(String(64), nullable=False)
    deviation = Column(String(32), nullable=False)
    possible_cause = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, INVESTIGATING, RESOLVED
    is_potential = Column(Boolean, nullable=False, default=True)


# ---------------------------------------------------------------------------
# LOAD SHEDDING MODELS — New for current semester
# ---------------------------------------------------------------------------

class LoadConfig(Base):
    """Configuration record for each of the 5 relay-switched loads."""
    __tablename__ = "load_configs"

    id = Column(String(8), primary_key=True)          # "L1"..."L5"
    name = Column(String(64), nullable=False)
    rated_power_w = Column(Float, nullable=False, default=100.0)
    priority = Column(Integer, nullable=False, default=5)   # 1 = highest shed protection
    is_essential = Column(Boolean, nullable=False, default=False)
    category = Column(String(32), nullable=False, default="Essential")  # "Essential" | "Heavy"
    relay_channel = Column(Integer, nullable=False)          # 1-5
    is_enabled = Column(Boolean, nullable=False, default=True)
    gpio_pin = Column(Integer, nullable=True)               # Physical GPIO
    relay_active_low = Column(Boolean, nullable=False, default=True)  # Typical relay: LOW=ON


class LoadSheddingEvent(Base):
    """Audit log for every automatic or manual load shed/restore action."""
    __tablename__ = "load_shedding_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, nullable=False, default=utc_now, index=True)
    action = Column(String(16), nullable=False)   # SHED | RESTORE | MANUAL_ON | MANUAL_OFF
    load_id = Column(String(8), nullable=False, index=True)   # "L1"..."L5"
    load_name = Column(String(64), nullable=False)
    reason = Column(String(255), nullable=False)
    power_w_at_event = Column(Float, nullable=True)
    threshold_w = Column(Float, nullable=True)
    is_automatic = Column(Boolean, nullable=False, default=True)
    is_simulated = Column(Boolean, nullable=False, default=False)


class DemandSettings(Base):
    """Single-row table holding the configurable load-shedding parameters."""
    __tablename__ = "demand_settings"

    id = Column(Integer, primary_key=True, default=1)
    threshold_w = Column(Float, nullable=False, default=250.0)
    confirmation_sec = Column(Float, nullable=False, default=2.0)
    cooldown_sec = Column(Float, nullable=False, default=3.0)
    restoration_hysteresis_w = Column(Float, nullable=False, default=20.0)
    auto_mode = Column(Boolean, nullable=False, default=True)
    auto_restore_enabled = Column(Boolean, nullable=False, default=True)
    transformer_rating_va = Column(Float, nullable=False, default=1000.0)
    power_factor = Column(Float, nullable=False, default=0.8)
    device_id = Column(String(64), nullable=False, default="ESP32_LOAD_SHEDDING_01")
    telemetry_interval_sec = Column(Float, nullable=False, default=2.0)
    updated_at = Column(DateTime, nullable=False, default=utc_now)


class AcTelemetryRecord(Base):
    """AC power measurements from ZMPT101B + ACS712-30A on the load-shedding node."""
    __tablename__ = "ac_telemetry_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    device_id = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    ac_voltage = Column(Float, nullable=False)        # V (ZMPT101B)
    ac_current = Column(Float, nullable=False)        # A (ACS712-30A)
    power_w = Column(Float, nullable=False)           # Real power (W)
    energy_wh = Column(Float, nullable=True, default=0.0)   # Cumulative Wh
    relay_states = Column(Text, nullable=True)        # JSON: {"L1":true,"L2":false,...}
    is_simulated = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_ac_device_timestamp", "device_id", "timestamp"),
    )
