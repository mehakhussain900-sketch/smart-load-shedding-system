import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import Base, engine, SessionLocal, init_db
from app.models import TelemetryRecord, DeviceRecord, AlertRecord, LoadConfig, LoadSheddingEvent, DemandSettings, AcTelemetryRecord

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    # Setup tables before each test
    init_db()
    db = SessionLocal()
    # Clean tables for clean test state
    db.query(TelemetryRecord).delete()
    db.query(DeviceRecord).delete()
    db.query(AlertRecord).delete()
    db.query(LoadSheddingEvent).delete()
    db.query(DemandSettings).delete()
    db.query(AcTelemetryRecord).delete()
    db.query(LoadConfig).delete()
    db.commit()
    db.close()
    yield
    # Teardown
    db = SessionLocal()
    db.query(TelemetryRecord).delete()
    db.query(DeviceRecord).delete()
    db.query(AlertRecord).delete()
    db.query(LoadSheddingEvent).delete()
    db.query(DemandSettings).delete()
    db.query(AcTelemetryRecord).delete()
    db.query(LoadConfig).delete()
    db.commit()
    db.close()

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "Smart Load Management System" in data["project_title"] or "PV" in data["project_title"]

def test_initial_empty_states():
    # 1. Device status should indicate waiting for ESP32
    dev_res = client.get("/api/device/status?device_id=ESP32-PV-01")
    assert dev_res.status_code == 200
    dev_data = dev_res.json()
    assert dev_data["connection_status"] == "Waiting for ESP32"
    assert dev_data["total_readings"] == 0

    # 2. Latest telemetry should be null
    latest_res = client.get("/api/telemetry/latest?is_simulated=false")
    assert latest_res.status_code == 200
    assert latest_res.json() is None

    # 3. Analytics summary should report Insufficient Data
    summary_res = client.get("/api/analytics/summary?is_simulated=false")
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["total_readings"] == 0
    assert summary_data["data_availability"] == "Insufficient Data (Empty)"

def test_valid_telemetry_submission():
    payload = {
        "device_id": "ESP32-PV-01",
        "solar_voltage": 17.7,
        "solar_current": 5.4,
        "temperature": 32.5,
        "humidity": 48.0,
        "load_current": 1.2,
        "is_simulated": False
    }
    response = client.post("/api/telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == "ESP32-PV-01"
    assert data["solar_voltage"] == 17.7
    assert data["solar_current"] == 5.4
    # Expected solar_power = 17.7 * 5.4 = 95.58 W
    assert round(data["solar_power"], 1) == 95.6

    # Verify latest reading now returns this record
    latest = client.get("/api/telemetry/latest?is_simulated=false").json()
    assert latest is not None
    assert latest["device_id"] == "ESP32-PV-01"

    # Verify device status is now Live
    status = client.get("/api/device/status?device_id=ESP32-PV-01").json()
    assert status["connection_status"] == "Live"
    assert status["total_readings"] == 1

def test_invalid_telemetry_rejection():
    # Voltage > 30V is invalid for 100W panel setup
    bad_payload = {
        "device_id": "ESP32-PV-01",
        "solar_voltage": 45.0,  # Invalid: max is 30.0V
        "solar_current": 5.4,
        "temperature": 25.0,
        "humidity": 50.0
    }
    response = client.post("/api/telemetry", json=bad_payload)
    assert response.status_code == 422  # Validation error

    # Negative current is invalid
    bad_current = {
        "device_id": "ESP32-PV-01",
        "solar_voltage": 17.7,
        "solar_current": -2.0,  # Invalid: min is 0.0A
        "temperature": 25.0,
        "humidity": 50.0
    }
    res2 = client.post("/api/telemetry", json=bad_current)
    assert res2.status_code == 422

def test_demand_analysis_endpoint():
    # 1. Initially empty
    empty_res = client.get("/api/demand/summary?is_simulated=false")
    assert empty_res.status_code == 200
    empty_data = empty_res.json()
    assert empty_data["data_points"] == 0
    assert empty_data["peak_demand_w"] is None
    assert "Maximum demand analysis evaluates" in empty_data["method_note"]

    # 2. Add reading with load current (load_power = 17.7 * 3.0 = 53.1 W)
    client.post("/api/telemetry", json={
        "device_id": "ESP32-PV-01",
        "solar_voltage": 17.7,
        "solar_current": 4.5,
        "temperature": 30.0,
        "humidity": 55.0,
        "load_current": 3.0,
        "is_simulated": False
    })

    demand_res = client.get("/api/demand/summary?is_simulated=false")
    assert demand_res.status_code == 200
    demand_data = demand_res.json()
    assert demand_data["data_points"] == 1
    assert round(demand_data["peak_demand_w"], 1) == 53.1

def test_ai_status_endpoint():
    # When empty
    ai_res = client.get("/api/ai/status?is_simulated=false")
    assert ai_res.status_code == 200
    ai_data = ai_res.json()
    assert "not trained" in ai_data["model_status"]
    assert ai_data["pv_health_score"] is None
    assert "Awaiting continuous sensor readings" in ai_data["pv_health_basis"]

def test_telemetry_history_pagination():
    # Post 3 records
    for i in range(3):
        client.post("/api/telemetry", json={
            "device_id": "ESP32-PV-01",
            "solar_voltage": 17.0 + i,
            "solar_current": 4.0,
            "temperature": 28.0,
            "humidity": 50.0,
            "is_simulated": False
        })

    hist_res = client.get("/api/telemetry/history?limit=2&offset=0&is_simulated=false")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] == 3
    assert len(hist_data["items"]) == 2


