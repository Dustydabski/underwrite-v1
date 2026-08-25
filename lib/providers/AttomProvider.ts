import { PropertyDataProvider, PropertyRecord } from "../types";
import { PropertyLookupError } from "./PropertyDataProvider";

/**
 * Real property/tax/valuation/rent data via ATTOM Data's Property API.
 * Covers arbitrary US addresses (unlike the SimplyRETS sandbox, which only
 * has ~100 fake demo listings). Requires a free-trial API key from
 * https://api.developer.attomdata.com/signup — set ATTOM_API_KEY.
 * Rent estimates come from ATTOM's separate Rental AVM product
 * (/valuation/rentalavm), which only covers single-family residences and
 * may not be included in every plan tier — fetched best-effort, so a
 * missing rent estimate doesn't fail the whole lookup.
 *
 * ATTOM's JSON field casing is inconsistent across their own docs/versions
 * (some fields camelCase, some all-lowercase). Field access below checks
 * both variants defensively; verify against a real response once you have
 * a key and adjust if ATTOM has since changed field names.
 */
export class AttomProvider implements PropertyDataProvider {
  readonly name = "ATTOM Data (Property API)";

  private readonly baseUrl = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";
  private readonly apiKey = process.env.ATTOM_API_KEY;

  async lookup(address: string): Promise<PropertyRecord> {
    if (!this.apiKey) {
      throw new PropertyLookupError(
        "ATTOM_API_KEY is not set. Sign up for a free trial at https://api.developer.attomdata.com/signup and set it as an env var.",
        this.name
      );
    }

    const { address1, address2 } = splitAddress(address);
    const url = `${this.baseUrl}/property/expandedprofile?address1=${encodeURIComponent(
      address1
    )}&address2=${encodeURIComponent(address2)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { APIKey: this.apiKey, Accept: "application/json" },
        cache: "no-store",
      });
    } catch (err) {
      throw new PropertyLookupError(
        `ATTOM request failed: ${err instanceof Error ? err.message : String(err)}`,
        this.name
      );
    }

    if (!res.ok) {
      throw new PropertyLookupError(`ATTOM returned ${res.status} ${res.statusText}`, this.name);
    }

    const body = await res.json();
    const record = body?.property?.[0];
    if (!record) {
      throw new PropertyLookupError(`No ATTOM record found for "${address}".`, this.name);
    }

    // Rental AVM is a separate product/entitlement — fetched best-effort in
    // parallel and never fails the whole lookup if it's unavailable (wrong
    // plan tier, non-SFR property, etc).
    const rentalAvm = await this.fetchRentalAvm(address1, address2);

    return toPropertyRecord(record, address, rentalAvm);
  }

  private async fetchRentalAvm(
    address1: string,
    address2: string
  ): Promise<{ value: number; low: number | null; high: number | null } | null> {
    const url = `${this.baseUrl}/valuation/rentalavm?address1=${encodeURIComponent(
      address1
    )}&address2=${encodeURIComponent(address2)}`;
    try {
      const res = await fetch(url, {
        headers: { APIKey: this.apiKey!, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = await res.json();
      const rec = body?.property?.[0];
      const value = toNumber(pick(rec, "avm.amount.value", "avm.amount.Value"));
      if (value == null) return null;
      return {
        value,
        low: toNumber(pick(rec, "avm.amount.low", "avm.amount.Low")),
        high: toNumber(pick(rec, "avm.amount.high", "avm.amount.High")),
      };
    } catch {
      return null;
    }
  }
}

function splitAddress(address: string): { address1: string; address2: string } {
  const parts = address.split(",");
  if (parts.length < 2) return { address1: address.trim(), address2: "" };
  const address1 = parts[0].trim();
  const address2 = parts.slice(1).join(",").trim();
  return { address1, address2 };
}

// Reads the first present key across a couple of plausible ATTOM casings.
function pick(obj: any, ...paths: string[]): any {
  for (const path of paths) {
    const value = path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
    if (value !== undefined && value !== null) return value;
  }
  return null;
}

function toNumber(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function toPropertyRecord(
  record: any,
  originalAddress: string,
  rentalAvm: { value: number; low: number | null; high: number | null } | null
): PropertyRecord {
  const fullAddress = pick(record, "address.oneLine", "address.oneline") ?? originalAddress;

  const beds = toNumber(pick(record, "building.rooms.beds", "building.rooms.bedsTotal"));
  const bathsFull = toNumber(pick(record, "building.rooms.bathsFull", "building.rooms.bathsfull"));
  const bathsTotal = toNumber(pick(record, "building.rooms.bathsTotal", "building.rooms.bathstotal"));
  const sqft = toNumber(
    pick(record, "building.size.universalSize", "building.size.universalsize", "building.size.livingSize")
  );
  const lotSizeAcres = toNumber(pick(record, "lot.lotSize1", "lot.lotsize1"));
  const lotSizeSqftDirect = toNumber(pick(record, "lot.lotSize2", "lot.lotsize2"));
  const yearBuilt = toNumber(pick(record, "summary.yearBuilt", "summary.yearbuilt", "building.summary.yearbuilt"));
  const unitCount = toNumber(
    pick(record, "building.summary.unitsCount", "building.summary.unitscount", "summary.unitsCount")
  );
  const propType =
    pick(record, "summary.propType", "summary.proptype", "summary.propertyType", "summary.propsubtype") ??
    "Unknown";

  const assessedValue = toNumber(pick(record, "assessment.assessed.assdTtlValue", "assessment.assessed.assdttlvalue"));
  const marketValue = toNumber(pick(record, "assessment.market.mktTtlValue", "assessment.market.mkttlvalue"));
  const taxAmt = toNumber(pick(record, "assessment.tax.taxAmt", "assessment.tax.taxamt"));
  const avmValue = toNumber(pick(record, "avm.amount.value", "avm.amount.Value"));

  const saleAmt = toNumber(pick(record, "sale.amount.saleAmt", "sale.amount.saleamt"));
  const saleDate = pick(record, "sale.amount.saleTransDate", "sale.amount.salerecdate", "sale.saleTransDate");

  return {
    address: fullAddress,
    propertyType: String(propType),
    unitCount,
    listPrice: null, // ATTOM is assessor/AVM data, not active listing data — no list price.
    estimatedValue:
      avmValue != null
        ? { value: avmValue, confidence: "medium", source: "ATTOM AVM" }
        : marketValue != null
        ? { value: marketValue, confidence: "low", source: "ATTOM assessor market value" }
        : null,
    beds,
    baths: bathsTotal ?? (bathsFull != null ? bathsFull : null),
    sqft,
    lotSizeSqft: lotSizeSqftDirect ?? (lotSizeAcres != null ? Math.round(lotSizeAcres * 43560) : null),
    yearBuilt,
    annualPropertyTaxes:
      taxAmt != null ? { value: taxAmt, confidence: "high", source: "ATTOM tax assessor record" } : null,
    monthlyHoa: null, // Not part of assessor data.
    previousSalePrice: saleAmt,
    previousSaleDate: typeof saleDate === "string" ? saleDate.slice(0, 10) : null,
    estimatedMonthlyRentLTR:
      rentalAvm != null
        ? { value: Math.round(rentalAvm.value), confidence: "medium", source: "ATTOM Rental AVM" }
        : null,
    estimatedNightlyRateSTR: null,
    estimatedOccupancySTR: null,
    notes: [
      "Source: ATTOM Data Property API (assessor + AVM data for a real address).",
      assessedValue != null
        ? `County-assessed value: $${assessedValue.toLocaleString()} (may lag market value).`
        : "",
      rentalAvm != null && rentalAvm.low != null && rentalAvm.high != null
        ? `Rental AVM range: $${Math.round(rentalAvm.low).toLocaleString()}–$${Math.round(
            rentalAvm.high
          ).toLocaleString()}/mo.`
        : rentalAvm == null
        ? "ATTOM Rental AVM had no estimate for this property (only covers single-family residences) — connect Rentometer or edit rent manually."
        : "",
      "ATTOM doesn't provide list price or HOA fees — connect an MLS feed for those, or edit manually.",
    ].filter(Boolean),
  };
}
