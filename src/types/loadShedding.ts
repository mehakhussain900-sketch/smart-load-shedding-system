// src/types/loadShedding.ts
// Types for the load shedding & maximum demand monitoring system

export interface LoadConfig {
  id: string;              // "L1"..."L5"
  name: string;
  rated_power_w: number;
  priority: number;        // 1 = highest priority (protected), 5 = shed first
  is_essential: boolean;
  category?: string;       // "Essential" | "Heavy"
  relay_channel: number;   // 1-5
  is_enabled: boolean;
  gpio_pin: number | null; // Physical GPIO
  relay_active_low: boolean;
  // Computed client-side from event log:
  isOn?: boolean;
}

export interface LoadSheddingEvent {
  id: number;
  timestamp: string;
  action: 'SHED' | 'RESTORE' | 'MANUAL_ON' | 'MANUAL_OFF';
  load_id: string;
  load_name: string;
  reason: string;
  power_w_at_event: number | null;
  threshold_w: number | null;
  is_automatic: boolean;
  is_simulated: boolean;
}

export interface DemandSettings {
  id: number;
  threshold_w: number;
  confirmation_sec: number;
  cooldown_sec: number;
  restoration_hysteresis_w: number;
  auto_mode: boolean;
  auto_restore_enabled: boolean;
  transformer_rating_va: number;
  power_factor: number;
  device_id: string;
  telemetry_interval_sec: number;
  updated_at: string;
}

export interface FullSystemConfig {
  settings: DemandSettings;
  loads: LoadConfig[];
}

export interface AcTelemetry {
  id?: number;
  device_id: string;
  timestamp: string;
  ac_voltage: number;    // V from ZMPT101B
  ac_current: number;   // A from ACS712-30A
  power_w: number;      // Real power (W)
  energy_wh: number | null;
  relay_states: Record<string, boolean> | null;
  is_simulated: boolean;
  created_at?: string;
}

export interface ShedStatus {
  auto_mode: boolean;
  threshold_w: number;
  current_power_w: number | null;
  utilization_pct: number | null;
  loads_shed_count: number;
  active_loads: string[];
  shed_loads: string[];
  last_event_at: string | null;
  status_message: string;
}
