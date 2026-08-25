import { calculateMortgage } from "./mortgage";
import { calculateLtrCashFlow, calculateStrCashFlow } from "./cashflow";
import { buildReturnSummary } from "./returns";
import { FullAssumptions, SensitivityRow } from "../types";

/** Purchase-price sensitivity table: five prices spanning -10% to +10% of asking. */
export function calculateSensitivity(assumptions: FullAssumptions): SensitivityRow[] {
  const base = assumptions.purchase.purchasePrice;
  const priceDeltas = [-0.1, -0.05, 0, 0.05, 0.1];

  return priceDeltas.map((delta) => {
    const price = Math.round(base * (1 + delta));
    const purchase = { ...assumptions.purchase, purchasePrice: price };
    const mortgage = calculateMortgage(purchase, assumptions.financing);
    const cashFlow =
      assumptions.rental.strategy === "str"
        ? calculateStrCashFlow(assumptions.rental, assumptions.expenses, mortgage)
        : calculateLtrCashFlow(assumptions.rental, assumptions.expenses, mortgage);

    const cashOnCash = mortgage.cashToClose > 0 ? (cashFlow.cashFlow / mortgage.cashToClose) * 100 : 0;
    const capRate = price > 0 ? (cashFlow.noi / price) * 100 : 0;

    const returns = buildReturnSummary(
      purchase,
      assumptions.financing,
      assumptions.expenses,
      assumptions.growth,
      assumptions.rental,
      mortgage
    );

    return {
      purchasePrice: price,
      cashOnCash: round1(cashOnCash),
      capRate: round1(capRate),
      irr10: round1(returns.irr10),
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
