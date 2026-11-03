export interface HourlyForecast {
  timestamp: string;
  hour: string;
  predictedPowerW: number;      // Predicted Solar Power (Watts)
  lowerConfidenceW: number;     // Lower 95% Confidence Bound (Watts)
  upperConfidenceW: number;     // Upper 95% Confidence Bound (Watts)
  temperatureC: number;         // Estimated Temperature (°C)
  humidityPercent: number;      // Estimated Humidity (%)
  actualPowerW?: number;        // Real-time measured Power (Watts)
  // Backward compatibility
  relativeLightPercent?: number;
  predictedPowerKw?: number;
  actualPowerKw?: number;
  estimatedIrradiance?: number;
}

export interface AIPredictionModelMetadata {
  modelName: string;
  modelType: string;
  status: 'Development / Demo Prototype (Simulated)' | 'Trained on Experimental Data';
  inputFeatures: string[];
  targetOutput: string;
  statusNote: string;
  // Backward compatibility
  algorithm?: string;
  r2Score?: number;
  mae?: number;
}

export interface DayAheadPredictionSummary {
  modelInfo: AIPredictionModelMetadata;
  dayAheadTotalWh: number;      // Wh (Daily Estimated Yield)
  peakPredictedW: number;       // Peak Predicted Power (Watts)
  peakHour: string;
  hourlyForecasts: HourlyForecast[];
  // Backward compatibility
  dayAheadTotalKwh?: number;
  peakPredictedKw?: number;
}
