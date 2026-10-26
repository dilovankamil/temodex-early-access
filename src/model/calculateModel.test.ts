import { describe, expect, it } from 'vitest';
import { baseScenario, cloneScenario } from './assumptions';
import { calculateModel } from './calculateModel';
import { createDefaultScenario } from './defaultScenario';
import { parseScenario, serializeScenario } from './scenarioIO';
import { buildScenarioPresets } from './scenarios';
import { EU27_IDS } from './marketGroups';

const approx = (value: number, target: number, pct = 0.01) =>
  Math.abs(value - target) <= Math.max(1, Math.abs(target) * pct);

describe('calculateModel', () => {
  it('starts core GBM commercialization in November 2031 after Phase II', () => {
    const scenario = createDefaultScenario();
    expect(scenario.countries.USA.launchYearByIndication.gbm).toBe(2031);
    expect(scenario.countries.USA.launchMonthByIndication?.gbm).toBe(11);
    const result = calculateModel(scenario);
    expect(result.years.find((row) => row.year === 2030)?.grossRevenueUsd).toBe(0);
    expect(result.years.find((row) => row.year === 2031)?.grossRevenueUsd ?? 0).toBeGreaterThan(0);
    expect(result.years.find((row) => row.year === 2031)?.grossRevenueUsd ?? 0)
      .toBeLessThan(result.years.find((row) => row.year === 2032)?.grossRevenueUsd ?? 0);
  });

  it('keeps the cleaned default footprint and headline price simple', () => {
    const scenario = createDefaultScenario();
    expect(scenario.countries.JPN.enabled).toBe(false);
    const active = Object.values(scenario.countries).filter((country) => country.enabled && country.accessRoute === 'commercial');
    expect(active.length).toBeGreaterThan(0);
    expect(active.every((country) => country.priceUsd === 75_000)).toBe(true);
  });

  it('does not repeat company development costs for every country', () => {
    const scenario = createDefaultScenario();
    const oneCountry = cloneScenario(scenario);
    Object.values(oneCountry.countries).forEach((country) => { country.enabled = country.id === 'USA'; });
    const all = calculateModel(scenario);
    const one = calculateModel(oneCountry);
    const year = 2030;
    expect(all.years.find((row) => row.year === year)?.developmentCostsUsd)
      .toBe(one.years.find((row) => row.year === year)?.developmentCostsUsd);
  });

  it('models the full EU27 population close to the Eurostat 2026 total', () => {
    const result = calculateModel(createDefaultScenario());
    const euPopulation = result.countryYears
      .filter((row) => row.year === 2026 && EU27_IDS.includes(row.countryId))
      .reduce((sum, row) => sum + row.population, 0);
    expect(approx(euPopulation, 451_990_300, 0.002)).toBe(true);
  });

  it('separates the eligible surgical opportunity from treated adoption', () => {
    const result = calculateModel(createDefaultScenario());
    expect(result.peakEligiblePatients).toBeGreaterThan(result.peakTreatedPatients);
    expect(result.peakEligiblePatients).toBeGreaterThan(25_000);
  });

  it('expansion case can exceed 25,000 annual treated patients without inflating the GBM-only base share', () => {
    const expansion = buildScenarioPresets().expansion;
    const result = calculateModel(expansion);
    expect(result.peakTreatedPatients).toBeGreaterThan(25_000);
  });

  it('keeps India at zero before its commercial launch even when enabled', () => {
    const scenario = createDefaultScenario();
    scenario.countries.IND.enabled = true;
    const result = calculateModel(scenario);
    const india2030 = result.countryYears.find((row) => row.countryId === 'IND' && row.year === 2030);
    expect(india2030?.treatedPatients ?? 0).toBe(0);
    expect(india2030?.grossRevenueUsd ?? 0).toBe(0);
  });

  it('makes China selection economically active when the market is enabled', () => {
    const baselineScenario = createDefaultScenario();
    const withoutChina = calculateModel(baselineScenario);
    const scenario = cloneScenario(baselineScenario);
    scenario.countries.CHN.enabled = true;
    const withChina = calculateModel(scenario);
    expect(scenario.countries.CHN.accessRoute).toBe('commercial');
    expect(withChina.cumulativeRevenueUsd).toBeGreaterThan(withoutChina.cumulativeRevenueUsd);
    expect(withChina.countryYears.some((row) => row.countryId === 'CHN' && row.grossRevenueUsd > 0)).toBe(true);
  });

  it('uses only pre-launch stages for commercialization probability', () => {
    const result = calculateModel(createDefaultScenario());
    expect(approx(result.valuation.commercializationSuccessPctByIndication.gbm, 70, 0.001)).toBe(true);
    expect(result.valuation.riskAdjustedNpvUsd).toBeLessThan(result.valuation.npvUsd);
  });

  it('does not make confirmatory Phase III an extra barrier to initial sales', () => {
    const scenario = createDefaultScenario();
    const phase3 = scenario.developmentStages.find((stage) => stage.id === 'gbm-p3');
    if (!phase3) throw new Error('GBM Phase III missing');
    phase3.successProbabilityPct = 5;
    const result = calculateModel(scenario);
    expect(approx(result.valuation.commercializationSuccessPctByIndication.gbm, 70, 0.001)).toBe(true);
  });

  it('weights later-stage development cost by probability of reaching that stage', () => {
    const scenario = createDefaultScenario();
    scenario.financial.riskAdjustmentPct = 100;
    Object.values(scenario.countries).forEach((country) => { country.enabled = false; });
    const result = calculateModel(scenario);
    const phase3Year = result.years.find((row) => row.year === 2032);
    expect(phase3Year?.riskAdjustedNetCashFlowUsd ?? 0).toBeGreaterThan(phase3Year?.netCashFlowUsd ?? 0);
  });

  it('supports explicitly marked imported proxy markets without a separate access module', () => {
    const scenario = createDefaultScenario();
    scenario.countries.TEST = {
      ...cloneScenario(baseScenario).countries.CAN,
      id: 'TEST', name: 'Test market', geoName: 'Test market', region: 'Europe',
      populationBaseYear: 2025, populationBase: 5_600_000, populationGrowthPct: 0.7,
      enabled: true, priceUsd: 60_000, peakSharePct: 20,
      launchYearByIndication: { gbm: 2032, brainMetastasis: 2034, opbt: 2034 },
      assumptionStatus: 'proxy', assumptionNote: 'Imported planning proxy.',
    };
    const result = calculateModel(scenario);
    expect(scenario.countries.TEST.assumptionStatus).toBe('proxy');
    expect(result.countryYears.some((row) => row.countryId === 'TEST')).toBe(true);
  });

  it('returns finite valuation outputs without a perpetual terminal value', () => {
    const result = calculateModel(createDefaultScenario());
    expect(Number.isFinite(result.valuation.npvUsd)).toBe(true);
    expect(Number.isFinite(result.valuation.riskAdjustedNpvUsd)).toBe(true);
  });

  it('keeps financing separate from asset NPV while adding it to cash balance', () => {
    const scenario = createDefaultScenario();
    const baseline = calculateModel(scenario);
    scenario.financingEvents.push({ id: 'test-funding', label: 'Test funding', year: 2028, amountUsd: 50_000_000, type: 'equity' });
    const funded = calculateModel(scenario);
    expect(funded.valuation.npvUsd).toBe(baseline.valuation.npvUsd);
    expect(approx(funded.endingCashBalanceUsd - baseline.endingCashBalanceUsd, 50_000_000)).toBe(true);
  });

  it('includes private corporate costs in cash flow and valuation when loaded', () => {
    const scenario = createDefaultScenario();
    const baseline = calculateModel(scenario);
    scenario.corporateCosts.push({ id: 'private-opex', label: 'Private OpEx', startYear: 2028, endYear: 2028, annualCostUsd: 10_000_000, annualGrowthPct: 0 });
    const withCost = calculateModel(scenario);
    expect(withCost.years.find((row) => row.year === 2028)?.corporateCostsUsd).toBe(10_000_000);
    expect(withCost.valuation.npvUsd).toBeLessThan(baseline.valuation.npvUsd);
  });

  it('round-trips month-specific scenario export/import files', () => {
    const scenario = createDefaultScenario();
    const parsed = parseScenario(serializeScenario(scenario));
    expect(parsed.name).toBe(scenario.name);
    expect(parsed.countries.USA.priceUsd).toBe(scenario.countries.USA.priceUsd);
    expect(parsed.countries.USA.launchMonthByIndication?.gbm).toBe(11);
  });
});
