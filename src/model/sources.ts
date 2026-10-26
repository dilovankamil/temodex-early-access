export type SourceCategory = 'Epidemiology' | 'Surgery eligibility' | 'Population' | 'Development' | 'Commercial' | 'Valuation';

export interface MethodologySource {
  id: string;
  category: SourceCategory;
  label: string;
  url?: string;
  appliesTo: string;
  note: string;
  status: 'literature' | 'workbook' | 'scenario';
}

export const methodologySources: MethodologySource[] = [
  {
    id: 'gbm-us-incidence', category: 'Epidemiology', label: 'US glioblastoma incidence',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6352755/', appliesTo: 'North America · GBM proxy basis',
    note: 'Literature lineage used by the finance workbook. Additional Americas markets currently use explicit regional planning proxies rather than country-specific epidemiology.', status: 'literature',
  },
  {
    id: 'gbm-eu-incidence', category: 'Epidemiology', label: 'European glioblastoma incidence',
    url: 'https://pubmed.ncbi.nlm.nih.gov/40203511/', appliesTo: 'Europe · GBM',
    note: 'Literature lineage used for the European regional incidence assumption. Country-specific variation is not yet modelled.', status: 'literature',
  },
  {
    id: 'gbm-jp-incidence', category: 'Epidemiology', label: 'Japan glioblastoma incidence',
    url: 'https://pubmed.ncbi.nlm.nih.gov/38206510/', appliesTo: 'East/South/Southeast Asia planning basis',
    note: 'Japan is the sourced Asian lineage in the current model. Other Asian and MENA markets use this only as a clearly marked planning proxy pending market-specific epidemiology.', status: 'literature',
  },
  {
    id: 'brain-met-incidence', category: 'Epidemiology', label: 'Brain metastasis incidence basis',
    url: 'https://pubmed.ncbi.nlm.nih.gov/2405271/', appliesTo: 'Brain metastases',
    note: 'Historical incidence basis inherited from the modelling workbook; this should be refreshed before external quantitative use.', status: 'literature',
  },
  {
    id: 'brain-met-surgery', category: 'Surgery eligibility', label: 'Role of surgery in metastatic brain tumors',
    url: 'https://pubmed.ncbi.nlm.nih.gov/30629227/', appliesTo: 'Brain metastases',
    note: 'Clinical context for resection eligibility. Country-specific surgical access remains a model assumption.', status: 'literature',
  },
  {
    id: 'population-eurostat', category: 'Population', label: 'Eurostat EU27 population, 1 January 2026',
    url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Population_and_population_change_statistics', appliesTo: 'European Union (27 countries)',
    note: 'EU member-state population bases are aligned to Eurostat 2026 demographic totals. UK, Norway and Switzerland sit in the same Europe commercial group but remain separate planning inputs.', status: 'literature',
  },
  {
    id: 'population-workbook', category: 'Population', label: 'Original workbook population scale',
    appliesTo: 'United States · UK · Japan and original configured European markets',
    note: 'The original finance workbook remains the lineage for core market population scale where more recent public sources have not yet replaced it.', status: 'workbook',
  },
  {
    id: 'population-expansion-proxies', category: 'Population', label: 'Regional expansion population scales',
    appliesTo: 'South America · MENA · South Asia · East/Southeast Asia · Oceania',
    note: 'Approximate national population scales are included for scenario exploration. They are planning inputs, not a validated demographic forecast series, and should be replaced with maintained country data before external quantitative use.', status: 'scenario',
  },
  {
    id: 'development-workbook', category: 'Development', label: 'Clinical programme timing and public cost layer',
    appliesTo: 'GBM · BM · OPBT',
    note: 'Coarse cost aggregates are transcribed from SI053_Finance_Model_v8.xlsx. The current public planning calendar begins Phase I in June 2027 and ends GBM Phase II on 31 August 2031.', status: 'workbook',
  },
  {
    id: 'temodex-mgmt-analysis', category: 'Development', label: 'Local Temodex delivery and MGMT analysis (Karlsson et al., 2019)',
    url: 'https://doi.org/10.4149/neo_2018_180613N393', appliesTo: 'Prior Temodex clinical evidence · MGMT subgroup analysis',
    note: 'A small cohort analysis reported overall-survival benefit across MGMT promoter methylation groups. This is supportive precedent for a local-exposure hypothesis, not a confirmed SI-053 clinical result; prospective SI-053 data are required.', status: 'literature',
  },
  {
    id: 'fda-orphan-separate-approval', category: 'Development', label: 'FDA orphan designation is separate from approval',
    url: 'https://www.fda.gov/industry/medical-products-rare-diseases-and-conditions/designating-orphan-product-drugs-and-biological-products', appliesTo: 'US regulatory pathway',
    note: 'FDA states that orphan designation is a separate process from approval/licensing. The model therefore does not treat ODD itself as authority to sell after Phase II.', status: 'literature',
  },
  {
    id: 'ema-conditional-approval', category: 'Development', label: 'EMA conditional marketing authorisation',
    url: 'https://www.ema.europa.eu/en/human-regulatory-overview/marketing-authorisation/conditional-marketing-authorisation', appliesTo: 'EU accelerated/conditional pathway',
    note: 'Orphan medicines can be eligible for conditional marketing authorisation when the applicable criteria are met. The modeled post-Phase-II launch is a strategic pathway assumption, not a guaranteed consequence of orphan status.', status: 'literature',
  },
  {
    id: 'stage-probability-scenario', category: 'Development', label: 'Clinical stage risk sensitivities',
    appliesTo: 'GBM · BM · OPBT',
    note: 'Stage probabilities are advanced scenario inputs rather than headline forecasts. Pre-launch stages affect commercialization risk; confirmatory post-launch stages affect probability-weighted programme spend.', status: 'scenario',
  },
  {
    id: 'pricing-scenario', category: 'Commercial', label: 'Treatment price, launch timing and peak penetration',
    appliesTo: 'Country markets',
    note: 'Scenario assumptions, not observed market facts. The default selected-market treatment-price assumption is $75,000. Core US/Europe GBM launch is modeled for November 2031, a couple of months after the configured Phase II end date; the partial first year is prorated. Expansion markets are explicitly marked as proxies and require country-specific validation before external quantitative use.', status: 'scenario',
  },
  {
    id: 'valuation-method', category: 'Valuation', label: 'Explicit-horizon commercialization-gate rNPV',
    appliesTo: 'Whole model',
    note: 'Uses annual cash flows through the selected horizon and no perpetual terminal value. Revenue is weighted by the configured pre-launch commercialization gate; confirmatory studies after launch remain in the development cost path rather than becoming an extra barrier to initial sales.', status: 'scenario',
  },
];
