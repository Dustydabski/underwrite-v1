import { PropertyDataProvider, PropertyRecord } from "../types";
import { PropertyLookupError } from "./PropertyDataProvider";

/**
 * Real property/tax/AVM/rent/listing data via RentCast's API. Covers
 * arbitrary US addresses with self-serve signup (no approval queue, unlike
 * ATTOM) — get a key at https://developers.rentcast.io and set
 * RENTCAST_API_KEY. Free tier is 50 requests/month, and each lookup here
 * costs up to 4 requests (property record + value estimate + rent estimate
 * + active sale listing), so budget accordingly.
 */
export class RentCastProvider implements PropertyDataProvider {
  readonly name = "RentCast";

  private readonly baseUrl = "https://api.rentcast.io/v1";
  private readonly apiKey = process.env.RENTCAST_API_KEY;

  async lookup(address: string): Promise<PropertyRecord> {
    if (!this.apiKey) {
      throw new PropertyLookupError(
        "RENTCAST_API_KEY is not set. Sign up free at https://developers.rentcast.io and set it as an env var.",
        this.name
      );
    }

    const encodedAddress = encodeURIComponent(address.trim());

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/properties?address=${encodedAddress}`, {
        headers: { "X-Api-Key": this.apiKey, Accept: "application/json" },
        cache: "no-store",
      });
    } catch (err) {
      throw new PropertyLookupError(
        `RentCast request failed: ${err instanceof Error ? err.message : String(err)}`,
        this.name
      );
    }

    if (!res.ok) {
      throw new PropertyLookupError(`RentCast returned ${res.status} ${res.statusText}`, this.name);
    }

    const records = await res.json();
    const record = Array.isArray(records) ? records[0] : records;
    if (!record) {
      throw new PropertyLookupError(`No RentCast record found for "${address}".`, this.name);
    }

    // Value + rent estimates + active listing are separate billed endpoints
    // — fetched best effort in parallel so a miss on any doesn't fail the
    // whole lookup.
    const [valueEstimate, rentEstimate, saleListing] = await Promise.all([
      this.fetchEstimate("avm/value", encodedAddress, "price", "priceRangeLow", "priceRangeHigh"),
      this.fetchEstimate("avm/rent/long-term", encodedAddress, "rent", "rentRangeLow", "rentRangeHigh"),
      this.fetchSaleListing(encodedAddress),
    ]);

    return toPropertyRecord(record, address, valueEstimate, rentEstimate, saleListing);
  }

  private async fetchEstimate(
    path: string,
    encodedAddress: string,
    valueField: string,
    lowField: string,
    highField: string
  ): Promise<{ value: number; low: number | null; high: number | null } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/${path}?address=${encodedAddress}`, {
        headers: { "X-Api-Key": this.apiKey!, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = await res.json();
      const value = toNumber(body?.[valueField]);
      if (value == null) return null;
      return { value, low: toNumber(body?.[lowField]), high: toNumber(body?.[highField]) };
    } catch {
      return null;
    }
  }

  private async fetchSaleListing(
    encodedAddress: string
  ): Promise<{ price: number; status: string; daysOnMarket: number | null; listedDate: string | null } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/listings/sale?address=${encodedAddress}`, {
        headers: { "X-Api-Key": this.apiKey!, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const listings = await res.json();
      const listing = Array.isArray(listings) ? listings[0] : null;
      const price = toNumber(listing?.price);
      if (!listing || price == null) return null;
      return {
        price,
        status: listing.status ?? "Unknown",
        daysOnMarket: toNumber(listing.daysOnMarket),
        listedDate: typeof listing.listedDate === "string" ? listing.listedDate.slice(0, 10) : null,
      };
    } catch {
      return null;
    }
  }
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// taxAssessments/propertyTaxes are objects keyed by year, e.g. {"2023": {...}}.
function latestYearField(obj: any, field: string): number | null {
  if (!obj || typeof obj !== "object") return null;
  const years = Object.keys(obj).filter((k) => /^\d{4}$/.test(k));
  if (years.length === 0) return null;
  const latest = years.sort().reverse()[0];
  return toNumber(obj[latest]?.[field]);
}

function toPropertyRecord(
  record: any,
  originalAddress: string,
  valueEstimate: { value: number; low: number | null; high: number | null } | null,
  rentEstimate: { value: number; low: number | null; high: number | null } | null,
  saleListing: { price: number; status: string; daysOnMarket: number | null; listedDate: string | null } | null
): PropertyRecord {
  const annualPropertyTaxes = latestYearField(record.propertyTaxes, "total");
  const assessedValue = latestYearField(record.taxAssessments, "value");
  const isActiveListing = saleListing != null && saleListing.status?.toLowerCase() === "active";

  return {
    address: record.formattedAddress ?? originalAddress,
    propertyType: record.propertyType ?? "Unknown",
    unitCount: toNumber(record.features?.unitCount),
    listPrice: isActiveListing
      ? { value: saleListing!.price, confidence: "high", source: "RentCast active listing" }
      : null,
    estimatedValue:
      valueEstimate != null
        ? { value: Math.round(valueEstimate.value), confidence: "medium", source: "RentCast AVM" }
        : assessedValue != null
        ? { value: assessedValue, confidence: "low", source: "RentCast tax-assessed value" }
        : null,
    beds: toNumber(record.bedrooms),
    baths: toNumber(record.bathrooms),
    sqft: toNumber(record.squareFootage),
    lotSizeSqft: toNumber(record.lotSize),
    yearBuilt: toNumber(record.yearBuilt),
    annualPropertyTaxes:
      annualPropertyTaxes != null
        ? { value: annualPropertyTaxes, confidence: "high", source: "RentCast tax record" }
        : null,
    monthlyHoa:
      record.hoa?.fee != null
        ? { value: toNumber(record.hoa.fee)!, confidence: "low", source: "RentCast HOA fee (assumed monthly)" }
        : null,
    previousSalePrice: toNumber(record.lastSalePrice),
    previousSaleDate: typeof record.lastSaleDate === "string" ? record.lastSaleDate.slice(0, 10) : null,
    estimatedMonthlyRentLTR:
      rentEstimate != null
        ? { value: Math.round(rentEstimate.value), confidence: "medium", source: "RentCast rent estimate" }
        : null,
    estimatedNightlyRateSTR: null,
    estimatedOccupancySTR: null,
    notes: [
      "Source: RentCast (property + tax + AVM + rent estimate for a real address).",
      isActiveListing
        ? `Actively listed for sale${
            saleListing!.daysOnMarket != null ? ` (${saleListing!.daysOnMarket} days on market)` : ""
          }${saleListing!.listedDate ? `, listed ${saleListing!.listedDate}` : ""}.`
        : "Not currently listed for sale on RentCast — purchase price defaults to the AVM estimate; edit if you have a real asking price.",
      valueEstimate?.low != null && valueEstimate?.high != null
        ? `Value estimate range: $${Math.round(valueEstimate.low).toLocaleString()}–$${Math.round(
            valueEstimate.high
          ).toLocaleString()}.`
        : "",
      rentEstimate?.low != null && rentEstimate?.high != null
        ? `Rent estimate range: $${Math.round(rentEstimate.low).toLocaleString()}–$${Math.round(
            rentEstimate.high
          ).toLocaleString()}/mo.`
        : "",
      "RentCast doesn't provide STR data — connect AirDNA/AirROI for that, or edit manually.",
    ].filter(Boolean),
  };
}
