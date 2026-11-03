export type PVHealthGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ATTENTION_REQUIRED';

export interface HealthMetricDetail {
  name: string;
  score: number;             // 0-100
  weight: number;            // weight in overall score
  status: 'OPTIMAL' | 'MODERATE' | 'DEGRADED';
  basis: string;             // Explainable rule description
}

export interface PVHealthAssessment {
  overallScore: number;             // 0-100 (PV Health Score)
  grade: PVHealthGrade;
  generationPerformance: number;   // % Generation Performance vs rated
  voltageStability: number;        // % Voltage Stability (17.7V nominal)
  currentStability: number;        // % Current Stability (ACS712 tracking)
  environmentalCondition: number;  // % Environmental Condition (DHT22 Temp & Humidity)
  anomalyLevel: 'NORMAL' | 'LOW_RISK' | 'POTENTIAL_ANOMALY';
  evaluationMode: 'RULE_BASED_ANALYTICAL (SIMULATED)';
  metrics: HealthMetricDetail[];
  recommendations: string[];
  // Backward compatibility fields
  activeWarnings?: number;
  degradationRateAnnual?: number;
  soilingLossPercentage?: number;
  estimatedRemainingYears?: number;
  strings?: Array<{
    stringId: string;
    name: string;
    panelCount: number;
    measuredVoltage: number;
    ratedVoltage: number;
    efficiencyLossPercent: number;
    soilingStatus: string;
    status: string;
  }>;
}
