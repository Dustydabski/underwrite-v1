import { PropertyDataProvider, PropertyRecord } from "../types";
import { PropertyLookupError } from "./PropertyDataProvider";

/**
 * Real MLS-shaped data via SimplyRETS (RESO-style REST API over a demo MLS
 * feed). Uses SimplyRETS's public demo credentials by default so this works
 * out of the box with no signup — set SIMPLYRETS_USER / SIMPLYRETS_SECRET
 * env vars to point at a real production account once you have one.
 *
 * IMPORTANT: the demo API only serves a fixed set of ~100 synthetic trial
 * listings (fake addresses, randomized data) — it will not find arbitrary
 * real-world addresses. It exists to validate the integration shape against
 * a real RESO-style API before paying for a production MLS data agreement.
 */
export class SimplyRetsProvider implements PropertyDataProvider {
  readonly name = "SimplyRETS (RESO demo sandbox)";

  private readonly baseUrl = "https://api.simplyrets.com/properties";
  private readonly user = process.env.SIMPLYRETS_USER || "simplyrets";
  private readonly secret = process.env.SIMPLYRETS_SECRET || "simplyrets";

  async lookup(address: string): Promise<PropertyRecord> {
    const url = `${this.baseUrl}?q=${encodeURIComponent(address.trim())}&limit=5`;
    const auth = Buffer.from(`${this.user}:${this.secret}`).toString("base64");

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Basic ${auth}` },
        cache: "no-store",
      });
    } catch (err) {
      throw new PropertyLookupError(
        `SimplyRETS request failed: ${err instanceof Error ? err.message : String(err)}`,
        this.name
      );
    }

    if (!res.ok) {
      throw new PropertyLookupError(
        `SimplyRETS returned ${res.status} ${res.statusText}`,
        this.name
      );
    }

    const listings: SimplyRetsListing[] = await res.json();
    if (!listings.length) {
      throw new PropertyLookupError(
        `No SimplyRETS demo listing matched "${address}". The sandbox only contains a small set of synthetic trial listings, not arbitrary real-world addresses.`,
        this.name
      );
    }

    return toPropertyRecord(listings[0]);
  }
}

// Only the fields we actually read; SimplyRETS listings carry many more.
interface SimplyRetsListing {
  address: { full: string };
  listPrice: number | null;
  property: {
    bedrooms: number | null;
    bathsFull: number | null;
    bathsHalf: number | null;
    area: number | null;
    yearBuilt: number | null;
    type: string | null;
    subTypeText: string | null;
    lotSizeArea: number | null;
    lotSizeAreaUnits: string | null;
  };
  association: { fee: number | null; frequency: string | null } | null;
  tax: { taxAnnualAmount: number | null } | null;
  sales: { closePrice: number | null; closeDate: string | null } | null;
}

function toPropertyRecord(listing: SimplyRetsListing): PropertyRecord {
  const baths =
    (listing.property.bathsFull ?? 0) + (listing.property.bathsHalf ?? 0) * 0.5;

  const lotSizeSqft = toSqft(
    listing.property.lotSizeArea,
    listing.property.lotSizeAreaUnits
  );

  const hoaFee = listing.association?.fee ?? null;
  const monthlyHoa =
    hoaFee != null
      ? {
          value: normalizeHoaToMonthly(hoaFee, listing.association?.frequency ?? null),
          confidence: "low" as const,
          source: `SimplyRETS HOA fee (frequency: ${listing.association?.frequency ?? "unspecified, assumed monthly"})`,
        }
      : null;

  return {
    address: listing.address.full,
    propertyType: listing.property.subTypeText || listing.property.type || "Unknown",
    unitCount: null,
    listPrice:
      listing.listPrice != null
        ? {
            value: listing.listPrice,
            confidence: "high",
            source: "SimplyRETS MLS listing (sandbox demo data)",
          }
        : null,
    estimatedValue: null,
    beds: listing.property.bedrooms ?? null,
    baths: baths || null,
    sqft: listing.property.area ?? null,
    lotSizeSqft,
    yearBuilt: listing.property.yearBuilt ?? null,
    annualPropertyTaxes:
      listing.tax?.taxAnnualAmount != null
        ? {
            value: listing.tax.taxAnnualAmount,
            confidence: "high",
            source: "SimplyRETS MLS tax record",
          }
        : null,
    monthlyHoa,
    previousSalePrice: listing.sales?.closePrice ?? null,
    previousSaleDate: listing.sales?.closeDate?.slice(0, 10) ?? null,
    estimatedMonthlyRentLTR: null,
    estimatedNightlyRateSTR: null,
    estimatedOccupancySTR: null,
    notes: [
      "Source: SimplyRETS demo sandbox — synthetic trial MLS data for integration testing, not a real listing.",
      "MLS feeds don't include rent or short-term-rental estimates; connect Rentometer/AirDNA for those, or edit the fields below manually.",
      "estimatedValue (AVM) isn't part of MLS data either — connect ATTOM/Estated for that, or the purchase price defaults to list price.",
    ],
  };
}

function toSqft(area: number | null, units: string | null): number | null {
  if (area == null) return null;
  if (!units || /sq ?ft/i.test(units)) return Math.round(area);
  if (/acre/i.test(units)) return Math.round(area * 43560);
  return Math.round(area);
}

function normalizeHoaToMonthly(fee: number, frequency: string | null): number {
  if (!frequency) return fee;
  if (/annual|year/i.test(frequency)) return Math.round(fee / 12);
  if (/quarter/i.test(frequency)) return Math.round(fee / 3);
  return fee;
}
