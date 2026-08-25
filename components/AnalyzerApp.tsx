"use client";

import { useState } from "react";
import { AnalysisResult, FullAssumptions, PropertyRecord } from "@/lib/types";
import { AssumptionsForm } from "./AssumptionsForm";
import { ResultsView } from "./ResultsView";
import { AddressAutocomplete } from "./AddressAutocomplete";

type Step = "address" | "assumptions" | "results";

export function AnalyzerApp() {
  const [step, setStep] = useState<Step>("address");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [property, setProperty] = useState<PropertyRecord | null>(null);
  const [assumptions, setAssumptions] = useState<FullAssumptions | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      setProperty(data.property);
      setAssumptions(data.assumptions);
      setStep("assumptions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!property || !assumptions) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ property, assumptions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl">Underwrite</span>
            <span className="text-[11px] text-ink/40 num">v1</span>
          </div>
          {step !== "address" && (
            <nav className="flex items-center gap-4 text-xs num text-ink/50">
              <StepDot active={step === "assumptions"} done={step === "results"} label="Assumptions" />
              <span>—</span>
              <StepDot active={step === "results"} done={false} label="Results" />
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {step === "address" && (
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="text-[11px] uppercase tracking-[0.15em] text-moss-600 font-medium mb-3">
              Property underwriting engine
            </div>
            <h1 className="font-display text-4xl sm:text-5xl leading-tight mb-4">
              Is this property a good investment?
            </h1>
            <p className="text-ink/60 mb-8">
              Enter an address and we&rsquo;ll pull what we can, let you fill in the rest, and underwrite the deal.
            </p>
            <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-3">
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, Sedona, AZ"
                className="flex-1"
                inputClassName="w-full border border-line bg-white rounded-md px-4 py-3 text-sm outline-none focus:border-moss-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-ink text-paper rounded-md px-6 py-3 text-sm font-medium hover:bg-moss-600 transition-colors disabled:opacity-50"
              >
                {loading ? "Looking up…" : "Analyze property"}
              </button>
            </form>
            {error && <p className="text-rust-500 text-sm mt-3">{error}</p>}
            <p className="text-[11px] text-ink/40 mt-6">
              V1 uses simulated property data so you can test the full underwriting flow end to end. Every number is
              editable on the next step.
            </p>
          </div>
        )}

        {step === "assumptions" && property && assumptions && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">Review the deal</h2>
              <button onClick={() => setStep("address")} className="text-sm text-ink/50 hover:text-ink underline">
                ← Search a different address
              </button>
            </div>
            <AssumptionsForm property={property} assumptions={assumptions} onChange={setAssumptions} />
            {error && <p className="text-rust-500 text-sm mt-4">{error}</p>}
            <div className="sticky bottom-4 mt-8 flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-ink text-paper rounded-md px-6 py-3 text-sm font-medium hover:bg-moss-600 transition-colors shadow-lg disabled:opacity-50"
              >
                {loading ? "Underwriting…" : "Run analysis →"}
              </button>
            </div>
          </div>
        )}

        {step === "results" && result && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl">Underwriting results</h2>
              <button onClick={() => setStep("assumptions")} className="text-sm text-ink/50 hover:text-ink underline">
                ← Edit assumptions
              </button>
            </div>
            <ResultsView result={result} />
          </div>
        )}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-10 text-[11px] text-ink/40">
        V1 · simulated property data · not investment advice
      </footer>
    </div>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <span className={active ? "text-ink font-medium" : done ? "text-moss-600" : ""}>{label}</span>
  );
}
