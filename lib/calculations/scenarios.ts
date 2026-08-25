import { calculateMortgage } from "./mortgage";
import { buildReturnSummary } from "./returns";
import { FullAssumptions, ScenarioResult } from "../types";

interface GrowthAdjustment {
  appreciationDelta: number;
  rentGrowthDelta: number;
  expenseGrowthDelta: number;
  vacancyDelta: number;
}

const BEAR: GrowthAdjustment = {
  appreciationDelta: -2,
  rentGrowthDelta: -1.5,
  expenseGrowthDelta: 1.5,
  vacancyDelta: 5,
};
const BULL: GrowthAdjustment = {
  appreciationDelta: 2,
  rentGrowthDelta: 1.5,
  expenseGrowthDelta: -1,
  vacancyDelta: -3,
};

function runScenario(
  assumptions: FullAssumptions,
  label: "Bear" | "Base" | "Bull",
  adj: GrowthAdjustment | null
): ScenarioResult {
  const growth = adj
    ? {
        annualAppreciationPct: Math.max(-5, assumptions.growth.annualAppreciationPct + adj.appreciationDelta),
        annualRentGrowthPct: Math.max(-5, assumptions.growth.annualRentGrowthPct + adj.rentGrowthDelta),
        annualExpenseGrowthPct: Math.max(0, assumptions.growth.annualExpenseGrowthPct + adj.expenseGrowthDelta),
      }
    : assumptions.growth;

  const expenses = adj
    ? { ...assumptions.expenses, vacancyPct: Math.max(0, Math.min(60, assumptions.expenses.vacancyPct + adj.vacancyDelta)) }
    : assumptions.expenses;

  const mortgage = calculateMortgage(assumptions.purchase, assumptions.financing);
  const returns = buildReturnSummary(
    assumptions.purchase,
    assumptions.financing,
    expenses,
    growth,
    assumptions.rental,
    mortgage
  );

  return {
    label,
    cashFlowYear1: returns.year1.annualCashFlow,
    propertyValueYear10: returns.tenYear.propertyValue,
    equityYear10: returns.tenYear.equity,
    totalReturnYear10: returns.tenYear.totalProfitIfSold,
    irr10: returns.irr10,
  };
}

export function calculateScenarios(assumptions: FullAssumptions): ScenarioResult[] {
  return [
    runScenario(assumptions, "Bear", BEAR),
    runScenario(assumptions, "Base", null),
    runScenario(assumptions, "Bull", BULL),
  ];
}
