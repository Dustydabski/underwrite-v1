import { AnalysisResult, FullAssumptions, PropertyRecord } from "./types";
import { calculateMortgage } from "./calculations/mortgage";
import { calculateLtrCashFlow, calculateStrCashFlow } from "./calculations/cashflow";
import { buildReturnSummary } from "./calculations/returns";
import { calculateScore, recommendationFromScore, buildReasons } from "./calculations/scoring";
import { calculateMaxPrice } from "./calculations/maxPrice";
import { calculateScenarios } from "./calculations/scenarios";
import { calculateSensitivity } from "./calculations/sensitivity";

/**
 * The single orchestration function that turns property data + user
 * assumptions into a full AnalysisResult. Pure, synchronous, and has no
 * knowledge of where the data came from — safe to call from an API route,
 * a server component, or directly client-side after fetching a property.
 */
export function analyzeProperty(property: PropertyRecord, assumptions: FullAssumptions): AnalysisResult {
  const mortgage = calculateMortgage(assumptions.purchase, assumptions.financing);

  const ltrCashFlow = calculateLtrCashFlow(assumptions.rental, assumptions.expenses, mortgage);
  const strCashFlow = assumptions.rental.str.enabled
    ? calculateStrCashFlow(assumptions.rental, assumptions.expenses, mortgage)
    : null;

  const activeCashFlow = assumptions.rental.strategy === "str" && strCashFlow ? strCashFlow : ltrCashFlow;

  const returns = buildReturnSummary(
    assumptions.purchase,
    assumptions.financing,
    assumptions.expenses,
    assumptions.growth,
    assumptions.rental,
    mortgage
  );

  const score = calculateScore({
    monthlyCashFlow: activeCashFlow.cashFlowMonthly,
    cashOnCashPct: returns.year1CashOnCash * 100,
    capRatePct: returns.year1CapRate * 100,
    irr10Pct: returns.irr10,
    purchasePrice: assumptions.purchase.purchasePrice,
    estimatedValue: property.estimatedValue?.value ?? null,
  });

  const recommendation = recommendationFromScore(score.total, activeCashFlow.cashFlowMonthly);
  const reasons = buildReasons(score, returns, property, assumptions.purchase.purchasePrice);
  const maxPrice = calculateMaxPrice(
    assumptions,
    property.listPrice?.value ?? assumptions.purchase.purchasePrice
  );
  const scenarios = calculateScenarios(assumptions);
  const sensitivity = calculateSensitivity(assumptions);

  return {
    property,
    assumptions,
    mortgage,
    ltrCashFlow,
    strCashFlow,
    returns,
    score,
    recommendation,
    reasons,
    maxPrice,
    scenarios,
    sensitivity,
  };
}
