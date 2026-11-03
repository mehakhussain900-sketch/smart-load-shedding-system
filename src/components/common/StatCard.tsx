import React, { type ReactNode, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: ReactNode;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  accentColor?: 'green' | 'blue' | 'amber' | 'red' | 'emerald' | 'cyan' | 'rose' | 'slate';
  badge?: string;
  /** If provided, the card becomes keyboard-accessible and navigates on click */
  to?: string;
  /** Tooltip text shown on hover/focus */
  tooltip?: string;
}

const ACCENT = {
  green:   { icon: 'bg-emerald-50 text-[#16A34A] border-emerald-200', hover: 'hover:border-emerald-300 hover:shadow-emerald-100/70' },
  blue:    { icon: 'bg-blue-50 text-[#2563EB] border-blue-200',       hover: 'hover:border-blue-300 hover:shadow-blue-100/70' },
  amber:   { icon: 'bg-amber-50 text-[#F59E0B] border-amber-200',     hover: 'hover:border-amber-300 hover:shadow-amber-100/70' },
  red:     { icon: 'bg-red-50 text-[#DC2626] border-red-200',         hover: 'hover:border-red-300 hover:shadow-red-100/70' },
  slate:   { icon: 'bg-slate-50 text-[#475569] border-slate-200',     hover: 'hover:border-slate-300 hover:shadow-slate-100/70' },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  subtitle,
  trend,
  trendUp,
  accentColor = 'blue',
  badge,
  to,
  tooltip,
}) => {
  const navigate = useNavigate();
  const colorKey = ({ green: 'green', emerald: 'green', blue: 'blue', cyan: 'blue',
                      amber: 'amber', red: 'red', rose: 'red', slate: 'slate' } as Record<string, string>)[accentColor] || 'blue';
  const accent = ACCENT[colorKey as keyof typeof ACCENT];

  // Flash animation when value changes
  const prevValueRef = useRef<string | number>(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (value !== prevValueRef.current && value !== '--') {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 650);
      prevValueRef.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);

  const isClickable = Boolean(to);

  const handleClick = () => { if (to) navigate(to); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (to && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${title}: ${value}${unit ?? ''} — navigate to details` : undefined}
      title={tooltip}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={[
        'bg-white border border-[#E2E8F0] rounded-xl p-4 sm:p-5 shadow-xs',
        'transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-md',
        accent.hover,
        isClickable
          ? 'cursor-pointer active:translate-y-0 active:shadow-xs active:scale-[0.995] focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300'
          : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-[#475569] uppercase tracking-wider leading-tight">
          {title}
        </span>
        <div className={`p-2 rounded-lg border shrink-0 transition-transform duration-200 ${accent.icon} ${isClickable ? 'group-hover:scale-110' : ''}`}>
          {icon}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-1.5">
        <span
          className={[
            'text-2xl sm:text-[26px] font-bold text-[#0F172A] tracking-tight leading-none',
            flash ? 'value-updated' : '',
          ].join(' ')}
        >
          {value}
        </span>
        {unit && <span className="text-xs font-semibold text-[#475569]">{unit}</span>}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-[#475569]">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {trend && (
            <span className={`font-semibold shrink-0 ${trendUp ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
              {trend}
            </span>
          )}
          {badge && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-[#475569] shrink-0">
              {badge}
            </span>
          )}
        </div>
      )}

      {isClickable && (
        <div className="mt-1.5 text-[10px] text-[#94A3B8] flex items-center gap-0.5">
          <span>View details →</span>
        </div>
      )}
    </div>
  );
};
