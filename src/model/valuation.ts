import type { IndicationId, ValuationResult, YearResult } from './types';

export const calculateValuation = (
  years: YearResult[],
  startYear: number,
  discountRatePct: number,
  riskAdjustmentPct: number,
  commercializationSuccessPctByIndication: Record<IndicationId, number>,
): ValuationResult => {
  const discountRate = discountRatePct / 100;

  const npvUsd = years.reduce((sum, row) => {
    const t = row.year - startYear;
    return sum + row.netCashFlowUsd / Math.pow(1 + discountRate, t);
  }, 0);

  const riskAdjustedNpvUsd = years.reduce((sum, row) => {
    const t = row.year - startYear;
    return sum + row.riskAdjustedNetCashFlowUsd / Math.pow(1 + discountRate, t);
  }, 0);

  return {
    npvUsd,
    riskAdjustedNpvUsd,
    discountRatePct,
    riskAdjustmentPct,
    commercializationSuccessPctByIndication,
  };
};
