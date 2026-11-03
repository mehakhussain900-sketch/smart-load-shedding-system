import type { SolarTelemetry } from '../types/telemetry';
import type { AcTelemetry, LoadSheddingEvent } from '../types/loadShedding';

type TelemetryListener = (data: SolarTelemetry) => void;
type AcTelemetryListener = (data: AcTelemetry) => void;
type ShedEventListener = (event: LoadSheddingEvent) => void;

class ESP32Service {
  private listeners: Set<TelemetryListener> = new Set();
  private acListeners: Set<AcTelemetryListener> = new Set();
  private shedEventListeners: Set<ShedEventListener> = new Set();
  private mockIntervalId: number | null = null;
  private isSimulating: boolean = false;
  private simulatedEnergyWh: number = 0.0;
  private simulatedAcEnergyWh: number = 14.2;

  // AC Load Simulation State
  private relayStates: Record<string, boolean> = {
    L1: true,
    L2: true,
    L3: true,
    L4: true,
    L5: false,
  };

  private autoMode: boolean = true;
  private autoRestore: boolean = true;
  private demandThresholdW: number = 250.0;
  private hysteresisW: number = 20.0;
  private overThresholdCount: number = 0;
  private underThresholdCount: number = 0;
  private lastActionTime: number = 0;
  private eventIdCounter: number = 1000;

  private loadConfigs: Record<string, { name: string; ratedW: number; isEssential: boolean; priority: number }> = {
    L1: { name: 'L1 - Essential Load 1', ratedW: 100.0, isEssential: true, priority: 1 },
    L2: { name: 'L2 - Essential Load 2', ratedW: 100.0, isEssential: true, priority: 2 },
    L3: { name: 'L3 - Essential Load 3', ratedW: 100.0, isEssential: true, priority: 3 },
    L4: { name: 'L4 - Heavy Load 1',     ratedW: 100.0, isEssential: false, priority: 4 },
    L5: { name: 'L5 - Heavy Load 2',     ratedW: 100.0, isEssential: false, priority: 5 },
  };

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeAc(listener: AcTelemetryListener): () => void {
    this.acListeners.add(listener);
    return () => {
      this.acListeners.delete(listener);
    };
  }

  public subscribeShedEvents(listener: ShedEventListener): () => void {
    this.shedEventListeners.add(listener);
    return () => {
      this.shedEventListeners.delete(listener);
    };
  }

  private notify(data: SolarTelemetry): void {
    this.listeners.forEach((listener) => listener(data));
  }

  private notifyAc(data: AcTelemetry): void {
    this.acListeners.forEach((listener) => listener(data));
  }

  private notifyShedEvent(event: LoadSheddingEvent): void {
    this.shedEventListeners.forEach((listener) => listener(event));
  }

  public setRelayState(loadId: string, state: boolean, isManual: boolean = true): void {
    if (this.relayStates[loadId] !== state) {
      this.relayStates[loadId] = state;
      const event: LoadSheddingEvent = {
        id: ++this.eventIdCounter,
        timestamp: new Date().toLocaleTimeString(),
        action: isManual ? (state ? 'MANUAL_ON' : 'MANUAL_OFF') : (state ? 'RESTORE' : 'SHED'),
        load_id: loadId,
        load_name: this.getLoadName(loadId),
        reason: isManual ? 'Manual control via dashboard' : (state ? 'Power below restoration threshold' : 'Power exceeded maximum demand threshold'),
        power_w_at_event: this.calculateCurrentAcPower(),
        threshold_w: this.demandThresholdW,
        is_automatic: !isManual,
        is_simulated: true,
      };
      this.notifyShedEvent(event);
      this.notifyAc(this.generateAcSample());
    }
  }

  public getRelayStates(): Record<string, boolean> {
    return { ...this.relayStates };
  }

  public setAutoMode(mode: boolean): void {
    this.autoMode = mode;
  }

  public setAutoRestore(mode: boolean): void {
    this.autoRestore = mode;
  }

  public setDemandThreshold(threshold: number): void {
    this.demandThresholdW = threshold;
  }

  public updateLoadConfiguration(loads: Array<{ id: string; name: string; rated_power_w: number; is_essential: boolean; priority: number }>): void {
    loads.forEach((l) => {
      this.loadConfigs[l.id] = {
        name: l.name,
        ratedW: l.rated_power_w,
        isEssential: l.is_essential,
        priority: l.priority,
      };
    });
  }

  private getLoadName(id: string): string {
    return this.loadConfigs[id]?.name || id;
  }

  private calculateCurrentAcPower(): number {
    let base = 0;
    Object.keys(this.loadConfigs).forEach((id) => {
      if (this.relayStates[id]) {
        base += this.loadConfigs[id].ratedW;
      }
    });
    // Add realistic AC fluctuation ± 0.5W
    const fluctuation = (Math.random() - 0.5) * 1.0;
    return Math.max(0, +(base + (base > 0 ? fluctuation : 0)).toFixed(1));
  }

  /**
   * Start simulated telemetry generator scaled for:
   * 1. Jakson JP-12x100 (100 Wp) Solar Panel
   * 2. ZMPT101B AC Voltage & ACS712-30A AC Current Load Shedding
   */
  public startSimulation(): void {
    if (this.mockIntervalId !== null) return;
    this.isSimulating = true;
    this.simulatedEnergyWh = 42.5;

    this.notify(this.generateSample());
    this.notifyAc(this.generateAcSample());

    this.mockIntervalId = window.setInterval(() => {
      this.notify(this.generateSample());
      this.runAutoShedAlgorithm();
      this.notifyAc(this.generateAcSample());
    }, 2000);
  }

