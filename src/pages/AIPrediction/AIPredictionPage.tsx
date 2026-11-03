import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { aiService } from '../../services/aiService';
import {
  BrainCircuit,
  Target,
  Sparkles,
  Info,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

export const AIPredictionPage: React.FC = () => {
  const prediction = aiService.getPredictionSummary();

  const chartData = prediction.hourlyForecasts.map((item) => ({
    hour: item.hour,
    predicted: item.predictedPowerW,
    lower: item.lowerConfidenceW,
    upper: item.upperConfidenceW,
    actual: item.actualPowerW,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Solar Generation Prediction"
        description="Multi-variable predictive modeling for short-term and day-ahead photovoltaic solar power generation."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2563EB] border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            Prediction Model: Development / Demo
          </span>
        }
      />

      {/* Model Status & Disclaimer Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#475569] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0F172A]">Development Prototype Disclaimer: </span>
          The forecasting engine is currently running in demonstration/prototype mode using empirical solar-geometric models. High-accuracy machine learning weights (e.g. multivariate regression) will be trained and evaluated against ground-truth measurements once physical ESP32 sensor telemetry has been continuously logged.
        </div>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Day-Ahead Estimated Yield"
          value={prediction.dayAheadTotalWh}
          unit="Wh"
          icon={<Sparkles className="w-4 h-4" />}
          subtitle="Estimated 24h yield"
          accentColor="green"
        />
        <StatCard
          title="Peak Forecast Power"
          value={prediction.peakPredictedW}
          unit="W"
          icon={<Target className="w-4 h-4" />}
          subtitle={`Forecast at ${prediction.peakHour}`}
          accentColor="amber"
        />
        <StatCard
          title="Target Output"
          value="Solar Power"
          unit="(Watts)"
          icon={<BrainCircuit className="w-4 h-4" />}
          subtitle="Single-target continuous"
          accentColor="blue"
        />
        <StatCard
          title="Engine Status"
          value="Prototype"
          icon={<Cpu className="w-4 h-4" />}
          subtitle="Simulated baseline"
          accentColor="slate"
        />
      </div>

      {/* INPUT FEATURES & MODEL PIPELINE */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#2563EB]" />
          Model Input Vector & Hardware Sensors
        </h3>
        <p className="text-xs text-[#475569] mb-4">
          The prediction pipeline ingests 6 physical sensor channels and temporal features to estimate instantaneous generation:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Voltage', unit: 'V', sensor: 'Voltage Divider' },
            { label: 'Current', unit: 'A', sensor: 'ACS712 Sensor' },
            { label: 'Temperature', unit: '°C', sensor: 'DHT22 Sensor' },
            { label: 'Humidity', unit: '%', sensor: 'DHT22 Sensor' },
            { label: 'Relative Light', unit: '%', sensor: 'LDR Photocell' },
            { label: 'Time of Day', unit: 'HH:MM', sensor: 'RTC / Timestamp' },
          ].map((feat) => (
            <div key={feat.label} className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-center">
              <span className="block text-[11px] font-bold text-[#0F172A]">{feat.label}</span>
              <span className="block text-[10px] text-[#2563EB] font-mono mt-0.5">{feat.unit}</span>
              <span className="block text-[9px] text-[#94A3B8] mt-1">{feat.sensor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ACTUAL VS PREDICTED POWER CHART */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Actual vs Predicted Solar Power (Watts)</h3>
            <p className="text-xs text-[#475569]">Comparison of predicted solar curve with actual recorded sensor readings</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
            6V 5W Prototype
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94A3B8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 6]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '11px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted Solar Power (W)"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#2563EB' }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual Measured Power (W)"
                stroke="#16A34A"
                strokeWidth={2}
                dot={{ r: 4, fill: '#16A34A' }}
              />
              <Line
                type="monotone"
                dataKey="lower"
                name="95% Lower Bound (W)"
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="upper"
                name="95% Upper Bound (W)"
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* HOURLY BREAKDOWN TABLE */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
          <span className="font-bold text-[#0F172A]">Day-Ahead Hourly Forecast Breakdown</span>
          <span className="text-[#475569]">Target: 6V 5W Prototype Solar Panel</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-slate-50 text-[#475569] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-2.5 px-3">Hour</th>
                <th className="py-2.5 px-3">Predicted Power (W)</th>
                <th className="py-2.5 px-3">Confidence Band</th>
                <th className="py-2.5 px-3">Relative Light (%)</th>
                <th className="py-2.5 px-3">Est. Temp (°C)</th>
                <th className="py-2.5 px-3">Actual Measured (W)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px]">
              {prediction.hourlyForecasts.map((item) => (
                <tr key={item.hour} className="hover:bg-slate-50/60">
                  <td className="py-2 px-3 font-semibold text-[#0F172A]">{item.hour}</td>
                  <td className="py-2 px-3 text-[#2563EB] font-bold">{item.predictedPowerW.toFixed(2)} W</td>
                  <td className="py-2 px-3 text-[#94A3B8]">
                    [{item.lowerConfidenceW} - {item.upperConfidenceW}] W
                  </td>
                  <td className="py-2 px-3 text-[#F59E0B] font-semibold">{item.relativeLightPercent}%</td>
                  <td className="py-2 px-3 text-[#475569]">{item.temperatureC}°C</td>
                  <td className="py-2 px-3">
                    {item.actualPowerW !== undefined ? (
                      <span className="text-[#16A34A] font-bold">{item.actualPowerW.toFixed(2)} W</span>
                    ) : (
                      <span className="text-[#94A3B8] italic font-sans text-[10px]">Awaiting timestamp</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
