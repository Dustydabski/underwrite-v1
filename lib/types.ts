// Core domain types shared across the app.

export type Confidence = "high" | "medium" | "low";

export interface ConfidentValue<T> {
  value: T;
  confidence: Confidence;
  source: string;
}

export interface PropertyRecord {
  address: string;
  propertyType: string;
  unitCount: number | null;
  listPrice: ConfidentValue<number> | null;
  estimatedValue: ConfidentValue<number> | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSizeSqft: number | null;
  yearBuilt: number | null;
  annualPropertyTaxes: ConfidentValue<number> | null;
  monthlyHoa: ConfidentValue<number> | null;
  previousSalePrice: number | null;
  previousSaleDate: string | null;
  estimatedMonthlyRentLTR: ConfidentValue<number> | null;
  estimatedNightlyRateSTR: ConfidentValue<number> | null;
  estimatedOccupancySTR: ConfidentValue<number> | null; // 0-1
  notes: string[];
}

/** Modular contract every property data source must implement. */
export interface PropertyDataProvider {
  readonly name: string;
  lookup(address: string): Promise<PropertyRecord>;
}

export interface PurchaseAssumptions {
  purchasePrice: number;
  closingCostsPct: number; // of purchase price
  renovationBudget: number;
  furnishingBudget: number;
  otherAcquisitionCosts: number;
}

export interface FinancingAssumptions {
  downPaymentPct: number;
  interestRatePct: number; // annual
  loanTermYears: number;
  pmiPctOfLoan: number; // annual, applied if down payment < 20%
  loanType: "conventional" | "fha" | "dscr" | "cash";
}

export interface OperatingExpenseAssumptions {
  annualPropertyTaxes: number;
  annualInsurance: number;
  monthlyHoa: number;
  propertyManagementPct: number; // of effective gross income
  maintenancePct: number; // of gross rent
  capExPct: number; // of gross rent
  vacancyPct: number; // of gross potential rent
  monthlyUtilities: number;
  monthlyLandscaping: number;
  monthlySnowRemoval: number;
  monthlyOtherExpenses: number;
}

export interface GrowthAssumptions {
  annualAppreciationPct: number;
  annualRentGrowthPct: number;
  annualExpenseGrowthPct: number;
}

export interface StrAssumptions {
  enabled: boolean;
  avgNightlyRate: number;
  occupancyPct: number; // 0-1
  cleaningFeePerStay: number;
  avgStayLengthNights: number;
  platformFeePct: number; // Airbnb/VRBO fee, of gross booking revenue
  monthlySupplies: number;
}

/** One row of a rent roll: N units of a given type at a given monthly rent each. */
export interface UnitMixRow {
  id: string;
  label: string;
  count: number;
  monthlyRent: number;
}

export interface RentalStrategyAssumptions {
  strategy: "ltr" | "str";
  monthlyRentLTR: number;
  unitMix: UnitMixRow[];
  str: StrAssumptions;
}

export interface InvestmentCriteria {
  minCashOnCashPct: number;
  minIrrPct: number;
}

export interface FullAssumptions {
  purchase: PurchaseAssumptions;
  financing: FinancingAssumptions;
  expenses: OperatingExpenseAssumptions;
  growth: GrowthAssumptions;
  rental: RentalStrategyAssumptions;
  criteria: InvestmentCriteria;
}

export interface MortgageDetails {
  loanAmount: number;
  monthlyPI: number;
  monthlyPmi: number;
  totalMonthlyPayment: number;
  cashToClose: number;
}

export interface AnnualCashFlow {
  grossPotentialRent: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cashFlowMonthly: number;
}

export interface YearProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualCashFlow: number;
  cumulativeCashFlow: number;
  principalPaydown: number;
  cumulativePrincipalPaydown: number;
  appreciationGain: number;
  totalProfitIfSold: number;
  roi: number; // cumulative, on cash invested
}

export interface ReturnSummary {
  cashInvested: number;
  year1: YearProjection;
  year1CashOnCash: number;
  year1CapRate: number;
  fiveYear: YearProjection;
  tenYear: YearProjection;
  irr5: number;
  irr10: number;
  projections: YearProjection[]; // 1..10
}

export interface ScoreBreakdown {
  cashFlow: number; // /25
  cashOnCash: number; // /20
  capRate: number; // /15
  irr: number; // /20
  priceVsValue: number; // /10
  marketFundamentals: number; // /10
  total: number; // /100
}

export type Recommendation = "BUY" | "CONSIDER" | "AVOID";

export interface MaxPriceResult {
  askingPrice: number;
  maxPriceForCoc: number;
  maxPriceForIrr: number;
  recommendedMaxPrice: number;
  targetOfferPrice: number;
}

export interface ScenarioResult {
  label: "Bear" | "Base" | "Bull";
  cashFlowYear1: number;
  propertyValueYear10: number;
  equityYear10: number;
  totalReturnYear10: number;
  irr10: number;
}

export interface SensitivityRow {
  purchasePrice: number;
  cashOnCash: number;
  capRate: number;
  irr10: number;
}

export interface AnalysisResult {
  property: PropertyRecord;
  assumptions: FullAssumptions;
  mortgage: MortgageDetails;
  ltrCashFlow: AnnualCashFlow;
  strCashFlow: AnnualCashFlow | null;
  returns: ReturnSummary;
  score: ScoreBreakdown;
  recommendation: Recommendation;
  reasons: { pros: string[]; risks: string[] };
  maxPrice: MaxPriceResult;
  scenarios: ScenarioResult[];
  sensitivity: SensitivityRow[];
}
