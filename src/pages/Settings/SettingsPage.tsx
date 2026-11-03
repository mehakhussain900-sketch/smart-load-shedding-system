import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Save,
  X,
  Edit3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Sliders,
  List,
} from 'lucide-react';
import { useLoadShed } from '../../hooks/useLoadShed';
import type { DemandSettings, LoadConfig } from '../../types/loadShedding';

// ─── Validation helpers ──────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

interface FieldError {
  [key: string]: string;
}

function validateSettings(s: Partial<DemandSettings>): FieldError {
  const errs: FieldError = {};
  if (s.threshold_w !== undefined && (s.threshold_w < 10 || s.threshold_w > 50000))
    errs.threshold_w = 'Must be 10 – 50 000 W';
  if (s.transformer_rating_va !== undefined && (s.transformer_rating_va < 10 || s.transformer_rating_va > 1_000_000))
    errs.transformer_rating_va = 'Must be 10 – 1 000 000 VA';
  if (s.power_factor !== undefined && (s.power_factor < 0.01 || s.power_factor > 1))
    errs.power_factor = 'Must be 0.01 – 1.00';
  if (s.confirmation_sec !== undefined && (s.confirmation_sec < 0.5 || s.confirmation_sec > 60))
    errs.confirmation_sec = 'Must be 0.5 – 60 s';
  if (s.cooldown_sec !== undefined && (s.cooldown_sec < 0.5 || s.cooldown_sec > 120))
    errs.cooldown_sec = 'Must be 0.5 – 120 s';
  if (s.restoration_hysteresis_w !== undefined && (s.restoration_hysteresis_w < 0 || s.restoration_hysteresis_w > 5000))
    errs.restoration_hysteresis_w = 'Must be 0 – 5 000 W';
  if (s.telemetry_interval_sec !== undefined && (s.telemetry_interval_sec < 0.5 || s.telemetry_interval_sec > 60))
    errs.telemetry_interval_sec = 'Must be 0.5 – 60 s';
  return errs;
}

