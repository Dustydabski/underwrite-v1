import { PropertyRecord, Recommendation, ReturnSummary, ScoreBreakdown } from "../types";

function clampScore(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}

/** Linear scale from 0 at `floor` to `max` at `ceiling`. */
function scale(value: number, floor: number, ceiling: number, max: number): number {
  if (ceiling === floor) return 0;
  const pct = (value - floor) / (ceiling - floor);
  return clampScore(pct * max, max);
}

export interface ScoreInputs {
  monthlyCashFlow: number;
  cashOnCashPct: number; // e.g. 8 for 8%
  capRatePct: number;
  irr10Pct: number;
  purchasePrice: number;
  estimatedValue: number | null;
  marketFundamentalsScore?: number; // 0-10, defaults to neutral until market APIs are connected
}

/**
 * Transparent 0-100 investment score. Every sub-score is a simple linear
 * scale between a "0 points" floor and a "full points" ceiling — no
 * hidden weighting. Thresholds are intentionally conservative (a "good"
 * long-term-rental deal, not a hot-market speculative one).
 */
export function calculateScore(inputs: ScoreInputs): ScoreBreakdown {
  const cashFlow = scale(inputs.monthlyCashFlow, 0, 500, 25);
  const cashOnCash = scale(inputs.cashOnCashPct, 0, 12, 20);
  const capRate = scale(inputs.capRatePct, 0, 8, 15);
  const irr = scale(inputs.irr10Pct, 0, 18, 20);

  let priceVsValue = 5; // neutral if we don't have an estimated value to compare to
  if (inputs.estimatedValue && inputs.estimatedValue > 0) {
    const discountPct = ((inputs.estimatedValue - inputs.purchasePrice) / inputs.estimatedValue) * 100;
    priceVsValue = scale(discountPct, -5, 10, 10);
  }

  const marketFundamentals = clampScore(inputs.marketFundamentalsScore ?? 6, 10);

  const total = cashFlow + cashOnCash + capRate + irr + priceVsValue + marketFundamentals;

  return {
    cashFlow: round1(cashFlow),
    cashOnCash: round1(cashOnCash),
    capRate: round1(capRate),
    irr: round1(irr),
    priceVsValue: round1(priceVsValue),
    marketFundamentals: round1(marketFundamentals),
    total: round1(total),
  };
}

export function recommendationFromScore(total: number, monthlyCashFlow: number): Recommendation {
  if (total >= 75 && monthlyCashFlow >= 0) return "BUY";
  if (total >= 50) return "CONSIDER";
  return "PASS";
}

export function buildReasons(
  score: ScoreBreakdown,
  returns: ReturnSummary,
  property: PropertyRecord,
  purchasePrice: number
): { pros: string[]; risks: string[] } {
  const pros: string[] = [];
  const risks: string[] = [];

  if (score.cashFlow >= 18) pros.push("Positive, healthy cash flow from year one");
  else if (score.cashFlow <= 8) risks.push("Thin or negative cash flow at this price and these terms");

  if (score.cashOnCash >= 15) pros.push("Strong cash-on-cash return relative to cash invested");
  if (score.capRate >= 10) pros.push("Cap rate is competitive for a stabilized rental");

  if (score.irr >= 15) pros.push(`Strong projected 10-year IRR (${returns.irr10.toFixed(1)}%)`);
  else if (score.irr <= 8) risks.push("Long-term IRR depends heavily on appreciation holding up");

  if (score.priceVsValue >= 7 && property.estimatedValue) {
    pros.push("Purchase price is below the estimated market value");
  } else if (score.priceVsValue <= 3 && property.estimatedValue) {
    risks.push("Purchase price is at or above the estimated market value, leaving little cushion");
  }

  if (property.annualPropertyTaxes && property.annualPropertyTaxes.value / purchasePrice > 0.015) {
    risks.push("Property taxes are elevated relative to price");
  }
  if (property.monthlyHoa) {
    risks.push("Monthly HOA dues reduce cash flow and add a fixed carrying cost");
  }
  if (score.marketFundamentals <= 5) {
    risks.push("Market fundamentals score is a neutral placeholder until a market-data API is connected");
  }

  if (pros.length === 0) pros.push("No standout strengths at the current price and assumptions");
  if (risks.length === 0) risks.push("No major red flags identified, but confirm all estimated figures locally");

  return { pros: pros.slice(0, 5), risks: risks.slice(0, 5) };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
