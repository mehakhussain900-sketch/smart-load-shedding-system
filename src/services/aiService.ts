import type { DayAheadPredictionSummary } from '../types/prediction';
import type { PVHealthAssessment } from '../types/health';
import type { AnomalyAlert } from '../types/anomaly';
import type { MaximumDemandStats, DemandProfilePoint } from '../types/demand';

/**
 * Service to provide AI model prediction data, rule-based health diagnostics,
 * structured anomaly alerts, and maximum demand loss analysis.
 * Scaled for the Jakson JP-12x100 100 Wp panel hardware test bench.
 */
export const aiService = {
  /**
   * Day-ahead solar generation prediction based on electrical and environmental inputs.
   * Scaled for Jakson JP-12x100 (100 Wp rated).
   */
  getPredictionSummary(): DayAheadPredictionSummary {
    const hours = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
    // Realistic power curve in Watts (peaking around 96W for a 100 Wp panel)
    const powerCurveWatts = [4.5, 18.2, 42.0, 68.5, 87.0, 94.2, 96.5, 90.0, 76.5, 54.0, 31.0, 12.0, 2.5];

    const hourlyForecasts = hours.map((hour, idx) => {
      const pred = powerCurveWatts[idx];
      return {
        timestamp: `Today ${hour}`,
        hour,
        predictedPowerW: pred,
        lowerConfidenceW: +(pred * 0.92).toFixed(1),
        upperConfidenceW: +(pred * 1.08).toFixed(1),
        temperatureC: +(26.0 + (pred / 96.5) * 11.5).toFixed(1),
        humidityPercent: Math.round(65 - (pred / 96.5) * 20),
        actualPowerW: idx < 7 ? +(pred * (1 + (Math.random() - 0.5) * 0.05)).toFixed(1) : undefined,
        predictedPowerKw: +(pred / 1000).toFixed(4),
        actualPowerKw: idx < 7 ? +(pred * (1 + (Math.random() - 0.5) * 0.05) / 1000).toFixed(4) : undefined,
      };
    });

    return {
      modelInfo: {
        modelName: 'SmartPV-Forecaster-v1 (Prototype)',
        modelType: 'Multivariate Solar Regression (Pre-Trained Baseline)',
        status: 'Development / Demo Prototype (Simulated)',
        inputFeatures: ['Solar Voltage (V)', 'Solar Current (A)', 'DHT22 Temperature (°C)', 'DHT22 Humidity (%)', 'Time of Day'],
        targetOutput: 'Predicted Solar Power (Watts)',
        statusNote: 'Prediction model is currently in development prototype mode. Model weights will be trained on continuous historical logs from the 100 Wp panel once sufficient real data is logged.',
        algorithm: 'Multivariate Regression Prototype',
        mae: 2.1,
        r2Score: 0.95,
      },
      dayAheadTotalWh: 585.0,
      peakPredictedW: 96.5,
      peakHour: '12:00 PM',
      hourlyForecasts,
      dayAheadTotalKwh: 0.585,
      peakPredictedKw: 0.0965,
    };
  },

  /**
   * Explainable rule-based analytical PV health evaluation for 100 Wp panel.
   */
  getHealthAssessment(): PVHealthAssessment {
    return {
      overallScore: 94,
      grade: 'EXCELLENT',
      generationPerformance: 95,
      voltageStability: 96,
      currentStability: 94,
      environmentalCondition: 90,
      anomalyLevel: 'NORMAL',
      evaluationMode: 'RULE_BASED_ANALYTICAL (SIMULATED)',
      metrics: [
        {
          name: 'Generation Performance',
          score: 95,
          weight: 35,
          status: 'OPTIMAL',
          basis: 'Actual output power tracks 95% of theoretical maximum for current temperature and sun angle.'
        },
        {
          name: 'Voltage Stability',
          score: 96,
          weight: 25,
          status: 'OPTIMAL',
          basis: 'Solar voltage remains steady in nominal 16.5V - 18.2V MPPT band during sunlight with minimal ripple.'
        },
        {
          name: 'Current Stability',
          score: 94,
          weight: 20,
          status: 'OPTIMAL',
          basis: 'ACS712 current reading follows expected curve without open-circuit drops or excessive noise.'
        },
        {
          name: 'Environmental Condition',
          score: 90,
          weight: 20,
          status: 'OPTIMAL',
          basis: 'DHT22 temperature (29.5°C) and humidity (54%) remain well within safe panel thermal thresholds.'
        }
      ],
      recommendations: [
        'Inspect 100 Wp panel surface periodically for dust accumulation to maintain peak solar conversion.',
        'Ensure DHT22 sensor ventilation port is unobstructed by mounting bracket fixtures.',
        'Maintain secure terminal connections on both ACS712 current sensors to avoid contact resistance.',
      ],
      activeWarnings: 0,
      degradationRateAnnual: 0.45,
      soilingLossPercentage: 2.5,
      estimatedRemainingYears: 22.0,
      strings: [
        {
          stringId: 'PV-MOD-01',
          name: 'Jakson JP-12x100 100Wp Monocrystalline Panel',
          panelCount: 1,
          measuredVoltage: 17.65,
          ratedVoltage: 17.70,
          efficiencyLossPercent: 2.1,
          soilingStatus: 'CLEAN',
          status: 'EXCELLENT',
        }
      ]
    };
  },

  /**
   * Active anomalies structured table and alerts.
   */
  getActiveAnomalies(): AnomalyAlert[] {
    return [
      {
        id: 'ANOM-201',
        timestamp: '15 mins ago',
        parameter: 'Solar Power (W)',
        expected: '88.5 W',
        actual: '62.0 W',
        deviation: '-29.9%',
        severity: 'MEDIUM',
        possibleCause: 'Unexpected power drop',
        status: 'ACTIVE',
        isPotential: true,
        description: 'Temporary solar power reduction detected relative to solar peak schedule.',
        mitigationSteps: 'Inspect 100 Wp solar panel surface for partial shading, obstruction, or cloud transients.',
        title: 'Potential Power Drop Anomaly',
        category: 'PARTIAL_SHADING',
        affectedComponent: 'Jakson 100Wp PV Module',
        confidenceScore: 0.88,
      },
      {
        id: 'ANOM-198',
        timestamp: '2 hours ago',
        parameter: 'Solar Voltage (V)',
        expected: '17.7 V',
        actual: '20.8 V',
        deviation: '+17.5%',
        severity: 'LOW',
        possibleCause: 'Voltage abnormality',
        status: 'INVESTIGATING',
        isPotential: true,
        description: 'Panel voltage approached open-circuit Voc during test load disconnect transition.',
        mitigationSteps: 'Verify charge controller battery circuit and DC load switch connection.',
        title: 'Potential Open-Circuit Voltage Rise',
        category: 'SENSOR_DISCONNECTED',
        affectedComponent: 'Voltage Divider Sensor',
        confidenceScore: 0.91,
      },
      {
        id: 'ANOM-194',
        timestamp: 'Yesterday 11:30',
        parameter: 'Solar Current (A)',
        expected: '5.20 A',
        actual: '2.40 A',
        deviation: '-53.8%',
        severity: 'HIGH',
        possibleCause: 'Low generation under suitable light conditions',
        status: 'RESOLVED',
        isPotential: true,
        description: 'Midday solar current dropped below expected curve during test load step change.',
        mitigationSteps: 'Panel orientation adjusted toward normal incidence; current restored to nominal 5.4 A.',
        title: 'Low Generation Under High Sun Condition',
        category: 'SEVERE_SOILING',
        affectedComponent: 'ACS712 Current Sensor #1',
        confidenceScore: 0.95,
      }
    ];
  },

  /**
   * Maximum Demand Analysis evaluation data scaled for 100 Wp panel.
   */
  getMaximumDemandAnalysis(): { stats: MaximumDemandStats; hourlyProfile: DemandProfilePoint[] } {
    const hours = [
      { time: '06:00', baseW: 24.0, pvW: 4.5 },
      { time: '07:00', baseW: 32.0, pvW: 18.2 },
      { time: '08:00', baseW: 45.0, pvW: 38.6 },
      { time: '09:00', baseW: 56.0, pvW: 62.0 },
      { time: '10:00', baseW: 64.0, pvW: 81.5 },
      { time: '11:00', baseW: 72.0, pvW: 92.4 },
      { time: '12:00', baseW: 76.5, pvW: 96.0 },
      { time: '13:00', baseW: 74.0, pvW: 91.2 },
      { time: '14:00', baseW: 68.0, pvW: 78.0 },
      { time: '15:00', baseW: 58.0, pvW: 55.4 },
      { time: '16:00', baseW: 48.0, pvW: 31.0 },
      { time: '17:00', baseW: 36.0, pvW: 11.5 },
      { time: '18:00', baseW: 28.0, pvW: 1.8 },
    ];

    const hourlyProfile: DemandProfilePoint[] = hours.map((item, idx) => {
      const netDemand = Math.max(0, +(item.baseW - item.pvW).toFixed(1));
      return {
        time: item.time,
        hour: 6 + idx,
        demandWithoutPvW: item.baseW,
        pvGenerationW: item.pvW,
        demandWithPvW: netDemand,
        demandReductionW: Math.min(item.baseW, item.pvW),
      };
    });

    const maxWithoutPv = Math.max(...hourlyProfile.map(p => p.demandWithoutPvW));
    const maxWithPv = Math.max(...hourlyProfile.map(p => p.demandWithPvW));
    const avgDemand = +(hourlyProfile.reduce((acc, p) => acc + p.demandWithoutPvW, 0) / hourlyProfile.length).toFixed(1);
    const avgPv = +(hourlyProfile.reduce((acc, p) => acc + p.pvGenerationW, 0) / hourlyProfile.length).toFixed(1);
    const peakReduction = +(maxWithoutPv - maxWithPv).toFixed(1);
    const pctReduction = +((peakReduction / maxWithoutPv) * 100).toFixed(1);

    return {
      stats: {
        peakDemandWithoutPvW: maxWithoutPv,
        peakDemandWithPvW: maxWithPv,
        averageDemandW: avgDemand,
        pvContributionW: avgPv,
        demandDuringSolarGenW: Math.max(0, +(avgDemand - avgPv).toFixed(1)),
        demandWithoutPvW: maxWithoutPv,
        demandWithPvW: maxWithPv,
        estimatedDemandDifferenceW: peakReduction,
        percentageReduction: pctReduction,
        analysisMode: 'SIMULATED',
      },
      hourlyProfile,
    };
  }
};
