import { calculateMortgage } from "./mortgage";
import { calculateLtrCashFlow, calculateStrCashFlow } from "./cashflow";
import { buildReturnSummary } from "./returns";
import {
  FinancingAssumptions,
  FullAssumptions,
  MaxPriceResult,
} from "../types";

function metricsAtPrice(assumptions: FullAssumptions, price: number) {
  const purchase = { ...assumptions.purchase, purchasePrice: price };
  const mortgage = calculateMortgage(purchase, assumptions.financing);
  const cashFlow =
    assumptions.rental.strategy === "str"
      ? calculateStrCashFlow(assumptions.rental, assumptions.expenses, mortgage)
      : calculateLtrCashFlow(assumptions.rental, assumptions.expenses, mortgage);
  const cashOnCashPct = mortgage.cashToClose > 0 ? (cashFlow.cashFlow / mortgage.cashToClose) * 100 : 0;

  const returns = buildReturnSummary(
    purchase,
    assumptions.financing,
    assumptions.expenses,
    assumptions.growth,
    assumptions.rental,
    mortgage
  );
  return { cashOnCashPct, irr10Pct: returns.irr10 };
}

/** Bisection assuming the metric decreases monotonically as price increases. */
function solveForPrice(
  target: number,
  metricFn: (price: number) => number,
  low: number,
  high: number
): number {
  let metricLow = metricFn(low);
  const metricHigh = metricFn(high);

  if (metricLow < target) return low; // even the floor price doesn't hit target
  if (metricHigh > target) return high; // even the ceiling exceeds target

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const metricMid = metricFn(mid);
    if (Math.abs(metricMid - target) < 0.01) return mid;
    if (metricMid > target) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return (low + high) / 2;
}

export function calculateMaxPrice(assumptions: FullAssumptions, askingPrice: number): MaxPriceResult {
  const low = Math.max(10000, askingPrice * 0.2);
  const high = askingPrice * 2.5;

  const maxPriceForCoc = solveForPrice(
    assumptions.criteria.minCashOnCashPct,
    (p) => metricsAtPrice(assumptions, p).cashOnCashPct,
    low,
    high
  );
  const maxPriceForIrr = solveForPrice(
    assumptions.criteria.minIrrPct,
    (p) => metricsAtPrice(assumptions, p).irr10Pct,
    low,
    high
  );

  const recommendedMaxPrice = Math.min(maxPriceForCoc, maxPriceForIrr);

  return {
    askingPrice,
    maxPriceForCoc: Math.round(maxPriceForCoc),
    maxPriceForIrr: Math.round(maxPriceForIrr),
    recommendedMaxPrice: Math.round(recommendedMaxPrice),
    targetOfferPrice: Math.round(recommendedMaxPrice),
  };
}
