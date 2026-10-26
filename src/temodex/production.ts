import { createDefaultScenario } from '../model/defaultScenario';
import type { CountryAssumption, IndicationId } from '../model/types';

export const sourceScenario = createDefaultScenario();
export const countries = Object.values(sourceScenario.countries).sort((a, b) => a.name.localeCompare(b.name));
export const indicationIds: IndicationId[] = ['gbm', 'brainMetastasis', 'opbt'];

export interface PatientInputs {
  population: number;
  baseYear: number;
  growthPct: number;
  accessPct: number;
  incidence: Record<IndicationId, number>;
  surgeryPct: Record<IndicationId, number>;
}

export interface ProductionInputs {
  cogs: number;
  overheadPct: number;
  coveragePct: number;
  annualScalePct: number;
  unitsPerPatient: number;
  startYear: number;
  years: number;
  countryIds: string[];
  indications: IndicationId[];
  patientOverrides: Record<string, PatientInputs>;
}

export interface ProductionRow {
  countryId: string;
  year: number;
  population: number;
  incidentPatients: number;
  eligiblePatients: number;
  suppliedPatients: number;
  products: number;
  costReimbursement: number;
  overhead: number;
  payment: number;
}

export interface ProductionYear extends Omit<ProductionRow, 'countryId'> {
  coveragePct: number;
  countries: ProductionRow[];
}

export function patientInputs(country: CountryAssumption): PatientInputs {
  return {
    population: country.populationBase,
    baseYear: country.populationBaseYear,
    growthPct: country.populationGrowthPct,
    accessPct: country.accessiblePopulationPct,
    incidence: Object.fromEntries(indicationIds.map((id) => [id, sourceScenario.indications[id].incidencePer100kByRegion[country.region]])) as Record<IndicationId, number>,
    surgeryPct: Object.fromEntries(indicationIds.map((id) => [id, country.surgeryEligibility[id] * 100])) as Record<IndicationId, number>,
  };
}

export const defaultInputs = (): ProductionInputs => ({
  cogs: sourceScenario.financial.cogsPerTreatmentUsd,
  overheadPct: 20,
  coveragePct: 0.1,
  annualScalePct: 0,
  unitsPerPatient: 1,
  startYear: 2027,
  years: 10,
  countryIds: ['MEX'],
  indications: ['gbm'],
  patientOverrides: {},
});

const finite = (value: number, min = 0, max = Number.MAX_VALUE) => Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
const pct = (value: number) => finite(value, 0, 100) / 100;

/** Manufacturer receipts, independent of the original asset's price, launch, adoption and valuation. */
export function calculateProduction(inputs: ProductionInputs): ProductionYear[] {
  const selectedCountries = [...new Set(inputs.countryIds)].flatMap((id) => sourceScenario.countries[id] ? [sourceScenario.countries[id]] : []);
  const selectedIndications = [...new Set(inputs.indications)].filter((id) => indicationIds.includes(id));
  const cogs = finite(inputs.cogs);
  const overheadRate = finite(inputs.overheadPct) / 100;
  const startYear = Math.round(finite(inputs.startYear, 2026, 2100));
  const horizon = Math.round(finite(inputs.years, 1, 30));
  return Array.from({ length: horizon }, (_, index) => {
    const year = startYear + index;
    const coveragePct = Math.min(100, finite(inputs.coveragePct, 0, 100) * Math.pow(1 + finite(inputs.annualScalePct, 0, 1000) / 100, index));
    const rows = selectedCountries.map((country): ProductionRow => {
      const patient = inputs.patientOverrides[country.id] ?? patientInputs(country);
      const population = finite(patient.population) * Math.pow(1 + finite(patient.growthPct, -10, 20) / 100, year - patient.baseYear);
      let incidentPatients = 0;
      let eligiblePatients = 0;
      selectedIndications.forEach((id) => {
        const incident = population * finite(patient.incidence[id]) / 100_000;
        incidentPatients += incident;
        eligiblePatients += incident * pct(patient.accessPct) * pct(patient.surgeryPct[id]);
      });
      const suppliedPatients = eligiblePatients * coveragePct / 100;
      const products = Math.round(suppliedPatients * finite(inputs.unitsPerPatient, 0, 1000));
      const costReimbursement = products * cogs;
      const overhead = costReimbursement * overheadRate;
      return { countryId: country.id, year, population, incidentPatients, eligiblePatients, suppliedPatients, products, costReimbursement, overhead, payment: costReimbursement + overhead };
    });
    const total = rows.reduce((sum, row) => ({
      population: sum.population + row.population,
      incidentPatients: sum.incidentPatients + row.incidentPatients,
      eligiblePatients: sum.eligiblePatients + row.eligiblePatients,
      suppliedPatients: sum.suppliedPatients + row.suppliedPatients,
      products: sum.products + row.products,
      costReimbursement: sum.costReimbursement + row.costReimbursement,
      overhead: sum.overhead + row.overhead,
      payment: sum.payment + row.payment,
    }), { population: 0, incidentPatients: 0, eligiblePatients: 0, suppliedPatients: 0, products: 0, costReimbursement: 0, overhead: 0, payment: 0 });
    return { ...total, year, coveragePct, countries: rows };
  });
}
