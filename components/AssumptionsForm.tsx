"use client";

import { FullAssumptions, PropertyRecord, UnitMixRow } from "@/lib/types";
import { Field, SectionCard, SelectField } from "./Field";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { UnitMixEditor } from "./UnitMixEditor";
import { fmtCurrency } from "@/lib/format";

function set<T>(obj: T, patch: Partial<T>): T {
  return { ...obj, ...patch };
}

export function AssumptionsForm({
  property,
  assumptions,
  onChange,
}: {
  property: PropertyRecord;
  assumptions: FullAssumptions;
  onChange: (a: FullAssumptions) => void;
}) {
  const a = assumptions;

  return (
    <div className="space-y-6">
      <SectionCard title={property.address} eyebrow="Property snapshot">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm mb-4">
          <Stat label="Type" value={property.propertyType} />
          {property.unitCount != null && property.unitCount > 1 && (
            <Stat label="Units" value={property.unitCount.toString()} />
          )}
          <Stat label="Beds / Baths" value={`${property.beds ?? "—"} / ${property.baths ?? "—"}`} />
          <Stat label="Sqft" value={property.sqft ? property.sqft.toLocaleString() : "—"} />
          <Stat label="Year built" value={property.yearBuilt?.toString() ?? "—"} />
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm border-t border-line pt-4">
          <div>
            <div className="text-ink/50 text-[11px] uppercase tracking-wide mb-1">List price</div>
            <div className="num text-base font-medium">
              {property.listPrice ? fmtCurrency(property.listPrice.value) : "—"}
            </div>
            {property.listPrice && (
              <div className="mt-1">
                <ConfidenceBadge confidence={property.listPrice.confidence} source={property.listPrice.source} />
              </div>
            )}
          </div>
          <div>
            <div className="text-ink/50 text-[11px] uppercase tracking-wide mb-1">Estimated value</div>
            <div className="num text-base font-medium">
              {property.estimatedValue ? fmtCurrency(property.estimatedValue.value) : "—"}
            </div>
            {property.estimatedValue && (
              <div className="mt-1">
                <ConfidenceBadge confidence={property.estimatedValue.confidence} source={property.estimatedValue.source} />
              </div>
            )}
          </div>
        </div>
        {property.notes.length > 0 && (
          <ul className="mt-4 text-[12px] text-ink/50 space-y-1 border-t border-line pt-3">
            {property.notes.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Purchase" eyebrow="1 of 6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Purchase price" suffix="$" value={a.purchase.purchasePrice} step={1000}
            onChange={(v) => onChange(set(a, { purchase: set(a.purchase, { purchasePrice: v }) }))} />
          <Field label="Closing costs" suffix="%" value={a.purchase.closingCostsPct} step={0.1}
            onChange={(v) => onChange(set(a, { purchase: set(a.purchase, { closingCostsPct: v }) }))} />
          <Field label="Renovation budget" suffix="$" value={a.purchase.renovationBudget} step={500}
            onChange={(v) => onChange(set(a, { purchase: set(a.purchase, { renovationBudget: v }) }))} />
          <Field label="Furnishing budget" suffix="$" value={a.purchase.furnishingBudget} step={500}
            onChange={(v) => onChange(set(a, { purchase: set(a.purchase, { furnishingBudget: v }) }))} />
          <Field label="Other acquisition costs" suffix="$" value={a.purchase.otherAcquisitionCosts} step={250}
            onChange={(v) => onChange(set(a, { purchase: set(a.purchase, { otherAcquisitionCosts: v }) }))} />
        </div>
      </SectionCard>

      <SectionCard title="Financing" eyebrow="2 of 6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SelectField label="Loan type" value={a.financing.loanType}
            options={[
              { value: "conventional", label: "Conventional" },
              { value: "fha", label: "FHA" },
              { value: "dscr", label: "DSCR" },
              { value: "cash", label: "Cash" },
            ]}
            onChange={(v) => onChange(set(a, { financing: set(a.financing, { loanType: v as any }) }))} />
          <Field label="Down payment" suffix="%" value={a.financing.downPaymentPct} step={1}
            onChange={(v) => onChange(set(a, { financing: set(a.financing, { downPaymentPct: v }) }))} />
          <Field label="Interest rate" suffix="%" value={a.financing.interestRatePct} step={0.125}
            onChange={(v) => onChange(set(a, { financing: set(a.financing, { interestRatePct: v }) }))} />
          <Field label="Loan term" suffix="yrs" value={a.financing.loanTermYears} step={5}
            onChange={(v) => onChange(set(a, { financing: set(a.financing, { loanTermYears: v }) }))} />
          <Field label="PMI (if <20% down)" suffix="%/yr" value={a.financing.pmiPctOfLoan} step={0.05}
            onChange={(v) => onChange(set(a, { financing: set(a.financing, { pmiPctOfLoan: v }) }))} />
        </div>
      </SectionCard>

      <SectionCard title="Rental strategy" eyebrow="3 of 6">
        <div className="mb-4">
          <SelectField label="Strategy" value={a.rental.strategy}
            options={[
              { value: "ltr", label: "Long-term rental" },
              { value: "str", label: "Short-term rental" },
            ]}
            onChange={(v) => onChange(set(a, { rental: set(a.rental, { strategy: v as any }) }))} />
        </div>
        {a.rental.strategy === "ltr" ? (
          <UnitMixEditor
            rows={a.rental.unitMix}
            onChange={(rows: UnitMixRow[]) =>
              onChange(
                set(a, {
                  rental: set(a.rental, {
                    unitMix: rows,
                    monthlyRentLTR: rows.reduce((sum, r) => sum + r.count * r.monthlyRent, 0),
                  }),
                })
              )
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Avg nightly rate" suffix="$" value={a.rental.str.avgNightlyRate} step={5}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { avgNightlyRate: v }) }) }))} />
            <Field label="Occupancy" suffix="%" value={Math.round(a.rental.str.occupancyPct * 100)} step={1}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { occupancyPct: v / 100 }) }) }))} />
            <Field label="Avg stay length" suffix="nights" value={a.rental.str.avgStayLengthNights} step={1}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { avgStayLengthNights: v }) }) }))} />
            <Field label="Cleaning fee / stay" suffix="$" value={a.rental.str.cleaningFeePerStay} step={10}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { cleaningFeePerStay: v }) }) }))} />
            <Field label="Platform fees" suffix="%" value={a.rental.str.platformFeePct} step={0.5}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { platformFeePct: v }) }) }))} />
            <Field label="Monthly supplies" suffix="$" value={a.rental.str.monthlySupplies} step={5}
              onChange={(v) => onChange(set(a, { rental: set(a.rental, { str: set(a.rental.str, { monthlySupplies: v }) }) }))} />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Operating expenses" eyebrow="4 of 6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Property taxes" suffix="$/yr" value={a.expenses.annualPropertyTaxes} step={100}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { annualPropertyTaxes: v }) }))} />
          <Field label="Insurance" suffix="$/yr" value={a.expenses.annualInsurance} step={50}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { annualInsurance: v }) }))} />
          <Field label="HOA" suffix="$/mo" value={a.expenses.monthlyHoa} step={5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { monthlyHoa: v }) }))} />
          <Field label="Property management" suffix="%" value={a.expenses.propertyManagementPct} step={0.5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { propertyManagementPct: v }) }))} />
          <Field label="Maintenance" suffix="%" value={a.expenses.maintenancePct} step={0.5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { maintenancePct: v }) }))} />
          <Field label="CapEx reserve" suffix="%" value={a.expenses.capExPct} step={0.5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { capExPct: v }) }))} />
          <Field label="Vacancy" suffix="%" value={a.expenses.vacancyPct} step={0.5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { vacancyPct: v }) }))} />
          <Field label="Utilities" suffix="$/mo" value={a.expenses.monthlyUtilities} step={5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { monthlyUtilities: v }) }))} />
          <Field label="Landscaping" suffix="$/mo" value={a.expenses.monthlyLandscaping} step={5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { monthlyLandscaping: v }) }))} />
          <Field label="Snow removal" suffix="$/mo" value={a.expenses.monthlySnowRemoval} step={5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { monthlySnowRemoval: v }) }))} />
          <Field label="Other expenses" suffix="$/mo" value={a.expenses.monthlyOtherExpenses} step={5}
            onChange={(v) => onChange(set(a, { expenses: set(a.expenses, { monthlyOtherExpenses: v }) }))} />
        </div>
      </SectionCard>

      <SectionCard title="Growth assumptions" eyebrow="5 of 6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Annual appreciation" suffix="%" value={a.growth.annualAppreciationPct} step={0.25}
            onChange={(v) => onChange(set(a, { growth: set(a.growth, { annualAppreciationPct: v }) }))} />
          <Field label="Annual rent growth" suffix="%" value={a.growth.annualRentGrowthPct} step={0.25}
            onChange={(v) => onChange(set(a, { growth: set(a.growth, { annualRentGrowthPct: v }) }))} />
          <Field label="Annual expense growth" suffix="%" value={a.growth.annualExpenseGrowthPct} step={0.25}
            onChange={(v) => onChange(set(a, { growth: set(a.growth, { annualExpenseGrowthPct: v }) }))} />
        </div>
      </SectionCard>

      <SectionCard title="Your investment criteria" eyebrow="6 of 6">
        <p className="text-sm text-ink/60 mb-4">Used to calculate the maximum price you should pay.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Min. cash-on-cash return" suffix="%" value={a.criteria.minCashOnCashPct} step={0.5}
            onChange={(v) => onChange(set(a, { criteria: set(a.criteria, { minCashOnCashPct: v }) }))} />
          <Field label="Min. IRR (10-yr)" suffix="%" value={a.criteria.minIrrPct} step={0.5}
            onChange={(v) => onChange(set(a, { criteria: set(a.criteria, { minIrrPct: v }) }))} />
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink/50 text-[11px] uppercase tracking-wide mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