# ---------------------------------------------------------------------------
# Load Shedding Tests
# ---------------------------------------------------------------------------

def test_get_loads_seeded():
    """GET /api/loads should return 5 seeded load configs."""
    response = client.get("/api/loads")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5
    ids = [d["id"] for d in data]
    assert "L1" in ids and "L5" in ids
    # L1 must be essential
    l1 = next(d for d in data if d["id"] == "L1")
    assert l1["is_essential"] is True
    assert l1["gpio_pin"] == 26


def test_get_demand_settings():
    """GET /api/loads/settings should return default threshold of 250 W, 1000 VA rating, 0.8 PF."""
    response = client.get("/api/loads/settings")
    assert response.status_code == 200
    data = response.json()
    assert data["threshold_w"] == 250.0
    assert data["auto_mode"] is True
    assert data["cooldown_sec"] == 3.0
    assert data["transformer_rating_va"] == 1000.0
    assert data["power_factor"] == 0.8


def test_update_demand_settings():
    """PUT /api/loads/settings should update threshold, transformer rating and power factor."""
    # Ensure seeded first
    client.get("/api/loads")
    response = client.put(
        "/api/loads/settings",
        json={"threshold_w": 280.0, "transformer_rating_va": 1500.0, "power_factor": 0.85},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["threshold_w"] == 280.0
    assert data["transformer_rating_va"] == 1500.0
    assert data["power_factor"] == 0.85


def test_get_shed_status():
    """GET /api/loads/status should return a valid status response."""
    response = client.get("/api/loads/status?is_simulated=false")
    assert response.status_code == 200
    data = response.json()
    assert "threshold_w" in data
    assert "auto_mode" in data
    assert isinstance(data["active_loads"], list)
    assert isinstance(data["shed_loads"], list)


def test_submit_ac_telemetry():
    """POST /api/ac-telemetry should persist a reading and return 201."""
    payload = {
        "device_id": "ESP32-LOAD-01",
        "ac_voltage": 230.0,
        "ac_current": 0.87,
        "power_w": 170.5,
        "relay_states": {"L1": True, "L2": True, "L3": False, "L4": False, "L5": False},
        "is_simulated": True,
    }
    response = client.post("/api/ac-telemetry", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == "ESP32-LOAD-01"
    assert data["ac_voltage"] == 230.0
    assert data["power_w"] == 170.5


def test_ac_telemetry_auto_shed_triggered():
    """Posting power above 250W threshold should create a SHED event."""
    # Ensure loads are seeded
    client.get("/api/loads")
    payload = {
        "device_id": "ESP32-LOAD-01",
        "ac_voltage": 230.0,
        "ac_current": 1.25,
        "power_w": 280.0,  # Above 250 W threshold
        "relay_states": {"L1": True, "L2": True, "L3": True, "L4": True, "L5": True},
        "is_simulated": True,
    }
    client.post("/api/ac-telemetry", json=payload)
    events_res = client.get("/api/loads/events?is_simulated=true")
    assert events_res.status_code == 200
    events = events_res.json()
    shed_events = [e for e in events if e["action"] == "SHED"]
    assert len(shed_events) >= 1
    # Essential load L1 must NOT be shed
    l1_shed = [e for e in shed_events if e["load_id"] == "L1"]
    assert len(l1_shed) == 0


def test_full_system_config_lifecycle():
    """Test full system configuration get, update, and reset."""
    # 1. Get full config
    res = client.get("/api/loads/config")
    assert res.status_code == 200
    cfg = res.json()
    assert "settings" in cfg
    assert "loads" in cfg
    assert len(cfg["loads"]) == 5

    # 2. Update via /api/loads/config
    update_payload = {
        "settings": {
            "threshold_w": 300.0,
            "transformer_rating_va": 1200.0,
            "power_factor": 0.9,
            "auto_restore_enabled": True
        },
        "loads": [
            {"id": "L5", "rated_power_w": 120.0, "category": "Heavy"}
        ]
    }
    put_res = client.put("/api/loads/config", json=update_payload)
    assert put_res.status_code == 200
    updated_data = put_res.json()
    assert updated_data["settings"]["threshold_w"] == 300.0
    l5 = next(l for l in updated_data["loads"] if l["id"] == "L5")
    assert l5["rated_power_w"] == 120.0

    # 3. Reset defaults
    reset_res = client.post("/api/loads/reset-defaults")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["settings"]["threshold_w"] == 250.0


def test_get_latest_ac_telemetry():
    """GET /api/ac-telemetry/latest should return the most recent record."""
    payload = {
        "device_id": "ESP32-LOAD-01",
        "ac_voltage": 231.5,
        "ac_current": 0.65,
        "power_w": 128.0,
        "is_simulated": True,
    }
    client.post("/api/ac-telemetry", json=payload)
    response = client.get("/api/ac-telemetry/latest?is_simulated=true")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == "ESP32-LOAD-01"
    assert data["ac_voltage"] == 231.5


def test_manual_relay_command():
    """POST /api/loads/L2/command should create a MANUAL_OFF event."""
    client.get("/api/loads")  # ensure seeded
    response = client.post(
        "/api/loads/L2/command",
        json={"action": "off", "reason": "Test manual shed", "is_simulated": True},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["action"] == "MANUAL_OFF"
    assert data["load_id"] == "L2"

