export interface DemandProfilePoint {
  time: string;
  hour: number;
  demandWithoutPvW: number;   // Base load without PV in Watts
  pvGenerationW: number;      // Solar PV generation in Watts
  demandWithPvW: number;      // Resulting net demand in Watts
  demandReductionW: number;   // Difference / peak shaving in Watts
}

export interface MaximumDemandStats {
  peakDemandWithoutPvW: number;
  peakDemandWithPvW: number;
  averageDemandW: number;
  pvContributionW: number;
  demandDuringSolarGenW: number;
  demandWithoutPvW: number;
  demandWithPvW: number;
  estimatedDemandDifferenceW: number;
  percentageReduction: number;
  analysisMode: 'SIMULATED' | 'ESTIMATED';
}
