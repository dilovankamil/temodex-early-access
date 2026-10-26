import type { CountryAssumption, Scenario } from './types';

const menaProxy = (
  id: string,
  name: string,
  populationBase: number,
  populationGrowthPct: number,
  priceUsd: number,
  peakSharePct: number,
  accessiblePopulationPct: number,
  surgeryEligibilityGbm: number,
  gbmLaunch = 2034,
): CountryAssumption => ({
  id,
  name,
  geoName: name,
  region: 'Middle East & North Africa',
  populationBaseYear: 2025,
  populationBase,
  populationGrowthPct,
  enabled: false,
  priceUsd,
  peakSharePct,
  loeYear: 2042,
  launchYearByIndication: {
    gbm: gbmLaunch,
    brainMetastasis: gbmLaunch + 2,
    opbt: gbmLaunch + 2,
  },
  surgeryEligibility: {
    gbm: surgeryEligibilityGbm,
    brainMetastasis: 0.2,
    opbt: 0.3,
  },
  accessiblePopulationPct,
  accessRoute: 'commercial',
  assumptionStatus: 'proxy',
  assumptionNote: 'Planning market. Population scale is approximate and epidemiology, price, addressable share, launch timing and penetration require country-specific validation before external quantitative use.',
});

const additionalMenaMarkets: CountryAssumption[] = [
  menaProxy('TUR', 'Turkey', 87_700_000, 0.3, 40_000, 18, 70, 0.65),
  menaProxy('ISR', 'Israel', 10_100_000, 1.4, 70_000, 25, 95, 0.78),
  menaProxy('QAT', 'Qatar', 3_100_000, 1.2, 70_000, 25, 95, 0.78),
  menaProxy('KWT', 'Kuwait', 5_000_000, 1.1, 65_000, 22, 90, 0.72),
  menaProxy('BHR', 'Bahrain', 1_600_000, 1.0, 60_000, 22, 90, 0.72),
  menaProxy('OMN', 'Oman', 5_500_000, 1.3, 55_000, 20, 80, 0.68),
];

export const ensureCompleteMarketSet = (scenario: Scenario): Scenario => {
  additionalMenaMarkets.forEach((country) => {
    if (!scenario.countries[country.id]) {
      scenario.countries[country.id] = JSON.parse(JSON.stringify(country)) as CountryAssumption;
    }
  });
  return scenario;
};
