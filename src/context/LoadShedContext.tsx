import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  LoadConfig,
  LoadSheddingEvent,
  DemandSettings,
  AcTelemetry,
  ShedStatus,
} from '../types/loadShedding';
import { api } from '../services/api';
import { esp32Service } from '../services/esp32Service';
import { useTelemetry } from '../hooks/useTelemetry';

interface LoadShedContextType {
  loads: LoadConfig[];
  acTelemetry: AcTelemetry | null;
  acHistory: AcTelemetry[];
  sheddingEvents: LoadSheddingEvent[];
  demandSettings: DemandSettings | null;
  shedStatus: ShedStatus | null;
  pendingCommands: Record<string, boolean>;
  isLoading: boolean;
  sendRelayCommand: (loadId: string, action: 'on' | 'off') => Promise<void>;
  updateSettings: (settings: Partial<DemandSettings>) => Promise<void>;
  updateLoad: (loadId: string, updates: Partial<LoadConfig>) => Promise<void>;
  updateFullConfig: (settings: Partial<DemandSettings>, loads: Partial<LoadConfig>[]) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  toggleAutoMode: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const LoadShedContext = createContext<LoadShedContextType | undefined>(undefined);

const DEFAULT_LOADS: LoadConfig[] = [
  { id: 'L1', name: 'L1 - Essential Load 1', rated_power_w: 100.0, priority: 1, is_essential: true,  category: 'Essential', relay_channel: 1, is_enabled: true, gpio_pin: 26, relay_active_low: true, isOn: true },
  { id: 'L2', name: 'L2 - Essential Load 2', rated_power_w: 100.0, priority: 2, is_essential: true,  category: 'Essential', relay_channel: 2, is_enabled: true, gpio_pin: 27, relay_active_low: true, isOn: true },
  { id: 'L3', name: 'L3 - Essential Load 3', rated_power_w: 100.0, priority: 3, is_essential: true,  category: 'Essential', relay_channel: 3, is_enabled: true, gpio_pin: 25, relay_active_low: true, isOn: true },
  { id: 'L4', name: 'L4 - Heavy Load 1',     rated_power_w: 100.0, priority: 4, is_essential: false, category: 'Heavy',     relay_channel: 4, is_enabled: true, gpio_pin: 33, relay_active_low: true, isOn: true },
  { id: 'L5', name: 'L5 - Heavy Load 2',     rated_power_w: 100.0, priority: 5, is_essential: false, category: 'Heavy',     relay_channel: 5, is_enabled: true, gpio_pin: 32, relay_active_low: true, isOn: false },
];

export const LoadShedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isSimulating } = useTelemetry();

  const [loads, setLoads] = useState<LoadConfig[]>(DEFAULT_LOADS);
  const [acTelemetry, setAcTelemetry] = useState<AcTelemetry | null>(null);
  const [acHistory, setAcHistory] = useState<AcTelemetry[]>([]);
  const [sheddingEvents, setSheddingEvents] = useState<LoadSheddingEvent[]>([]);
  const [demandSettings, setDemandSettings] = useState<DemandSettings | null>({
    id: 1,
    threshold_w: 250.0,
    confirmation_sec: 2.0,
    cooldown_sec: 3.0,
    restoration_hysteresis_w: 20.0,
    auto_mode: true,
    auto_restore_enabled: true,
    transformer_rating_va: 1000.0,
    power_factor: 0.8,
    device_id: 'ESP32_LOAD_SHEDDING_01',
    telemetry_interval_sec: 2.0,
    updated_at: new Date().toISOString(),
  });
  const [shedStatus, setShedStatus] = useState<ShedStatus | null>(null);
  const [pendingCommands, setPendingCommands] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch real data from backend
  const fetchRealData = useCallback(async () => {
    try {
      const [fetchedLoads, fetchedStates, latestAc, historyRes, events, settings, status] =
        await Promise.allSettled([
          api.getLoads(),
          api.getRelayStates(false),
          api.getLatestAcTelemetry(false),
          api.getAcTelemetryHistory({ limit: 30, is_simulated: false }),
          api.getSheddingEvents(30, false),
          api.getDemandSettings(),
          api.getShedStatus(false),
        ]);

      let states: Record<string, boolean> = {};
      if (fetchedStates.status === 'fulfilled') {
        states = fetchedStates.value;
      }

      if (fetchedLoads.status === 'fulfilled') {
        const mapped = fetchedLoads.value.map((l) => ({
          ...l,
          isOn: states[l.id] ?? l.is_enabled,
        }));
        setLoads(mapped);
      }

      if (latestAc.status === 'fulfilled') {
        setAcTelemetry(latestAc.value);
      }

      if (historyRes.status === 'fulfilled') {
        setAcHistory(historyRes.value.items.slice().reverse());
      }

      if (events.status === 'fulfilled') {
        setSheddingEvents(events.value);
      }

      if (settings.status === 'fulfilled') {
        setDemandSettings(settings.value);
      }

      if (status.status === 'fulfilled') {
        setShedStatus(status.value);
      }

      setPendingCommands({});
    } catch {
      // Backend offline or error handled gracefully
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync simulation or real polling
  useEffect(() => {
    if (isSimulating) {
      // In simulation mode, subscribe to esp32Service AC telemetry & events
      const initialStates = esp32Service.getRelayStates();
      setLoads(
        DEFAULT_LOADS.map((l) => ({
          ...l,
          isOn: initialStates[l.id] ?? l.is_enabled,
        }))
      );

      const unsubAc = esp32Service.subscribeAc((sample) => {
        setAcTelemetry(sample);
        setAcHistory((prev) => [...prev, sample].slice(-30));

        // Update loads' isOn state based on sample.relay_states
        if (sample.relay_states) {
          const currentStates = sample.relay_states;
          setLoads((prevLoads) =>
            prevLoads.map((l) => ({
              ...l,
              isOn: currentStates[l.id] ?? l.isOn,
            }))
          );
        }

        // Update synthetic shedStatus
        const currentPower = sample.power_w;
        const thresh = demandSettings?.threshold_w || 250.0;
        const util = +((currentPower / thresh) * 100).toFixed(1);
        const activeIds = Object.entries(sample.relay_states || {})
          .filter(([, on]) => on)
          .map(([id]) => id);
        const shedIds = Object.entries(sample.relay_states || {})
          .filter(([id, on]) => !on && id !== 'L6')
          .map(([id]) => id);

        setShedStatus({
          auto_mode: demandSettings?.auto_mode ?? true,
          threshold_w: thresh,
          current_power_w: currentPower,
          utilization_pct: util,
          loads_shed_count: shedIds.length,
          active_loads: activeIds,
          shed_loads: shedIds,
          last_event_at: new Date().toISOString(),
          status_message:
            currentPower > thresh
              ? `OVER THRESHOLD: ${currentPower.toFixed(1)}W > ${thresh.toFixed(1)}W`
              : `Normal: ${currentPower.toFixed(1)}W (${util}% of threshold)`,
        });
      });

      const unsubEvents = esp32Service.subscribeShedEvents((event) => {
        setSheddingEvents((prev) => [event, ...prev].slice(0, 50));
      });

      setIsLoading(false);

      return () => {
        unsubAc();
        unsubEvents();
      };
    } else {
      // Real hardware mode: initial fetch + interval polling
      fetchRealData();
      const interval = setInterval(fetchRealData, 2500);
      return () => clearInterval(interval);
    }
  }, [isSimulating, fetchRealData, demandSettings?.threshold_w, demandSettings?.auto_mode]);

  const sendRelayCommand = async (loadId: string, action: 'on' | 'off') => {
    setPendingCommands((prev) => ({ ...prev, [loadId]: true }));

    if (isSimulating) {
      esp32Service.setRelayState(loadId, action === 'on', true);
      setPendingCommands((prev) => ({ ...prev, [loadId]: false }));
      return;
    }

    try {
      await api.sendRelayCommand(loadId, action, 'Manual dashboard command', false);
      await fetchRealData();
    } catch (err) {
      console.error('Failed to send relay command:', err);
    } finally {
      setPendingCommands((prev) => ({ ...prev, [loadId]: false }));
    }
  };

  const updateSettings = async (updates: Partial<DemandSettings>) => {
    if (isSimulating) {
      setDemandSettings((prev) => (prev ? { ...prev, ...updates } : null));
      if (updates.threshold_w !== undefined) {
        esp32Service.setDemandThreshold(updates.threshold_w);
      }
      if (updates.auto_mode !== undefined) {
        esp32Service.setAutoMode(updates.auto_mode);
      }
      return;
    }

    try {
      const updated = await api.updateDemandSettings(updates);
      setDemandSettings(updated);
    } catch (err) {
      console.error('Failed to update demand settings:', err);
    }
  };

  const toggleAutoMode = async () => {
    const current = demandSettings?.auto_mode ?? true;
    await updateSettings({ auto_mode: !current });
  };

  const updateLoad = async (loadId: string, updates: Partial<LoadConfig>) => {
    if (isSimulating) {
      setLoads((prev) => prev.map((l) => (l.id === loadId ? { ...l, ...updates } : l)));
      return;
    }
    try {
      const updated = await api.updateLoad(loadId, updates);
      setLoads((prev) =>
        prev.map((l) => (l.id === loadId ? { ...l, ...updated, isOn: l.isOn } : l))
      );
    } catch (err) {
      console.error('Failed to update load:', err);
      throw err;
    }
  };

  const updateFullConfig = async (
    settings: Partial<DemandSettings>,
    loadsUpdate: Partial<LoadConfig>[]
  ) => {
    if (isSimulating) {
      if (settings) {
        setDemandSettings((prev) => (prev ? { ...prev, ...settings } : null));
        if (settings.threshold_w !== undefined) esp32Service.setDemandThreshold(settings.threshold_w);
        if (settings.auto_mode !== undefined) esp32Service.setAutoMode(settings.auto_mode);
      }
      return;
    }
    try {
      const result = await api.updateFullConfig({ settings, loads: loadsUpdate });
      setDemandSettings(result.settings);
      const states = await api.getRelayStates(false).catch(() => ({} as Record<string, boolean>));
      setLoads(result.loads.map((l) => ({ ...l, isOn: states[l.id] ?? l.is_enabled })));
    } catch (err) {
      console.error('Failed to update full config:', err);
      throw err;
    }
  };

  const resetToDefaults = async () => {
    if (isSimulating) return;
    try {
      const result = await api.resetDefaultConfig();
      setDemandSettings(result.settings);
      const states = await api.getRelayStates(false).catch(() => ({} as Record<string, boolean>));
      setLoads(result.loads.map((l) => ({ ...l, isOn: states[l.id] ?? l.is_enabled })));
    } catch (err) {
      console.error('Failed to reset defaults:', err);
      throw err;
    }
  };

  return (
    <LoadShedContext.Provider
      value={{
        loads,
        acTelemetry,
        acHistory,
        sheddingEvents,
        demandSettings,
        shedStatus,
        pendingCommands,
        isLoading,
        sendRelayCommand,
        updateSettings,
        updateLoad,
        updateFullConfig,
        resetToDefaults,
        toggleAutoMode,
        refreshAll: fetchRealData,
      }}
    >
      {children}
    </LoadShedContext.Provider>
  );
};
