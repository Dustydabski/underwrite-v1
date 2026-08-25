# Underwrite — Real Estate Investment Analyzer (V1)

A working local app that takes a property address, lets you review/edit assumptions,
and produces a full investment underwriting: cash flow, returns, a transparent 0–100
score, a BUY / CONSIDER / PASS call, max purchase price, scenario analysis, and a
purchase-price sensitivity table.

V1 ships with a **simulated property data provider** so the entire flow works end to
end today. The architecture is built so a real data source can be swapped in without
touching any UI or calculation code.

## Running it locally

Requirements: Node.js 18.18+ (works on 20/22).

```bash
cd reia
npm install
npm run dev
```

Open http://localhost:3000. Enter any address (e.g. "123 Main St, Sedona, AZ") — the
mock provider will always return the same numbers for the same address, so it's safe
to test repeatedly.

For a production-style run: `npm run build && npm run start`.

## How it works

1. **Address entry** → `POST /api/lookup` calls the registered `PropertyDataProvider`
   (currently `MockPropertyProvider`) and returns a `PropertyRecord` plus default
   assumptions pre-filled from it.
2. **Review & edit assumptions** → every field (purchase, financing, expenses, growth,
   rental strategy, your investment criteria) is editable before you run the numbers.
3. **Run analysis** → `POST /api/analyze` runs the pure calculation engine
   (`lib/analyze.ts`) and returns the full `AnalysisResult`: cash flow, 1/5/10-year
   projections, IRR, the investment score breakdown, recommendation, max purchase
   price, scenarios, and sensitivity table.

## File / folder structure

```
reia/
  app/
    page.tsx                 Home page (renders the client wizard)
    layout.tsx                Root layout, fonts
    globals.css                Design tokens / Tailwind
    api/
      lookup/route.ts          POST address -> PropertyRecord + default assumptions
      analyze/route.ts         POST property + assumptions -> AnalysisResult
  components/
    AnalyzerApp.tsx             3-step wizard: address -> assumptions -> results
    AssumptionsForm.tsx          All editable inputs, grouped by section
    ResultsView.tsx              Full results dashboard (score, cash flow, charts,
                                  max price, scenarios, sensitivity)
    ScoreStamp.tsx                BUY/CONSIDER/PASS "stamp" signature element
    ConfidenceBadge.tsx           High/medium/low confidence indicator
    Field.tsx                     Reusable form inputs
  lib/
    types.ts                      All shared domain types
    defaults.ts                   Builds default assumptions from a PropertyRecord
    analyze.ts                    Orchestrates the full analysis (pure function)
    format.ts                     Currency/percent formatting helpers
    providers/
      PropertyDataProvider.ts     The interface every data source implements +
                                   a ProviderRegistry for swapping/adding providers
      MockPropertyProvider.ts     V1's simulated data source
    calculations/
      mortgage.ts                 Loan payment, PMI, amortization
      cashflow.ts                 LTR and STR annual cash flow (NOI, debt service, etc.)
      returns.ts                  1–10 year projections, IRR (bisection), CoC, cap rate
      scoring.ts                  Transparent 100-point score + BUY/CONSIDER/PASS + reasons
      maxPrice.ts                 Solves for max price given min CoC / min IRR targets
      scenarios.ts                Bear / Base / Bull case
      sensitivity.ts               Purchase-price sensitivity table (±10%)
```

Financial math lives entirely in `lib/calculations/` — nothing is computed inside a
UI component, so the same engine can later be reused by a batch job, an API-only
product, or a different frontend.

## Swapping in a real property data provider

Everything in the app talks to the `PropertyDataProvider` interface
(`lib/types.ts` / `lib/providers/PropertyDataProvider.ts`), never to a specific
vendor. To add a real source:

1. Create `lib/providers/ZillowProvider.ts` (or Estated, Rentometer, county
   assessor, etc.) implementing `lookup(address): Promise<PropertyRecord>`.
2. Register it in `app/api/lookup/route.ts`:
   `new ProviderRegistry().register(new ZillowProvider()).register(new MockPropertyProvider())`
   — the registry tries providers in order and falls back automatically, so you can
   mix a real listing API with the mock as a fallback while you're still wiring things up.
3. Nothing else changes. The UI and calculation engine only ever see `PropertyRecord`.

### Providers wired up so far

