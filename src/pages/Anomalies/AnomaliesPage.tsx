import React, { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { aiService } from '../../services/aiService';
import {
  ShieldAlert,
  Info,
} from 'lucide-react';
import type { AnomalySeverity } from '../../types/anomaly';

export const AnomaliesPage: React.FC = () => {
  const anomalies = aiService.getActiveAnomalies();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filtered = anomalies.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const getSeverityBadge = (severity: AnomalySeverity) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-50 text-[#DC2626] border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-[#D97706] border-amber-200';
      case 'LOW':
      default:
        return 'bg-blue-50 text-[#2563EB] border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intelligent Anomaly & Fault Detection"
        description="Continuous rule-based and statistical fault classification for 6V 5W PV panel, ACS712 current sensors, and environmental modules."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-[#D97706] border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
            Potential Anomaly (Simulated Events)
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="text-xs bg-white border border-[#E2E8F0] text-[#0F172A] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#16A34A] shadow-2xs"
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>
        }
      />

      {/* Scope Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-start gap-3 text-xs text-[#475569]">
        <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-[#0F172A]">Hardware-Aligned Fault Classification: </span>
          Anomalies are detected against operational limits of the 6V 5W panel, voltage sensor, ACS712 sensors, DHT22, and LDR light sensor. Demo events are tagged as <span className="font-semibold text-[#0F172A]">"Potential anomaly"</span>.
        </div>
      </div>

      {/* Structured Anomaly Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center text-xs">
          <span className="font-bold text-[#0F172A]">Active & Recent Anomaly Log</span>
          <span className="text-[#475569]">Showing {filtered.length} events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0F172A]">
            <thead className="bg-slate-50 text-[#475569] uppercase text-[10px] tracking-wider border-b border-[#E2E8F0]">
              <tr>
                <th className="py-3 px-3.5">Timestamp</th>
                <th className="py-3 px-3.5">Parameter</th>
                <th className="py-3 px-3.5">Expected</th>
                <th className="py-3 px-3.5">Actual</th>
                <th className="py-3 px-3.5">Deviation</th>
                <th className="py-3 px-3.5">Severity</th>
                <th className="py-3 px-3.5">Possible Cause</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-xs">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3.5 font-mono text-[11px] text-[#475569] whitespace-nowrap">
                    {item.timestamp}
                  </td>
                  <td className="py-3 px-3.5 font-semibold text-[#0F172A]">
                    {item.parameter}
                  </td>
                  <td className="py-3 px-3.5 font-mono text-[#475569]">
                    {item.expected}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-bold text-[#0F172A]">
                    {item.actual}
                  </td>
                  <td className="py-3 px-3.5 font-mono font-semibold text-[#DC2626]">
                    {item.deviation}
                  </td>
                  <td className="py-3 px-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getSeverityBadge(item.severity)}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="py-3 px-3.5 text-[#475569] font-medium">
                    {item.possibleCause}
                  </td>
                  <td className="py-3 px-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      item.status === 'ACTIVE'
                        ? 'text-[#DC2626]'
                        : item.status === 'INVESTIGATING'
                        ? 'text-[#D97706]'
                        : 'text-[#16A34A]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'ACTIVE' ? 'bg-[#DC2626]' : item.status === 'INVESTIGATING' ? 'bg-[#D97706]' : 'bg-[#16A34A]'
                      }`} />
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED CARDS VIEW */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0F172A]">Diagnostic Investigation Cards</h3>
        {filtered.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
          return (
            <div
              key={alert.id}
              className="p-5 rounded-xl border border-[#E2E8F0] bg-white transition-all shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg border ${
                      isCritical
                        ? 'bg-red-50 border-red-200 text-[#DC2626]'
                        : 'bg-amber-50 border-amber-200 text-[#D97706]'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0F172A] text-sm flex items-center gap-2">
                      <span>Potential Anomaly: {alert.possibleCause}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#475569] border border-[#E2E8F0]">
                        {alert.id}
                      </span>
                    </h3>
                    <p className="text-xs text-[#475569] mt-0.5">
                      Monitored Channel: <span className="font-medium text-[#0F172A]">{alert.parameter}</span> | Deviation: <span className="font-semibold text-[#DC2626]">{alert.deviation}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getSeverityBadge(alert.severity)}`}
                  >
                    {alert.severity} SEVERITY
                  </span>
                  <span className="text-xs text-[#94A3B8] font-mono">{alert.timestamp}</span>
                </div>
              </div>

              {alert.description && (
                <div className="mt-3 text-xs text-[#475569] leading-relaxed pl-11">
                  {alert.description}
                </div>
              )}

              {alert.mitigationSteps && (
                <div className="mt-3 ml-11 p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs">
                  <span className="text-[#0F172A] font-semibold">Recommended Mitigation: </span>
                  <span className="text-[#475569]">{alert.mitigationSteps}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
