import type { CountryAssumption, CountryId, RegionId, Scenario } from './types';

const EU_GBM_INCIDENCE = 4.52;
const US_GBM_INCIDENCE = 3.4229616188;
const JP_GBM_INCIDENCE = 2.1;
const BM_INCIDENCE = 19.8268283291;

const regionalGbmIncidence: Record<RegionId, number> = {
  'North America': US_GBM_INCIDENCE,
  Europe: EU_GBM_INCIDENCE,
  'South America': US_GBM_INCIDENCE,
  'Middle East & North Africa': JP_GBM_INCIDENCE,
  'South Asia': JP_GBM_INCIDENCE,
  'East Asia': JP_GBM_INCIDENCE,
  'Southeast Asia': JP_GBM_INCIDENCE,
  Oceania: US_GBM_INCIDENCE,
};

const incidenceByRegion = (value: number): Record<RegionId, number> => ({
  'North America': value,
  Europe: value,
  'South America': value,
  'Middle East & North Africa': value,
  'South Asia': value,
  'East Asia': value,
  'Southeast Asia': value,
  Oceania: value,
});

const launches = (gbm: number, expansion: number) => ({
  gbm,
  brainMetastasis: expansion,
  opbt: expansion,
});

const euCountry = (
  id: CountryId,
  name: string,
  geoName: string,
  populationBase: number,
  populationGrowthPct: number,
  assumptionStatus: CountryAssumption['assumptionStatus'] = 'proxy',
): CountryAssumption => ({
  id,
  name,
  geoName,
  region: 'Europe',
  populationBaseYear: 2026,
  populationBase,
  populationGrowthPct,
  enabled: true,
  priceUsd: 75_000,
  peakSharePct: 30,
  loeYear: 2040,
  launchYearByIndication: launches(2032, 2034),
  surgeryEligibility: { gbm: 0.741, brainMetastasis: 0.25, opbt: 0.33 },
  accessiblePopulationPct: 100,
  accessRoute: 'commercial',
  assumptionStatus,
  assumptionNote: assumptionStatus === 'proxy'
    ? 'European regional commercial assumptions are applied as a planning proxy until country-specific pricing and access are validated.'
    : undefined,
});

interface ProxyCountryInput {
  id: CountryId;
  name: string;
  geoName?: string;
  region: RegionId;
  populationBase: number;
  populationGrowthPct: number;
  priceUsd: number;
  peakSharePct: number;
  accessiblePopulationPct: number;
  surgeryEligibilityGbm: number;
  gbmLaunch: number;
  expansionLaunch?: number;
  enabled?: boolean;
  loeYear?: number;
}

const proxyCountry = (input: ProxyCountryInput): CountryAssumption => ({
  id: input.id,
  name: input.name,
  geoName: input.geoName ?? input.name,
  region: input.region,
  populationBaseYear: 2025,
  populationBase: input.populationBase,
  populationGrowthPct: input.populationGrowthPct,
  enabled: input.enabled ?? false,
  priceUsd: input.priceUsd,
  peakSharePct: input.peakSharePct,
  loeYear: input.loeYear ?? 2042,
  launchYearByIndication: launches(input.gbmLaunch, input.expansionLaunch ?? input.gbmLaunch + 2),
  surgeryEligibility: { gbm: input.surgeryEligibilityGbm, brainMetastasis: 0.20, opbt: 0.30 },
  accessiblePopulationPct: input.accessiblePopulationPct,
  accessRoute: 'commercial',
  assumptionStatus: 'proxy',
  assumptionNote: 'Planning market. Population scale is approximate and epidemiology, price, addressable share, launch timing and penetration require country-specific validation before external quantitative use.',
});

