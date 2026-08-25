import { PropertyDataProvider, PropertyRecord } from "../types";

/**
 * Deterministic mock provider for V1. Generates plausible property data
 * from a hash of the address so the same address always returns the same
 * numbers (useful for testing / demos). This is the provider that gets
 * swapped out for Zillow/ATTOM/Estated/Rentometer/etc. in production —
 * see PropertyDataProvider for the interface every real provider must
 * satisfy.
 */
export class MockPropertyProvider implements PropertyDataProvider {
  readonly name = "Mock Provider (V1 placeholder)";

  async lookup(address: string): Promise<PropertyRecord> {
    const seed = hashString(address.trim().toLowerCase());
    const rand = mulberry32(seed);

    const beds = 2 + Math.floor(rand() * 4); // 2-5
    const baths = Math.max(1, beds - Math.floor(rand() * 2));
    const sqft = Math.round((900 + rand() * 2400) / 10) * 10;
    const yearBuilt = Math.round(1955 + rand() * 68);
    const basePrice = Math.round((sqft * (140 + rand() * 260)) / 1000) * 1000;
    const estimatedValue = Math.round((basePrice * (0.94 + rand() * 0.12)) / 1000) * 1000;
    const monthlyRent = Math.round((estimatedValue * (0.006 + rand() * 0.0035)) / 5) * 5;
    const nightlyRate = Math.round((monthlyRent / 30) * (2.2 + rand() * 1.3));
    const occupancy = 0.45 + rand() * 0.3;
    const annualTaxes = Math.round((estimatedValue * (0.008 + rand() * 0.012)) / 10) * 10;
    const hasHoa = rand() > 0.6;

    return {
      address: titleCase(address.trim()),
      propertyType: pick(rand, ["Single Family", "Townhouse", "Condo", "Duplex"]),
      unitCount: null,
      listPrice: {
        value: basePrice,
        confidence: "medium",
        source: "Simulated listing estimate (mock provider)",
      },
      estimatedValue: {
        value: estimatedValue,
        confidence: "medium",
        source: "Simulated AVM estimate (mock provider)",
      },
      beds,
      baths,
      sqft,
      lotSizeSqft: Math.round((sqft * (1.2 + rand() * 3)) / 10) * 10,
      yearBuilt,
      annualPropertyTaxes: {
        value: annualTaxes,
        confidence: "low",
        source: "Estimated from regional tax rate average",
      },
      monthlyHoa: hasHoa
        ? {
            value: Math.round((50 + rand() * 350) / 5) * 5,
            confidence: "low",
            source: "Estimated (no HOA data source connected)",
          }
        : null,
      previousSalePrice: Math.round((basePrice * (0.6 + rand() * 0.25)) / 1000) * 1000,
      previousSaleDate: `${2014 + Math.floor(rand() * 9)}-${String(
        1 + Math.floor(rand() * 12)
      ).padStart(2, "0")}-01`,
      estimatedMonthlyRentLTR: {
        value: monthlyRent,
        confidence: "low",
        source: "Estimated from price-to-rent ratio (no rental API connected)",
      },
      estimatedNightlyRateSTR: {
        value: nightlyRate,
        confidence: "low",
        source: "Estimated from LTR comp (no STR API connected)",
      },
      estimatedOccupancySTR: {
        value: occupancy,
        confidence: "low",
        source: "Regional occupancy average (no STR API connected)",
      },
      notes: [
        "This is V1 mock data. Connect a real provider (Zillow, ATTOM, Estated, Rentometer, county assessor) to replace these estimates.",
        "All fields below are editable — override anything that doesn't match reality.",
      ],
    };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0 || 1;
}

// Small seedable PRNG so mock results are stable per-address.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}
