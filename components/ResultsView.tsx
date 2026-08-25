"use client";

import { AnalysisResult } from "@/lib/types";
import { fmtCurrency, fmtPct, fmtNum } from "@/lib/format";
import { ScoreStamp } from "./ScoreStamp";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function ResultsView({ result }: { result: AnalysisResult }) {
  const { property, assumptions, mortgage, returns, score, recommendation, reasons, maxPrice, scenarios, sensitivity } =
    result;
  const activeCashFlow = assumptions.rental.strategy === "str" && result.strCashFlow ? result.strCashFlow : result.ltrCashFlow;

  const chartData = returns.projections.map((p) => ({
    year: `Yr ${p.year}`,
    Equity: Math.round(p.equity),
    "Loan balance": Math.round(p.loanBalance),
    "Cumulative cash flow": Math.round(p.cumulativeCashFlow),
  }));

  return (
    <div className="space-y-8">
      {/* 1 & 2. Investment decision */}
      <section className="bg-white border border-line rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
          <ScoreStamp recommendation={recommendation} score={score.total} />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-ink/50 mb-1">{property.address}</div>
            <p className="font-display text-xl sm:text-2xl leading-snug">
              {recommendation === "BUY" &&
                "This property appears attractive at the current price, given the selected assumptions."}
              {recommendation === "CONSIDER" &&
                "This deal is borderline — it may work with tighter terms or a lower price."}
              {recommendation === "PASS" &&
                "This property does not meet a reasonable investment bar at the current price and assumptions."}
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-8 pt-6 border-t border-line">
          <div>
            <h4 className="text-sm font-semibold text-moss-600 mb-2">Why we like it</h4>
            <ul className="space-y-1.5 text-sm">
              {reasons.pros.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-moss-500">+</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-rust-500 mb-2">Risks</h4>
            <ul className="space-y-1.5 text-sm">
              {reasons.risks.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-rust-500">–</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Score breakdown */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-4">Investment score breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <ScoreBar label="Cash flow" value={score.cashFlow} max={25} />
          <ScoreBar label="Cash-on-cash" value={score.cashOnCash} max={20} />
          <ScoreBar label="Cap rate" value={score.capRate} max={15} />
          <ScoreBar label="IRR" value={score.irr} max={20} />
          <ScoreBar label="Price vs. value" value={score.priceVsValue} max={10} />
          <ScoreBar label="Market" value={score.marketFundamentals} max={10} />
        </div>
      </section>

      {/* Key numbers */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KeyNumber label="Monthly cash flow" value={fmtCurrency(activeCashFlow.cashFlowMonthly)} accent={activeCashFlow.cashFlowMonthly >= 0 ? "moss" : "rust"} />
        <KeyNumber label="Cash-on-cash (yr 1)" value={fmtPct(returns.year1CashOnCash * 100)} />
        <KeyNumber label="Cap rate (yr 1)" value={fmtPct(returns.year1CapRate * 100)} />
        <KeyNumber label="10-yr IRR" value={fmtPct(returns.irr10)} />
      </section>

      {/* Cash flow */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-4">Year 1 cash flow ({assumptions.rental.strategy === "str" ? "short-term rental" : "long-term rental"})</h3>
        <table className="w-full text-sm">
          <tbody>
            <Row label="Gross potential income" value={activeCashFlow.grossPotentialRent} />
            {activeCashFlow.vacancyLoss > 0 && <Row label="Vacancy loss" value={-activeCashFlow.vacancyLoss} />}
            <Row label="Effective gross income" value={activeCashFlow.effectiveGrossIncome} bold />
            <Row label="Operating expenses" value={-activeCashFlow.operatingExpenses} />
            <Row label="Net operating income (NOI)" value={activeCashFlow.noi} bold />
            <Row label="Debt service" value={-activeCashFlow.debtService} />
            <Row label="Annual cash flow" value={activeCashFlow.cashFlow} bold accent />
            <Row label="Monthly cash flow" value={activeCashFlow.cashFlowMonthly} bold accent />
          </tbody>
        </table>
      </section>

      {/* Financing */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-4">Financing</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="Loan amount" value={fmtCurrency(mortgage.loanAmount)} />
          <Stat label="Monthly P&I" value={fmtCurrency(mortgage.monthlyPI)} />
          <Stat label="Monthly PMI" value={fmtCurrency(mortgage.monthlyPmi)} />
          <Stat label="Cash to close" value={fmtCurrency(mortgage.cashToClose)} />
        </div>
      </section>

      {/* Return projections */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-1">Return projections</h3>
        <p className="text-sm text-ink/50 mb-4">
          {fmtPct(assumptions.growth.annualAppreciationPct)} appreciation · {fmtPct(assumptions.growth.annualRentGrowthPct)} rent growth ·{" "}
          {fmtPct(assumptions.growth.annualExpenseGrowthPct)} expense growth
        </p>
        <div className="h-72 w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#E4E4DF" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} stroke="#0B1120" />
              <YAxis tick={{ fontSize: 12 }} stroke="#0B1120" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} />
              <Legend />
              <Line type="monotone" dataKey="Equity" stroke="#2E5238" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Loan balance" stroke="#B5473C" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cumulative cash flow" stroke="#C9A24B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <ProjectionCard label="Year 1" p={returns.year1} cashInvested={returns.cashInvested} />
          <ProjectionCard label="Year 5" p={returns.fiveYear} cashInvested={returns.cashInvested} irr={returns.irr5} />
          <ProjectionCard label="Year 10" p={returns.tenYear} cashInvested={returns.cashInvested} irr={returns.irr10} />
        </div>
      </section>

      {/* Max purchase price */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-1">Maximum purchase price</h3>
        <p className="text-sm text-ink/50 mb-4">
          Based on a minimum {fmtPct(assumptions.criteria.minCashOnCashPct)} cash-on-cash return and a minimum{" "}
          {fmtPct(assumptions.criteria.minIrrPct)} 10-year IRR.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Stat label="Asking price" value={fmtCurrency(maxPrice.askingPrice)} />
          <Stat label={`Max for ${fmtPct(assumptions.criteria.minCashOnCashPct)} CoC`} value={fmtCurrency(maxPrice.maxPriceForCoc)} />
          <Stat label={`Max for ${fmtPct(assumptions.criteria.minIrrPct)} IRR`} value={fmtCurrency(maxPrice.maxPriceForIrr)} />
          <Stat label="Recommended max price" value={fmtCurrency(maxPrice.recommendedMaxPrice)} accent />
        </div>
      </section>

      {/* Scenario analysis */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-4">Scenario analysis</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {scenarios.map((s) => (
            <div key={s.label} className="border border-line rounded-md p-4">
              <div
                className={`text-[11px] uppercase tracking-wide font-semibold mb-3 ${
                  s.label === "Bear" ? "text-rust-500" : s.label === "Bull" ? "text-moss-600" : "text-ink/60"
                }`}
              >
                {s.label} case
              </div>
              <dl className="space-y-2 text-sm">
                <Kv k="Year 1 cash flow" v={fmtCurrency(s.cashFlowYear1)} />
                <Kv k="Year 10 value" v={fmtCurrency(s.propertyValueYear10)} />
                <Kv k="Year 10 equity" v={fmtCurrency(s.equityYear10)} />
                <Kv k="Year 10 total return" v={fmtCurrency(s.totalReturnYear10)} />
                <Kv k="10-yr IRR" v={fmtPct(s.irr10)} />
              </dl>
            </div>
          ))}
        </div>
      </section>

      {/* Sensitivity */}
      <section className="bg-white border border-line rounded-lg p-6">
        <h3 className="font-display text-lg mb-1">Purchase price sensitivity</h3>
        <p className="text-sm text-ink/50 mb-4">How returns change ±10% around the current purchase price.</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-line">
              <th className="py-2">Purchase price</th>
              <th className="py-2 num">Cash-on-cash</th>
              <th className="py-2 num">Cap rate</th>
              <th className="py-2 num">10-yr IRR</th>
            </tr>
          </thead>
          <tbody>
            {sensitivity.map((row) => {
              const isCurrent = row.purchasePrice === assumptions.purchase.purchasePrice;
              return (
                <tr key={row.purchasePrice} className={`border-b border-line/60 ${isCurrent ? "bg-moss-50" : ""}`}>
                  <td className="py-2 num">
                    {fmtCurrency(row.purchasePrice)} {isCurrent && <span className="text-moss-600 text-xs">← current</span>}
                  </td>
                  <td className="py-2 num">{fmtPct(row.cashOnCash)}</td>
                  <td className="py-2 num">{fmtPct(row.capRate)}</td>
                  <td className="py-2 num">{fmtPct(row.irr10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: number; bold?: boolean; accent?: boolean }) {
  return (
    <tr className="border-b border-line/60">
      <td className={`py-2 ${bold ? "font-semibold" : "text-ink/70"}`}>{label}</td>
      <td className={`py-2 num text-right ${bold ? "font-semibold" : ""} ${accent ? (value >= 0 ? "text-moss-600" : "text-rust-500") : ""}`}>
        {value < 0 ? `(${fmtCurrency(Math.abs(value))})` : fmtCurrency(value)}
      </td>
    </tr>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-ink/50 text-[11px] uppercase tracking-wide mb-1">{label}</div>
      <div className={`num text-base font-medium ${accent ? "text-moss-600" : ""}`}>{value}</div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink/50">{k}</dt>
      <dd className="num font-medium">{v}</dd>
    </div>
  );
}

function KeyNumber({ label, value, accent }: { label: string; value: string; accent?: "moss" | "rust" }) {
  return (
    <div className="bg-white border border-line rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wide text-ink/50 mb-1">{label}</div>
      <div className={`num text-xl font-semibold ${accent === "moss" ? "text-moss-600" : accent === "rust" ? "text-rust-500" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-ink/60">{label}</span>
        <span className="num text-ink/60">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 70 ? "bg-moss-500" : pct >= 40 ? "bg-gold-400" : "bg-rust-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function ProjectionCard({
  label,
  p,
  cashInvested,
  irr,
}: {
  label: string;
  p: AnalysisResult["returns"]["year1"];
  cashInvested: number;
  irr?: number;
}) {
  return (
    <div className="border border-line rounded-md p-4">
      <div className="text-[11px] uppercase tracking-wide text-ink/50 mb-3">{label}</div>
      <dl className="space-y-2 text-sm">
        <Kv k="Property value" v={fmtCurrency(p.propertyValue)} />
        <Kv k="Loan balance" v={fmtCurrency(p.loanBalance)} />
        <Kv k="Equity" v={fmtCurrency(p.equity)} />
        <Kv k="Cumulative cash flow" v={fmtCurrency(p.cumulativeCashFlow)} />
        <Kv k="Total profit if sold" v={fmtCurrency(p.totalProfitIfSold)} />
        <Kv k="ROI" v={fmtPct(p.roi * 100)} />
        {irr !== undefined && <Kv k="IRR" v={fmtPct(irr)} />}
      </dl>
    </div>
  );
}
