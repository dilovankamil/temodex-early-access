import type { IndicationId, Scenario } from './types';

export type ValidationLevel = 'error' | 'warning';

export interface ValidationIssue {
  level: ValidationLevel;
  code: string;
  path: string;
  message: string;
}

const indicationIds: IndicationId[] = ['gbm', 'brainMetastasis', 'opbt'];
const finite = (value: number) => Number.isFinite(value);
const inRange = (value: number, min: number, max: number) => finite(value) && value >= min && value <= max;
const isConfirmatoryStage = (phase: string) => /confirmatory/i.test(phase);
const monthName = (month: number) => new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, month - 1, 1)));

export const validateScenario = (scenario: Scenario): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const add = (level: ValidationLevel, code: string, path: string, message: string) =>
    issues.push({ level, code, path, message });

  if (
    !Number.isInteger(scenario.startYear) ||
    !Number.isInteger(scenario.endYear) ||
    scenario.startYear > scenario.endYear ||
    scenario.startYear < 1900 ||
    scenario.endYear > 2200 ||
    scenario.endYear - scenario.startYear > 100
  ) {
    add('error', 'invalid-horizon', 'startYear/endYear', 'Model years must be integers from 1900 to 2200 with a forecast horizon no longer than 100 years.');
  }
  if (!inRange(scenario.erosionPct, 0, 100)) add('error', 'invalid-erosion', 'erosionPct', 'Post-LoE erosion must be between 0% and 100%.');
  if (!inRange(scenario.patentExtensionYears, 0, 30)) add('error', 'invalid-patent-extension', 'patentExtensionYears', 'Patent extension must be between 0 and 30 years.');

  const countries = Object.values(scenario.countries);
  if (!countries.length) add('error', 'no-countries', 'countries', 'Scenario must contain at least one country.');
  if (!countries.some((country) => country.enabled)) add('warning', 'no-enabled-countries', 'countries', 'No country is enabled, so commercial revenue will be zero.');

  for (const country of countries) {
    const base = `countries.${country.id}`;
    if (!finite(country.populationBase) || country.populationBase <= 0) add('error', 'invalid-population', `${base}.populationBase`, `${country.name}: population must be greater than zero.`);
    if (!finite(country.populationGrowthPct) || country.populationGrowthPct <= -100 || country.populationGrowthPct > 20) add('error', 'invalid-population-growth', `${base}.populationGrowthPct`, `${country.name}: population growth is outside the supported range (-100%, 20%].`);
    if (!inRange(country.accessiblePopulationPct, 0, 100)) add('error', 'invalid-accessible-population', `${base}.accessiblePopulationPct`, `${country.name}: accessible population must be between 0% and 100%.`);
    if (!inRange(country.peakSharePct, 0, 100)) add('error', 'invalid-peak-share', `${base}.peakSharePct`, `${country.name}: peak market share must be between 0% and 100%.`);
    if (!finite(country.priceUsd) || country.priceUsd < 0) add('error', 'invalid-price', `${base}.priceUsd`, `${country.name}: price cannot be negative.`);
    if (!Number.isInteger(country.loeYear)) add('error', 'invalid-loe', `${base}.loeYear`, `${country.name}: LoE must be an integer year.`);

    for (const indication of indicationIds) {
      const launch = country.launchYearByIndication[indication];
      const month = country.launchMonthByIndication?.[indication] ?? 1;
      const eligibility = country.surgeryEligibility[indication];
      if (!Number.isInteger(launch)) add('error', 'invalid-launch-year', `${base}.launchYearByIndication.${indication}`, `${country.name}: ${indication} launch year must be an integer.`);
      if (!Number.isInteger(month) || month < 1 || month > 12) add('error', 'invalid-launch-month', `${base}.launchMonthByIndication.${indication}`, `${country.name}: ${indication} launch month must be an integer from 1 to 12.`);
      if (!inRange(eligibility, 0, 1)) add('error', 'invalid-surgery-eligibility', `${base}.surgeryEligibility.${indication}`, `${country.name}: ${indication} surgery eligibility must be between 0 and 1.`);
      if (Number.isInteger(launch) && country.loeYear < launch) add('error', 'loe-before-launch', `${base}.loeYear`, `${country.name}: LoE (${country.loeYear}) occurs before ${indication} launch (${launch}).`);
    }

    if (country.assumptionStatus === 'proxy') {
      add('warning', 'proxy-market', base, `${country.name} uses proxy assumptions and requires country-specific validation before external use.`);
    }
  }

  for (const indication of Object.values(scenario.indications)) {
    if (!inRange(indication.defaultRampYears, 1, 30)) add('error', 'invalid-ramp', `indications.${indication.id}.defaultRampYears`, `${indication.name}: adoption ramp must be between 1 and 30 years.`);
    for (const [region, incidence] of Object.entries(indication.incidencePer100kByRegion)) {
      if (!finite(incidence) || incidence < 0) add('error', 'invalid-incidence', `indications.${indication.id}.incidencePer100kByRegion.${region}`, `${indication.name}: incidence cannot be negative.`);
    }
    if (indication.enabled && (indication.assumptionStatus === 'proxy' || indication.id !== 'gbm')) {
      add('warning', 'proxy-indication', `indications.${indication.id}`, `${indication.name} uses provisional epidemiology or eligibility assumptions and requires validation before external quantitative use.`);
    }
  }
  if (!Object.values(scenario.indications).some((indication) => indication.enabled)) add('warning', 'no-enabled-indications', 'indications', 'No indication is enabled, so commercial revenue will be zero.');

  for (const stage of scenario.developmentStages) {
    const base = `developmentStages.${stage.id}`;
    const start = Date.parse(`${stage.startDate}T00:00:00Z`);
    const end = Date.parse(`${stage.endDate}T00:00:00Z`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) add('error', 'invalid-stage-dates', base, `${stage.phase}: development stage dates are invalid.`);
    if (!finite(stage.publicCostUsd) || stage.publicCostUsd < 0) add('error', 'invalid-stage-cost', `${base}.publicCostUsd`, `${stage.phase}: development cost cannot be negative.`);
    if (!inRange(stage.successProbabilityPct, 0, 100)) add('error', 'invalid-stage-probability', `${base}.successProbabilityPct`, `${stage.phase}: success probability must be between 0% and 100%.`);
  }

  for (const cost of scenario.corporateCosts) {
    if (!Number.isInteger(cost.startYear) || !Number.isInteger(cost.endYear) || cost.startYear > cost.endYear) add('error', 'invalid-corporate-cost-dates', `corporateCosts.${cost.id}`, `${cost.label}: cost period is invalid.`);
    if (!finite(cost.annualCostUsd) || cost.annualCostUsd < 0) add('error', 'invalid-corporate-cost', `corporateCosts.${cost.id}.annualCostUsd`, `${cost.label}: annual cost cannot be negative.`);
    if (!finite(cost.annualGrowthPct) || cost.annualGrowthPct <= -100 || cost.annualGrowthPct > 100) add('error', 'invalid-corporate-growth', `corporateCosts.${cost.id}.annualGrowthPct`, `${cost.label}: annual growth is outside the supported range (-100%, 100%].`);
  }

  for (const event of scenario.financingEvents) {
    if (!Number.isInteger(event.year)) add('error', 'invalid-financing-year', `financingEvents.${event.id}.year`, `${event.label}: financing year must be an integer.`);
    if (!finite(event.amountUsd)) add('error', 'invalid-financing-amount', `financingEvents.${event.id}.amountUsd`, `${event.label}: financing amount must be finite.`);
  }

  if (!inRange(scenario.financial.cogsPerTreatmentUsd, 0, 1_000_000)) add('error', 'invalid-cogs', 'financial.cogsPerTreatmentUsd', 'COGS per treatment is outside the supported range.');
  if (!inRange(scenario.financial.commercialOpexPct, 0, 100)) add('error', 'invalid-commercial-opex', 'financial.commercialOpexPct', 'Commercial OpEx must be between 0% and 100%.');
  if (!inRange(scenario.financial.corporateTaxPct, 0, 100)) add('error', 'invalid-tax', 'financial.corporateTaxPct', 'Corporate tax must be between 0% and 100%.');
  if (!inRange(scenario.financial.riskAdjustmentPct, 0, 100)) add('error', 'invalid-risk-adjustment', 'financial.riskAdjustmentPct', 'Additional risk multiplier must be between 0% and 100%.');
  if (!finite(scenario.financial.discountRatePct) || scenario.financial.discountRatePct <= -100 || scenario.financial.discountRatePct > 100) add('error', 'invalid-discount-rate', 'financial.discountRatePct', 'Discount rate is outside the supported range (-100%, 100%].');

  // Commercial launch is compared with the last non-confirmatory stage. A study explicitly
  // designated "Confirmatory" may overlap the post-launch period without creating a timing warning.
  for (const indication of indicationIds) {
    if (!scenario.indications[indication]?.enabled) continue;
    const gateStages = scenario.developmentStages
      .filter((stage) => stage.indication === indication && !isConfirmatoryStage(stage.phase));
    if (!gateStages.length) continue;
    const gateEnd = Math.max(...gateStages.map((stage) => Date.parse(`${stage.endDate}T23:59:59Z`)));
    for (const country of countries.filter((item) => item.enabled && item.accessRoute === 'commercial')) {
      const launchYear = country.launchYearByIndication[indication];
      const launchMonthValue = country.launchMonthByIndication?.[indication] ?? 1;
      const launchDate = Date.UTC(launchYear, launchMonthValue - 1, 1);
      if (launchDate <= gateEnd) {
        add('warning', 'launch-before-commercial-gate', `countries.${country.id}.launchYearByIndication.${indication}`, `${country.name}: ${indication} launch (${monthName(launchMonthValue)} ${launchYear}) is not after the configured pre-launch programme gate.`);
      }
    }
  }

  return issues;
};

export const scenarioErrors = (scenario: Scenario) => validateScenario(scenario).filter((issue) => issue.level === 'error');
