import { cloneScenario } from './assumptions';
import { createDefaultScenario } from './defaultScenario';
import type { Scenario } from './types';

const mapCountries = (scenario: Scenario, fn: (country: Scenario['countries'][keyof Scenario['countries']]) => void) => {
  Object.values(scenario.countries).forEach(fn);
};

export type ScenarioPresetId = 'conservative' | 'base' | 'expansion';

export const buildScenarioPresets = (): Record<ScenarioPresetId, Scenario> => {
  const base = createDefaultScenario();
  const conservative = cloneScenario(base);
  conservative.name = 'Conservative';
  conservative.erosionPct = 25;
  conservative.financial.discountRatePct = 12.5;
  conservative.financial.riskAdjustmentPct = 85;
  mapCountries(conservative, (country) => {
    country.peakSharePct = Math.max(8, country.peakSharePct * 0.6);
    country.priceUsd *= 0.8;
    country.launchYearByIndication.gbm += 2;
    country.launchYearByIndication.brainMetastasis += 2;
    country.launchYearByIndication.opbt += 2;
  });

  const expansion = cloneScenario(base);
  expansion.name = 'Expansion';
  expansion.indications.brainMetastasis.enabled = true;
  expansion.indications.opbt.enabled = true;
  expansion.patentExtensionYears = 2;
  expansion.financial.riskAdjustmentPct = 100;
  mapCountries(expansion, (country) => {
    if (country.accessRoute === 'commercial') {
      country.enabled = true;
      country.peakSharePct = Math.min(45, country.peakSharePct + 10);
    }
  });

  return { conservative, base, expansion };
};
