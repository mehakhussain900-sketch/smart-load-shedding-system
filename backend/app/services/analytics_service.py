from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models import TelemetryRecord
from ..schemas import AnalyticsSummaryResponse

def get_analytics_summary(db: Session, is_simulated: bool = False) -> AnalyticsSummaryResponse:
    records = db.query(TelemetryRecord).filter(TelemetryRecord.is_simulated == is_simulated)
    count = records.count()

    if count == 0:
        return AnalyticsSummaryResponse(
            total_readings=0,
            peak_solar_power_w=None,
            average_solar_power_w=None,
            total_energy_wh=None,
            today_energy_wh=None,
            average_temperature_c=None,
            average_humidity_pct=None,
            data_availability="Insufficient Data (Empty)",
        )

    peak_power = db.query(func.max(TelemetryRecord.solar_power)).filter(TelemetryRecord.is_simulated == is_simulated).scalar()
    avg_power = db.query(func.avg(TelemetryRecord.solar_power)).filter(TelemetryRecord.is_simulated == is_simulated).scalar()
    total_energy = db.query(func.max(TelemetryRecord.energy_wh)).filter(TelemetryRecord.is_simulated == is_simulated).scalar()

    avg_temp = db.query(func.avg(TelemetryRecord.temperature)).filter(TelemetryRecord.is_simulated == is_simulated).scalar()
    avg_hum = db.query(func.avg(TelemetryRecord.humidity)).filter(TelemetryRecord.is_simulated == is_simulated).scalar()

    # Calculate today's energy
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    today_records = records.filter(TelemetryRecord.timestamp >= today_start)
    today_count = today_records.count()
    if today_count > 0:
        min_e = db.query(func.min(TelemetryRecord.energy_wh)).filter(TelemetryRecord.is_simulated == is_simulated, TelemetryRecord.timestamp >= today_start).scalar() or 0.0
        max_e = db.query(func.max(TelemetryRecord.energy_wh)).filter(TelemetryRecord.is_simulated == is_simulated, TelemetryRecord.timestamp >= today_start).scalar() or 0.0
        today_energy = max(0.0, max_e - min_e)
    else:
        today_energy = 0.0

    return AnalyticsSummaryResponse(
        total_readings=count,
        peak_solar_power_w=round(float(peak_power), 2) if peak_power is not None else 0.0,
        average_solar_power_w=round(float(avg_power), 2) if avg_power is not None else 0.0,
        total_energy_wh=round(float(total_energy), 2) if total_energy is not None else 0.0,
        today_energy_wh=round(float(today_energy), 2),
        average_temperature_c=round(float(avg_temp), 1) if avg_temp is not None else 0.0,
        average_humidity_pct=round(float(avg_hum), 1) if avg_hum is not None else 0.0,
        data_availability="Sufficient Data",
    )
