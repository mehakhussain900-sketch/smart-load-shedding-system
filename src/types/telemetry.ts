export type ConnectionStatus = 'Waiting for ESP32' | 'Live' | 'Disconnected' | 'Simulation Mode';

export interface SolarTelemetry {
  id?: number;
  deviceId: string;
  timestamp: string;
  
  // Solar PV Measurements (Jakson JP-12x100 100 Wp panel)
  voltage: number;         // V (Solar Voltage, ~0 - 21.4V)
  current: number;         // A (Solar Current, ~0 - 6.2A)
  power: number;           // W (Solar Power = V × I, ~0 - 100W)
  energyToday: number;     // Wh (Today's Cumulative Energy)
  totalEnergy: number;     // Wh (Total Cumulative Energy)
  
  // Environmental Sensor (DHT22)
  temperature: number;     // °C (DHT22 Ambient Temperature)
  humidity: number;        // % (DHT22 Relative Humidity)

  // DC Load Parameters (ACS712 Load Sensor)
  loadCurrent?: number;    // A (DC Load Current)
  loadPower?: number;      // W (DC Load Power)

  // System & Status
  healthScore?: number;    // 0 - 100
  isSimulated: boolean;    // true for simulation, false for real hardware
  systemStatus?: string;
  rssi?: number;
}

export interface BackendDeviceStatus {
  device_id: string;
  connection_status: 'Waiting for ESP32' | 'Live' | 'Disconnected';
  last_seen: string | null;
  last_seen_seconds_ago: number | null;
  total_readings: number;
  data_source: string;
  stale_timeout_seconds: number;
}

export interface BackendAnalyticsSummary {
  total_readings: number;
  peak_solar_power_w: number | null;
  average_solar_power_w: number | null;
  total_energy_wh: number | null;
  today_energy_wh: number | null;
  average_temperature_c: number | null;
  average_humidity_pct: number | null;
  data_availability: string;
}

export interface BackendDemandSummary {
  peak_demand_w: number | null;
  average_demand_w: number | null;
  pv_contribution_w: number | null;
  estimated_demand_offset_w: number | null;
  data_points: number;
  method_note: string;
}

export interface BackendAIStatus {
  model_status: string;
  is_trained: boolean;
  samples_logged: number;
  minimum_samples_needed: number;
  pv_health_score: number | null;
  pv_health_grade: string;
  pv_health_basis: string;
  anomalies_detected: number;
}

export interface BackendAlertItem {
  id: number;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  parameter: string;
  expected_value: string;
  actual_value: string;
  deviation: string;
  possible_cause: string;
  status: string;
  is_potential: boolean;
}
