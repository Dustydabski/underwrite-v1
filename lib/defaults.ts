import { FullAssumptions, PropertyRecord, UnitMixRow } from "./types";

/** Builds sane default assumptions, pre-filled from whatever the property provider found. */
export function buildDefaultAssumptions(property: PropertyRecord): FullAssumptions {
  const purchasePrice = property.listPrice?.value ?? property.estimatedValue?.value ?? 400000;
  const monthlyRent = property.estimatedMonthlyRentLTR?.value ?? Math.round(purchasePrice * 0.007);

  const unitCount = property.unitCount && property.unitCount > 1 ? property.unitCount : 1;
  const unitMix: UnitMixRow[] =
    unitCount > 1
      ? [
          {
            id: "unit-1",
            label: "Unit",
            count: unitCount,
            monthlyRent: Math.round(monthlyRent / unitCount / 5) * 5,
          },
        ]
      : [{ id: "unit-1", label: "Whole property", count: 1, monthlyRent: monthlyRent }];
  const monthlyRentFromMix = unitMix.reduce((sum, row) => sum + row.count * row.monthlyRent, 0);

  return {
    purchase: {
      purchasePrice,
      closingCostsPct: 2.5,
      renovationBudget: 0,
      furnishingBudget: 0,
      otherAcquisitionCosts: 0,
    },
    financing: {
      downPaymentPct: 20,
      interestRatePct: 7,
      loanTermYears: 30,
      pmiPctOfLoan: 0.5,
      loanType: "conventional",
    },
    expenses: {
      annualPropertyTaxes: property.annualPropertyTaxes?.value ?? Math.round(purchasePrice * 0.011),
      annualInsurance: Math.round(purchasePrice * 0.0035),
      monthlyHoa: property.monthlyHoa?.value ?? 0,
      propertyManagementPct: 8,
      maintenancePct: 5,
      capExPct: 5,
      vacancyPct: 5,
      monthlyUtilities: 0,
      monthlyLandscaping: 0,
      monthlySnowRemoval: 0,
      monthlyOtherExpenses: 0,
    },
    growth: {
      annualAppreciationPct: 3,
      annualRentGrowthPct: 3,
      annualExpenseGrowthPct: 3,
    },
    rental: {
      strategy: "ltr",
      monthlyRentLTR: monthlyRentFromMix,
      unitMix,
      str: {
        enabled: Boolean(property.estimatedNightlyRateSTR),
        avgNightlyRate: property.estimatedNightlyRateSTR?.value ?? Math.round(monthlyRent / 30) * 3,
        occupancyPct: property.estimatedOccupancySTR?.value ?? 0.55,
        cleaningFeePerStay: 120,
        avgStayLengthNights: 3,
        platformFeePct: 3,
        monthlySupplies: 75,
      },
    },
    criteria: {
      minCashOnCashPct: 8,
      minIrrPct: 12,
    },
  };
}