/** Public/demo assumptions only. Regional expansion markets are selectable planning proxies. */
export const baseScenario: Scenario = {
  name: 'Base case',
  startYear: 2026,
  endYear: 2047,
  erosionPct: 15,
  patentExtensionYears: 0,
  indications: {
    gbm: {
      id: 'gbm',
      name: 'Glioblastoma',
      incidencePer100kByRegion: regionalGbmIncidence,
      defaultRampYears: 6,
      enabled: true,
    },
    brainMetastasis: {
      id: 'brainMetastasis',
      name: 'Brain Metastases',
      incidencePer100kByRegion: incidenceByRegion(BM_INCIDENCE),
      defaultRampYears: 6,
      enabled: false,
    },
    opbt: {
      id: 'opbt',
      name: 'Other Primary Brain Tumors',
      incidencePer100kByRegion: regionalGbmIncidence,
      defaultRampYears: 6,
      enabled: false,
    },
  },
  countries: {
    USA: {
      id: 'USA', name: 'United States', geoName: 'United States of America', region: 'North America',
      populationBaseYear: 2028, populationBase: 353_050_000, populationGrowthPct: 0.543, enabled: true,
      priceUsd: 75_000, peakSharePct: 30, loeYear: 2037, launchYearByIndication: launches(2032, 2034),
      surgeryEligibility: { gbm: 0.73, brainMetastasis: 0.25, opbt: 0.33 }, accessiblePopulationPct: 100, accessRoute: 'commercial',
    },
    CAN: proxyCountry({ id: 'CAN', name: 'Canada', region: 'North America', populationBase: 41_500_000, populationGrowthPct: 1.0, priceUsd: 70_000, peakSharePct: 25, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.73, gbmLaunch: 2032, enabled: true, loeYear: 2040 }),
    MEX: proxyCountry({ id: 'MEX', name: 'Mexico', region: 'North America', populationBase: 132_000_000, populationGrowthPct: 0.8, priceUsd: 45_000, peakSharePct: 15, accessiblePopulationPct: 60, surgeryEligibilityGbm: 0.60, gbmLaunch: 2033, enabled: true, loeYear: 2040 }),

    BEL: euCountry('BEL', 'Belgium', 'Belgium', 11_955_300, 0.60),
    BGR: euCountry('BGR', 'Bulgaria', 'Bulgaria', 6_423_200, -0.22),
    CZE: euCountry('CZE', 'Czechia', 'Czech Republic', 10_915_800, 0.06),
    DNK: euCountry('DNK', 'Denmark', 'Denmark', 6_025_600, 0.55),
    DEU: euCountry('DEU', 'Germany', 'Germany', 83_467_100, -0.13, 'configured'),
    EST: euCountry('EST', 'Estonia', 'Estonia', 1_360_700, -0.68),
    IRL: euCountry('IRL', 'Ireland', 'Ireland', 5_510_600, 1.29),
    GRC: euCountry('GRC', 'Greece', 'Greece', 10_366_600, -0.06),
    ESP: euCountry('ESP', 'Spain', 'Spain', 49_590_100, 0.94, 'configured'),
    FRA: euCountry('FRA', 'France', 'France', 69_112_300, 0.33, 'configured'),
    HRV: euCountry('HRV', 'Croatia', 'Croatia', 3_876_000, 0.04),
    ITA: euCountry('ITA', 'Italy', 'Italy', 58_942_800, 0.00, 'configured'),
    CYP: euCountry('CYP', 'Cyprus', 'Cyprus', 996_600, 1.38),
    LVA: euCountry('LVA', 'Latvia', 'Latvia', 1_845_100, -0.83),
    LTU: euCountry('LTU', 'Lithuania', 'Lithuania', 2_887_600, -0.11),
    LUX: euCountry('LUX', 'Luxembourg', 'Luxembourg', 691_000, 1.32),
    HUN: euCountry('HUN', 'Hungary', 'Hungary', 9_488_400, -0.54),
    MLT: euCountry('MLT', 'Malta', 'Malta', 588_300, 2.44),
    NLD: euCountry('NLD', 'Netherlands', 'Netherlands', 18_130_200, 0.48),
    AUT: euCountry('AUT', 'Austria', 'Austria', 9_216_000, 0.20),
    POL: euCountry('POL', 'Poland', 'Poland', 36_332_800, -0.45),
    PRT: euCountry('PRT', 'Portugal', 'Portugal', 11_424_000, 0.32),
    ROU: euCountry('ROU', 'Romania', 'Romania', 19_041_300, -0.01),
    SVN: euCountry('SVN', 'Slovenia', 'Slovenia', 2_135_100, 0.20),
    SVK: euCountry('SVK', 'Slovakia', 'Slovakia', 5_409_400, -0.18),
    FIN: euCountry('FIN', 'Finland', 'Finland', 5_652_900, 0.30),
    SWE: euCountry('SWE', 'Sweden', 'Sweden', 10_605_500, 0.17),
    GBR: { ...euCountry('GBR', 'United Kingdom', 'United Kingdom', 69_000_000, 0.45, 'configured'), assumptionNote: undefined },
    NOR: proxyCountry({ id: 'NOR', name: 'Norway', region: 'Europe', populationBase: 5_600_000, populationGrowthPct: 0.8, priceUsd: 75_000, peakSharePct: 30, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.741, gbmLaunch: 2032, enabled: true }),
    CHE: proxyCountry({ id: 'CHE', name: 'Switzerland', region: 'Europe', populationBase: 9_000_000, populationGrowthPct: 0.8, priceUsd: 80_000, peakSharePct: 30, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.741, gbmLaunch: 2032, enabled: true }),

    BRA: proxyCountry({ id: 'BRA', name: 'Brazil', region: 'South America', populationBase: 213_000_000, populationGrowthPct: 0.5, priceUsd: 30_000, peakSharePct: 15, accessiblePopulationPct: 50, surgeryEligibilityGbm: 0.55, gbmLaunch: 2034 }),
    ARG: proxyCountry({ id: 'ARG', name: 'Argentina', region: 'South America', populationBase: 46_000_000, populationGrowthPct: 0.5, priceUsd: 30_000, peakSharePct: 15, accessiblePopulationPct: 60, surgeryEligibilityGbm: 0.60, gbmLaunch: 2034 }),
    COL: proxyCountry({ id: 'COL', name: 'Colombia', region: 'South America', populationBase: 53_000_000, populationGrowthPct: 0.8, priceUsd: 28_000, peakSharePct: 12, accessiblePopulationPct: 50, surgeryEligibilityGbm: 0.55, gbmLaunch: 2035 }),
    CHL: proxyCountry({ id: 'CHL', name: 'Chile', region: 'South America', populationBase: 20_000_000, populationGrowthPct: 0.4, priceUsd: 35_000, peakSharePct: 15, accessiblePopulationPct: 70, surgeryEligibilityGbm: 0.65, gbmLaunch: 2034 }),

    SAU: proxyCountry({ id: 'SAU', name: 'Saudi Arabia', region: 'Middle East & North Africa', populationBase: 35_000_000, populationGrowthPct: 1.2, priceUsd: 45_000, peakSharePct: 15, accessiblePopulationPct: 65, surgeryEligibilityGbm: 0.60, gbmLaunch: 2034 }),
    ARE: proxyCountry({ id: 'ARE', name: 'United Arab Emirates', geoName: 'United Arab Emirates', region: 'Middle East & North Africa', populationBase: 11_000_000, populationGrowthPct: 1.5, priceUsd: 55_000, peakSharePct: 20, accessiblePopulationPct: 75, surgeryEligibilityGbm: 0.65, gbmLaunch: 2034 }),
    EGY: proxyCountry({ id: 'EGY', name: 'Egypt', region: 'Middle East & North Africa', populationBase: 117_000_000, populationGrowthPct: 1.6, priceUsd: 20_000, peakSharePct: 10, accessiblePopulationPct: 30, surgeryEligibilityGbm: 0.45, gbmLaunch: 2035 }),
    MAR: proxyCountry({ id: 'MAR', name: 'Morocco', region: 'Middle East & North Africa', populationBase: 38_000_000, populationGrowthPct: 0.9, priceUsd: 22_000, peakSharePct: 10, accessiblePopulationPct: 35, surgeryEligibilityGbm: 0.45, gbmLaunch: 2035 }),

    IND: proxyCountry({ id: 'IND', name: 'India', region: 'South Asia', populationBase: 1_480_000_000, populationGrowthPct: 0.75, priceUsd: 25_000, peakSharePct: 15, accessiblePopulationPct: 25, surgeryEligibilityGbm: 0.50, gbmLaunch: 2034 }),
    PAK: proxyCountry({ id: 'PAK', name: 'Pakistan', region: 'South Asia', populationBase: 255_000_000, populationGrowthPct: 1.5, priceUsd: 18_000, peakSharePct: 10, accessiblePopulationPct: 20, surgeryEligibilityGbm: 0.40, gbmLaunch: 2035 }),
    BGD: proxyCountry({ id: 'BGD', name: 'Bangladesh', region: 'South Asia', populationBase: 176_000_000, populationGrowthPct: 1.0, priceUsd: 16_000, peakSharePct: 8, accessiblePopulationPct: 18, surgeryEligibilityGbm: 0.38, gbmLaunch: 2035 }),

    JPN: {
      id: 'JPN', name: 'Japan', geoName: 'Japan', region: 'East Asia',
      populationBaseYear: 2028, populationBase: 121_221_170, populationGrowthPct: -0.52, enabled: true,
      priceUsd: 75_000, peakSharePct: 30, loeYear: 2040, launchYearByIndication: launches(2034, 2036),
      surgeryEligibility: { gbm: 0.886, brainMetastasis: 0.25, opbt: 0.33 }, accessiblePopulationPct: 100, accessRoute: 'commercial',
    },
    CHN: proxyCountry({ id: 'CHN', name: 'China', region: 'East Asia', populationBase: 1_408_000_000, populationGrowthPct: -0.15, priceUsd: 35_000, peakSharePct: 15, accessiblePopulationPct: 30, surgeryEligibilityGbm: 0.55, gbmLaunch: 2034 }),
    KOR: proxyCountry({ id: 'KOR', name: 'South Korea', geoName: 'South Korea', region: 'East Asia', populationBase: 51_700_000, populationGrowthPct: -0.1, priceUsd: 55_000, peakSharePct: 20, accessiblePopulationPct: 90, surgeryEligibilityGbm: 0.75, gbmLaunch: 2034 }),

    IDN: proxyCountry({ id: 'IDN', name: 'Indonesia', region: 'Southeast Asia', populationBase: 286_000_000, populationGrowthPct: 0.8, priceUsd: 18_000, peakSharePct: 8, accessiblePopulationPct: 20, surgeryEligibilityGbm: 0.40, gbmLaunch: 2035 }),
    THA: proxyCountry({ id: 'THA', name: 'Thailand', region: 'Southeast Asia', populationBase: 72_000_000, populationGrowthPct: 0.1, priceUsd: 25_000, peakSharePct: 12, accessiblePopulationPct: 40, surgeryEligibilityGbm: 0.50, gbmLaunch: 2035 }),
    MYS: proxyCountry({ id: 'MYS', name: 'Malaysia', region: 'Southeast Asia', populationBase: 36_000_000, populationGrowthPct: 1.0, priceUsd: 30_000, peakSharePct: 12, accessiblePopulationPct: 50, surgeryEligibilityGbm: 0.55, gbmLaunch: 2035 }),
    SGP: proxyCountry({ id: 'SGP', name: 'Singapore', region: 'Southeast Asia', populationBase: 6_000_000, populationGrowthPct: 0.8, priceUsd: 65_000, peakSharePct: 20, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.75, gbmLaunch: 2034 }),

    AUS: proxyCountry({ id: 'AUS', name: 'Australia', region: 'Oceania', populationBase: 27_500_000, populationGrowthPct: 1.3, priceUsd: 70_000, peakSharePct: 25, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.73, gbmLaunch: 2033 }),
    NZL: proxyCountry({ id: 'NZL', name: 'New Zealand', region: 'Oceania', populationBase: 5_300_000, populationGrowthPct: 1.0, priceUsd: 65_000, peakSharePct: 25, accessiblePopulationPct: 100, surgeryEligibilityGbm: 0.73, gbmLaunch: 2033 }),
  },
  developmentStages: [
    { id: 'gbm-p1', indication: 'gbm', phase: 'Phase I', startDate: '2027-06-01', endDate: '2029-05-31', publicCostUsd: 4_400_000, successProbabilityPct: 100 },
    { id: 'gbm-p2', indication: 'gbm', phase: 'Phase II', startDate: '2030-01-01', endDate: '2031-08-31', publicCostUsd: 24_700_000, successProbabilityPct: 70 },
    { id: 'gbm-p3', indication: 'gbm', phase: 'Confirmatory Phase III', startDate: '2031-12-01', endDate: '2033-11-30', publicCostUsd: 45_000_000, successProbabilityPct: 65 },
    { id: 'bm-p2', indication: 'brainMetastasis', phase: 'Bridging Phase II', startDate: '2032-03-01', endDate: '2033-05-31', publicCostUsd: 9_700_000, successProbabilityPct: 70 },
    { id: 'bm-p3', indication: 'brainMetastasis', phase: 'Confirmatory Phase III', startDate: '2033-11-01', endDate: '2035-10-31', publicCostUsd: 44_700_000, successProbabilityPct: 65 },
    { id: 'opbt-p2', indication: 'opbt', phase: 'Bridging Phase II', startDate: '2032-03-01', endDate: '2033-05-31', publicCostUsd: 9_700_000, successProbabilityPct: 70 },
    { id: 'opbt-p3', indication: 'opbt', phase: 'Confirmatory Phase III', startDate: '2033-11-01', endDate: '2035-10-31', publicCostUsd: 44_700_000, successProbabilityPct: 65 },
  ],
  corporateCosts: [],
  financingEvents: [],
  financial: {
    cogsPerTreatmentUsd: 500,
    commercialOpexPct: 8,
    discountRatePct: 10.135,
    corporateTaxPct: 20,
    riskAdjustmentPct: 100,
  },
};

export const cloneScenario = (scenario: Scenario): Scenario => JSON.parse(JSON.stringify(scenario)) as Scenario;