function validateLoad(l: Partial<LoadConfig>): FieldError {
  const errs: FieldError = {};
  if (l.rated_power_w !== undefined && (l.rated_power_w < 0 || l.rated_power_w > 10000))
    errs.rated_power_w = 'Must be 0 – 10 000 W';
  if (l.priority !== undefined && (l.priority < 1 || l.priority > 10))
    errs.priority = 'Must be 1 – 10';
  if (l.name !== undefined && l.name.trim() === '')
    errs.name = 'Name cannot be empty';
  return errs;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title, subtitle, expanded, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-[#E2E8F0] hover:bg-slate-100 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#16A34A]"
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#16A34A]" />
      </div>
      <div>
        <div className="text-sm font-semibold text-[#0F172A]">{title}</div>
        {subtitle && <div className="text-xs text-[#64748B]">{subtitle}</div>}
      </div>
    </div>
    {expanded ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
  </button>
);

interface FieldRowProps {
  label: string;
  note?: string;
  error?: string;
  children: React.ReactNode;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, note, error, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2.5 border-b border-slate-50 last:border-0">
    <div className="sm:w-64 shrink-0">
      <div className="text-sm font-medium text-[#374151]">{label}</div>
      {note && <div className="text-[11px] text-[#94A3B8] mt-0.5 leading-tight">{note}</div>}
    </div>
    <div className="flex-1">
      {children}
      {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
    </div>
  </div>
);

interface NumberInputProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({ value, onChange, min, max, step = 1, unit, disabled }) => (
  <div className="flex items-center gap-2">
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className="w-36 px-2.5 py-1.5 text-sm border border-[#CBD5E1] rounded-md text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent disabled:bg-slate-50 disabled:text-[#94A3B8]"
    />
    {unit && <span className="text-xs text-[#64748B]">{unit}</span>}
  </div>
);

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, disabled, placeholder, className = '' }) => (
  <input
    type="text"
    value={value}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={`px-2.5 py-1.5 text-sm border border-[#CBD5E1] rounded-md text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent disabled:bg-slate-50 disabled:text-[#94A3B8] ${className}`}
  />
);

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled, label }) => (
  <button
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-1 ${
      checked ? 'bg-[#16A34A]' : 'bg-[#CBD5E1]'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    {label && <span className="sr-only">{label}</span>}
  </button>
);

// ─── Calculation Preview Panel ────────────────────────────────────────────────

interface CalcPreviewProps {
  settings: Partial<DemandSettings>;
  loads: Partial<LoadConfig>[];
}

const CalcPreview: React.FC<CalcPreviewProps> = ({ settings, loads }) => {
  const rating = settings.transformer_rating_va ?? 1000;
  const pf = settings.power_factor ?? 0.8;
  const threshold = settings.threshold_w ?? 250;
  const hysteresis = settings.restoration_hysteresis_w ?? 20;
  const capacity = rating * pf;
  const headroom = threshold - hysteresis;

  const shedOrder = [...loads]
    .filter((l) => !l.is_essential && l.category !== 'Essential')
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return (
    <div className="bg-slate-50 border border-[#E2E8F0] rounded-lg p-4 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">Live Preview</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] mb-0.5">Transformer Capacity</div>
          <div className="text-lg font-bold text-[#0F172A]">{capacity.toFixed(0)} <span className="text-xs font-normal text-[#64748B]">W</span></div>
          <div className="text-[11px] text-[#64748B]">{rating} VA × {pf}</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] mb-0.5">Demand Threshold</div>
          <div className="text-lg font-bold text-[#0F172A]">{threshold.toFixed(0)} <span className="text-xs font-normal text-[#64748B]">W</span></div>
          <div className="text-[11px] text-[#64748B]">{((threshold / capacity) * 100).toFixed(1)}% of capacity</div>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-[#94A3B8] mb-0.5">Restore Headroom</div>
          <div className="text-lg font-bold text-[#0F172A]">{headroom.toFixed(0)} <span className="text-xs font-normal text-[#64748B]">W</span></div>
          <div className="text-[11px] text-[#64748B]">Hysteresis: {hysteresis} W</div>
        </div>
      </div>
      {shedOrder.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold text-[#64748B] mb-1.5 uppercase tracking-wider">Auto-Shed Sequence (first → last)</div>
          <div className="flex flex-wrap gap-1.5">
            {shedOrder.map((l, i) => (
              <span key={l.id ?? i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                <span className="text-red-400">{i + 1}.</span> {l.name ?? l.id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const { demandSettings, loads, updateFullConfig, resetToDefaults } = useLoadShed();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [settingsErrors, setSettingsErrors] = useState<FieldError>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, FieldError>>({});
  const [sectionsOpen, setSectionsOpen] = useState({ system: true, loads: true });

  // Local draft state
  const [draftSettings, setDraftSettings] = useState<Partial<DemandSettings>>({});
  const [draftLoads, setDraftLoads] = useState<LoadConfig[]>([]);

  const initDraft = useCallback(() => {
    if (demandSettings) setDraftSettings({ ...demandSettings });
    setDraftLoads(loads.map((l) => ({ ...l })));
    setSettingsErrors({});
    setLoadErrors({});
  }, [demandSettings, loads]);

  useEffect(() => {
    if (!editing) initDraft();
  }, [editing, initDraft]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStartEdit = () => {
    initDraft();
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    const sErrs = validateSettings(draftSettings);
    const lErrs: Record<string, FieldError> = {};
    draftLoads.forEach((l) => {
      const e = validateLoad(l);
      if (Object.keys(e).length > 0) lErrs[l.id] = e;
    });

    setSettingsErrors(sErrs);
    setLoadErrors(lErrs);

    if (Object.keys(sErrs).length > 0 || Object.keys(lErrs).length > 0) {
      setToast({ type: 'error', message: 'Please fix validation errors before saving.' });
      return;
    }

    setSaving(true);
    try {
      await updateFullConfig(draftSettings, draftLoads);
      setEditing(false);
      setToast({ type: 'success', message: 'Configuration saved successfully.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message ?? 'Failed to save configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setShowResetConfirm(false);
    try {
      await resetToDefaults();
      setEditing(false);
      setToast({ type: 'success', message: 'Settings reset to factory defaults.' });
    } catch (err: any) {
      setToast({ type: 'error', message: err?.message ?? 'Failed to reset settings.' });
    } finally {
      setResetting(false);
    }
  };

  const updateDraftSetting = (key: keyof DemandSettings, value: any) => {
    setDraftSettings((prev) => ({ ...prev, [key]: value }));
    setSettingsErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
  };

  const updateDraftLoad = (id: string, key: keyof LoadConfig, value: any) => {
    setDraftLoads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [key]: value };
        // Sync category ↔ is_essential
        if (key === 'category') updated.is_essential = value === 'Essential';
        if (key === 'is_essential') updated.category = value ? 'Essential' : 'Heavy';
        return updated;
      })
    );
    setLoadErrors((prev) => {
      const n = { ...prev };
      if (n[id]) { delete n[id][key as string]; }
      return n;
    });
  };

  const toggleSection = (key: 'system' | 'loads') =>
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const displaySettings = editing ? draftSettings : (demandSettings ?? {});
  const displayLoads = editing ? draftLoads : loads;

  return (
    <div className="flex flex-col gap-5 p-5 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#16A34A]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] leading-tight">System Configuration</h1>
            <p className="text-sm text-[#64748B]">
              Manage all load-shedding parameters, thresholds and device settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!editing ? (
            <>
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={resetting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#DC2626] border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-1 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit Settings
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#475569] border border-[#CBD5E1] rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:opacity-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-[#16A34A] rounded-lg hover:bg-[#15803D] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-1 disabled:opacity-60 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-[#166534]'
              : 'bg-red-50 border-red-200 text-[#991B1B]'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-auto text-current opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ESP32 Firmware Warning */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-[#92400E]">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong>ESP32 Note:</strong> Settings like <em>Device ID</em> and <em>Telemetry Interval</em> are stored in the backend and sent to ESP32 via the telemetry response. To permanently update these in firmware, the Arduino code must be reflashed. All other settings take effect on the backend immediately.
        </span>
      </div>

      {/* ─── Section A: System & Demand Settings ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <SectionHeader
          icon={Sliders}
          title="System & Demand Settings"
          subtitle="Transformer, thresholds, timings and auto-shed behaviour"
          expanded={sectionsOpen.system}
          onToggle={() => toggleSection('system')}
        />
        {sectionsOpen.system && (
          <div className="p-4 space-y-0">
            <FieldRow label="Device ID" note="Requires firmware reflash to take full effect on ESP32" error={settingsErrors.device_id}>
              {editing ? (
                <TextInput
                  value={(draftSettings.device_id as string) ?? ''}
                  onChange={(v) => updateDraftSetting('device_id', v)}
                  className="w-full max-w-xs"
                />
              ) : (
                <span className="text-sm font-mono text-[#0F172A]">{displaySettings.device_id ?? '—'}</span>
              )}
            </FieldRow>

            <FieldRow label="Transformer Rating" error={settingsErrors.transformer_rating_va}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.transformer_rating_va as number) ?? 1000}
                  onChange={(v) => updateDraftSetting('transformer_rating_va', v)}
                  min={10} max={1000000} step={50} unit="VA"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.transformer_rating_va ?? '—'} VA</span>
              )}
            </FieldRow>

            <FieldRow label="Power Factor" error={settingsErrors.power_factor}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.power_factor as number) ?? 0.8}
                  onChange={(v) => updateDraftSetting('power_factor', clamp(v, 0.01, 1.0))}
                  min={0.01} max={1.0} step={0.01}
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.power_factor ?? '—'}</span>
              )}
            </FieldRow>

            <FieldRow label="Max Demand Threshold" error={settingsErrors.threshold_w}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.threshold_w as number) ?? 250}
                  onChange={(v) => updateDraftSetting('threshold_w', v)}
                  min={10} max={50000} step={10} unit="W"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.threshold_w ?? '—'} W</span>
              )}
            </FieldRow>

            <FieldRow label="Overload Confirmation Time" note="Delay before triggering shed" error={settingsErrors.confirmation_sec}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.confirmation_sec as number) ?? 2}
                  onChange={(v) => updateDraftSetting('confirmation_sec', v)}
                  min={0.5} max={60} step={0.5} unit="s"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.confirmation_sec ?? '—'} s</span>
              )}
            </FieldRow>

            <FieldRow label="Relay Settling / Cooldown Time" error={settingsErrors.cooldown_sec}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.cooldown_sec as number) ?? 3}
                  onChange={(v) => updateDraftSetting('cooldown_sec', v)}
                  min={0.5} max={120} step={0.5} unit="s"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.cooldown_sec ?? '—'} s</span>
              )}
            </FieldRow>

            <FieldRow label="Restoration Margin / Hysteresis" note="Power must drop this far below threshold before restoring loads" error={settingsErrors.restoration_hysteresis_w}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.restoration_hysteresis_w as number) ?? 20}
                  onChange={(v) => updateDraftSetting('restoration_hysteresis_w', v)}
                  min={0} max={5000} step={5} unit="W"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.restoration_hysteresis_w ?? '—'} W</span>
              )}
            </FieldRow>

            <FieldRow label="Telemetry Interval" note="Backend-side polling interval; firmware-side requires reflash" error={settingsErrors.telemetry_interval_sec}>
              {editing ? (
                <NumberInput
                  value={(draftSettings.telemetry_interval_sec as number) ?? 2}
                  onChange={(v) => updateDraftSetting('telemetry_interval_sec', v)}
                  min={0.5} max={60} step={0.5} unit="s"
                />
              ) : (
                <span className="text-sm text-[#0F172A]">{displaySettings.telemetry_interval_sec ?? '—'} s</span>
              )}
            </FieldRow>

            <FieldRow label="Automatic Load Shedding" note="Allow backend to shed loads automatically when threshold is exceeded">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={(editing ? draftSettings.auto_mode : displaySettings.auto_mode) ?? true}
                  onChange={(v) => updateDraftSetting('auto_mode', v)}
                  disabled={!editing}
                  label="Auto shedding"
                />
                <span className="text-sm text-[#64748B]">
                  {((editing ? draftSettings.auto_mode : displaySettings.auto_mode) ?? true) ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </FieldRow>

            <FieldRow label="Automatic Load Restoration" note="Allow backend to restore loads automatically when power drops below threshold">
              <div className="flex items-center gap-3">
                <Toggle
                  checked={(editing ? draftSettings.auto_restore_enabled : displaySettings.auto_restore_enabled) ?? true}
                  onChange={(v) => updateDraftSetting('auto_restore_enabled', v)}
                  disabled={!editing}
                  label="Auto restoration"
                />
                <span className="text-sm text-[#64748B]">
                  {((editing ? draftSettings.auto_restore_enabled : displaySettings.auto_restore_enabled) ?? true) ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </FieldRow>

            {demandSettings?.updated_at && (
              <div className="pt-2 text-[11px] text-[#94A3B8]">
                Last updated: {new Date(demandSettings.updated_at).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Calculation Preview ─── */}
      <CalcPreview
        settings={editing ? draftSettings : (demandSettings ?? {})}
        loads={editing ? draftLoads : loads}
      />

      {/* ─── Section B: Load Configuration ─── */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
        <SectionHeader
          icon={List}
          title="Load Configuration"
          subtitle="Names, rated power, categories and shedding priorities"
          expanded={sectionsOpen.loads}
          onToggle={() => toggleSection('loads')}
        />
        {sectionsOpen.loads && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-[#64748B]">
                  <th className="text-left px-4 py-2.5 font-semibold">ID</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Rated Power</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Category</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Priority <span className="normal-case font-normal text-[#94A3B8]">(1=protected)</span></th>
                  <th className="text-left px-4 py-2.5 font-semibold">Enabled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {displayLoads.map((load) => {
                  const errs = loadErrors[load.id] ?? {};
                  return (
                    <tr key={load.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{load.id}</td>

                      <td className="px-4 py-3">
                        {editing ? (
                          <div>
                            <TextInput
                              value={(draftLoads.find((l) => l.id === load.id)?.name) ?? ''}
                              onChange={(v) => updateDraftLoad(load.id, 'name', v)}
                              className="w-40"
                            />
                            {errs.name && <div className="text-xs text-red-600 mt-1">{errs.name}</div>}
                          </div>
                        ) : (
                          <span className="font-medium text-[#0F172A]">{load.name}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editing ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={draftLoads.find((l) => l.id === load.id)?.rated_power_w ?? 0}
                                min={0} max={10000} step={10}
                                onChange={(e) => updateDraftLoad(load.id, 'rated_power_w', parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                              />
                              <span className="text-xs text-[#64748B]">W</span>
                            </div>
                            {errs.rated_power_w && <div className="text-xs text-red-600 mt-1">{errs.rated_power_w}</div>}
                          </div>
                        ) : (
                          <span className="text-[#0F172A]">{load.rated_power_w} W</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editing ? (
                          <select
                            value={draftLoads.find((l) => l.id === load.id)?.category ?? 'Essential'}
                            onChange={(e) => updateDraftLoad(load.id, 'category', e.target.value)}
                            className="px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                          >
                            <option value="Essential">Essential</option>
                            <option value="Heavy">Heavy</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              (load.category ?? (load.is_essential ? 'Essential' : 'Heavy')) === 'Essential'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {load.category ?? (load.is_essential ? 'Essential' : 'Heavy')}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {editing ? (
                          <div>
                            <input
                              type="number"
                              value={draftLoads.find((l) => l.id === load.id)?.priority ?? 1}
                              min={1} max={10} step={1}
                              onChange={(e) => updateDraftLoad(load.id, 'priority', parseInt(e.target.value) || 1)}
                              className="w-16 px-2 py-1.5 text-sm border border-[#CBD5E1] rounded-md text-[#0F172A] bg-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                            />
                            {errs.priority && <div className="text-xs text-red-600 mt-1">{errs.priority}</div>}
                          </div>
                        ) : (
                          <span className="font-mono text-[#0F172A]">{load.priority}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <Toggle
                          checked={
                            editing
                              ? (draftLoads.find((l) => l.id === load.id)?.is_enabled ?? true)
                              : load.is_enabled
                          }
                          onChange={(v) => updateDraftLoad(load.id, 'is_enabled', v)}
                          disabled={!editing}
                          label={`Enable ${load.id}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-[#E2E8F0] text-[11px] text-[#94A3B8] flex items-center gap-1.5">
              <Cpu className="w-3 h-3" />
              Essential loads are never auto-shed. Heavy loads are shed in descending priority order (highest number first).
            </div>
          </div>
        )}
      </div>

      {/* Connected Load Summary */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[#16A34A]" />
          <span className="text-sm font-semibold text-[#0F172A]">Connected Load Summary</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {(['Essential', 'Heavy'] as const).map((cat) => {
            const catLoads = displayLoads.filter((l) => (l.category ?? (l.is_essential ? 'Essential' : 'Heavy')) === cat);
            const total = catLoads.reduce((s, l) => s + l.rated_power_w, 0);
            return (
              <div key={cat} className="bg-slate-50 rounded-lg p-3 border border-[#E2E8F0]">
                <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">{cat} Loads</div>
                <div className="text-xl font-bold text-[#0F172A] mt-0.5">{total} <span className="text-xs font-normal text-[#64748B]">W</span></div>
                <div className="text-[11px] text-[#64748B]">{catLoads.length} load{catLoads.length !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="text-[10px] uppercase tracking-wide text-emerald-600">Total Connected</div>
            <div className="text-xl font-bold text-[#0F172A] mt-0.5">
              {displayLoads.reduce((s, l) => s + l.rated_power_w, 0)} <span className="text-xs font-normal text-[#64748B]">W</span>
            </div>
            <div className="text-[11px] text-emerald-700">{displayLoads.length} loads</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 border border-[#E2E8F0]">
            <div className="text-[10px] uppercase tracking-wide text-[#94A3B8]">Sheddable Load</div>
            <div className="text-xl font-bold text-[#0F172A] mt-0.5">
              {displayLoads.filter((l) => (l.category ?? (l.is_essential ? 'Essential' : 'Heavy')) !== 'Essential').reduce((s, l) => s + l.rated_power_w, 0)} <span className="text-xs font-normal text-[#64748B]">W</span>
            </div>
            <div className="text-[11px] text-[#64748B]">Heavy loads only</div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <div className="text-base font-bold text-[#0F172A]">Reset to Defaults?</div>
                <div className="text-xs text-[#64748B]">This action cannot be undone</div>
              </div>
            </div>
            <p className="text-sm text-[#475569] mb-5">
              All settings will be restored to factory defaults. The current configuration will be permanently overwritten.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-[#475569] border border-[#CBD5E1] rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors"
              >
                Reset Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
