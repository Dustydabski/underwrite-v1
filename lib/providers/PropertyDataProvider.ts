import { PropertyDataProvider } from "../types";

// Re-exported for convenience so consumers only need one import path.
export type { PropertyDataProvider } from "../types";

/** Thrown when a provider cannot find a record for the given address. */
export class PropertyLookupError extends Error {
  constructor(message: string, public readonly providerName: string) {
    super(message);
    this.name = "PropertyLookupError";
  }
}

/**
 * Registry of available providers. V1 ships with MockPropertyProvider only.
 * To add a real provider (Zillow, ATTOM, Estated, Rentometer, county
 * assessor, etc.), implement PropertyDataProvider and register it here.
 * The rest of the app only ever talks to the PropertyDataProvider
 * interface, so swapping providers requires no changes elsewhere.
 */
export class ProviderRegistry {
  private providers: PropertyDataProvider[] = [];

  register(provider: PropertyDataProvider) {
    this.providers.push(provider);
    return this;
  }

  /** Uses the first registered provider that returns a result. */
  async lookup(address: string) {
    if (this.providers.length === 0) {
      throw new Error("No property data providers registered.");
    }
    let lastError: unknown = null;
    for (const provider of this.providers) {
      try {
        return await provider.lookup(address);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("All property data providers failed.");
  }
}
