import type {
  SolarTelemetry,
  BackendDeviceStatus,
  BackendAnalyticsSummary,
  BackendDemandSummary,
  BackendAIStatus,
  BackendAlertItem,
} from '../types/telemetry';
import type {
  LoadConfig,
  LoadSheddingEvent,
  DemandSettings,
  AcTelemetry,
  ShedStatus,
  FullSystemConfig,
} from '../types/loadShedding';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

const API_BASE_URL = getApiBaseUrl();

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error [${response.status}]: ${errorText || response.statusText}`);
  }

  return response.json();
}

export const api = {
  async getHealth(): Promise<{ status: string; database: string; version: string }> {
    return request('/health');
  },

  async getDeviceStatus(deviceId: string = 'ESP32-PV-01'): Promise<BackendDeviceStatus> {
    return request(`/device/status?device_id=${encodeURIComponent(deviceId)}`);
  },

  async getLatestTelemetry(isSimulated: boolean = false): Promise<SolarTelemetry | null> {
    const record = await request<any>(`/telemetry/latest?is_simulated=${isSimulated}`);
    if (!record) return null;
    return {
      id: record.id,
      deviceId: record.device_id,
      timestamp: new Date(record.timestamp).toLocaleTimeString(),
      voltage: record.solar_voltage,
      current: record.solar_current,
      power: record.solar_power,
      energyToday: record.energy_wh ?? 0.0,
      totalEnergy: record.energy_wh ?? 0.0,
      temperature: record.temperature,
      humidity: record.humidity,
      loadCurrent: record.load_current ?? undefined,
      loadPower: record.load_power ?? undefined,
      isSimulated: record.is_simulated,
    };
  },

  async getTelemetryHistory(params: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    is_simulated?: boolean;
  } = {}): Promise<{ total: number; limit: number; offset: number; items: SolarTelemetry[] }> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    query.set('is_simulated', String(params.is_simulated ?? false));

    const res = await request<any>(`/telemetry/history?${query.toString()}`);
    const items: SolarTelemetry[] = res.items.map((record: any) => ({
      id: record.id,
      deviceId: record.device_id,
      timestamp: new Date(record.timestamp).toLocaleTimeString(),
      voltage: record.solar_voltage,
      current: record.solar_current,
      power: record.solar_power,
      energyToday: record.energy_wh ?? 0.0,
      totalEnergy: record.energy_wh ?? 0.0,
      temperature: record.temperature,
      humidity: record.humidity,
      loadCurrent: record.load_current ?? undefined,
      loadPower: record.load_power ?? undefined,
      isSimulated: record.is_simulated,
    }));

    return { total: res.total, limit: res.limit, offset: res.offset, items };
  },

  async submitTelemetry(payload: {
    device_id: string;
    solar_voltage: number;
    solar_current: number;
    temperature: number;
    humidity: number;
    load_current?: number;
    is_simulated?: boolean;
  }): Promise<SolarTelemetry> {
    return request('/telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAnalyticsSummary(isSimulated: boolean = false): Promise<BackendAnalyticsSummary> {
    return request(`/analytics/summary?is_simulated=${isSimulated}`);
  },

  async getDemandSummary(isSimulated: boolean = false): Promise<BackendDemandSummary> {
    return request(`/demand/summary?is_simulated=${isSimulated}`);
  },

  async getAIStatus(isSimulated: boolean = false): Promise<BackendAIStatus> {
    return request(`/ai/status?is_simulated=${isSimulated}`);
  },

  async getAlerts(limit: number = 50): Promise<BackendAlertItem[]> {
    return request(`/alerts?limit=${limit}`);
  },

  // -------------------------------------------------------------------------
  // Load Shedding & AC Telemetry APIs
  // -------------------------------------------------------------------------
  async getLoads(): Promise<LoadConfig[]> {
    return request('/loads');
  },

  async updateLoad(loadId: string, update: Partial<LoadConfig>): Promise<LoadConfig> {
    return request(`/loads/${encodeURIComponent(loadId)}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  },

  async sendRelayCommand(
    loadId: string,
    action: 'on' | 'off',
    reason: string = 'Manual command via dashboard',
    isSimulated: boolean = false
  ): Promise<LoadSheddingEvent> {
    return request(`/loads/${encodeURIComponent(loadId)}/command`, {
      method: 'POST',
      body: JSON.stringify({ action, reason, is_simulated: isSimulated }),
    });
  },

  async getSheddingEvents(limit: number = 50, isSimulated?: boolean): Promise<LoadSheddingEvent[]> {
    const query = new URLSearchParams();
    query.set('limit', String(limit));
    if (isSimulated !== undefined) query.set('is_simulated', String(isSimulated));
    return request(`/loads/events?${query.toString()}`);
  },

  async getFullConfig(): Promise<FullSystemConfig> {
    return request('/loads/config');
  },

  async updateFullConfig(config: { settings?: Partial<DemandSettings>; loads?: Partial<LoadConfig>[] }): Promise<FullSystemConfig> {
    return request('/loads/config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  async resetDefaultConfig(): Promise<FullSystemConfig> {
    return request('/loads/reset-defaults', {
      method: 'POST',
    });
  },

  async getDemandSettings(): Promise<DemandSettings> {
    return request('/loads/settings');
  },

  async updateDemandSettings(settings: Partial<DemandSettings>): Promise<DemandSettings> {
    return request('/loads/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  async getShedStatus(isSimulated: boolean = false): Promise<ShedStatus> {
    return request(`/loads/status?is_simulated=${isSimulated}`);
  },

  async getRelayStates(isSimulated: boolean = false): Promise<Record<string, boolean>> {
    return request(`/loads/relay-states?is_simulated=${isSimulated}`);
  },

  async submitAcTelemetry(payload: {
    device_id: string;
    ac_voltage: number;
    ac_current: number;
    power_w?: number;
    energy_wh?: number;
    relay_states?: Record<string, boolean>;
    is_simulated?: boolean;
  }): Promise<AcTelemetry> {
    return request('/ac-telemetry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getLatestAcTelemetry(isSimulated: boolean = false): Promise<AcTelemetry | null> {
    const record = await request<any>(`/ac-telemetry/latest?is_simulated=${isSimulated}`);
    if (!record) return null;
    let relayStates = null;
    if (record.relay_states) {
      try {
        relayStates = typeof record.relay_states === 'string' ? JSON.parse(record.relay_states) : record.relay_states;
      } catch {
        relayStates = null;
      }
    }
    return {
      id: record.id,
      device_id: record.device_id,
      timestamp: new Date(record.timestamp).toLocaleTimeString(),
      ac_voltage: record.ac_voltage,
      ac_current: record.ac_current,
      power_w: record.power_w,
      energy_wh: record.energy_wh ?? 0.0,
      relay_states: relayStates,
      is_simulated: record.is_simulated,
      created_at: record.created_at,
    };
  },

  async getAcTelemetryHistory(params: {
    limit?: number;
    offset?: number;
    start_date?: string;
    end_date?: string;
    is_simulated?: boolean;
  } = {}): Promise<{ total: number; limit: number; offset: number; items: AcTelemetry[] }> {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.start_date) query.set('start_date', params.start_date);
    if (params.end_date) query.set('end_date', params.end_date);
    query.set('is_simulated', String(params.is_simulated ?? false));

    const res = await request<any>(`/ac-telemetry/history?${query.toString()}`);
    const items: AcTelemetry[] = res.items.map((record: any) => {
      let relayStates = null;
      if (record.relay_states) {
        try {
          relayStates = typeof record.relay_states === 'string' ? JSON.parse(record.relay_states) : record.relay_states;
        } catch {
          relayStates = null;
        }
      }
      return {
        id: record.id,
        device_id: record.device_id,
        timestamp: new Date(record.timestamp).toLocaleTimeString(),
        ac_voltage: record.ac_voltage,
        ac_current: record.ac_current,
        power_w: record.power_w,
        energy_wh: record.energy_wh ?? 0.0,
        relay_states: relayStates,
        is_simulated: record.is_simulated,
        created_at: record.created_at,
      };
    });

    return { total: res.total, limit: res.limit, offset: res.offset, items };
  },
};
