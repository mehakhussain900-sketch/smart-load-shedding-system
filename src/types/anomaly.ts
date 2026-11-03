export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PossibleCause =
  | 'Unexpected power drop'
  | 'Voltage abnormality'
  | 'Current abnormality'
  | 'Sensor inconsistency'
  | 'Low generation under suitable light conditions';

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  parameter: string;
  expected: string;
  actual: string;
  deviation: string;
  severity: AnomalySeverity;
  possibleCause: PossibleCause;
  status: 'ACTIVE' | 'INVESTIGATING' | 'RESOLVED';
  isPotential: boolean;            // "Potential anomaly" for simulated/demo events
  description?: string;
  mitigationSteps?: string;
  // Backward compatibility
  title?: string;
  category?: string;
  affectedComponent?: string;
  confidenceScore?: number;
}
