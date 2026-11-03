import React from 'react';
import { TelemetryProvider } from './context/TelemetryContext';
import { LoadShedProvider } from './context/LoadShedContext';
import { AppRoutes } from './routes/AppRoutes';

export const App: React.FC = () => {
  return (
    <TelemetryProvider>
      <LoadShedProvider>
        <AppRoutes />
      </LoadShedProvider>
    </TelemetryProvider>
  );
};

export default App;
