import type { CSSProperties } from 'react';

/**
 * Shared Recharts contentStyle for all chart tooltips in the PV Intelligence dashboard.
 * Provides consistent light enterprise styling across all six pages.
 */
export const CHART_TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderColor: '#E2E8F0',
  borderRadius: '8px',
  fontSize: '11px',
  boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.08)',
  padding: '8px 12px',
};

export const CHART_CURSOR_STYLE = {
  stroke: '#E2E8F0',
  strokeWidth: 1,
  fill: 'rgba(241,245,249,0.6)',
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: '11px',
  paddingTop: '8px',
};
