import type { CountryId } from './types';

export interface MarketGroupDefinition {
  id: string;
  label: string;
  countryIds: CountryId[];
  collapsedByDefault?: boolean;
}

export const EU27_IDS: CountryId[] = [
  'BEL','BGR','CZE','DNK','DEU','EST','IRL','GRC','ESP','FRA','HRV','ITA','CYP','LVA','LTU','LUX','HUN','MLT','NLD','AUT','POL','PRT','ROU','SVN','SVK','FIN','SWE',
];

export const EUROPE_IDS: CountryId[] = [...EU27_IDS, 'GBR', 'NOR', 'CHE'];

export const MARKET_GROUPS: MarketGroupDefinition[] = [
  { id: 'north-america', label: 'North America', countryIds: ['USA', 'CAN', 'MEX'] },
  { id: 'europe', label: 'Europe', countryIds: EUROPE_IDS, collapsedByDefault: true },
  { id: 'south-america', label: 'South America', countryIds: ['BRA', 'ARG', 'COL', 'CHL'], collapsedByDefault: true },
  { id: 'mena', label: 'Middle East & North Africa', countryIds: ['SAU', 'ARE', 'ISR', 'TUR', 'QAT', 'KWT', 'BHR', 'OMN', 'EGY', 'MAR'], collapsedByDefault: true },
  { id: 'south-asia', label: 'South Asia', countryIds: ['IND', 'PAK', 'BGD'], collapsedByDefault: true },
  { id: 'east-asia', label: 'East Asia', countryIds: ['JPN', 'CHN', 'KOR'], collapsedByDefault: true },
  { id: 'southeast-asia', label: 'Southeast Asia', countryIds: ['IDN', 'THA', 'MYS', 'SGP'], collapsedByDefault: true },
  { id: 'oceania', label: 'Australia & New Zealand', countryIds: ['AUS', 'NZL'], collapsedByDefault: true },
];
