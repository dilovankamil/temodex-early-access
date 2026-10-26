import { describe, expect, it } from 'vitest';
import { baseScenario, cloneScenario } from './assumptions';
import { parseScenario, serializeScenario } from './scenarioIO';
import { validateScenario } from './validation';
import { buildScenarioPresets } from './scenarios';

describe('scenario validation', () => {
  it('accepts the committed base scenario without fatal errors', () => {
    const errors = validateScenario(baseScenario).filter((issue) => issue.level === 'error');
    expect(errors).toHaveLength(0);
  });

  it('does not warn when confirmatory Phase III overlaps modeled commercial launch', () => {
    const issues = validateScenario(baseScenario);
    expect(issues.some((issue) => issue.code === 'launch-before-commercial-gate')).toBe(false);
  });

  it('warns when commercial launch is not after the pre-launch gate', () => {
    const scenario = cloneScenario(baseScenario);
    scenario.countries.USA.launchYearByIndication.gbm = 2031;
    const issues = validateScenario(scenario);
    expect(issues.some((issue) => issue.code === 'launch-before-commercial-gate' && issue.level === 'warning')).toBe(true);
  });

  it('flags LoE before launch', () => {
    const scenario = cloneScenario(baseScenario);
    scenario.countries.USA.loeYear = 2028;
    const issues = validateScenario(scenario);
    expect(issues.some((issue) => issue.code === 'loe-before-launch' && issue.level === 'error')).toBe(true);
  });

  it('flags out-of-range patient access', () => {
    const scenario = cloneScenario(baseScenario);
    scenario.countries.USA.accessiblePopulationPct = 120;
    expect(validateScenario(scenario).some((issue) => issue.code === 'invalid-accessible-population')).toBe(true);
  });

  it('rejects a structurally valid imported scenario with fatal modelling errors', () => {
    const scenario = cloneScenario(baseScenario);
    scenario.financial.corporateTaxPct = 150;
    expect(() => parseScenario(serializeScenario(scenario))).toThrow(/validation failed/i);
  });

  it('rejects incomplete nested country data before it reaches the calculation engine', () => {
    const file = JSON.parse(serializeScenario(baseScenario)) as { scenario: { countries: Record<string, Record<string, unknown>> } };
    delete file.scenario.countries.USA.launchYearByIndication;
    expect(() => parseScenario(JSON.stringify(file))).toThrow(/incomplete or malformed/i);
  });

  it('rejects pathological forecast horizons and non-finite private assumptions', () => {
    const scenario = cloneScenario(baseScenario);
    scenario.endYear = scenario.startYear + 101;
    expect(validateScenario(scenario).some((issue) => issue.code === 'invalid-horizon' && issue.level === 'error')).toBe(true);

    scenario.endYear = baseScenario.endYear;
    scenario.corporateCosts.push({ id: 'bad-growth', label: 'Bad growth', startYear: 2027, endYear: 2028, annualCostUsd: 1, annualGrowthPct: 1_000 });
    expect(validateScenario(scenario).some((issue) => issue.code === 'invalid-corporate-growth' && issue.level === 'error')).toBe(true);
  });

  it('flags provisional indication epidemiology when expansion indications are active', () => {
    const issues = validateScenario(buildScenarioPresets().expansion);
    const proxyIndications = issues.filter((issue) => issue.code === 'proxy-indication');
    expect(proxyIndications.some((issue) => issue.path === 'indications.brainMetastasis')).toBe(true);
    expect(proxyIndications.some((issue) => issue.path === 'indications.opbt')).toBe(true);
  });
});
