import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { useTelemetry } from '../../hooks/useTelemetry';
import { api } from '../../services/api';
import { CHART_TOOLTIP_STYLE, CHART_CURSOR_STYLE, CHART_LEGEND_STYLE } from '../../components/common/chartStyles';
import type { BackendDemandSummary } from '../../types/telemetry';
import {
  TrendingDown,
  Zap,
  Activity,
  BarChart3,
  ArrowDownRight,
  Info,
  ShieldCheck,
  AlertCircle,
  Cpu,
  Layers,
  ToggleRight,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLoadShed } from '../../hooks/useLoadShed';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const MaximumDemandPage: React.FC = () => {
  const { isSimulating, setSimulating } = useTelemetry();
  const { acTelemetry, demandSettings, shedStatus } = useLoadShed();
  const [demandData, setDemandData] = useState<BackendDemandSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchDemand = async () => {
      try {
        const res = await api.getDemandSummary(isSimulating);
        if (isMounted) setDemandData(res);
      } catch {
        // Handled silently
      }
    };

    fetchDemand();
    const interval = setInterval(fetchDemand, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimulating]);

  // Scaled 100 Wp Jakson test bench simulated profile (12V DC test load)
  const hourlyProfile100W = [
    { time: '06:00', demandWithoutPvW: 24.0, pvGenerationW: 4.5, demandWithPvW: 19.5, demandReductionW: 4.5 },
    { time: '07:00', demandWithoutPvW: 32.0, pvGenerationW: 18.2, demandWithPvW: 13.8, demandReductionW: 18.2 },
    { time: '08:00', demandWithoutPvW: 45.0, pvGenerationW: 38.6, demandWithPvW: 16.4, demandReductionW: 28.6 },
    { time: '09:00', demandWithoutPvW: 56.0, pvGenerationW: 62.0, demandWithPvW: 8.0, demandReductionW: 48.0 },
    { time: '10:00', demandWithoutPvW: 64.0, pvGenerationW: 81.5, demandWithPvW: 2.0, demandReductionW: 62.0 },
    { time: '11:00', demandWithoutPvW: 72.0, pvGenerationW: 92.4, demandWithPvW: 0.0, demandReductionW: 72.0 },
    { time: '12:00', demandWithoutPvW: 76.5, pvGenerationW: 96.0, demandWithPvW: 0.0, demandReductionW: 76.5 },
    { time: '13:00', demandWithoutPvW: 74.0, pvGenerationW: 91.2, demandWithPvW: 0.0, demandReductionW: 74.0 },
    { time: '14:00', demandWithoutPvW: 68.0, pvGenerationW: 78.0, demandWithPvW: 0.0, demandReductionW: 68.0 },
    { time: '15:00', demandWithoutPvW: 58.0, pvGenerationW: 55.4, demandWithPvW: 12.6, demandReductionW: 45.4 },
    { time: '16:00', demandWithoutPvW: 48.0, pvGenerationW: 31.0, demandWithPvW: 22.0, demandReductionW: 26.0 },
    { time: '17:00', demandWithoutPvW: 36.0, pvGenerationW: 11.5, demandWithPvW: 26.5, demandReductionW: 9.5 },
    { time: '18:00', demandWithoutPvW: 28.0, pvGenerationW: 1.8, demandWithPvW: 26.2, demandReductionW: 1.8 },
  ];

  // Multi-day peak demand reduction trend across test runs on 100 Wp test bench
  const multiDayTrend100W = [
    { day: 'Day 1', withoutPv: 74.5, withPv: 18.2, reduction: 56.3 },
    { day: 'Day 2', withoutPv: 78.0, withPv: 20.4, reduction: 57.6 },
    { day: 'Day 3', withoutPv: 71.2, withPv: 16.5, reduction: 54.7 },
    { day: 'Day 4', withoutPv: 76.8, withPv: 19.1, reduction: 57.7 },
    { day: 'Day 5', withoutPv: 73.4, withPv: 17.8, reduction: 55.6 },
    { day: 'Day 6', withoutPv: 70.0, withPv: 15.9, reduction: 54.1 },
    { day: 'Day 7 (Today)', withoutPv: 76.5, withPv: 14.8, reduction: 61.7 },
  ];

  const hasRealData = !isSimulating && Boolean(demandData && demandData.data_points > 0);
  const peakVal = demandData?.peak_demand_w ?? null;
  const offsetVal = demandData?.estimated_demand_offset_w ?? null;
  const avgVal = demandData?.average_demand_w ?? null;
  const pvVal = demandData?.pv_contribution_w ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maximum Demand Analysis"
        description="Evaluation of 100 Wp solar photovoltaic generation impact on peak DC load shaving and demand loss mitigation."
        badge={
          isSimulating ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
              Simulation Mode Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
              Real Hardware Mode
            </span>
          )
        }
      />

      {/* Honest Empty State for Real Hardware Mode */}
      {!isSimulating && !hasRealData && (
        <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-[#0F172A]">
                Waiting for ESP32 load telemetry. No real readings have been received yet.
              </h4>
              <p className="text-xs text-[#475569] mt-0.5">
                Maximum demand analysis requires historical readings from ACS712 Sensor #2 (DC Load Current). You can switch to simulation mode to preview the analysis methodology.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSimulating(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-amber-300 text-[#D97706] hover:bg-amber-100/50 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            Preview with Simulation
          </button>
        </div>
      )}

      {/* Method Disclosure Card */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex items-start gap-3.5 text-xs text-[#0F172A] shadow-2xs">
        <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-sm text-[#0F172A]">
            Methodology & Physical Scope Disclosure
          </div>
          <p className="text-xs text-[#475569] leading-relaxed">
            {demandData?.method_note ||
              'Maximum demand analysis evaluates how local solar PV generation can shave peak electrical demand. Calculations demonstrate the methodology on the 100 Wp test bench and small DC load. It does not represent a validated grid-scale maximum demand tariff reduction.'}
          </p>
        </div>
      </div>

      {/* Active Load Shedding System Status Card */}
      <div className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#16A34A]">
            <ToggleRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Automatic Load Shedding Module (Current Active Control)
            </div>
            <div className="text-xs text-[#475569]">
              Configured Demand Ceiling: <strong>{demandSettings?.threshold_w ?? 250} W</strong> | Live Power: <strong>{acTelemetry?.power_w.toFixed(1) ?? '--'} W</strong> | Shed: <strong>{shedStatus?.loads_shed_count ?? 0} loads</strong>
            </div>
          </div>
        </div>
        <Link
          to="/loads"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white transition-colors shadow-2xs shrink-0"
        >
          <span>Open Relay Control</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Real Hardware Empty State Educational Breakdown */}
      {!isSimulating && !hasRealData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              <h3 className="text-sm font-bold text-[#0F172A]">What is Maximum Demand?</h3>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              Maximum demand represents the peak rate at which electrical energy is consumed by connected loads over a defined integration window (typically 15 or 30 minutes in commercial grids). High peak spikes cause thermal losses in transmission lines and trigger utility maximum demand penalty charges.
            </p>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#0F172A]">
              <span className="font-semibold">Mathematical Net Demand:</span>
              <code className="block mt-1 font-mono text-[11px] text-[#2563EB]">
                P_net(t) = P_load(t) - P_solar(t)
              </code>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#2563EB]" />
              <h3 className="text-sm font-bold text-[#0F172A]">100 Wp Hardware Implementation</h3>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              On this prototype bench, peak demand is monitored on the DC test load via ACS712 Sensor #2 and the DC bus voltage divider:
            </p>
            <ul className="text-xs text-[#475569] space-y-1.5 list-disc list-inside">
              <li><strong className="text-[#0F172A]">Jakson JP-12x100:</strong> 100 Wp rated solar module (Vmp = 17.7V, Imp = 5.70A)</li>
              <li><strong className="text-[#0F172A]">ACS712 Sensor #2:</strong> Dedicated to measuring DC load current</li>
              <li><strong className="text-[#0F172A]">Peak Shaving:</strong> Solar power directly feeds load during midday sun</li>
              <li><strong className="text-[#0F172A]">Database Sync:</strong> Computes moving average demand once real loads run</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Populated Metrics & Charts */
        <>
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Peak Load Demand"
              value={
                isSimulating
                  ? '76.5'
                  : peakVal !== null
                  ? `${peakVal}`
                  : '0.0'
              }
              unit="W"
              icon={<Zap className="w-4 h-4" />}
              subtitle="Unassisted peak DC load"
              accentColor="amber"
              badge="Base Peak"
            />

            <StatCard
              title="Net Demand with PV"
              value={
                isSimulating
                  ? '14.8'
                  : peakVal !== null && offsetVal !== null
                  ? `${Math.max(0, peakVal - offsetVal).toFixed(1)}`
                  : '0.0'
              }
              unit="W"
              icon={<TrendingDown className="w-4 h-4" />}
              subtitle="Net peak with solar PV"
              accentColor="green"
              badge="Shaved Peak"
            />

            <StatCard
              title="Peak Demand Shaved"
              value={
                isSimulating
                  ? '-61.7'
                  : offsetVal !== null
                  ? `-${offsetVal}`
                  : '0.0'
              }
              unit="W"
              icon={<ArrowDownRight className="w-4 h-4" />}
              subtitle={isSimulating ? '80.7% peak reduction' : 'Calculated solar offset'}
              accentColor="green"
            />

            <StatCard
              title="Average PV Offset"
              value={
                isSimulating
                  ? '47.8'
                  : pvVal !== null
                  ? `${pvVal}`
                  : '0.0'
              }
              unit="W"
              icon={<Activity className="w-4 h-4" />}
              subtitle="Daylight generation offset"
              accentColor="blue"
            />

            <StatCard
              title="Average DC Load"
              value={
                isSimulating
                  ? '51.4'
                  : avgVal !== null
                  ? `${avgVal}`
                  : '0.0'
              }
              unit="W"
              icon={<BarChart3 className="w-4 h-4" />}
              subtitle="Mean daytime load demand"
              accentColor="slate"
            />

            <StatCard
              title="Data Points Logged"
              value={isSimulating ? '1,440' : `${demandData?.data_points || 0}`}
              unit="pts"
              icon={<Layers className="w-4 h-4" />}
              subtitle={isSimulating ? 'Simulated 100 Wp profile' : 'Real database records'}
              accentColor="blue"
            />

            <StatCard
              title="Panel Rating"
              value="100"
              unit="Wp"
              icon={<ShieldCheck className="w-4 h-4" />}
              subtitle="Jakson JP-12x100"
              accentColor="green"
              badge="Rated Max"
            />

            <StatCard
              title="Bench Analysis"
              value={isSimulating ? 'Simulated' : 'Measured'}
              icon={<Info className="w-4 h-4" />}
              subtitle="ACS712 Sensor #2 (DC Load)"
              accentColor="slate"
              badge={isSimulating ? 'Prototype' : 'Hardware'}
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Demand vs Time Profile */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Demand vs Time Profile</h3>
                  <p className="text-xs text-[#475569]">
                    Comparison of DC Load Demand without PV vs Net Shaved Demand with PV (Watts)
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#16A34A] border border-emerald-200">
                  Peak Shaving
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyProfile100W} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="baseDemandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="netDemandGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 90]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Area
                      type="monotone"
                      dataKey="demandWithoutPvW"
                      name="Load Demand Without PV (W)"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#baseDemandGrad)"
                      activeDot={{ r: 5, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="demandWithPvW"
                      name="Net Demand With PV (W)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#netDemandGrad)"
                      activeDot={{ r: 5, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: PV Generation vs Load Balance */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">PV Generation vs Load Balance</h3>
                  <p className="text-xs text-[#475569]">
                    100 Wp Jakson solar generation directly counteracting DC test load power
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
                  Solar Balance
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyProfile100W} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 105]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Line
                      type="monotone"
                      dataKey="demandWithoutPvW"
                      name="DC Test Load (W)"
                      stroke="#475569"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      activeDot={{ r: 5, fill: '#475569', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pvGenerationW"
                      name="Solar Generation (W)"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#16A34A' }}
                      activeDot={{ r: 6, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="demandReductionW"
                      name="Demand Reduction (W)"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Peak Demand Trend Across Test Cycles */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">Peak Demand Trend Across Test Days</h3>
                  <p className="text-xs text-[#475569]">
                    Daily peak demand with vs without 100 Wp PV integration across test runs
                  </p>
                </div>
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-[#475569]">
                  Multi-Day Evaluation
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={multiDayTrend100W} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 90]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(241,245,249,0.7)' }} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar
                      dataKey="withoutPv"
                      name="Peak Demand Without PV (W)"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="withPv"
                      name="Peak Demand With PV (W)"
                      fill="#16A34A"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
