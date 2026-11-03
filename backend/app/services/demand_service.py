from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import TelemetryRecord
from ..schemas import DemandAnalysisResponse

def get_demand_analysis(db: Session, is_simulated: bool = False) -> DemandAnalysisResponse:
    # Filter records that have load measurements
    records = (
        db.query(TelemetryRecord)
        .filter(
            TelemetryRecord.is_simulated == is_simulated,
            TelemetryRecord.load_power.isnot(None),
            TelemetryRecord.load_power > 0.0,
        )
    )
    count = records.count()

    method_note = (
        "Maximum demand analysis evaluates how local solar PV generation can shave peak electrical demand. "
        "Calculations demonstrate the methodology on the 100 Wp test bench and small DC load. "
        "It does not represent a validated grid-scale maximum demand tariff reduction."
    )

    if count == 0:
        return DemandAnalysisResponse(
            peak_demand_w=None,
            average_demand_w=None,
            pv_contribution_w=None,
            estimated_demand_offset_w=None,
            data_points=0,
            method_note=method_note + " Awaiting real DC load telemetry to calculate measured demand curves.",
        )

    peak_load = db.query(func.max(TelemetryRecord.load_power)).filter(
        TelemetryRecord.is_simulated == is_simulated,
        TelemetryRecord.load_power.isnot(None),
    ).scalar()

    avg_load = db.query(func.avg(TelemetryRecord.load_power)).filter(
        TelemetryRecord.is_simulated == is_simulated,
        TelemetryRecord.load_power.isnot(None),
    ).scalar()

    avg_solar = db.query(func.avg(TelemetryRecord.solar_power)).filter(
        TelemetryRecord.is_simulated == is_simulated,
        TelemetryRecord.load_power.isnot(None),
    ).scalar() or 0.0

    peak_w = round(float(peak_load), 2) if peak_load is not None else 0.0
    avg_demand_w = round(float(avg_load), 2) if avg_load is not None else 0.0
    pv_contrib_w = round(float(avg_solar), 2)
    offset_w = round(min(avg_demand_w, pv_contrib_w), 2)

    return DemandAnalysisResponse(
        peak_demand_w=peak_w,
        average_demand_w=avg_demand_w,
        pv_contribution_w=pv_contrib_w,
        estimated_demand_offset_w=offset_w,
        data_points=count,
        method_note=method_note,
    )
