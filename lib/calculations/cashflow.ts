import {
  AnnualCashFlow,
  MortgageDetails,
  OperatingExpenseAssumptions,
  RentalStrategyAssumptions,
} from "../types";

export function calculateLtrCashFlow(
  rental: RentalStrategyAssumptions,
  expenses: OperatingExpenseAssumptions,
  mortgage: MortgageDetails
): AnnualCashFlow {
  const grossPotentialRent = rental.monthlyRentLTR * 12;
  const vacancyLoss = grossPotentialRent * (expenses.vacancyPct / 100);
  const effectiveGrossIncome = grossPotentialRent - vacancyLoss;

  const propertyManagement = effectiveGrossIncome * (expenses.propertyManagementPct / 100);
  const maintenance = grossPotentialRent * (expenses.maintenancePct / 100);
  const capEx = grossPotentialRent * (expenses.capExPct / 100);
  const fixedAnnual =
    expenses.annualPropertyTaxes +
    expenses.annualInsurance +
    expenses.monthlyHoa * 12 +
    expenses.monthlyUtilities * 12 +
    expenses.monthlyLandscaping * 12 +
    expenses.monthlySnowRemoval * 12 +
    expenses.monthlyOtherExpenses * 12;

  const operatingExpenses = propertyManagement + maintenance + capEx + fixedAnnual;
  const noi = effectiveGrossIncome - operatingExpenses;
  const debtService = mortgage.totalMonthlyPayment * 12;
  const cashFlow = noi - debtService;

  return {
    grossPotentialRent,
    vacancyLoss,
    effectiveGrossIncome,
    operatingExpenses,
    noi,
    debtService,
    cashFlow,
    cashFlowMonthly: cashFlow / 12,
  };
}

export function calculateStrCashFlow(
  rental: RentalStrategyAssumptions,
  expenses: OperatingExpenseAssumptions,
  mortgage: MortgageDetails
): AnnualCashFlow {
  const str = rental.str;
  const nightsBooked = 365 * str.occupancyPct;
  const stays = nightsBooked / Math.max(1, str.avgStayLengthNights);

  const roomRevenue = str.avgNightlyRate * nightsBooked;
  const cleaningRevenue = stays * str.cleaningFeePerStay;
  const grossPotentialRent = roomRevenue + cleaningRevenue; // gross booking revenue

  const platformFees = grossPotentialRent * (str.platformFeePct / 100);
  const effectiveGrossIncome = grossPotentialRent - platformFees;

  const propertyManagement = effectiveGrossIncome * (expenses.propertyManagementPct / 100);
  const maintenance = roomRevenue * (expenses.maintenancePct / 100);
  const capEx = roomRevenue * (expenses.capExPct / 100);
  const supplies = str.monthlySupplies * 12;
  const fixedAnnual =
    expenses.annualPropertyTaxes +
    expenses.annualInsurance +
    expenses.monthlyHoa * 12 +
    expenses.monthlyUtilities * 12 +
    expenses.monthlyLandscaping * 12 +
    expenses.monthlySnowRemoval * 12 +
    expenses.monthlyOtherExpenses * 12;

  const operatingExpenses = propertyManagement + maintenance + capEx + supplies + fixedAnnual;
  const noi = effectiveGrossIncome - operatingExpenses;
  const debtService = mortgage.totalMonthlyPayment * 12;
  const cashFlow = noi - debtService;

  return {
    grossPotentialRent,
    vacancyLoss: 0,
    effectiveGrossIncome,
    operatingExpenses,
    noi,
    debtService,
    cashFlow,
    cashFlowMonthly: cashFlow / 12,
  };
}
