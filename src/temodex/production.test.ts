import { describe, expect, it } from 'vitest';
import { calculateModel } from '../model/calculateModel';
import { cloneScenario } from '../model/assumptions';
import { calculateProduction, defaultInputs, sourceScenario } from './production';

describe('Temodex manufacturer payment', () => {
  it('preserves the original Mexico eligible-patient calculation and applies production share once', () => {
    const original = cloneScenario(sourceScenario);
    original.startYear = 2027;
    original.endYear = 2027;
    Object.values(original.countries).forEach((country) => { country.enabled = country.id === 'MEX'; });
    const eligible = calculateModel(original).years[0].eligiblePatients;
    const row = calculateProduction({ ...defaultInputs(), years: 1 })[0];
    expect(row.eligiblePatients).toBeCloseTo(eligible, 10);
    expect(row.products).toBe(Math.round(eligible * 0.001));
    expect(row.payment).toBeCloseTo(Math.round(eligible * 0.001) * 500 * 1.2, 10);
    expect(row.payment).toBeCloseTo(row.costReimbursement + row.overhead, 10);
  });

  it('adds countries and optional indications without commercial launch gates', () => {
    const inputs = { ...defaultInputs(), indications: ['gbm', 'brainMetastasis', 'opbt'] as const };
    const combined = calculateProduction({ ...inputs, indications: [...inputs.indications], countryIds: ['MEX', 'USA'] })[0];
    const mexico = calculateProduction({ ...inputs, indications: [...inputs.indications] })[0];
    const usa = calculateProduction({ ...inputs, indications: [...inputs.indications], countryIds: ['USA'] })[0];
    expect(combined.payment).toBeCloseTo(mexico.payment + usa.payment, 10);
    expect(mexico.eligiblePatients).toBeGreaterThan(calculateProduction(defaultInputs())[0].eligiblePatients);
    expect(combined.payment).toBeGreaterThan(0);
  });

  it('uses a markup on COGS, not a margin on payment, and scales products per patient', () => {
    const base = calculateProduction(defaultInputs())[0];
    const row = calculateProduction({ ...defaultInputs(), overheadPct: 25, unitsPerPatient: 2 })[0];
    expect(row.costReimbursement).toBeCloseTo(Math.round(base.suppliedPatients * 2) * 500, 10);
    expect(row.overhead).toBeCloseTo(row.costReimbursement * 0.25, 10);
    expect(row.overhead / row.payment).toBeCloseTo(0.2, 10);
  });

  it('rounds products per country before summing and uses those quantities for payment', () => {
    const result = calculateProduction({ ...defaultInputs(), countryIds: ['MEX', 'USA', 'SWE'], coveragePct: 0.1 });
    for (const year of result) {
      expect(Number.isInteger(year.products)).toBe(true);
      expect(year.products).toBe(year.countries.reduce((sum, row) => sum + row.products, 0));
      for (const row of year.countries) {
        expect(row.products).toBe(Math.round(row.suppliedPatients));
        expect(row.costReimbursement).toBe(row.products * 500);
        expect(row.payment).toBeCloseTo(row.products * 600, 10);
      }
    }
  });

  it('caps scale-up at eligible patients and never produces negative or nonfinite receipts', () => {
    const scaled = calculateProduction({ ...defaultInputs(), coveragePct: 50, annualScalePct: 100 });
    expect(scaled[1].coveragePct).toBe(100);
    expect(scaled[9].suppliedPatients).toBeCloseTo(scaled[9].eligiblePatients, 10);
    expect(calculateProduction({ ...defaultInputs(), countryIds: [] })[0].payment).toBe(0);
    expect(calculateProduction({ ...defaultInputs(), indications: [] })[0].payment).toBe(0);
    expect(calculateProduction({ ...defaultInputs(), cogs: -50, coveragePct: NaN })[0].payment).toBe(0);
  });
});
