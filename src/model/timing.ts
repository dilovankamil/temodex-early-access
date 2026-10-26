import type { CountryAssumption, DevelopmentStage, IndicationId, Scenario } from './types';

export const monthIndex = (year: number, month: number) => year * 12 + month - 1;

export const commercialLaunchIndex = (country: CountryAssumption, indication: IndicationId) =>
  monthIndex(country.launchYearByIndication[indication], country.launchMonthByIndication?.[indication] ?? 1);

export const developmentStageEndIndex = (stage: DevelopmentStage) => {
  const end = new Date(`${stage.endDate}T00:00:00Z`);
  return monthIndex(end.getUTCFullYear(), end.getUTCMonth() + 1);
};

export const earliestCommercialLaunchIndex = (scenario: Scenario, indication: IndicationId) => {
  const launches = Object.values(scenario.countries)
    .filter((country) => country.enabled && country.accessRoute === 'commercial')
    .map((country) => commercialLaunchIndex(country, indication));
  return launches.length ? Math.min(...launches) : monthIndex(scenario.endYear + 1, 1);
};

export const isPreLaunchDevelopmentStage = (scenario: Scenario, stage: DevelopmentStage) =>
  developmentStageEndIndex(stage) < earliestCommercialLaunchIndex(scenario, stage.indication);