- **`AttomProvider`** (`lib/providers/AttomProvider.ts`) — real assessor + AVM +
  rent data for arbitrary US addresses via [ATTOM's Property API](https://api.developer.attomdata.com/signup).
  Requires `ATTOM_API_KEY` (free 30-day trial, self-serve). Pulls property/tax/AVM
  from `/property/expandedprofile` and monthly rent from ATTOM's separate
  **Rental AVM** product (`/valuation/rentalavm`, single-family only, fetched
  best-effort — a missing rent estimate doesn't fail the lookup). Still no list
  price or HOA data — those need an MLS feed / manual entry. **Field-path mapping
  is best-effort** — ATTOM's docs are inconsistent about exact JSON casing across
  versions, so once you have a key, do one live lookup and compare the raw response
  against `toPropertyRecord()` in that file before trusting it.
  - **Finding your key:** ATTOM has two portals. If you signed up at
    **cloud.attomdata.com**, your key is under the **Direct Integration** section.
    If you signed up at **api.developer.attomdata.com**, it's under
    **Account → Applications**.
- **`SimplyRetsProvider`** (`lib/providers/SimplyRetsProvider.ts`) — real RESO-shaped
  MLS API, but on SimplyRETS's public demo sandbox (~100 fake trial listings, not
  real addresses). Useful for validating the MLS integration shape before paying for
  a production MLS data agreement (which requires broker affiliation). Works out of
  the box with SimplyRETS's public demo credentials, no signup needed.
- Registry order in `app/api/lookup/route.ts`: **ATTOM → SimplyRETS → Mock**, so a
  real address gets real data when `ATTOM_API_KEY` is set, a SimplyRETS demo address
  gets sandbox MLS data, and anything else falls back to the synthetic mock.

Set `ATTOM_API_KEY` in `.env.local` (see `.env.local.example`).

## Recommended APIs for V2 (rent, STR, and beyond)

Property/tax/AVM (ATTOM) and MLS-shaped sandbox data (SimplyRETS) are wired up above.
The rest of this table is still unconnected — pick these up next.

| Need | Provider | What it gives you | Cost (as of research) | API key | Commercial use | Notes |
|---|---|---|---|---|---|---|
| Property details + AVM | **ATTOM Data** ✅ wired (`AttomProvider`) | Characteristics, tax assessor data, AVM value, sales history | Paid, tiered by call volume; free trial available | Yes | Yes | Broadest single-source coverage in the US; the most common "go-to" for underwriting tools |
| Property details + AVM | **Estated** | Similar to ATTOM — property, tax, ownership, valuation | Paid, usage-based | Yes | Yes | Often cheaper than ATTOM at low volume; alternative/backup to ATTOM |
| Zestimate / listing data | **Zillow (via Bridge Interactive / RapidAPI resellers)** | Zestimate, rent Zestimate, listing photos | Zillow does not offer a public self-serve API for this; access is via approved MLS/Bridge partners or third-party resellers of scraped/cached data | Varies | Restricted — Zillow's own ToS blocks most commercial redistribution | Treat as the hardest one to get cleanly; don't build a v1 dependency on it |
| Long-term rent comps | **Rentometer** | Rent estimate + comparable rentals for an address | Paid plans starting in the tens of dollars/month; API access requires higher-tier/business plan | Yes | Yes on paid API plans | Purpose-built for exactly this use case — this is the next highest-value integration since ATTOM doesn't provide rent |
| Short-term rental revenue | **AirDNA** | Nightly rate, occupancy, projected STR revenue by address/market | Paid, API access is enterprise-priced | Yes | Yes | The market standard for STR underwriting; expensive but hard to substitute |
| County assessor / public records | **County GIS / assessor open-data portals** | Tax assessed value, parcel data, tax history | Free where available | No, usually open data | Yes | Coverage and format vary wildly by county; good free supplement, not a full replacement |
| MLS / active listings | **Realtor/MLS via RESO Web API through an approved vendor (e.g. SimplyRETS, Trestle)** | Live list price, status, listing photos | Paid, usage-based; MLS access itself typically requires broker affiliation | Yes | Requires MLS/broker agreement | `SimplyRetsProvider` ✅ wired against the free demo sandbox only — a production feed needs a broker/MLS agreement, not just an API key |

Practical v2 sequencing: **ATTOM is wired for both property/tax/AVM and LTR rent**
(needs your own API key to go live — Rental AVM only covers single-family, so
non-SFR or Rental-AVM-miss properties still fall back to manual entry). Rentometer
is now optional — only worth adding if you want a second rent opinion or coverage
ATTOM's Rental AVM misses. Add **AirDNA/AirROI** once STR is a real priority.
Treat Zillow and a production MLS feed as later-stage integrations that need a business
relationship, not just an API key.

## Highest-value V2 features

1. Real property + rent data (the two items above) — this is what turns the tool
   from a calculator into an actual underwriting product.
2. Save/compare multiple properties side by side.
3. PDF/shareable deal summary export (for showing a lender, partner, or agent).
4. Real market fundamentals (population/income/employment growth, rent growth,
   days on market) feeding the currently-neutral Market Fundamentals score.
5. AI deal-analysis layer (per the original spec): a model that reads the full
   structured `AnalysisResult` and writes a plain-English assessment, refusing to
   fabricate anything not present in the data ("insufficient data" instead of guessing).
6. Multi-unit / house-hack support (2-4 unit properties, one unit owner-occupied).
7. Portfolio-level rollup once a user has analyzed several properties.
8. Address autocomplete + input validation.

## What was deliberately left out of V1

Per the brief: no auth, no billing, no user accounts/profiles, no database. State
lives entirely in the browser during a session. Adding persistence (Postgres/Supabase)
is a reasonable early V2 step once you want to save analyzed properties.
