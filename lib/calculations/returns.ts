import { remainingBalance } from "./mortgage";
import {
  FinancingAssumptions,
  GrowthAssumptions,
  MortgageDetails,
  OperatingExpenseAssumptions,
  PurchaseAssumptions,
  RentalStrategyAssumptions,
  ReturnSummary,
  YearProjection,
} from "../types";
import { calculateLtrCashFlow, calculateStrCashFlow } from "./cashflow";

const SELLING_COSTS_PCT = 7; // realtor commission + closing costs on exit, used for sale-proceeds math

export function buildProjections(
  purchase: PurchaseAssumptions,
  financing: FinancingAssumptions,
  expenses: OperatingExpenseAssumptions,
  growth: GrowthAssumptions,
  rental: RentalStrategyAssumptions,
  mortgage: MortgageDetails,
  years = 10
): YearProjection[] {
  const projections: YearProjection[] = [];
  let cumulativeCashFlow = 0;
  let cumulativePrincipal = 0;

  for (let year = 1; year <= years; year++) {
    const rentFactor = Math.pow(1 + growth.annualRentGrowthPct / 100, year - 1);
    const expenseFactor = Math.pow(1 + growth.annualExpenseGrowthPct / 100, year - 1);
    const valueFactor = Math.pow(1 + growth.annualAppreciationPct / 100, year);

    const grownRental: RentalStrategyAssumptions = {
      ...rental,
      monthlyRentLTR: rental.monthlyRentLTR * rentFactor,
      str: { ...rental.str, avgNightlyRate: rental.str.avgNightlyRate * rentFactor },
    };
    const grownExpenses: OperatingExpenseAssumptions = {
      ...expenses,
      annualPropertyTaxes: expenses.annualPropertyTaxes * expenseFactor,
      annualInsurance: expenses.annualInsurance * expenseFactor,
      monthlyHoa: expenses.monthlyHoa * expenseFactor,
      monthlyUtilities: expenses.monthlyUtilities * expenseFactor,
      monthlyLandscaping: expenses.monthlyLandscaping * expenseFactor,
      monthlySnowRemoval: expenses.monthlySnowRemoval * expenseFactor,
      monthlyOtherExpenses: expenses.monthlyOtherExpenses * expenseFactor,
    };

    const cf =
      rental.strategy === "str"
        ? calculateStrCashFlow(grownRental, grownExpenses, mortgage)
        : calculateLtrCashFlow(grownRental, grownExpenses, mortgage);

    const propertyValue = purchase.purchasePrice * valueFactor;
    const loanBalance =
      financing.loanType === "cash"
        ? 0
        : remainingBalance(mortgage.loanAmount, financing.interestRatePct, financing.loanTermYears, year * 12);
    const prevLoanBalance =
      year === 1
        ? mortgage.loanAmount
        : financing.loanType === "cash"
        ? 0
        : remainingBalance(
            mortgage.loanAmount,
            financing.interestRatePct,
            financing.loanTermYears,
            (year - 1) * 12
          );

    const principalPaydown = prevLoanBalance - loanBalance;
    cumulativePrincipal += principalPaydown;
    cumulativeCashFlow += cf.cashFlow;

    const equity = propertyValue - loanBalance;
    const appreciationGain = propertyValue - purchase.purchasePrice;
    const cashInvested = mortgage.cashToClose;
    const sellingCosts = propertyValue * (SELLING_COSTS_PCT / 100);
    const totalProfitIfSold = equity - sellingCosts + cumulativeCashFlow - cashInvested;

    projections.push({
      year,
      propertyValue,
      loanBalance,
      equity,
      annualCashFlow: cf.cashFlow,
      cumulativeCashFlow,
      principalPaydown,
      cumulativePrincipalPaydown: cumulativePrincipal,
      appreciationGain,
      totalProfitIfSold,
      roi: cashInvested > 0 ? totalProfitIfSold / cashInvested : 0,
    });
  }

  return projections;
}

/** IRR via bisection on cash flow series: [-invested, cf1, cf2, ..., cfN + net sale proceeds]. */
export function calculateIrr(cashInvested: number, projections: YearProjection[], exitYear: number): number {
  const relevant = projections.slice(0, exitYear);
  const flows = [-cashInvested];
  relevant.forEach((p, i) => {
    const isLast = i === relevant.length - 1;
    flows.push(isLast ? p.annualCashFlow + (p.equity - p.propertyValue * (SELLING_COSTS_PCT / 100)) : p.annualCashFlow);
  });

  const npv = (rate: number) => flows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let low = -0.9;
  let high = 3.0;
  if (npv(low) * npv(high) > 0) {
    // Fallback: no sign change found in range, so no clean IRR — return 0.
    return 0;
  }
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const val = npv(mid);
    if (Math.abs(val) < 1e-6) return mid * 100;
    if (npv(low) * val < 0) high = mid;
    else low = mid;
  }
  return ((low + high) / 2) * 100;
}

export function buildReturnSummary(
  purchase: PurchaseAssumptions,
  financing: FinancingAssumptions,
  expenses: OperatingExpenseAssumptions,
  growth: GrowthAssumptions,
  rental: RentalStrategyAssumptions,
  mortgage: MortgageDetails
): ReturnSummary {
  const projections = buildProjections(purchase, financing, expenses, growth, rental, mortgage, 10);
  const cashInvested = mortgage.cashToClose;
  const year1 = projections[0];
  const fiveYear = projections[4];
  const tenYear = projections[9];

  const year1Noi = year1.annualCashFlow + mortgage.totalMonthlyPayment * 12; // approx NOI back-out
  const year1CashOnCash = cashInvested > 0 ? year1.annualCashFlow / cashInvested : 0;
  const year1CapRate = purchase.purchasePrice > 0 ? year1Noi / purchase.purchasePrice : 0;

  return {
    cashInvested,
    year1,
    year1CashOnCash,
    year1CapRate,
    fiveYear,
    tenYear,
    irr5: calculateIrr(cashInvested, projections, 5),
    irr10: calculateIrr(cashInvested, projections, 10),
    projections,
  };
}
