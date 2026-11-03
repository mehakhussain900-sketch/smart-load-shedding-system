import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { DashboardPage } from '../pages/Dashboard/DashboardPage';
import { LoadManagementPage } from '../pages/LoadManagement/LoadManagementPage';
import { LiveMonitoringPage } from '../pages/LiveMonitoring/LiveMonitoringPage';
import { EnergyAnalyticsPage } from '../pages/EnergyAnalytics/EnergyAnalyticsPage';
import { AIHealthPage } from '../pages/AIHealth/AIHealthPage';
import { MaximumDemandPage } from '../pages/MaximumDemand/MaximumDemandPage';
import { DataLogsPage } from '../pages/DataLogs/DataLogsPage';
import { SettingsPage } from '../pages/Settings/SettingsPage';

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* Core Modules */}
          <Route index element={<DashboardPage />} />
          <Route path="loads" element={<LoadManagementPage />} />
          <Route path="monitoring" element={<LiveMonitoringPage />} />
          <Route path="analytics" element={<EnergyAnalyticsPage />} />
          <Route path="ai-health" element={<AIHealthPage />} />
          <Route path="demand-analysis" element={<MaximumDemandPage />} />
          <Route path="data-logs" element={<DataLogsPage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Legacy route redirects for seamless navigation */}
          <Route path="load-management" element={<Navigate to="/loads" replace />} />
          <Route path="live-monitoring" element={<Navigate to="/monitoring" replace />} />
          <Route path="energy-analytics" element={<Navigate to="/analytics" replace />} />
          <Route path="ai-prediction" element={<Navigate to="/ai-health" replace />} />
          <Route path="pv-health" element={<Navigate to="/ai-health" replace />} />
          <Route path="maximum-demand" element={<Navigate to="/demand-analysis" replace />} />
          <Route path="anomalies" element={<Navigate to="/ai-health" replace />} />

          {/* Catch-all redirect to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
