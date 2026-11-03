from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import TelemetryRecord, AlertRecord
from ..schemas import AIStatusResponse
from ..config import settings

MINIMUM_TRAINING_SAMPLES = 500

def get_ai_and_health_status(db: Session, is_simulated: bool = False) -> AIStatusResponse:
    real_count = db.query(TelemetryRecord).filter(TelemetryRecord.is_simulated == is_simulated).count()
    active_anomalies_count = db.query(AlertRecord).filter(AlertRecord.status == "ACTIVE").count()

    # Model training readiness check
    is_trained = False
    model_status = "Prediction model not trained — awaiting sufficient real data."

    # Explainable Rule-Based Health Scoring
    if real_count < 5:
        pv_health_score = None
        pv_health_grade = "Insufficient Data"
        pv_health_basis = "Awaiting continuous sensor readings to evaluate panel voltage and current stability."
    else:
        # Evaluate last 20 readings for rule compliance
        recent = (
            db.query(TelemetryRecord)
            .filter(TelemetryRecord.is_simulated == is_simulated)
            .order_by(desc(TelemetryRecord.timestamp))
            .limit(20)
            .all()
        )

        voltage_scores = []
        for r in recent:
            # Nominal Vmp is 17.7V, Voc is 21.4V
            if 10.0 <= r.solar_voltage <= settings.PANEL_VOC_V:
                voltage_scores.append(100)
            elif r.solar_voltage > settings.PANEL_VOC_V or r.solar_voltage < 2.0:
                voltage_scores.append(60)
            else:
                voltage_scores.append(85)

        avg_score = int(sum(voltage_scores) / len(voltage_scores))
        # Deduct if active anomalies present
        final_score = max(40, avg_score - (active_anomalies_count * 5))
        pv_health_score = final_score
        if final_score >= 85:
            pv_health_grade = "Optimal"
        elif final_score >= 70:
            pv_health_grade = "Moderate"
        else:
            pv_health_grade = "Degraded / Attention Required"

        pv_health_basis = (
            f"Rule-based assessment on recent {len(recent)} sensor records: "
            f"Voltage stability within expected {settings.PANEL_VMP_V}V Vmp / {settings.PANEL_VOC_V}V Voc window; "
            f"{active_anomalies_count} active anomaly flags."
        )

    return AIStatusResponse(
        model_status=model_status,
        is_trained=is_trained,
        samples_logged=real_count,
        minimum_samples_needed=MINIMUM_TRAINING_SAMPLES,
        pv_health_score=pv_health_score,
        pv_health_grade=pv_health_grade,
        pv_health_basis=pv_health_basis,
        anomalies_detected=active_anomalies_count,
    )

def get_alerts(db: Session, limit: int = 50) -> List[AlertRecord]:
    return db.query(AlertRecord).order_by(desc(AlertRecord.timestamp)).limit(limit).all()
