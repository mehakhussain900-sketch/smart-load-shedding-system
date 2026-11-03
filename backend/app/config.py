import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_TITLE: str = "IoT-Enabled Smart Load Management System for Maximum Demand Control and Electricity Cost Reduction"
    APP_NAME: str = "PV-Intelligence API"
    VERSION: str = "1.0.0"

    # Database
    DATABASE_PATH: Path = DATA_DIR / "pv_intelligence.db"
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH.as_posix()}")

    # Stale device timeout in seconds (default 60s)
    STALE_TIMEOUT_SECONDS: int = int(os.getenv("STALE_TIMEOUT_SECONDS", "60"))

    # CORS origins
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://10.38.236.12:5173",
        "http://10.38.236.12:8000",
        "http://10.38.236.63",
        "*",
    ]

    # Hardware Specs: Jakson JP-12x100 100 Wp
    PANEL_PMAX_W: float = 100.0
    PANEL_VMP_V: float = 17.7
    PANEL_IMP_A: float = 5.70
    PANEL_VOC_V: float = 21.4
    PANEL_ISC_A: float = 6.20

    # Sensor Physical Bounds for Validation
    VOLTAGE_MIN_V: float = 0.0
    VOLTAGE_MAX_V: float = 30.0   # Beyond Voc (21.4V) is considered sensor fault / out of bound
    CURRENT_MIN_A: float = 0.0
    CURRENT_MAX_A: float = 10.0   # Beyond Isc (6.2A) + margin
    TEMP_MIN_C: float = -20.0     # DHT22 operational range
    TEMP_MAX_C: float = 80.0
    HUMIDITY_MIN_PCT: float = 0.0
    HUMIDITY_MAX_PCT: float = 100.0

    # -----------------------------------------------------------------------
    # Load Shedding Defaults (overridable via environment variables)
    # -----------------------------------------------------------------------
    DEMAND_THRESHOLD_W: float = float(os.getenv("DEMAND_THRESHOLD_W", "250.0"))
    SHED_CONFIRMATION_SEC: float = float(os.getenv("SHED_CONFIRMATION_SEC", "2.0"))
    SHED_COOLDOWN_SEC: float = float(os.getenv("SHED_COOLDOWN_SEC", "3.0"))
    RESTORATION_HYSTERESIS_W: float = float(os.getenv("RESTORATION_HYSTERESIS_W", "20.0"))
    TRANSFORMER_RATING_VA: float = float(os.getenv("TRANSFORMER_RATING_VA", "1000.0"))
    DEFAULT_POWER_FACTOR: float = float(os.getenv("DEFAULT_POWER_FACTOR", "0.8"))
    DEVICE_ID: str = os.getenv("DEVICE_ID", "ESP32_LOAD_SHEDDING_01")
    TELEMETRY_INTERVAL_SEC: float = float(os.getenv("TELEMETRY_INTERVAL_SEC", "2.0"))

    # AC Sensor Bounds — ZMPT101B + ACS712-30A
    AC_VOLTAGE_MIN_V: float = 180.0
    AC_VOLTAGE_MAX_V: float = 260.0
    AC_CURRENT_MAX_A: float = 30.0   # ACS712-30A rated maximum

settings = Settings()