  private runAutoShedAlgorithm(): void {
    if (!this.autoMode) return;

    const now = Date.now();
    // 3-second cooldown
    if (now - this.lastActionTime < 3000) return;

    const power = this.calculateCurrentAcPower();

    if (power > this.demandThresholdW) {
      this.overThresholdCount++;
      this.underThresholdCount = 0;

      // 2 seconds threshold confirmation duration (~1 tick of 2000ms)
      if (this.overThresholdCount >= 1) {
        // Find lowest priority non-essential load that is ON
        // Non-essential only. Sorted descending by priority (L5 shed first, then L4)
        const candidates = Object.entries(this.loadConfigs)
          .filter(([id, cfg]) => !cfg.isEssential && this.relayStates[id])
          .sort((a, b) => b[1].priority - a[1].priority)
          .map(([id]) => id);

        const target = candidates[0];

        if (target) {
          this.setRelayState(target, false, false);
          this.lastActionTime = now;
          this.overThresholdCount = 0;
        }
      }
    } else if (this.autoRestore && power < (this.demandThresholdW - this.hysteresisW)) {
      this.underThresholdCount++;
      this.overThresholdCount = 0;

      // Hysteresis restoration: if safely under threshold, restore highest priority OFF load (L4 before L5)
      if (this.underThresholdCount >= 2) {
        const restoreCandidates = Object.entries(this.loadConfigs)
          .filter(([id, cfg]) => !cfg.isEssential && !this.relayStates[id])
          .sort((a, b) => a[1].priority - b[1].priority)
          .map(([id]) => id);

        const target = restoreCandidates[0];

        if (target) {
          // Check if restoring target would immediately cause overload
          const ratedPower = this.loadConfigs[target]?.ratedW || 100.0;
          const wouldBePower = power + ratedPower;

          if (wouldBePower <= (this.demandThresholdW - this.hysteresisW)) {
            this.setRelayState(target, true, false);
            this.lastActionTime = now;
            this.underThresholdCount = 0;
          }
        }
      }
    } else {
      this.overThresholdCount = 0;
      this.underThresholdCount = 0;
    }
  }

  public stopSimulation(): void {
    if (this.mockIntervalId !== null) {
      clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
    this.isSimulating = false;
  }

  public getSimulationStatus(): boolean {
    return this.isSimulating;
  }

  public generateAcSample(): AcTelemetry {
    const now = new Date();
    const power = this.calculateCurrentAcPower();
    // ZMPT101B voltage: ~228V - 232V
    const acVoltage = +(230.0 + (Math.random() - 0.5) * 3.0).toFixed(1);
    // Real AC power factor ~0.92 for resistive/SMPS load mix
    const powerFactor = 0.92;
    const acCurrent = +(power / (acVoltage * powerFactor)).toFixed(2);

    // Energy increment (2 seconds = 2/3600 h)
    const incWh = power * (2 / 3600);
    this.simulatedAcEnergyWh = +(this.simulatedAcEnergyWh + incWh).toFixed(2);

    return {
      device_id: 'ESP32-LOAD-01',
      timestamp: now.toLocaleTimeString(),
      ac_voltage: acVoltage,
      ac_current: acCurrent,
      power_w: power,
      energy_wh: this.simulatedAcEnergyWh,
      relay_states: { ...this.relayStates },
      is_simulated: true,
    };
  }

  private generateSample(): SolarTelemetry {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    
    // Solar curve peaking near mid-day
    const solarFactor = Math.max(0.15, Math.sin(((hours - 6) / 12) * Math.PI));
    const noise = (Math.random() - 0.5) * 0.04;
    const factor = Math.max(0.1, Math.min(1.0, solarFactor + noise));

    // Jakson JP-12x100 100 Wp calculations
    // Vmp = 17.7V, Imp = 5.70A
    const voltage = +(16.8 + factor * 1.4 + (Math.random() - 0.5) * 0.2).toFixed(2);
    const current = +(5.4 * factor + (Math.random() - 0.5) * 0.15).toFixed(2);
    const power = +(voltage * current).toFixed(2);

    // Incremental Wh calculation (2 seconds = 2/3600 h)
    const incWh = power * (2 / 3600);
    this.simulatedEnergyWh = +(this.simulatedEnergyWh + incWh).toFixed(2);

    // DHT22 Ambient
    const temperature = +(28.5 + factor * 5.0 + (Math.random() - 0.5) * 0.5).toFixed(1);
    const humidity = Math.round(58 - factor * 12 + (Math.random() - 0.5) * 2);

    // DC Test Load via ACS712
    const loadCurrent = +(1.8 + (Math.random() - 0.5) * 0.1).toFixed(2);
    const loadPower = +(12.0 * loadCurrent).toFixed(2); // ~21.6 W

    return {
      deviceId: 'ESP32-PV-01',
      timestamp: now.toLocaleTimeString(),
      voltage,
      current,
      power,
      energyToday: this.simulatedEnergyWh,
      totalEnergy: +(280.0 + this.simulatedEnergyWh).toFixed(2),
      temperature,
      humidity,
      loadCurrent,
      loadPower,
      healthScore: 94,
      isSimulated: true,
      systemStatus: 'SIMULATED',
    };
  }
}

export const esp32Service = new ESP32Service();
