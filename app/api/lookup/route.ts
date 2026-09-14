import { NextRequest, NextResponse } from "next/server";
import { ProviderRegistry } from "@/lib/providers/PropertyDataProvider";
import { MockPropertyProvider } from "@/lib/providers/MockPropertyProvider";
import { SimplyRetsProvider } from "@/lib/providers/SimplyRetsProvider";
import { AttomProvider } from "@/lib/providers/AttomProvider";
import { RentCastProvider } from "@/lib/providers/RentCastProvider";
import { BudgetGuardedProvider } from "@/lib/providers/BudgetGuardedProvider";
import { buildDefaultAssumptions } from "@/lib/defaults";
import { checkIpRateLimit, getClientIp, isAdminRequest } from "@/lib/rateLimit";

// Provider registry lives here so swapping/adding real providers (Zillow,
// Rentometer, county assessor, ...) is a one-line change.
// Tries RentCast first (property + tax + AVM + rent in one provider, real
// US addresses, self-serve no approval queue), then ATTOM (same category of
// data, requires ATTOM_API_KEY and account approval), then SimplyRETS (real
// RESO-shaped MLS API, but demo sandbox only matches its own fake listings),
// then falls back to the fully-synthetic mock provider if nothing matched.
//
// RentCast and ATTOM are wrapped in BudgetGuardedProvider: each lookup costs
// multiple real API calls (RentCast: property + value + rent + sale listing
// = 4; ATTOM: expandedprofile + rentalavm = 2), and neither vendor offers a
// hard usage cap, so we enforce our own monthly ceiling to prevent surprise
// billing once this app has more than one user. Per-IP requests are also
// throttled (default 5/hour, see checkIpRateLimit) with an admin cookie
// bypass for the owner (see /api/admin-login). All of this requires Upstash
// Redis (Vercel -> Storage -> Marketplace -> "Upstash for Redis") to
// actually take effect — without it, these guards fail open (no cap) and
// calls flow through as before. Caps are configurable via env vars;
// defaults are conservative.
const registry = new ProviderRegistry()
  .register(
    new BudgetGuardedProvider(
      new RentCastProvider(),
      "rentcast",
      4,
      Number(process.env.RENTCAST_MONTHLY_CAP) || 45
    )
  )
  .register(
    new BudgetGuardedProvider(new AttomProvider(), "attom", 2, Number(process.env.ATTOM_MONTHLY_CAP) || 90)
  )
  .register(new SimplyRetsProvider())
  .register(new MockPropertyProvider());

export async function POST(req: NextRequest) {
  // Admin cookie (set via /api/admin-login) skips the per-IP throttle so
  // the owner can keep working without getting caught by a limit that's
  // deliberately tight for everyone else. Still subject to the monthly
  // budget cap below — that's the real dollar ceiling, not a spam filter.
  if (!isAdminRequest(req)) {
    const ip = getClientIp(req);
    const withinRateLimit = await checkIpRateLimit(ip);
    if (!withinRateLimit) {
      return NextResponse.json(
        { error: "Too many requests from this address. Try again in a bit." },
        { status: 429 }
      );
    }
  }

  const body = await req.json().catch(() => null);
  const address = body?.address?.trim();

  if (!address) {
    return NextResponse.json({ error: "An address is required." }, { status: 400 });
  }

  try {
    const property = await registry.lookup(address);
    const assumptions = buildDefaultAssumptions(property);
    return NextResponse.json({ property, assumptions });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Property lookup failed." },
      { status: 500 }
    );
  }
}
