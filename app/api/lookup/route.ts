import { NextRequest, NextResponse } from "next/server";
import { ProviderRegistry } from "@/lib/providers/PropertyDataProvider";
import { MockPropertyProvider } from "@/lib/providers/MockPropertyProvider";
import { SimplyRetsProvider } from "@/lib/providers/SimplyRetsProvider";
import { AttomProvider } from "@/lib/providers/AttomProvider";
import { buildDefaultAssumptions } from "@/lib/defaults";

// Provider registry lives here so swapping/adding real providers (Zillow,
// Estated, Rentometer, county assessor, ...) is a one-line change.
// Tries ATTOM first (real assessor/AVM data for arbitrary US addresses,
// requires ATTOM_API_KEY), then SimplyRETS (real RESO-shaped MLS API, but
// demo sandbox only matches its own fake listings), then falls back to the
// fully-synthetic mock provider if nothing else found a match.
const registry = new ProviderRegistry()
  .register(new AttomProvider())
  .register(new SimplyRetsProvider())
  .register(new MockPropertyProvider());

export async function POST(req: NextRequest) {
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
