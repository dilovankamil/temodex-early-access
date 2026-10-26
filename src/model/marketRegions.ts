import type { RegionId } from './types';

export const REGION_ORDER: RegionId[] = [
  'North America',
  'Europe',
  'South America',
  'Middle East & North Africa',
  'South Asia',
  'East Asia',
  'Southeast Asia',
  'Oceania',
];

export const REGION_COLORS: Record<RegionId, string> = {
  'North America': '#6ed7ff',
  Europe: '#4fd1c5',
  'South America': '#f5b942',
  'Middle East & North Africa': '#f28c6f',
  'South Asia': '#d69ef5',
  'East Asia': '#8ca8ff',
  'Southeast Asia': '#7fd9a8',
  Oceania: '#f1a7c5',
};

export const regionColor = (region: RegionId, active = true) =>
  active ? REGION_COLORS[region] : '#2a3035';
