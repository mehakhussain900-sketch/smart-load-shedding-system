import React, { type ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, badge, actions }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 mb-6 border-b border-[#E2E8F0] gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">{title}</h1>
          {badge}
        </div>
        <p className="mt-1 text-xs sm:text-sm text-[#475569] max-w-3xl leading-relaxed">{description}</p>
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
};
