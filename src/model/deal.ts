import type { ModelResult } from './types';

export type DealType = 'self-commercialize' | 'regional-license' | 'global-license' | 'acquisition';

export interface DealTerms {
  type: DealType;
  upfrontUsd: number;
  royaltyPct: number;
  retainedCommercialPct: number;
  partnerDevelopmentFundingPct: number;
  milestonesUsd: number;
}

export interface DealResult {
  indicativeValueUsd: number;
  fundingBurdenUsd: number;
  upfrontValueUsd: number;
  riskAdjustedMilestonesUsd: number;
  royaltyNpvUsd: number;
  retainedValueUsd: number;
}

export const calculateDeal = (model: ModelResult, terms: DealTerms): DealResult => {
  const coreCommercializationProbability = (model.valuation.commercializationSuccessPctByIndication.gbm ?? 100) / 100;
  const additionalRiskMultiplier = model.valuation.riskAdjustmentPct / 100;
  const milestoneRiskFactor = coreCommercializationProbability * additionalRiskMultiplier;

  if (terms.type === 'self-commercialize') {
    return {
      indicativeValueUsd: model.valuation.riskAdjustedNpvUsd,
      fundingBurdenUsd: model.peakFundingRequirementUsd,
      upfrontValueUsd: 0,
      riskAdjustedMilestonesUsd: 0,
      royaltyNpvUsd: 0,
      retainedValueUsd: model.valuation.riskAdjustedNpvUsd,
    };
  }

  const riskAdjustedMilestonesUsd = terms.milestonesUsd * milestoneRiskFactor;

  if (terms.type === 'acquisition') {
    return {
      indicativeValueUsd: terms.upfrontUsd + riskAdjustedMilestonesUsd,
      fundingBurdenUsd: 0,
      upfrontValueUsd: terms.upfrontUsd,
      riskAdjustedMilestonesUsd,
      royaltyNpvUsd: 0,
      retainedValueUsd: 0,
    };
  }

  const startYear = model.years[0]?.year ?? 0;
  const discountRate = model.valuation.discountRatePct / 100;

  const royaltyNpvUsd = model.years.reduce((sum, row) => {
    const t = row.year - startYear;
    const royaltyCash = row.riskAdjustedGrossRevenueUsd * (terms.royaltyPct / 100);
    return sum + royaltyCash / Math.pow(1 + discountRate, t);
  }, 0);

  const retainedValueUsd = model.valuation.riskAdjustedNpvUsd * (terms.retainedCommercialPct / 100);
  const fundingBurdenUsd = model.peakFundingRequirementUsd * (1 - terms.partnerDevelopmentFundingPct / 100);

  return {
    indicativeValueUsd: terms.upfrontUsd + riskAdjustedMilestonesUsd + royaltyNpvUsd + retainedValueUsd,
    fundingBurdenUsd,
    upfrontValueUsd: terms.upfrontUsd,
    riskAdjustedMilestonesUsd,
    royaltyNpvUsd,
    retainedValueUsd,
  };
};
