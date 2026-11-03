import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useTelemetry } from '../../hooks/useTelemetry';
import { CHART_TOOLTIP_STYLE, CHART_CURSOR_STYLE, CHART_LEGEND_STYLE } from '../../components/common/chartStyles';
import { api } from '../../services/api';
import type { BackendAIStatus, BackendAlertItem } from '../../types/telemetry';
import {
  BrainCircuit,
  ShieldCheck,
  AlertTriangle,
  Info,
  Layers,
  Cpu,
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

export const AIHealthPage: React.FC = () => {
  const { isSimulating } = useTelemetry();
  const [activeTab, setActiveTab] = useState<'prediction' | 'health' | 'anomalies'>('prediction');
  const [aiStatus, setAIStatus] = useState<BackendAIStatus | null>(null);
  const [alerts, setAlerts] = useState<BackendAlertItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [statusRes, alertsRes] = await Promise.all([
          api.getAIStatus(isSimulating),
          api.getAlerts(50),
        ]);
        if (isMounted) {
          setAIStatus(statusRes);
          setAlerts(alertsRes);
        }
      } catch {
        // Handled
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSimulating]);

  // Demo forecast curve for preview in simulation mode
  const demoForecast = [
    { hour: '06:00', predicted: 5.2, baseline: 5.0 },
    { hour: '08:00', predicted: 42.0, baseline: 40.0 },
    { hour: '10:00', predicted: 87.5, baseline: 85.0 },
    { hour: '12:00', predicted: 96.5, baseline: 95.0 },
    { hour: '14:00', predicted: 76.0, baseline: 75.0 },
    { hour: '16:00', predicted: 32.0, baseline: 30.0 },
    { hour: '18:00', predicted: 3.0, baseline: 2.5 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Diagnostics & PV Health"
        description="Predictive solar modeling readiness, explainable rule-based PV health diagnostics, and anomaly detection."
        badge={
          <StatusBadge
            status={isSimulating ? 'SIMULATING' : aiStatus?.is_trained ? 'ONLINE' : 'OFFLINE'}
            label={isSimulating ? 'Simulated AI Pipeline' : 'Rule-Based Active'}
            size="sm"
          />
        }
      />

      {/* THREE INTERNAL TABS */}
      <div className="flex border-b border-[#E2E8F0] gap-2">
        <button
          onClick={() => setActiveTab('prediction')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'prediction'
              ? 'border-[#2563EB] text-[#2563EB] bg-blue-50/50 rounded-t-lg'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Solar Prediction</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'health'
              ? 'border-[#16A34A] text-[#16A34A] bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>PV Health Diagnostic</span>
        </button>

        <button
          onClick={() => setActiveTab('anomalies')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'anomalies'
              ? 'border-[#DC2626] text-[#DC2626] bg-red-50/50 rounded-t-lg'
              : 'border-transparent text-[#475569] hover:text-[#0F172A]'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Anomaly Detection ({alerts.length})</span>
        </button>
      </div>

      {/* TAB 1: SOLAR PREDICTION */}
      {activeTab === 'prediction' && (
        <div className="space-y-6">
          {/* Honest Model Training Status Banner */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-[#0F172A] flex items-start gap-3 shadow-2xs">
            <Info className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-[#0F172A]">
                {aiStatus?.model_status || 'Prediction model not trained — awaiting sufficient real data.'}
              </div>
              <p className="text-[#475569] leading-relaxed">
                Machine learning models require a minimum of {aiStatus?.minimum_samples_needed || 500} valid sensor records across daylight cycles before training begins. Collected so far: <span className="font-mono font-bold text-[#0F172A]">{aiStatus?.samples_logged || 0}</span> real records.
              </p>
            </div>
          </div>

          {/* Model Features Vector Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0F172A] mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#2563EB]" />
              Configured Machine Learning Feature Inputs (100 Wp Setup)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {[
                { name: 'Solar Voltage', unit: 'V (0-21.4V)', source: 'Voltage Divider' },
                { name: 'Solar Current', unit: 'A (0-6.2A)', source: 'ACS712 Sensor' },
                { name: 'Temperature', unit: '°C (-20 to 80°C)', source: 'DHT22 Sensor' },
                { name: 'Humidity', unit: '% (0-100%)', source: 'DHT22 Sensor' },
                { name: 'Time of Day', unit: 'Hour / Min', source: 'Timestamp' },
              ].map((f) => (
                <div key={f.name} className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm">
                  <span className="block font-bold text-[#0F172A]">{f.name}</span>
                  <span className="block font-mono text-[11px] text-[#2563EB] mt-0.5">{f.unit}</span>
                  <span className="block text-[10px] text-[#94A3B8] mt-1">{f.source}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-xs text-[#475569]">
              <span className="font-semibold text-[#0F172A]">Target Output: </span>
              <span>Predicted Instantaneous Solar Power in Watts (0 to 100 W).</span>
            </div>
          </div>

          {/* Forecast Preview Chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs transition-shadow duration-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">Solar Prediction Framework (Preview)</h3>
                <p className="text-xs text-[#475569]">Predicted power trajectory across daytime hours (Watts)</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
                Prototype Architecture
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={demoForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} unit="W" domain={[0, 110]} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR_STYLE} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Power (W)"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="baseline"
                    name="Empirical Baseline (W)"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 5, fill: '#94A3B8', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PV HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="PV Health Score"
              value={aiStatus?.pv_health_score !== null && aiStatus?.pv_health_score !== undefined ? aiStatus.pv_health_score : '--'}
              unit="/100"
              icon={<ShieldCheck className="w-4 h-4" />}
              subtitle={aiStatus?.pv_health_grade || 'Insufficient Data'}
              accentColor="green"
            />
            <StatCard
              title="Assessment Type"
              value="Rule-Based"
              icon={<Cpu className="w-4 h-4" />}
              subtitle="Explainable Analytical"
              accentColor="blue"
            />
            <StatCard
              title="Active Faults"
              value={aiStatus?.anomalies_detected ?? 0}
              icon={<AlertTriangle className="w-4 h-4" />}
              subtitle="Flags in current window"
              accentColor={aiStatus?.anomalies_detected ? 'red' : 'green'}
            />
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0F172A] mb-2">Diagnostic Explanation & Rule Basis</h3>
            <p className="text-xs text-[#475569] leading-relaxed mb-4">
              {aiStatus?.pv_health_basis || 'Awaiting continuous readings to evaluate panel voltage and current stability.'}
            </p>

            <div className="space-y-3 pt-3 border-t border-[#E2E8F0]">
              {[
                { rule: 'Voltage Boundary Check', desc: 'Panel operating voltage evaluated against 17.7V Vmp and 21.4V Voc rated bounds.', weight: '40%' },
                { rule: 'Current Output Check', desc: 'ACS712 current output evaluated against 5.70A Imp rated bounds.', weight: '35%' },
                { rule: 'DHT22 Thermal Margin', desc: 'Operating temperature checked against DHT22 limits (< 65°C).', weight: '25%' },
              ].map((r) => (
                <div key={r.rule} className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] flex justify-between items-center text-xs transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-sm">
                  <div>
                    <span className="font-bold text-[#0F172A]">{r.rule}</span>
                    <p className="text-[11px] text-[#475569] mt-0.5">{r.desc}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-[#2563EB] shrink-0 ml-4">Weight: {r.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ANOMALY DETECTION */}
      {activeTab === 'anomalies' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
              <span className="font-bold text-[#0F172A]">Potential Anomaly Events ({alerts.length})</span>
              <span className="text-[#94A3B8]">Logged from real-time checks</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#0F172A]">
                <thead className="bg-slate-50 text-[#475569] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
                  <tr>
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Parameter</th>
                    <th className="py-2.5 px-3">Expected</th>
                    <th className="py-2.5 px-3">Actual</th>
                    <th className="py-2.5 px-3">Deviation</th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Possible Cause</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                  {alerts.length > 0 ? (
                    alerts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition-colors duration-150 cursor-default">
                        <td className="py-2.5 px-3 font-mono text-[#475569]">{new Date(a.timestamp).toLocaleTimeString()}</td>
                        <td className="py-2.5 px-3 font-semibold">{a.parameter}</td>
                        <td className="py-2.5 px-3 text-[#475569]">{a.expected_value}</td>
                        <td className="py-2.5 px-3 font-bold">{a.actual_value}</td>
                        <td className="py-2.5 px-3 text-[#DC2626] font-semibold">{a.deviation}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            a.severity === 'CRITICAL' || a.severity === 'HIGH' ? 'bg-red-50 text-[#DC2626]' : 'bg-amber-50 text-[#D97706]'
                          }`}>
                            {a.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[#475569]">{a.possible_cause}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[#16A34A]">{a.status}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-[#94A3B8]">
                        Zero active anomaly events detected. System operating within nominal bounds.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
