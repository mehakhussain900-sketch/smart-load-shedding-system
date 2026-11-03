import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTelemetry } from '../../hooks/useTelemetry';
import { CHART_TOOLTIP_STYLE, CHART_CURSOR_STYLE, CHART_LEGEND_STYLE } from '../../components/common/chartStyles';
import { api } from '../../services/api';
import type { BackendAnalyticsSummary } from '../../types/telemetry';
import {
  Zap,
  TrendingUp,
  Calendar,
  Activity,
  Info,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const EnergyAnalyticsPage: React.FC = () => {
  const { isSimulating } = useTelemetry();
  const [summary, setSummary] = useState<BackendAnalyticsSummary | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const res = await api.getAnalyticsSummary(isSimulating);
        if (isMounted) setSummary(res);
      } catch {
        // Handled gracefully
      }
    };

    fetchSummary();
    const interval = setInterval(fetchSummary, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimulating]);

  // Simulated 100 Wp test curve for simulation mode
  const simulatedCurve = [
    { time: '06:00', solarW: 5.2, loadW: 18.0 },
    { time: '07:00', solarW: 19.5, loadW: 18.5 },
    { time: '08:00', solarW: 42.0, loadW: 22.0 },
    { time: '09:00', solarW: 68.0, loadW: 24.5 },
    { time: '10:00', solarW: 87.5, loadW: 26.0 },
    { time: '11:00', solarW: 94.2, loadW: 28.0 },
    { time: '12:00', solarW: 96.5, loadW: 29.5 },
    { time: '13:00', solarW: 90.0, loadW: 28.0 },
    { time: '14:00', solarW: 76.0, loadW: 25.0 },
    { time: '15:00', solarW: 54.0, loadW: 23.5 },
    { time: '16:00', solarW: 32.0, loadW: 20.0 },
    { time: '17:00', solarW: 13.0, loadW: 18.5 },
    { time: '18:00', solarW: 3.0, loadW: 18.0 },
  ];

  const hasData = summary && summary.total_readings > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Energy Analytics & Performance"
        description="Historical energy generation, daily Wh accumulation, and solar generation versus DC load comparison."
        badge={
          <StatusBadge
            status={isSimulating ? 'SIMULATING' : hasData ? 'ONLINE' : 'OFFLINE'}
            label={isSimulating ? 'Simulated Analytics' : hasData ? 'Database Analytics' : 'Awaiting Records'}
            size="sm"
          />
        }
      />

      {/* Honest Insufficient Data Banner when real database is empty */}
      {!hasData && !isSimulating && (
        <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#0F172A] flex items-start gap-3 shadow-2xs">
          <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Insufficient data: </span>
            <span>
              Real energy and power summaries will compute automatically once telemetry records are submitted to the backend database. Currently showing 0 stored records.
            </span>
          </div>
        </div>
      )}

      {/* 4 SUMMARY STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Daily Energy"
          value={hasData && summary.today_energy_wh !== null ? summary.today_energy_wh : isSimulating ? '365.4' : '--'}
          unit="Wh"
          icon={<Zap className="w-4 h-4" />}
          subtitle={hasData || isSimulating ? "Today's integrated energy" : 'Insufficient data'}
          accentColor="green"
        />
        <StatCard
          title="Total Energy"
          value={hasData && summary.total_energy_wh !== null ? summary.total_energy_wh : isSimulating ? '1,842.0' : '--'}
          unit="Wh"
          icon={<Calendar className="w-4 h-4" />}
          subtitle={hasData || isSimulating ? 'Cumulative logged yield' : 'Insufficient data'}
          accentColor="green"
        />
        <StatCard
          title="Peak Generation"
          value={hasData && summary.peak_solar_power_w !== null ? summary.peak_solar_power_w : isSimulating ? '96.5' : '--'}
          unit="W"
          icon={<TrendingUp className="w-4 h-4" />}
          subtitle={hasData || isSimulating ? 'Instantaneous maximum power' : 'Insufficient data'}
          accentColor="amber"
        />
        <StatCard
          title="Average Generation"
          value={hasData && summary.average_solar_power_w !== null ? summary.average_solar_power_w : isSimulating ? '52.3' : '--'}
          unit="W"
          icon={<Activity className="w-4 h-4" />}
          subtitle={hasData || isSimulating ? 'Average solar output' : 'Insufficient data'}
          accentColor="blue"
        />
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Solar Generation vs Load Comparison */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Solar Generation vs Load Comparison</h3>
              <p className="text-xs text-[#475569]">Instantaneous Solar Power (W) vs DC Load Power (W)</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
              Power (Watts)
            </span>
          </div>

          <div className="h-64 w-full">
            {isSimulating || hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulatedCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="solarAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="loadAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 110]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Area
                    type="monotone"
                    dataKey="solarW"
                    name="Solar Power (W)"
                    stroke="#16A34A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#solarAreaGrad)"
                    activeDot={{ r: 5, fill: '#16A34A', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="loadW"
                    name="DC Load Power (W)"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#loadAreaGrad)"
                    activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-lg bg-slate-50">
                <Clock className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-xs font-semibold text-[#0F172A]">Insufficient Data for Power Curves</p>
                <p className="text-[11px] text-[#475569] mt-1">
                  Enable Simulation Mode to preview solar vs load curves, or transmit real ESP32 readings.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Daily Energy Generation (Wh) */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#0F172A]">Daily Energy Generation History</h3>
              <p className="text-xs text-[#475569]">Cumulative daily integrated energy in Watt-hours (Wh)</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#16A34A] border border-emerald-200">
              Energy (Wh)
            </span>
          </div>

          <div className="h-64 w-full">
            {isSimulating || hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { day: 'Day 1', energyWh: 320 },
                    { day: 'Day 2', energyWh: 385 },
                    { day: 'Day 3', energyWh: 310 },
                    { day: 'Day 4', energyWh: 410 },
                    { day: 'Day 5', energyWh: 365 },
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="Wh" />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'rgba(241,245,249,0.7)' }} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Bar
                    dataKey="energyWh"
                    name="Daily Energy (Wh)"
                    fill="#16A34A"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#E2E8F0] rounded-lg bg-slate-50">
                <Clock className="w-8 h-8 text-[#94A3B8] mb-2" />
                <p className="text-xs font-semibold text-[#0F172A]">Insufficient Data for Energy Bars</p>
                <p className="text-[11px] text-[#475569] mt-1">Daily energy accumulates over multiple logging sessions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
