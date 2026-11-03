import React, { useState } from 'react';
import {
  ToggleRight,
  ShieldCheck,
  Zap,
  Power,
  Sliders,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Radio,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { useLoadShed } from '../../hooks/useLoadShed';
import { useTelemetry } from '../../hooks/useTelemetry';

export const LoadManagementPage: React.FC = () => {
  const {
    loads,
    demandSettings,
    sheddingEvents,
    pendingCommands,
    sendRelayCommand,
    updateSettings,
    toggleAutoMode,
    refreshAll,
  } = useLoadShed();

  const { isSimulating } = useTelemetry();

  const [editingSettings, setEditingSettings] = useState(false);
  const [thresholdInput, setThresholdInput] = useState<string>(
    String(demandSettings?.threshold_w ?? 250)
  );
  const [cooldownInput, setCooldownInput] = useState<string>(
    String(demandSettings?.cooldown_sec ?? 3)
  );
  const [hysteresisInput, setHysteresisInput] = useState<string>(
    String(demandSettings?.restoration_hysteresis_w ?? 20)
  );
  const [transformerRatingInput, setTransformerRatingInput] = useState<string>(
    String(demandSettings?.transformer_rating_va ?? 1000)
  );
  const [powerFactorInput, setPowerFactorInput] = useState<string>(
    String(demandSettings?.power_factor ?? 0.8)
  );

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseFloat(thresholdInput);
    const cooldown = parseFloat(cooldownInput);
    const hysteresis = parseFloat(hysteresisInput);
    const ratingVa = parseFloat(transformerRatingInput);
    const pf = parseFloat(powerFactorInput);

    if (isNaN(threshold) || threshold < 50) return;
    await updateSettings({
      threshold_w: threshold,
      cooldown_sec: isNaN(cooldown) ? 3 : cooldown,
      restoration_hysteresis_w: isNaN(hysteresis) ? 20 : hysteresis,
      transformer_rating_va: isNaN(ratingVa) || ratingVa <= 0 ? 1000 : ratingVa,
      power_factor: isNaN(pf) || pf <= 0 || pf > 1 ? 0.8 : pf,
    });
    setEditingSettings(false);
  };

  const autoMode = demandSettings?.auto_mode ?? true;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Load Management & Relay Control"
        description="Monitor, configure, and control relay channels (L1–L5) with automatic overload protection."
        badge={
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              autoMode
                ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                : 'bg-amber-50 text-[#D97706] border border-amber-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoMode ? 'bg-[#16A34A] animate-pulse' : 'bg-[#D97706]'
              }`}
            />
            {autoMode ? 'Automatic Mode Active' : 'Manual Override Mode'}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleAutoMode()}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                autoMode
                  ? 'bg-slate-100 text-[#0F172A] border-[#E2E8F0] hover:bg-slate-200'
                  : 'bg-[#16A34A] text-white border-emerald-600 hover:bg-emerald-700 shadow-2xs'
              }`}
            >
              <ToggleRight className="w-3.5 h-3.5" />
              <span>{autoMode ? 'Switch to Manual' : 'Enable Automatic Mode'}</span>
            </button>
            <button
              onClick={() => refreshAll()}
              className="p-2 text-[#475569] hover:text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Refresh load status"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      {/* Demand Threshold & Algorithm Settings Bar */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2563EB]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Algorithm Thresholds & Timing Parameters
              </div>
              <div className="text-xs text-[#475569]">
                Configured limits for automated shedding and load restoration decisions.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Demand Limit: </span>
              <span className="font-bold text-[#0F172A]">
                {demandSettings?.threshold_w ?? 200.0} W
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Confirmation: </span>
              <span className="font-semibold text-[#0F172A]">
                {demandSettings?.confirmation_sec ?? 2.0}s
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Cooldown: </span>
              <span className="font-semibold text-[#0F172A]">
                {demandSettings?.cooldown_sec ?? 3.0}s
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Hysteresis: </span>
              <span className="font-semibold text-[#0F172A]">
                {demandSettings?.restoration_hysteresis_w ?? 20.0} W
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Transformer: </span>
              <span className="font-semibold text-[#0F172A]">
                {demandSettings?.transformer_rating_va ?? 1000} VA ({( (demandSettings?.transformer_rating_va ?? 1000) / 1000).toFixed(1)} kVA)
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Power Factor: </span>
              <span className="font-semibold text-[#0F172A]">
                {demandSettings?.power_factor ?? 0.8}
              </span>
            </div>
            <button
              onClick={() => {
                setThresholdInput(String(demandSettings?.threshold_w ?? 200));
                setCooldownInput(String(demandSettings?.cooldown_sec ?? 3));
                setHysteresisInput(String(demandSettings?.restoration_hysteresis_w ?? 20));
                setTransformerRatingInput(String(demandSettings?.transformer_rating_va ?? 1000));
                setPowerFactorInput(String(demandSettings?.power_factor ?? 0.8));
                setEditingSettings(!editingSettings);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold text-[#2563EB] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {editingSettings ? 'Cancel' : 'Edit Parameters'}
            </button>
          </div>
        </div>

        {/* Inline Settings Editor */}
        {editingSettings && (
          <form
            onSubmit={handleSaveSettings}
            className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs"
          >
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                Demand Limit (W):
              </label>
              <input
                type="number"
                step="1"
                min="50"
                max="5000"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                Cooldown (s):
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                max="60"
                value={cooldownInput}
                onChange={(e) => setCooldownInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                Restoration (W):
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max="200"
                value={hysteresisInput}
                onChange={(e) => setHysteresisInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                Transformer (VA):
              </label>
              <input
                type="number"
                step="50"
                min="100"
                max="100000"
                value={transformerRatingInput}
                onChange={(e) => setTransformerRatingInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] text-xs font-medium"
              />
            </div>
            <div>
              <label className="block text-[#475569] font-medium mb-1">
                Power Factor (PF):
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                max="1.0"
                value={powerFactorInput}
                onChange={(e) => setPowerFactorInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] focus:ring-2 focus:ring-[#2563EB] text-xs font-medium"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-1.5 px-3 bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Manual Control Information Card */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-blue-50/70 rounded-xl border border-blue-200/80 p-3.5 text-xs flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-100/80 rounded-lg text-blue-600">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-semibold text-blue-900">Direct Hardware Relay Control: </span>
            <span className="text-blue-800/80">
              You can turn loads ON/OFF directly using the buttons below. Commands are synchronized with the ESP32 on its next telemetry cycle (~2 s).
            </span>
          </div>
        </div>
      </div>

      {/* Relays & Loads Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
            Connected Electrical Loads (3× 2-Channel Relay Modules)
          </h2>
          <span className="text-[11px] text-[#475569]">
            Total Connected Load Capacity:{' '}
            <strong className="text-[#0F172A]">
              {loads.reduce((acc, l) => acc + (l.rated_power_w || 0), 0)} W
            </strong>{' '}
            ({loads.length} loads)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loads.map((load) => {
            const isPending = !!pendingCommands[load.id];
            const isOn = load.isOn ?? false;
            const lastEvent = sheddingEvents.find((e) => e.load_id === load.id);
            const isShed = !isOn && lastEvent?.action === 'SHED';

            return (
              <div
                key={load.id}
                className={`bg-white rounded-xl border p-4 transition-all duration-150 shadow-2xs ${
                  isOn
                    ? 'border-emerald-200 ring-1 ring-emerald-50'
                    : isShed
                    ? 'border-rose-300 ring-1 ring-rose-50 bg-rose-50/20'
                    : 'border-[#E2E8F0] bg-slate-50/50'
                }`}
              >
                {/* Top badges */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-[#0F172A] border border-slate-200">
                      {load.id}
                    </span>
                    <span className="text-[11px] text-[#94A3B8]">
                      CH {load.relay_channel}
                    </span>
                  </div>

                  {load.is_essential ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-[#16A34A] border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Essential
                    </span>
                  ) : isShed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-[#DC2626] border border-rose-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      Auto-Shed
                    </span>
                  ) : load.id === 'L6' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-slate-100 text-[#94A3B8]">
                      Spare
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#475569] bg-slate-100 border border-slate-200">
                      Priority {load.priority}
                    </span>
                  )}
                </div>

                {/* Load Name & Rating */}
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[#0F172A]">{load.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#475569]">
                    <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
                    <span>
                      Rated Power:{' '}
                      <strong className="text-[#0F172A]">{load.rated_power_w} W</strong>
                    </span>
                  </div>
                </div>

                {/* Hardware Pin & State Box */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-[#E2E8F0] mb-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#94A3B8]">Relay State:</span>
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        isOn
                          ? 'text-[#16A34A]'
                          : isShed
                          ? 'text-[#DC2626]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {isOn ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          <span>ENERGIZED (ON)</span>
                        </>
                      ) : isShed ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-[#DC2626]" />
                          <span>AUTOMATICALLY SHED</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-[#64748B]" />
                          <span>MANUALLY OFF</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#94A3B8]">Pin Assignment:</span>
                    <span className="font-mono text-[#475569]">
                      GPIO {load.gpio_pin ?? 'TBD'} ({load.relay_active_low ? 'Active LOW' : 'Active HIGH'})
                    </span>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-700 font-medium mt-1 animate-pulse">
                      <Radio className="w-3 h-3" />
                      <span>Syncing with ESP32...</span>
                    </div>
                  )}
                </div>

                {/* Control Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-[#94A3B8]">
                    {load.is_essential
                      ? 'Essential (Protected from auto-shed)'
                      : isShed
                      ? 'Auto-shed due to overload'
                      : load.id === 'L6'
                      ? 'Disabled channel'
                      : autoMode
                      ? 'Auto-managed'
                      : 'Manual switch'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {load.id === 'L6' ? (
                      <span className="text-[11px] font-semibold text-[#94A3B8] px-2 py-1 bg-slate-100 rounded">
                        Disabled
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={isPending || isOn}
                          onClick={() => sendRelayCommand(load.id, 'on')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            isOn
                              ? 'bg-slate-100 text-[#94A3B8] cursor-not-allowed'
                              : 'bg-emerald-50 text-[#16A34A] border border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>ON</span>
                        </button>
                        <button
                          disabled={isPending || !isOn}
                          onClick={() => sendRelayCommand(load.id, 'off')}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                            !isOn
                              ? 'bg-slate-100 text-[#94A3B8] cursor-not-allowed'
                              : 'bg-rose-50 text-[#DC2626] border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>OFF</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shedding & Restoration Audit Trail */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Load Shedding & Restoration Audit Trail
            </h3>
          </div>
          <span className="text-[11px] text-[#475569]">
            Recent automated & manual relay operations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-[#E2E8F0] text-[#94A3B8] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-4">Time</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Load Target</th>
                <th className="py-2.5 px-4">Trigger Reason</th>
                <th className="py-2.5 px-4">Power at Event</th>
                <th className="py-2.5 px-4">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {sheddingEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#94A3B8] italic">
                    No load shedding events recorded yet. All loads operating within threshold.
                  </td>
                </tr>
              ) : (
                sheddingEvents.slice(0, 15).map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[#475569]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          evt.action === 'SHED' || evt.action === 'MANUAL_OFF'
                            ? 'bg-rose-50 text-[#DC2626] border border-rose-200'
                            : 'bg-emerald-50 text-[#16A34A] border border-emerald-200'
                        }`}
                      >
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#0F172A]">
                      {evt.load_id} — {evt.load_name}
                    </td>
                    <td className="py-2.5 px-4 text-[#475569]">{evt.reason}</td>
                    <td className="py-2.5 px-4 font-mono font-medium text-[#0F172A]">
                      {evt.power_w_at_event !== null ? `${evt.power_w_at_event} W` : '--'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          evt.is_automatic
                            ? 'bg-blue-50 text-[#2563EB]'
                            : 'bg-slate-100 text-[#475569]'
                        }`}
                      >
                        {evt.is_automatic ? 'Automated' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety & Physical Wiring Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-[#0F172A] flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[#D97706] uppercase tracking-wide text-[11px]">
            Hardware Verification & Safe Operation Guidelines
          </div>
          <p className="text-[11px] text-[#475569] leading-relaxed">
            1. <strong>L1 Essential Load</strong> is protected by software policy and will never be shed automatically.{' '}
            2. The <strong>200 W demand limit</strong> is a project-specific parameter for demonstration of peak reduction, not an electrical breaker limit.{' '}
            3. Pin assignments (GPIO 26, 27, 14, 12, 13, 15) must be verified against actual lab wiring before powering relay coils.{' '}
            4. Current mode:{' '}
            <strong>{isSimulating ? 'Simulation Mode (Test-bench stream)' : 'Real Hardware Mode'}</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};
