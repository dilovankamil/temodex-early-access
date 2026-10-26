import { baseScenario, cloneScenario } from './assumptions';
import { EUROPE_IDS } from './marketGroups';
import { ensureCompleteMarketSet } from './marketExtensions';
import type { Scenario } from './types';

const EARLY_GBM_LAUNCH_IDS = new Set(['USA', ...EUROPE_IDS]);

/**
 * Public-facing default scenario used by the application.
 *
 * Phase II ends 31 Aug 2031. The core US/Europe commercial case therefore starts
 * in November 2031, a couple of months later, with the first calendar year
 * naturally prorated by the model engine.
 */
export const createDefaultScenario = (): Scenario => {
  const scenario = ensureCompleteMarketSet(cloneScenario(baseScenario));

  // Core public footprint remains North America + Europe. Japan starts deselected.
  if (scenario.countries.JPN) scenario.countries.JPN.enabled = false;

  // Keep the headline treatment-price assumption simple and investor-readable.
  Object.values(scenario.countries)
    .filter((country) => country.enabled && country.accessRoute === 'commercial')
    .forEach((country) => { country.priceUsd = 75_000; });

  Object.values(scenario.countries).forEach((country) => {
    if (!EARLY_GBM_LAUNCH_IDS.has(country.id)) return;
    country.launchYearByIndication.gbm = 2031;
    country.launchMonthByIndication = {
      ...country.launchMonthByIndication,
      gbm: 11,
    };
  });

  return scenario;
};
