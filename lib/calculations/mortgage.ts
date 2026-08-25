import { FinancingAssumptions, MortgageDetails, PurchaseAssumptions } from "../types";

export function calculateMortgage(
  purchase: PurchaseAssumptions,
  financing: FinancingAssumptions
): MortgageDetails {
  const { purchasePrice, closingCostsPct, renovationBudget, furnishingBudget, otherAcquisitionCosts } =
    purchase;
  const { downPaymentPct, interestRatePct, loanTermYears, pmiPctOfLoan, loanType } = financing;

  if (loanType === "cash") {
    const cashToClose =
      purchasePrice +
      purchasePrice * (closingCostsPct / 100) +
      renovationBudget +
      furnishingBudget +
      otherAcquisitionCosts;
    return { loanAmount: 0, monthlyPI: 0, monthlyPmi: 0, totalMonthlyPayment: 0, cashToClose };
  }

  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyRate = interestRatePct / 100 / 12;
  const numPayments = loanTermYears * 12;

  const monthlyPI =
    monthlyRate === 0
      ? loanAmount / numPayments
      : (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);

  const monthlyPmi = downPaymentPct < 20 ? (loanAmount * (pmiPctOfLoan / 100)) / 12 : 0;

  const closingCosts = purchasePrice * (closingCostsPct / 100);
  const cashToClose =
    downPayment + closingCosts + renovationBudget + furnishingBudget + otherAcquisitionCosts;

  return {
    loanAmount,
    monthlyPI,
    monthlyPmi,
    totalMonthlyPayment: monthlyPI + monthlyPmi,
    cashToClose,
  };
}

/** Remaining loan balance after `monthsElapsed` payments. */
export function remainingBalance(
  loanAmount: number,
  interestRatePct: number,
  loanTermYears: number,
  monthsElapsed: number
): number {
  const monthlyRate = interestRatePct / 100 / 12;
  const numPayments = loanTermYears * 12;
  if (monthlyRate === 0) {
    return Math.max(0, loanAmount * (1 - monthsElapsed / numPayments));
  }
  const factor = Math.pow(1 + monthlyRate, monthsElapsed);
  const balance =
    loanAmount * factor -
    (calcPayment(loanAmount, monthlyRate, numPayments) * (factor - 1)) / monthlyRate;
  return Math.max(0, balance);
}

function calcPayment(loanAmount: number, monthlyRate: number, numPayments: number): number {
  if (monthlyRate === 0) return loanAmount / numPayments;
  return (
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1)
  );
}
