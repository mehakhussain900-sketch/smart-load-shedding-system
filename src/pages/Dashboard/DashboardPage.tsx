import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { useLoadShed } from '../../hooks/useLoadShed';
import { useTelemetry } from '../../hooks/useTelemetry';
import { CHART_TOOLTIP_STYLE, CHART_CURSOR_STYLE } from '../../components/common/chartStyles';
import {
  Zap,
  Gauge,
  Activity,
  Sliders,
  Clock,
  ArrowRight,
  ShieldCheck,
  Power,
  Info,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const {
    loads,
    acTelemetry,
    acHistory,
    sheddingEvents,
    demandSettings,
    shedStatus,
  } = useLoadShed();

  const {
    connectionStatus,
    isSimulating,
    backendOnline,
    toggleSimulation,
  } = useTelemetry();

  const hasData = acTelemetry !== null;
  const powerW = hasData ? acTelemetry.power_w.toFixed(1) : '--';
  const voltageV = hasData ? acTelemetry.ac_voltage.toFixed(1) : '--';
  const currentA = hasData ? acTelemetry.ac_current.toFixed(2) : '--';
  const energyWh = hasData ? (acTelemetry.energy_wh ?? 0).toFixed(1) : '--';

  const thresholdW = demandSettings?.threshold_w ?? 200.0;
  const utilizationPct = hasData
    ? ((acTelemetry.power_w / thresholdW) * 100).toFixed(1)
    : '--';

  // Transformer Loading calculation
  // Formula: Transformer Loading (%) = (Grid Input Power (W) / (Transformer Rating (VA) × Power Factor)) × 100
  // Defaults: 1000 VA (1 kVA), Power Factor: 0.8 -> 800 W active power capacity
  const transformerRatingVa = demandSettings?.transformer_rating_va ?? 1000.0;
  const powerFactor = demandSettings?.power_factor ?? 0.8;
  const transformerCapacityW = transformerRatingVa * powerFactor; // e.g. 800 W
  const transformerLoadingPct = hasData
    ? ((acTelemetry.power_w / transformerCapacityW) * 100).toFixed(1)
    : '--';

  const loadingVal = hasData ? (acTelemetry.power_w / transformerCapacityW) * 100 : 0;
  const loadingAccent = loadingVal > 85 ? 'red' : loadingVal > 70 ? 'amber' : 'green';
  const isEstimate = isSimulating || !hasData;

  const isOverThreshold = hasData && acTelemetry.power_w > thresholdW;
  const isNearThreshold = hasData && acTelemetry.power_w > thresholdW * 0.85;

  // Power KPI accent color
  const powerAccent = isOverThreshold ? 'red' : isNearThreshold ? 'amber' : 'green';

  // Badge configuration based on connection status
  const getBadgeStyle = () => {
    switch (connectionStatus) {
      case 'Live':
        return 'bg-emerald-50 text-[#16A34A] border-emerald-200';
      case 'Simulation Mode':
        return 'bg-amber-50 text-[#D97706] border-amber-200';
      case 'Waiting for ESP32':
        return 'bg-blue-50 text-[#2563EB] border-blue-200';
      case 'Disconnected':
      default:
        return 'bg-slate-100 text-[#475569] border-slate-200';
    }
  };

  const autoMode = demandSettings?.auto_mode ?? true;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Load Shedding & Maximum Demand Dashboard"
        description="Real-time AC power telemetry, automatic relay shedding algorithm, and maximum demand loss reduction."
        badge={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeStyle()}`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus === 'Live'
                    ? 'bg-[#16A34A] animate-pulse'
                    : connectionStatus === 'Simulation Mode'
                    ? 'bg-[#D97706]'
                    : 'bg-[#2563EB]'
                }`}
              />
              {connectionStatus}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                autoMode
                  ? 'bg-emerald-50 text-[#16A34A] border-emerald-200'
                  : 'bg-amber-50 text-[#D97706] border-amber-200'
              }`}
            >
              {autoMode ? 'Auto Shedding ON' : 'Manual Mode'}
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2 text-xs text-[#475569] bg-white border border-[#E2E8F0] px-3 py-1.5 rounded-lg shadow-2xs">
            <Radio className="w-3.5 h-3.5 text-[#2563EB]" />
            <span className="font-semibold text-[#0F172A]">Hardware:</span>
            <span>ESP32 | ZMPT101B | ACS712-30A | 3× 2-Ch Relays</span>
          </div>
        }
      />

      {/* Honest Empty State Banner when awaiting real ESP32 readings */}
      {!hasData && !isSimulating && (
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-sm text-[#0F172A]">Waiting for ESP32 load telemetry</div>
              <p className="text-[#475569] mt-0.5 leading-relaxed">
                No real AC sensor readings have arrived yet. Connect the ESP32 node or switch to{' '}
                <strong>Simulation Mode</strong> to inspect live automated shedding behavior on the 201.5W load bench.
              </p>
            </div>
          </div>
          <button
            onClick={toggleSimulation}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#2563EB] text-white hover:bg-blue-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            Enable Simulation Mode
          </button>
        </div>
      )}

      {/* PRIMARY 6 KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Real Power */}
        <StatCard
          title="Real AC Power"
          value={powerW}
          unit="W"
          icon={<Zap className="w-4 h-4" />}
          subtitle={`Limit: ${thresholdW.toFixed(0)} W`}
          accentColor={powerAccent}
          to="/loads"
          tooltip="Real power measured by ZMPT101B and ACS712 sensors"
        />

        {/* 2. AC Voltage */}
        <StatCard
          title="Grid AC Voltage"
          value={voltageV}
          unit="V"
          icon={<Gauge className="w-4 h-4" />}
          subtitle="ZMPT101B Sensor"
          accentColor="blue"
          to="/monitoring"
          tooltip="True RMS AC voltage"
        />

        {/* 3. AC Current */}
        <StatCard
          title="Total AC Current"
          value={currentA}
          unit="A"
          icon={<Activity className="w-4 h-4" />}
          subtitle="ACS712-30A Module"
          accentColor="blue"
          to="/monitoring"
          tooltip="Measured AC load current"
        />

        {/* 4. Transformer Loading (%) */}
        <StatCard
          title="Transformer Loading"
          value={transformerLoadingPct}
          unit="%"
          icon={<Cpu className="w-4 h-4" />}
          subtitle={
            isEstimate
              ? `Est. (${(transformerRatingVa / 1000).toFixed(1)} kVA @ ${powerFactor} PF)`
              : `${(transformerRatingVa / 1000).toFixed(1)} kVA @ ${powerFactor} PF`
          }
          accentColor={loadingAccent}
          to="/loads"
          tooltip={`Transformer Loading (%) = (Grid Input Power (W) / (${transformerRatingVa} VA × ${powerFactor})) × 100. Rated active power: ${transformerCapacityW.toFixed(0)} W. Click to adjust rating and power factor in settings.`}
        />

        {/* 5. Demand Limit & Utilization */}
        <StatCard
          title="Demand Limit"
          value={thresholdW.toFixed(0)}
          unit="W"
          icon={<Sliders className="w-4 h-4" />}
          subtitle={`Util: ${utilizationPct}%`}
          accentColor={powerAccent}
          to="/loads"
          tooltip="Configured demand ceiling before automatic load shedding triggers"
        />

        {/* 6. Energy Consumed */}
        <StatCard
          title="Energy Today"
          value={energyWh}
          unit="Wh"
          icon={<Clock className="w-4 h-4" />}
          subtitle="Cumulative (Wh)"
          accentColor="amber"
          to="/analytics"
          tooltip="Integrated electrical energy consumed"
        />
      </div>

      {/* MAIN TWO PANELS: POWER CHART & RELAY STATES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Power vs Demand Threshold Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#0F172A]">Real-Time Power vs. Demand Threshold</h3>
                {isOverThreshold && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-[#DC2626] border border-rose-200 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Overload Triggered
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569] mt-0.5">
                Red dashed boundary indicates configured maximum demand limit ({thresholdW} W)
              </p>
            </div>
            <Link
              to="/loads"
              className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 hover:underline flex items-center gap-1 transition-colors duration-150"
            >
              <span>Relay Control</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="h-60 w-full">
            {acHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={acHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="powerGradientNormal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="powerGradientOver" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="timestamp" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94A3B8' }}
                    unit="W"
                    domain={[0, Math.max(250, thresholdW + 40)]}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                  <ReferenceLine
                    y={thresholdW}
                    stroke="#DC2626"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: `Threshold: ${thresholdW}W`,
                      position: 'top',
                      fill: '#DC2626',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="power_w"
                    name="Real Power (W)"
                    stroke={isOverThreshold ? '#DC2626' : '#16A34A'}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill={isOverThreshold ? 'url(#powerGradientOver)' : 'url(#powerGradientNormal)'}
                    activeDot={{ r: 5, fill: isOverThreshold ? '#DC2626' : '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-lg bg-slate-50">
                <Clock className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-xs font-semibold text-[#0F172A]">Awaiting Telemetry Stream</p>
                <p className="text-[11px] text-[#475569] max-w-sm mt-1">
                  Power curves will populate as soon as AC readings arrive from ESP32 or simulation mode is turned on.
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-[#475569]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>Measured Load Power</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-1 border-t-2 border-dashed border-[#DC2626]" />
                <span>Demand Ceiling ({thresholdW} W)</span>
              </span>
            </div>
            <span>
              Source:{' '}
              <strong className="text-[#0F172A]">
                {isSimulating ? 'Simulated Bench Stream' : 'Live ESP32 Node'}
              </strong>
            </span>
          </div>
        </div>

        {/* Right: Relay Channel Status (1 Col) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex flex-col justify-between transition-shadow duration-200 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                <Power className="w-4 h-4 text-[#2563EB]" />
                Relay Load Channels
              </h3>
              <Link
                to="/loads"
                className="text-[11px] text-[#2563EB] hover:text-blue-700 hover:underline font-semibold"
              >
                Manage →
              </Link>
            </div>

            <div className="space-y-2">
              {loads.map((load) => {
                const isOn = load.isOn ?? false;
                const isSpare = load.id === 'L6';

                return (
                  <div
                    key={load.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                      isSpare
                        ? 'bg-slate-50/60 border-slate-200 opacity-60'
                        : isOn
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-[#E2E8F0]">
                        {load.id}
                      </span>
                      <div>
                        <div className="font-semibold text-[#0F172A] flex items-center gap-1">
                          <span>{load.name}</span>
                          {load.is_essential && (
                            <span title="Essential Protected">
                              <ShieldCheck className="w-3 h-3 text-[#16A34A]" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#94A3B8]">
                          {load.rated_power_w > 0 ? `${load.rated_power_w} W` : 'Spare'}
                        </div>
                      </div>
                    </div>

                    <div>
                      {isSpare ? (
                        <span className="text-[10px] font-semibold text-[#94A3B8] px-2 py-0.5 bg-slate-100 rounded">
                          Disabled
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOn
                              ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                              : 'bg-rose-50 text-[#DC2626] border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOn ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                            }`}
                          />
                          {isOn ? 'ON' : 'SHED'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8F0] space-y-2 text-[11px]">
            <div className="flex justify-between text-[#475569]">
              <span>Transformer:</span>
              <span className="text-[#0F172A] font-semibold">
                {(transformerRatingVa / 1000).toFixed(1)} kVA @ {powerFactor} PF ({transformerCapacityW.toFixed(0)} W)
              </span>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Transformer Loading:</span>
              <strong className={loadingAccent === 'red' ? 'text-[#DC2626]' : loadingAccent === 'amber' ? 'text-[#D97706]' : 'text-[#16A34A]'}>
                {transformerLoadingPct}% {isEstimate ? '(Estimated)' : ''}
              </strong>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Loads Shed:</span>
              <strong className="text-[#0F172A]">
                {shedStatus?.loads_shed_count ?? 0} channel(s)
              </strong>
            </div>
            <div className="flex justify-between text-[#475569]">
              <span>Essential Protection:</span>
              <span className="text-[#16A34A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                L1 Protected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT SHEDDING EVENTS & ALGORITHM STATUS */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs p-5 transition-shadow duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">
              Recent Automated Shedding & Restoration Actions
            </h3>
            <p className="text-xs text-[#475569]">
              Cooldown: {demandSettings?.cooldown_sec ?? 3}s | Confirmation: {demandSettings?.confirmation_sec ?? 2}s | Restoration Delta: {demandSettings?.restoration_hysteresis_w ?? 20}W
            </p>
          </div>
          <Link
            to="/loads"
            className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 hover:underline"
          >
            View All Events →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Load</th>
                <th className="py-2 px-3">Trigger Reason</th>
                <th className="py-2 px-3">Power at Trigger</th>
                <th className="py-2 px-3">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sheddingEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-[#94A3B8] italic">
                    No shedding events logged. System load currently stable below maximum demand threshold.
                  </td>
                </tr>
              ) : (
                sheddingEvents.slice(0, 5).map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3 font-mono text-[#475569]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          evt.action === 'SHED' || evt.action === 'MANUAL_OFF'
                            ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
                            : 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        }`}
                      >
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#0F172A]">
                      {evt.load_id} ({evt.load_name})
                    </td>
                    <td className="py-2 px-3 text-[#475569]">{evt.reason}</td>
                    <td className="py-2 px-3 font-mono font-medium text-[#0F172A]">
                      {evt.power_w_at_event !== null ? `${evt.power_w_at_event} W` : '--'}
                    </td>
                    <td className="py-2 px-3 text-[11px] text-[#475569]">
                      {evt.is_automatic ? 'Automated Algorithm' : 'Manual Dashboard'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between text-[11px] text-[#94A3B8]">
          <span>
            Backend status: <strong className="text-[#0F172A]">{backendOnline ? 'Online' : 'Offline'}</strong>
          </span>
          <span>
            Solar PV monitoring & prediction modules preserved for Semester 2 integration.
          </span>
        </div>
      </div>
    </div>
  );
};
