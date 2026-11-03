import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { SolarTelemetry, BackendDeviceStatus, ConnectionStatus } from '../types/telemetry';
import { api } from '../services/api';
import { esp32Service } from '../services/esp32Service';

interface TelemetryContextType {
  telemetry: SolarTelemetry | null;
  history: SolarTelemetry[];
  deviceStatus: BackendDeviceStatus | null;
  connectionStatus: ConnectionStatus;
  isSimulating: boolean;
  isLoading: boolean;
  backendOnline: boolean;
  lastFetchError: string | null;
  toggleSimulation: () => void;
  setSimulating: (simulating: boolean) => void;
  refreshTelemetry: () => Promise<void>;
}

export const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [telemetry, setTelemetry] = useState<SolarTelemetry | null>(null);
  const [history, setHistory] = useState<SolarTelemetry[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<BackendDeviceStatus | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [lastFetchError, setLastFetchError] = useState<string | null>(null);

  // Real Mode polling
  const fetchRealData = useCallback(async () => {
    try {
      // 1. Device status — check against the AC load-shedding device ID
      const dev = await api.getDeviceStatus('ESP32_LOAD_SHEDDING_01');
      setDeviceStatus(dev);
      setBackendOnline(true);
      setLastFetchError(null);

      // 2. Latest reading
      const latest = await api.getLatestTelemetry(false);
      setTelemetry(latest);

      // 3. History
      const hist = await api.getTelemetryHistory({ limit: 30, is_simulated: false });
      setHistory(hist.items.slice().reverse()); // Oldest first for charts
    } catch (err: any) {
      setBackendOnline(false);
      setLastFetchError(err.message || 'Unable to connect to backend server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSimulating) {
      // Simulation mode
      esp32Service.startSimulation();
      const unsubscribe = esp32Service.subscribe((data) => {
        setTelemetry(data);
        setHistory((prev) => {
          const updated = [...prev, data];
          return updated.slice(-30);
        });
      });

      return () => {
        unsubscribe();
        esp32Service.stopSimulation();
      };
    } else {
      // Real hardware mode: initial fetch + interval polling
      fetchRealData();
      const interval = setInterval(fetchRealData, 2500);
      return () => clearInterval(interval);
    }
  }, [isSimulating, fetchRealData]);

  const toggleSimulation = () => {
    if (isSimulating) {
      setIsSimulating(false);
      setTelemetry(null);
      setHistory([]);
      setIsLoading(true);
    } else {
      setIsSimulating(true);
      setHistory([]);
    }
  };

  const connectionStatus: ConnectionStatus = isSimulating
    ? 'Simulation Mode'
    : !backendOnline
    ? 'Disconnected'
    : (deviceStatus?.connection_status || 'Waiting for ESP32');

  return (
    <TelemetryContext.Provider
      value={{
        telemetry,
        history,
        deviceStatus,
        connectionStatus,
        isSimulating,
        isLoading,
        backendOnline,
        lastFetchError,
        toggleSimulation,
        setSimulating: setIsSimulating,
        refreshTelemetry: fetchRealData,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};
