import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTelemetry } from '../../hooks/useTelemetry';
import { CHART_TOOLTIP_STYLE, CHART_CURSOR_STYLE, CHART_LEGEND_STYLE } from '../../components/common/chartStyles';
import {
  Zap,
  Gauge,
  Activity,
  Thermometer,
  Droplets,
  BatteryCharging,
  Clock,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const LiveMonitoringPage: React.FC = () => {
  const { telemetry, history, connectionStatus } = useTelemetry();

  const hasData = telemetry !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitoring"
        description="High-frequency real-time solar generation, load measurements, and environmental telemetry from ESP32."
        badge={
          <StatusBadge
            status={
              connectionStatus === 'Live'
                ? 'ONLINE'
                : connectionStatus === 'Simulation Mode'
                ? 'SIMULATING'
                : 'OFFLINE'
            }
            label={connectionStatus}
            size="sm"
          />
        }
        actions={
          <div className="text-xs text-[#475569] font-mono bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg shadow-2xs">
            Node: ESP32-PV-01 | Panel: 100 Wp Jakson
          </div>
        }
      />

      {/* SECTION 1: SOLAR PV MEASUREMENTS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
            SOLAR GENERATION (Jakson JP-12x100 100 Wp)
          </h2>
          <span className="text-[11px] text-[#94A3B8]">Sensors: Voltage Divider & ACS712 Solar</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Solar Voltage"
            value={hasData ? telemetry.voltage.toFixed(2) : '--'}
            unit="V"
            icon={<Gauge className="w-4 h-4" />}
            subtitle="Vmp: 17.7V | Voc: 21.4V"
            accentColor="amber"
          />
          <StatCard
            title="Solar Current"
            value={hasData ? telemetry.current.toFixed(2) : '--'}
            unit="A"
            icon={<Zap className="w-4 h-4" />}
            subtitle="Imp: 5.70A | Isc: 6.20A"
            accentColor="amber"
          />
          <StatCard
            title="Solar Power"
            value={hasData ? telemetry.power.toFixed(1) : '--'}
            unit="W"
            icon={<Activity className="w-4 h-4" />}
            subtitle="Instantaneous (V × I)"
            accentColor="green"
          />
          <StatCard
            title="Today's Energy"
            value={hasData ? telemetry.energyToday.toFixed(1) : '--'}
            unit="Wh"
            icon={<Zap className="w-4 h-4" />}
            subtitle="Integrated energy"
            accentColor="green"
          />
        </div>
      </div>

      {/* SECTION 2: LOAD & ENVIRONMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Measurements */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              LOAD MEASUREMENTS (DC Test Load)
            </h2>
            <span className="text-[11px] text-[#94A3B8]">ACS712 Load Sensor</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Load Current"
              value={hasData && telemetry.loadCurrent !== undefined ? telemetry.loadCurrent.toFixed(2) : '--'}
              unit="A"
              icon={<Zap className="w-4 h-4" />}
              subtitle="DC Load draw"
              accentColor="blue"
            />
            <StatCard
              title="Load Power"
              value={hasData && telemetry.loadPower !== undefined ? telemetry.loadPower.toFixed(1) : '--'}
              unit="W"
              icon={<BatteryCharging className="w-4 h-4" />}
              subtitle="DC Load consumption"
              accentColor="blue"
            />
          </div>
        </div>

        {/* Environmental Telemetry */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
              ENVIRONMENTAL CONDITIONS (DHT22)
            </h2>
            <span className="text-[11px] text-[#94A3B8]">DHT22 Sensor</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Temperature"
              value={hasData ? telemetry.temperature.toFixed(1) : '--'}
              unit="°C"
              icon={<Thermometer className="w-4 h-4" />}
              subtitle="Ambient temperature"
              accentColor="blue"
            />
            <StatCard
              title="Humidity"
              value={hasData ? Math.round(telemetry.humidity) : '--'}
              unit="%"
              icon={<Droplets className="w-4 h-4" />}
              subtitle="Relative humidity"
              accentColor="blue"
            />
          </div>
        </div>
      </div>

      {/* SENSOR CIRCUIT STATUS TABLE */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
        <h3 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          Sensor Hardware Interface Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {[
            { sensor: 'Voltage Divider', param: '0 - 21.4V DC', status: hasData ? 'Nominal' : 'Waiting', pin: 'GPIO 34 (ADC1)' },
            { sensor: 'ACS712 Solar', param: '0 - 6.2A DC', status: hasData ? 'Nominal' : 'Waiting', pin: 'GPIO 35 (ADC1)' },
            { sensor: 'ACS712 Load', param: '0 - 5.0A DC', status: hasData ? 'Nominal' : 'Waiting', pin: 'GPIO 32 (ADC1)' },
            { sensor: 'DHT22 Temp/Humidity', param: '-20°C to 80°C / 0-100%', status: hasData ? 'Nominal' : 'Waiting', pin: 'GPIO 4 (Digital)' },
          ].map((s) => (
            <div key={s.sensor} className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-[#0F172A]">{s.sensor}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${hasData ? 'bg-emerald-50 text-[#16A34A]' : 'bg-slate-200 text-[#475569]'}`}>
                  {s.status}
                </span>
              </div>
              <p className="text-[11px] text-[#475569]">{s.param}</p>
              <p className="text-[10px] text-[#94A3B8] font-mono mt-1">{s.pin}</p>
            </div>
          ))}
        </div>
      </div>

      {/* REAL-TIME ROLLING CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Solar Power vs Load Power */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Real-Time Power Balance</h3>
              <p className="text-xs text-[#475569]">Solar Generation Power (W) vs Load Consumption Power (W)</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
              Buffer: {history.length} pts
            </span>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveSolarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="liveLoadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 110]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="power"
                    name="Solar Power (W)"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#liveSolarGrad)"
                    activeDot={{ r: 5, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="loadPower"
                    name="Load Power (W)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#liveLoadGrad)"
                    activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-lg bg-slate-50">
                <Clock className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-xs font-semibold text-[#0F172A]">Waiting for Live Telemetry</p>
                <p className="text-[11px] text-[#475569] mt-1">Real-time curves render when ESP32 transmits readings.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Solar Voltage & Solar Current */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Solar V-I Operating Dynamics</h3>
              <p className="text-xs text-[#475569]">Voltage (V) and Current (A) across 100 Wp panel</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
              Dual Axis
            </span>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis yAxisId="v" tick={{ fontSize: 10, fill: '#94A3B8' }} unit="V" domain={[0, 24]} />
                  <YAxis yAxisId="c" orientation="right" tick={{ fontSize: 10, fill: '#94A3B8' }} unit="A" domain={[0, 7]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Line
                    yAxisId="v"
                    type="monotone"
                    dataKey="voltage"
                    name="Voltage (V)"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    yAxisId="c"
                    type="monotone"
                    dataKey="current"
                    name="Current (A)"
                    stroke="#16A34A"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-lg bg-slate-50">
                <Clock className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-xs font-semibold text-[#0F172A]">Waiting for Live Telemetry</p>
                <p className="text-[11px] text-[#475569] mt-1">Voltage and current trends will display dynamically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
