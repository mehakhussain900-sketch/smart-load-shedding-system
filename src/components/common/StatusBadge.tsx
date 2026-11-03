import React from 'react';

interface StatusBadgeProps {
  status: 'ONLINE' | 'SIMULATING' | 'OFFLINE' | 'WARNING' | 'CRITICAL' | 'NORMAL';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'md' }) => {
  const config = {
    ONLINE: { bg: 'bg-emerald-50', text: 'text-[#16A34A]', border: 'border-emerald-200', dot: 'bg-[#16A34A]' },
    NORMAL: { bg: 'bg-emerald-50', text: 'text-[#16A34A]', border: 'border-emerald-200', dot: 'bg-[#16A34A]' },
    SIMULATING: { bg: 'bg-blue-50', text: 'text-[#2563EB]', border: 'border-blue-200', dot: 'bg-[#2563EB]' },
    OFFLINE: { bg: 'bg-slate-100', text: 'text-[#475569]', border: 'border-slate-200', dot: 'bg-[#94A3B8]' },
    WARNING: { bg: 'bg-amber-50', text: 'text-[#D97706]', border: 'border-amber-200', dot: 'bg-[#D97706]' },
    CRITICAL: { bg: 'bg-red-50', text: 'text-[#DC2626]', border: 'border-red-200', dot: 'bg-[#DC2626]' },
  }[status] || { bg: 'bg-slate-100', text: 'text-[#475569]', border: 'border-slate-200', dot: 'bg-[#94A3B8]' };

  const displayLabel = label || status;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} animate-pulse`} />
      {displayLabel}
    </span>
  );
};
