from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict

class TelemetryCreate(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64, description="ESP32 hardware identifier")
    timestamp: Optional[datetime] = Field(default=None, description="Timestamp of measurement in ISO 8601")
    solar_voltage: float = Field(..., ge=0.0, le=30.0, description="Solar panel voltage in Volts (0.0 to 30.0V)")
    solar_current: float = Field(..., ge=0.0, le=10.0, description="Solar panel current in Amperes (0.0 to 10.0A)")
    solar_power: Optional[float] = Field(default=None, ge=0.0, le=300.0, description="Solar power in Watts (optional, computed as V*I if omitted)")
    load_current: Optional[float] = Field(default=None, ge=0.0, le=10.0, description="DC load current in Amperes")
    load_power: Optional[float] = Field(default=None, ge=0.0, le=300.0, description="DC load power in Watts")
    temperature: float = Field(..., ge=-20.0, le=80.0, description="DHT22 ambient temperature in °C (-20 to 80°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="DHT22 relative humidity in % (0 to 100%)")
    energy_wh: Optional[float] = Field(default=None, ge=0.0, description="Cumulative or integrated energy in Wh")
    is_simulated: bool = Field(default=False, description="Flag indicating if reading is from simulated test stream")

    @field_validator("solar_power", mode="before")
    def validate_or_compute_power(cls, v, values):
        return v

class TelemetryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    timestamp: datetime
    solar_voltage: float
    solar_current: float
    solar_power: float
    load_current: Optional[float]
    load_power: Optional[float]
    temperature: float
    humidity: float
    energy_wh: Optional[float]
    is_simulated: bool
    created_at: datetime

class TelemetryHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[TelemetryResponse]

class DeviceStatusResponse(BaseModel):
    device_id: str
    connection_status: str  # "Waiting for ESP32" | "Live" | "Disconnected"
    last_seen: Optional[datetime]
    last_seen_seconds_ago: Optional[int]
    total_readings: int
    data_source: str
    stale_timeout_seconds: int

class AnalyticsSummaryResponse(BaseModel):
    total_readings: int
    peak_solar_power_w: Optional[float]
    average_solar_power_w: Optional[float]
    total_energy_wh: Optional[float]
    today_energy_wh: Optional[float]
    average_temperature_c: Optional[float]
    average_humidity_pct: Optional[float]
    data_availability: str  # "Sufficient Data" | "Insufficient Data (Empty)"

class DemandAnalysisResponse(BaseModel):
    peak_demand_w: Optional[float]
    average_demand_w: Optional[float]
    pv_contribution_w: Optional[float]
    estimated_demand_offset_w: Optional[float]
    data_points: int
    method_note: str

class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    severity: str
    parameter: str
    expected_value: str
    actual_value: str
    deviation: str
    possible_cause: str
    status: str
    is_potential: bool

class AIStatusResponse(BaseModel):
    model_status: str
    is_trained: bool
    samples_logged: int
    minimum_samples_needed: int
    pv_health_score: Optional[int]
    pv_health_grade: str
    pv_health_basis: str
    anomalies_detected: int

class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
    version: str
    project_title: str


# ---------------------------------------------------------------------------
# LOAD SHEDDING SCHEMAS — New for current semester
# ---------------------------------------------------------------------------

class LoadConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    rated_power_w: float
    priority: int
    is_essential: bool
    category: str = "Essential"
    relay_channel: int
    is_enabled: bool
    gpio_pin: Optional[int]
    relay_active_low: bool


class LoadConfigUpdate(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    rated_power_w: Optional[float] = Field(default=None, ge=0.0, le=10000.0)
    priority: Optional[int] = Field(default=None, ge=1, le=10)
    is_essential: Optional[bool] = None
    category: Optional[str] = None
    is_enabled: Optional[bool] = None


class RelayCommandRequest(BaseModel):
    action: str = Field(..., description="'on' or 'off'")
    reason: Optional[str] = Field(default="Manual command via dashboard")
    is_simulated: bool = Field(default=False)


class LoadSheddingEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    action: str
    load_id: str
    load_name: str
    reason: str
    power_w_at_event: Optional[float]
    threshold_w: Optional[float]
    is_automatic: bool
    is_simulated: bool


class DemandSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    threshold_w: float
    confirmation_sec: float
    cooldown_sec: float
    restoration_hysteresis_w: float
    auto_mode: bool
    auto_restore_enabled: bool = True
    transformer_rating_va: float = 1000.0
    power_factor: float = 0.8
    device_id: str = "ESP32_LOAD_SHEDDING_01"
    telemetry_interval_sec: float = 2.0
    updated_at: datetime


class DemandSettingsUpdate(BaseModel):
    threshold_w: Optional[float] = Field(default=None, ge=10.0, le=50000.0)
    confirmation_sec: Optional[float] = Field(default=None, ge=0.5, le=60.0)
    cooldown_sec: Optional[float] = Field(default=None, ge=0.5, le=120.0)
    restoration_hysteresis_w: Optional[float] = Field(default=None, ge=0.0, le=5000.0)
    auto_mode: Optional[bool] = None
    auto_restore_enabled: Optional[bool] = None
    transformer_rating_va: Optional[float] = Field(default=None, ge=10.0, le=1000000.0)
    power_factor: Optional[float] = Field(default=None, ge=0.01, le=1.0)
    device_id: Optional[str] = Field(default=None, max_length=64)
    telemetry_interval_sec: Optional[float] = Field(default=None, ge=0.5, le=60.0)


class FullSystemConfigResponse(BaseModel):
    settings: DemandSettingsResponse
    loads: List[LoadConfigResponse]


class FullSystemConfigUpdate(BaseModel):
    settings: Optional[DemandSettingsUpdate] = None
    loads: Optional[List[LoadConfigUpdate]] = None


class AcTelemetryCreate(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    timestamp: Optional[datetime] = Field(default=None)
    ac_voltage: float = Field(..., ge=0.0, le=300.0, description="AC voltage from ZMPT101B in V")
    ac_current: float = Field(..., ge=0.0, le=35.0, description="AC current from ACS712-30A in A")
    power_w: Optional[float] = Field(default=None, ge=0.0, le=10000.0)
    energy_wh: Optional[float] = Field(default=None, ge=0.0)
    relay_states: Optional[dict] = Field(default=None, description='{"L1": true, "L2": false, ...}')
    is_simulated: bool = Field(default=False)


class AcTelemetryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: str
    timestamp: datetime
    ac_voltage: float
    ac_current: float
    power_w: float
    energy_wh: Optional[float]
    relay_states: Optional[str]   # raw JSON string from DB
    is_simulated: bool
    created_at: datetime
    config: Optional[dict] = None
    # Pending relay commands for ESP32 to execute on next telemetry receipt
    pending_relay_commands: Optional[dict] = None  # e.g. {"L4": "on", "L5": "off"}


class AcTelemetryHistoryResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[AcTelemetryResponse]


class ShedStatusResponse(BaseModel):
    auto_mode: bool
    threshold_w: float
    current_power_w: Optional[float]
    utilization_pct: Optional[float]
    loads_shed_count: int
    active_loads: List[str]
    shed_loads: List[str]
    last_event_at: Optional[datetime]
    status_message: str
