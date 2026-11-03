import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { aiService } from '../../services/aiService';
import {
  ShieldCheck,
  Zap,
  Activity,
  Gauge,
  Thermometer,
  CheckCircle2,
  Info,
} from 'lucide-react';

export const PVHealthPage: React.FC = () => {
  const health = aiService.getHealthAssessment();

  return (
    <div className="space-y-6">
      <PageHeader
        title="PV System Health Assessment"
        description="Explainable, rule-based diagnostic evaluation of photovoltaic generation health, voltage/current stability, and environmental conditions."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            RULE-BASED SCORING (SIMULATED)
          </span>
        }
      />

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="PV Health Score"
          value={health.overallScore}
          unit="/100"
          icon={<ShieldCheck className="w-4 h-4" />}
          subtitle={`Grade: ${health.grade}`}
          accentColor="green"
        />
        <StatCard
          title="Gen. Performance"
          value={health.generationPerformance}
          unit="%"
          icon={<Zap className="w-4 h-4" />}
          subtitle="Output vs light level"
          accentColor="green"
        />
        <StatCard
          title="Voltage Stability"
          value={health.voltageStability}
          unit="%"
          icon={<Gauge className="w-4 h-4" />}
          subtitle="5.4V-6.2V nominal"
          accentColor="blue"
        />
        <StatCard
          title="Current Stability"
          value={health.currentStability}
          unit="%"
          icon={<Activity className="w-4 h-4" />}
          subtitle="ACS712 tracking"
          accentColor="blue"
        />
        <StatCard
          title="Env. Condition"
          value={health.environmentalCondition}
          unit="%"
          icon={<Thermometer className="w-4 h-4" />}
          subtitle="DHT22 thermal margin"
          accentColor="blue"
        />
        <StatCard
          title="Anomaly Level"
          value="Normal"
          icon={<CheckCircle2 className="w-4 h-4" />}
          subtitle="Zero critical faults"
          accentColor="green"
        />
      </div>

      {/* EXPLAINABLE RULE-BASED SCORING DETAILS */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Explainable Health Diagnostic Breakdown</h3>
            <p className="text-xs text-[#475569]">Rule-based weighting framework applied to real-time physical sensor channels</p>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded bg-slate-100 text-[#475569]">
            Transparent Scoring Logic
          </span>
        </div>

        <div className="space-y-4">
          {health.metrics.map((metric) => (
            <div key={metric.name} className="p-4 rounded-lg bg-slate-50/70 border border-[#E2E8F0]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-bold text-[#0F172A]">{metric.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-[#475569] border border-[#E2E8F0]">
                    Weight: {metric.weight}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#16A34A]">{metric.score} / 100</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#16A34A] border border-emerald-200">
                    {metric.status}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-[#16A34A] h-full rounded-full transition-all duration-300"
                  style={{ width: `${metric.score}%` }}
                />
              </div>

              <p className="text-xs text-[#475569] leading-relaxed">
                <span className="font-semibold text-[#0F172A]">Diagnostic Rule: </span>
                {metric.basis}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* HARDWARE MODULE PROFILE & RECOMMENDATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Under Evaluation */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] mb-3">Evaluated Physical Hardware Unit</h3>
          <div className="p-4 rounded-lg bg-slate-50 border border-[#E2E8F0] space-y-2.5 text-xs text-[#475569]">
            <div className="flex justify-between">
              <span>Unit Identifier:</span>
              <span className="font-mono font-bold text-[#0F172A]">PV-MOD-01 (6V 5W Prototype)</span>
            </div>
            <div className="flex justify-between">
              <span>Rated Peak Power:</span>
              <span className="font-medium text-[#0F172A]">5.00 Watts</span>
            </div>
            <div className="flex justify-between">
              <span>Nominal Voltage:</span>
              <span className="font-medium text-[#0F172A]">6.00 Volts DC</span>
            </div>
            <div className="flex justify-between">
              <span>Rated Current (Imp):</span>
              <span className="font-medium text-[#0F172A]">~0.83 Amperes</span>
            </div>
            <div className="flex justify-between">
              <span>Sensor Edge Node:</span>
              <span className="font-medium text-[#2563EB]">ESP32 Microcontroller Node</span>
            </div>
          </div>
        </div>

        {/* Operational Recommendations */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#2563EB]" />
            Diagnostic Insights & Recommendations
          </h3>
          <ul className="space-y-2.5 text-xs text-[#475569]">
            {health.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] mt-1.5 shrink-0" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
