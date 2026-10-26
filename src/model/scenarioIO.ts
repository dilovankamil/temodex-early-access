import type { Scenario } from './types';
import { scenarioErrors } from './validation';

export const MODEL_FILE_VERSION = 1;

interface ScenarioFile {
  model: 'si053-strategic-model';
  version: number;
  exportedAt: string;
  scenario: Scenario;
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const indicationIds = ['gbm', 'brainMetastasis', 'opbt'] as const;
const regionIds = ['North America', 'Europe', 'South America', 'Middle East & North Africa', 'South Asia', 'East Asia', 'Southeast Asia', 'Oceania'];
const accessRoutes = ['commercial', 'clinical-trial', 'none'];
const financingTypes = ['equity', 'debt', 'partner', 'grant'];
const financialKeys = ['cogsPerTreatmentUsd', 'commercialOpexPct', 'discountRatePct', 'corporateTaxPct', 'riskAdjustmentPct'] as const;

const hasCountryShape = (value: unknown) => {
  if (!isObject(value) || !isObject(value.launchYearByIndication) || !isObject(value.surgeryEligibility)) return false;
  if (value.launchMonthByIndication !== undefined && !isObject(value.launchMonthByIndication)) return false;
  const launches = value.launchYearByIndication;
  const eligibility = value.surgeryEligibility;
  const launchMonths = value.launchMonthByIndication;
  return ['id', 'name', 'geoName'].every((key) => typeof value[key] === 'string')
    && regionIds.includes(String(value.region))
    && accessRoutes.includes(String(value.accessRoute))
    && typeof value.enabled === 'boolean'
    && ['populationBaseYear', 'populationBase', 'populationGrowthPct', 'priceUsd', 'peakSharePct', 'loeYear', 'accessiblePopulationPct']
      .every((key) => isFiniteNumber(value[key]))
    && indicationIds.every((id) => isFiniteNumber(launches[id]) && isFiniteNumber(eligibility[id]))
    && indicationIds.every((id) => launchMonths?.[id] === undefined || isFiniteNumber(launchMonths[id]));
};

const hasIndicationShape = (value: unknown, id: string) => {
  if (!isObject(value) || !isObject(value.incidencePer100kByRegion)) return false;
  const incidence = value.incidencePer100kByRegion;
  return value.id === id
    && typeof value.name === 'string'
    && typeof value.enabled === 'boolean'
    && isFiniteNumber(value.defaultRampYears)
    && regionIds.every((region) => isFiniteNumber(incidence[region]));
};

const hasStageShape = (value: unknown) => isObject(value)
  && ['id', 'phase', 'startDate', 'endDate'].every((key) => typeof value[key] === 'string')
  && indicationIds.includes(value.indication as typeof indicationIds[number])
  && isFiniteNumber(value.publicCostUsd)
  && isFiniteNumber(value.successProbabilityPct);

const hasCorporateCostShape = (value: unknown) => isObject(value)
  && typeof value.id === 'string'
  && typeof value.label === 'string'
  && ['startYear', 'endYear', 'annualCostUsd', 'annualGrowthPct'].every((key) => isFiniteNumber(value[key]));

const hasFinancingShape = (value: unknown) => isObject(value)
  && typeof value.id === 'string'
  && typeof value.label === 'string'
  && financingTypes.includes(String(value.type))
  && isFiniteNumber(value.year)
  && isFiniteNumber(value.amountUsd);

const cloneScenarioData = (scenario: Scenario): Scenario =>
  JSON.parse(JSON.stringify(scenario)) as Scenario;

export const serializeScenario = (scenario: Scenario) => JSON.stringify({
  model: 'si053-strategic-model',
  version: MODEL_FILE_VERSION,
  exportedAt: new Date().toISOString(),
  scenario,
} satisfies ScenarioFile, null, 2);

export const parseScenario = (text: string): Scenario => {
  const parsed: unknown = JSON.parse(text);
  if (!isObject(parsed) || parsed.model !== 'si053-strategic-model' || parsed.version !== MODEL_FILE_VERSION) {
    throw new Error('This is not a compatible SI-053 scenario file.');
  }
  if (!isObject(parsed.scenario)) throw new Error('Scenario payload is missing.');

  const scenario = parsed.scenario as unknown as Scenario;
  if (
    typeof scenario.name !== 'string' ||
    typeof scenario.startYear !== 'number' ||
    typeof scenario.endYear !== 'number' ||
    !isObject(scenario.countries) ||
    !isObject(scenario.indications) ||
    !Array.isArray(scenario.developmentStages) ||
    !Array.isArray(scenario.corporateCosts) ||
    !Array.isArray(scenario.financingEvents) ||
    !isObject(scenario.financial)
  ) {
    throw new Error('Scenario file is incomplete or malformed.');
  }
  if (
    !Object.values(scenario.countries).every(hasCountryShape) ||
    !indicationIds.every((id) => hasIndicationShape(scenario.indications[id], id)) ||
    !scenario.developmentStages.every(hasStageShape) ||
    !scenario.corporateCosts.every(hasCorporateCostShape) ||
    !scenario.financingEvents.every(hasFinancingShape) ||
    !financialKeys.every((key) => isFiniteNumber(scenario.financial[key]))
  ) {
    throw new Error('Scenario file is incomplete or malformed.');
  }

  const cloned = cloneScenarioData(scenario);
  const errors = scenarioErrors(cloned);
  if (errors.length) {
    const first = errors[0];
    throw new Error(`Scenario validation failed: ${first.message}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}`);
  }

  return cloned;
};
