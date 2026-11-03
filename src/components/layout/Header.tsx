import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  RefreshCw,
  Cpu,
  CheckCircle2,
  Clock,
  Radio,
  X,
  Layers,
} from 'lucide-react';
import { useTelemetry } from '../../hooks/useTelemetry';
import { useLoadShed } from '../../hooks/useLoadShed';

type PopoverType = 'esp32' | 'system' | 'mode' | 'notifications' | null;

export const Header: React.FC = () => {
  const {
    telemetry,
    deviceStatus,
    connectionStatus,
    isSimulating,
    backendOnline,
    toggleSimulation,
    refreshTelemetry,
  } = useTelemetry();
  const { demandSettings, acTelemetry } = useLoadShed();

  const [time, setTime] = useState<string>(new Date().toLocaleTimeString());
  const [activePopover, setActivePopover] = useState<PopoverType>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Live real-time clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Click outside listener to close popovers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const togglePopover = (type: PopoverType) => {
    setActivePopover((prev) => (prev === type ? null : type));
  };

  const isLive = connectionStatus === 'Live';
  const isWaiting = connectionStatus === 'Waiting for ESP32';

  return (
    <header
      ref={headerRef}
      className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-xs relative"
    >
      {/* Title & Subtitle */}
      <div className="flex flex-col justify-center">
        <h1 className="text-sm font-bold text-[#0F172A] tracking-tight">
          Automatic Load Shedding & Demand Monitoring
        </h1>
        <p className="text-[11px] text-[#475569] hidden md:block">
          IoT-enabled AC power telemetry, automatic relay shedding, and maximum demand loss reduction
        </p>
      </div>

      {/* Interactive Controls */}
      <div className="flex items-center gap-3">
        {/* 1. ESP32 STATUS PILL */}
        <div className="relative">
          <button
            onClick={() => togglePopover('esp32')}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] hover:border-blue-300 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
            title="Click to view ESP32 Gateway Node Status"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isLive
                    ? 'bg-[#16A34A]'
                    : isSimulating
                    ? 'bg-[#F59E0B]'
                    : isWaiting
                    ? 'bg-[#2563EB]'
                    : 'bg-[#DC2626]'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive
                    ? 'bg-[#16A34A]'
                    : isSimulating
                    ? 'bg-[#F59E0B]'
                    : isWaiting
                    ? 'bg-[#2563EB]'
                    : 'bg-[#DC2626]'
                }`}
              />
            </span>
            <Cpu className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="text-[11px] font-semibold text-[#0F172A]">
              ESP32: <span className="font-medium text-[#475569]">{connectionStatus}</span>
            </span>
          </button>

          {/* Popover 1: ESP32 Node Details */}
          {activePopover === 'esp32' && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-xs text-[#0F172A] z-50 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E2E8F0]">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#2563EB]" />
                  ESP32 Gateway Node
                </span>
                <button
                  onClick={() => setActivePopover(null)}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 font-sans">
                <div className="flex justify-between">
                  <span className="text-[#475569]">Device ID:</span>
                  <span className="font-mono font-semibold">{demandSettings?.device_id ?? 'ESP32_LOAD_SHEDDING_01'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Connection:</span>
                  <span
                    className={`font-semibold ${
                      isLive ? 'text-[#16A34A]' : isSimulating ? 'text-[#F59E0B]' : 'text-[#2563EB]'
                    }`}
                  >
                    {connectionStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Telemetry Stream:</span>
                  <span className="font-semibold text-[#0F172A]">
                    {acTelemetry ? 'Active – Real Hardware' : telemetry ? 'Active' : 'Awaiting data'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Last Update:</span>
                  <span className="font-mono text-[#475569]">
                    {acTelemetry?.timestamp || telemetry?.timestamp || (deviceStatus?.last_seen ? new Date(deviceStatus.last_seen).toLocaleTimeString() : 'Never')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Hardware Target:</span>
                  <span className="font-medium text-[#0F172A]">ZMPT101B + ACS712 + 3× Relays</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-[#94A3B8]">
                <span>Timeout: 60s stale limit</span>
                <button
                  onClick={() => refreshTelemetry()}
                  className="text-[#2563EB] hover:underline font-semibold"
                >
                  Check Now
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. SYSTEM STATUS PILL */}
        <div className="relative">
          <button
            onClick={() => togglePopover('system')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-emerald-50 hover:bg-emerald-100/80 text-[#16A34A] border border-emerald-200 transition-all cursor-pointer active:scale-[0.98] shadow-2xs"
            title="Click to view Subsystem Health & Status"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">
              {backendOnline ? 'System Normal' : 'Backend Connecting'}
            </span>
          </button>

          {/* Popover 2: System Status */}
          {activePopover === 'system' && (
            <div className="absolute right-0 mt-2 w-76 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-xs text-[#0F172A] z-50 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E2E8F0]">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                  System Health & Components
                </span>
                <button
                  onClick={() => setActivePopover(null)}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Backend Server:</span>
                  <span className={`font-semibold ${backendOnline ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {backendOnline ? 'FastAPI Online' : 'Connecting...'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Target Node:</span>
                  <span className="font-mono text-[#0F172A]">{demandSettings?.device_id ?? 'ESP32_LOAD_SHEDDING_01'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Sensors:</span>
                  <span className="font-medium text-[#0F172A]">ZMPT101B (AC V), ACS712-30A (AC I)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Actuators:</span>
                  <span className="font-medium text-[#0F172A]">3× 2-Ch Relays (5 Active + 1 Spare)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Data Stream:</span>
                  <span className="font-medium text-[#16A34A]">
                    {isSimulating ? 'Simulated Active' : isLive ? 'Real Active' : 'Waiting for Readings'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#475569]">Anomaly Status:</span>
                  <span className="font-semibold text-[#16A34A]">0 Critical Faults</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. SIMULATION / REAL MODE TOGGLE BUTTON & POPOVER */}
        <div className="relative">
          <button
            onClick={() => togglePopover('mode')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-[0.98] shadow-2xs ${
              isSimulating
                ? 'bg-amber-50 text-[#D97706] border-amber-200 hover:bg-amber-100/70'
                : 'bg-white text-[#0F172A] border-[#E2E8F0] hover:bg-slate-50'
            }`}
            title="Toggle between Real Telemetry Mode and Simulation Mode"
          >
            <RefreshCw className={`w-3 h-3 ${isSimulating ? 'text-[#D97706]' : 'text-[#2563EB]'}`} />
            <span>{isSimulating ? 'Simulation Mode' : 'Real Data Mode'}</span>
          </button>

          {/* Popover 3: Mode Status & Toggle */}
          {activePopover === 'mode' && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-xs text-[#0F172A] z-50 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E2E8F0]">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#2563EB]" />
                  Data Source Mode
                </span>
                <button
                  onClick={() => setActivePopover(null)}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between">
                  <span className="text-[#475569]">Current Mode:</span>
                  <span className="font-bold text-[#0F172A]">
                    {isSimulating ? 'Simulation Mode' : 'Real Hardware Mode'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475569]">Hardware Connected:</span>
                  <span className={`font-semibold ${isLive ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                    {isLive ? 'Yes (Live Stream)' : 'No (Awaiting ESP32)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed bg-slate-50 p-2 rounded-lg border border-[#E2E8F0]">
                  Real telemetry will appear automatically as soon as the physical ESP32 node posts readings to <code className="text-[#2563EB]">POST /api/telemetry</code>. Simulation Mode provides an isolated test-bench stream without contaminating real database records.
                </p>
              </div>
              <button
                onClick={() => {
                  toggleSimulation();
                  setActivePopover(null);
                }}
                className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-[#2563EB] hover:bg-blue-700 text-white transition-colors cursor-pointer"
              >
                {isSimulating ? 'Switch to Real Data Mode' : 'Enable Simulation Mode'}
              </button>
            </div>
          )}
        </div>

        {/* 4. REAL-TIME LIVE CLOCK */}
        <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-[#475569] bg-slate-50 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>{time}</span>
        </div>

        {/* 5. NOTIFICATION BELL & PANEL */}
        <div className="relative">
          <button
            onClick={() => togglePopover('notifications')}
            className="p-1.5 rounded-lg text-[#475569] hover:text-[#0F172A] hover:bg-slate-100 transition-all cursor-pointer relative active:scale-[0.98]"
            title="System Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F59E0B] ring-2 ring-white" />
          </button>

          {/* Popover 5: Notification Panel */}
          {activePopover === 'notifications' && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-xl shadow-lg p-4 text-xs text-[#0F172A] z-50 animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-[#E2E8F0]">
                <span className="font-bold text-xs flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#F59E0B]" />
                  System Notifications
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-[#D97706]">
                  Active
                </span>
              </div>
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[#0F172A]">Telemetry Pipeline</span>
                    <span className="text-[10px] text-[#94A3B8]">Just now</span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    FastAPI backend ready to receive sensor payloads from ESP32 DevKit V1 for Jakson 100 Wp panel.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[#0F172A]">Demand Analysis Ready</span>
                    <span className="text-[10px] text-[#94A3B8]">Active</span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    Peak demand offset tracking initialized for DC test load monitoring.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-[#0F172A]">AI Model Status</span>
                    <span className="text-[10px] text-[#94A3B8]">Info</span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">
                    Prediction model in baseline state — awaiting continuous physical sensor logs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};