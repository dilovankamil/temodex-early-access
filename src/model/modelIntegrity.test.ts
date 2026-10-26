import { describe, expect, it } from 'vitest';
import { calculateModel } from './calculateModel';
import { createDefaultScenario } from './defaultScenario';
import { EUROPE_IDS } from './marketGroups';
import { isPreLaunchDevelopmentStage } from './timing';
import { scenarioErrors } from './validation';

const close = (left: number, right: number) =>
  Math.abs(left - right) <= Math.max(0.000001, Math.abs(right) * 0.000001);

describe('public model integrity', () => {
  it('ships a valid 33-market base case with the documented launch and price assumptions', () => {
    const scenario = createDefaultScenario();
    const enabled = Object.values(scenario.countries).filter((country) => country.enabled && country.accessRoute === 'commercial');
    expect(scenarioErrors(scenario)).toEqual([]);
    expect(enabled).toHaveLength(33);
    expect(scenario.countries.JPN.enabled).toBe(false);
    enabled.forEach((country) => expect(country.priceUsd).toBe(75_000));
    ['USA', ...EUROPE_IDS].forEach((countryId) => {
      const country = scenario.countries[countryId];
      expect(country.launchYearByIndication.gbm).toBe(2031);
      expect(country.launchMonthByIndication?.gbm).toBe(11);
    });
    expect(scenario.countries.CAN.launchYearByIndication.gbm).toBe(2032);
    expect(scenario.countries.MEX.launchYearByIndication.gbm).toBe(2033);
  });

  it('counts each enabled development budget once', () => {
    const scenario = createDefaultScenario();
    const result = calculateModel(scenario);
    const configured = scenario.developmentStages
      .filter((stage) => scenario.indications[stage.indication].enabled)
      .reduce((sum, stage) => sum + stage.publicCostUsd, 0);
    const modeled = result.years.reduce((sum, year) => sum + year.developmentCostsUsd, 0);
    expect(close(modeled, configured)).toBe(true);
  });

  it('keeps treated volume within the eligible funnel and revenue at zero before launch', () => {
    const scenario = createDefaultScenario();
    const result = calculateModel(scenario);
    result.countryYears.forEach((row) => {
      const country = scenario.countries[row.countryId];
      expect(row.treatedPatients).toBeLessThanOrEqual(row.eligiblePatients + 0.000001);
      expect(close(row.cogsUsd, row.treatedPatients * scenario.financial.cogsPerTreatmentUsd)).toBe(true);
      if (row.year < country.launchYearByIndication.gbm) {
        expect(row.treatedPatients).toBe(0);
        expect(row.grossRevenueUsd).toBe(0);
      }
    });
  });

  it('converges from peak share to eligible patients after the adoption ramp', () => {
    const scenario = createDefaultScenario();
    Object.values(scenario.countries).forEach((country) => { country.enabled = country.id === 'USA'; });
    scenario.countries.USA.peakSharePct = 100;
    scenario.countries.USA.launchYearByIndication.gbm = scenario.startYear;
    scenario.countries.USA.launchMonthByIndication = { ...scenario.countries.USA.launchMonthByIndication, gbm: 1 };
    const matureYear = scenario.startYear + scenario.indications.gbm.defaultRampYears - 1;
    const row = calculateModel(scenario).countryYears.find((item) => item.countryId === 'USA' && item.year === matureYear);
    expect(row).toBeDefined();
    expect(close(row?.accessibleCases ?? 0, row?.incidentCases ?? 0)).toBe(true);
    expect(close(row?.treatedPatients ?? 0, row?.eligiblePatients ?? 0)).toBe(true);
  });

  it('does not let a disabled market change the commercialization gate', () => {
    const baselineScenario = createDefaultScenario();
    const baseline = calculateModel(baselineScenario).valuation.commercializationSuccessPctByIndication.gbm;
    baselineScenario.countries.JPN.enabled = false;
    baselineScenario.countries.JPN.launchYearByIndication.gbm = baselineScenario.startYear;
    const changed = calculateModel(baselineScenario).valuation.commercializationSuccessPctByIndication.gbm;
    expect(changed).toBe(baseline);
  });

  it('classifies stages against the earliest enabled launch month', () => {
    const scenario = createDefaultScenario();
    const phase2 = scenario.developmentStages.find((stage) => stage.id === 'gbm-p2');
    const confirmatory = scenario.developmentStages.find((stage) => stage.id === 'gbm-p3');
    expect(phase2).toBeDefined();
    expect(confirmatory).toBeDefined();
    expect(isPreLaunchDevelopmentStage(scenario, phase2!)).toBe(true);
    expect(isPreLaunchDevelopmentStage(scenario, confirmatory!)).toBe(false);

    scenario.countries.USA.enabled = false;
    scenario.countries.JPN.enabled = true;
    scenario.countries.JPN.launchYearByIndication.gbm = 2030;
    scenario.countries.JPN.launchMonthByIndication = { ...scenario.countries.JPN.launchMonthByIndication, gbm: 1 };
    expect(isPreLaunchDevelopmentStage(scenario, phase2!)).toBe(false);
  });

  it('reconciles every annual portfolio total to its country rows', () => {
    const result = calculateModel(createDefaultScenario());
    result.years.forEach((year) => {
      const rows = result.countryYears.filter((row) => row.year === year.year);
      expect(close(year.grossRevenueUsd, rows.reduce((sum, row) => sum + row.grossRevenueUsd, 0))).toBe(true);
      expect(close(year.cogsUsd, rows.reduce((sum, row) => sum + row.cogsUsd, 0))).toBe(true);
      expect(close(year.commercialOpexUsd, rows.reduce((sum, row) => sum + row.commercialOpexUsd, 0))).toBe(true);
      expect(close(year.eligiblePatients, rows.reduce((sum, row) => sum + row.eligiblePatients, 0))).toBe(true);
      expect(close(year.treatedPatients, rows.reduce((sum, row) => sum + row.treatedPatients, 0))).toBe(true);
    });
  });

  it('prorates a November launch to two months of first-ramp adoption', () => {
    const scenario = createDefaultScenario();
    Object.values(scenario.countries).forEach((country) => { country.enabled = country.id === 'USA'; });
    const row = calculateModel(scenario).countryYears.find((item) => item.countryId === 'USA' && item.year === 2031);
    expect(row).toBeDefined();
    const firstRampShare = scenario.countries.USA.peakSharePct / 100 / scenario.indications.gbm.defaultRampYears;
    const expectedTreated = (row?.eligiblePatients ?? 0) * firstRampShare * 2 / 12;
    expect(close(row?.treatedPatients ?? 0, expectedTreated)).toBe(true);
    expect(close(row?.grossRevenueUsd ?? 0, expectedTreated * scenario.countries.USA.priceUsd)).toBe(true);
  });

  it('remains finite with no commercial markets and with the full expansion footprint', () => {
    const noMarkets = createDefaultScenario();
    Object.values(noMarkets.countries).forEach((country) => { country.enabled = false; });
    const emptyResult = calculateModel(noMarkets);
    expect(emptyResult.cumulativeRevenueUsd).toBe(0);
    expect(emptyResult.years.every((year) => Object.values(year).filter((value) => typeof value === 'number').every(Number.isFinite))).toBe(true);

    const expansion = createDefaultScenario();
    Object.values(expansion.countries).forEach((country) => { country.enabled = true; country.peakSharePct = 100; });
    Object.values(expansion.indications).forEach((indication) => { indication.enabled = true; });
    const expansionResult = calculateModel(expansion);
    expect(Number.isFinite(expansionResult.valuation.riskAdjustedNpvUsd)).toBe(true);
    expect(expansionResult.countryYears.every((row) => row.treatedPatients <= row.eligiblePatients + 0.000001)).toBe(true);
  });
});
