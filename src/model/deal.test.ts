import { describe, expect, it } from 'vitest';
import { baseScenario } from './assumptions';
import { calculateModel } from './calculateModel';
import { calculateDeal } from './deal';

describe('calculateDeal', () => {
  const model = calculateModel(baseScenario);
  const gbmMilestoneRisk = model.valuation.commercializationSuccessPctByIndication.gbm / 100
    * model.valuation.riskAdjustmentPct / 100;

  it('uses rNPV and full funding burden for self-commercialization', () => {
    const result = calculateDeal(model, {
      type: 'self-commercialize',
      upfrontUsd: 0,
      milestonesUsd: 0,
      royaltyPct: 0,
      retainedCommercialPct: 100,
      partnerDevelopmentFundingPct: 0,
    });
    expect(result.indicativeValueUsd).toBe(model.valuation.riskAdjustedNpvUsd);
    expect(result.fundingBurdenUsd).toBe(model.peakFundingRequirementUsd);
  });

  it('discounts royalties from the same stage-adjusted revenue stream as rNPV', () => {
    const result = calculateDeal(model, {
      type: 'global-license',
      upfrontUsd: 100_000_000,
      milestonesUsd: 200_000_000,
      royaltyPct: 20,
      retainedCommercialPct: 0,
      partnerDevelopmentFundingPct: 100,
    });
    expect(result.royaltyNpvUsd).toBeGreaterThan(0);
    expect(result.royaltyNpvUsd).toBeLessThan(model.cumulativeRevenueUsd * 0.2);
    expect(result.riskAdjustedMilestonesUsd).toBeCloseTo(200_000_000 * gbmMilestoneRisk, -3);
    expect(result.fundingBurdenUsd).toBe(0);
  });

  it('risk-adjusts contingent acquisition milestones while leaving upfront cash certain', () => {
    const result = calculateDeal(model, {
      type: 'acquisition',
      upfrontUsd: 500_000_000,
      milestonesUsd: 200_000_000,
      royaltyPct: 0,
      retainedCommercialPct: 0,
      partnerDevelopmentFundingPct: 100,
    });
    const expectedMilestone = 200_000_000 * gbmMilestoneRisk;
    expect(result.upfrontValueUsd).toBe(500_000_000);
    expect(result.riskAdjustedMilestonesUsd).toBeCloseTo(expectedMilestone, -3);
    expect(result.indicativeValueUsd).toBeCloseTo(500_000_000 + expectedMilestone, -3);
  });
});
