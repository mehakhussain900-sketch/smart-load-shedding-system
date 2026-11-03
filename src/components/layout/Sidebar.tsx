import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ToggleRight,
  Activity,
  Zap,
  TrendingDown,
  FileSpreadsheet,
  Cpu,
  Radio,
  Settings,
} from 'lucide-react';
import { useTelemetry } from '../../hooks/useTelemetry';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Load Management', path: '/loads', icon: ToggleRight },
  { name: 'Power Monitoring', path: '/monitoring', icon: Activity },
  { name: 'Demand Analysis', path: '/demand-analysis', icon: TrendingDown },
  { name: 'Analytics', path: '/analytics', icon: Zap },
  { name: 'Event Log', path: '/data-logs', icon: FileSpreadsheet },
  { name: 'System Settings', path: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { connectionStatus, isSimulating } = useTelemetry();

  const isLive = connectionStatus === 'Live';
  const isWaiting = connectionStatus === 'Waiting for ESP32';

  return (
    <aside className="w-64 bg-white border-r border-[#E2E8F0] flex flex-col shrink-0 min-h-screen select-none shadow-xs">
      {/* Brand & Project Banner */}
      <div className="p-5 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#16A34A]">
            <Cpu className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#0F172A] tracking-tight leading-tight">
              PV Intelligence
            </h1>
            <span className="text-[10px] font-semibold text-[#16A34A] tracking-wider uppercase">
              LOAD & DEMAND CONTROL
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
          CORE MODULES
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#16A34A] ${
                  isActive
                    ? 'bg-emerald-50 text-[#0F172A] font-semibold border border-emerald-200 shadow-2xs'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-[#16A34A] transition-all duration-150" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 transition-all duration-150 ${isActive ? 'text-[#16A34A]' : 'text-[#94A3B8] group-hover:text-[#475569] group-hover:scale-110'}`} />
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom Node Gateway Card */}
      <div className="p-4 border-t border-[#E2E8F0] bg-slate-50/50">
        <div className="p-3 rounded-lg bg-white border border-[#E2E8F0] text-xs shadow-2xs">
          <div className="flex items-center justify-between text-[#475569] mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-[11px] uppercase tracking-wider text-[#0F172A]">
              <Radio className="w-3.5 h-3.5 text-[#2563EB]" />
              NODE GATEWAY
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                isLive
                  ? 'bg-[#16A34A] ring-2 ring-emerald-100'
                  : isSimulating
                  ? 'bg-[#F59E0B] ring-2 ring-amber-100'
                  : isWaiting
                  ? 'bg-[#2563EB] animate-pulse ring-2 ring-blue-100'
                  : 'bg-[#DC2626]'
              }`}
            />
          </div>
          <div className="text-[#0F172A] font-mono font-medium text-[11px]">ESP32 DevKit V1</div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px]">
            <div className="flex justify-between items-center text-[#475569]">
              <span>Hardware:</span>
              <span className="font-medium text-[#0F172A]">3× Relay Modules (6-Ch)</span>
            </div>
            <div className="flex justify-between items-center text-[#475569]">
              <span>Status:</span>
              <span className={`font-semibold ${
                isLive ? 'text-[#16A34A]' : isSimulating ? 'text-[#F59E0B]' : isWaiting ? 'text-[#2563EB]' : 'text-[#DC2626]'
              }`}>
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
