import { PropertyDataProvider, PropertyRecord } from "../types";
import { PropertyLookupError } from "./PropertyDataProvider";
import { reserveMonthlyBudget } from "../rateLimit";

/**
 * Wraps a paid provider so it hard-refuses to make more calls once a
 * self-imposed monthly budget is exhausted — protects against surprise
 * bills once this app has multiple/anonymous users, since neither RentCast
 * nor ATTOM offer a hard usage cap themselves. When refused, the registry
 * falls through to the next provider (typically Mock) instead of erroring.
 */
export class BudgetGuardedProvider implements PropertyDataProvider {
  constructor(
    private readonly inner: PropertyDataProvider,
    private readonly budgetKey: string,
    private readonly costPerLookup: number,
    private readonly monthlyCap: number
  ) {}

  get name() {
    return this.inner.name;
  }

  async lookup(address: string): Promise<PropertyRecord> {
    const allowed = await reserveMonthlyBudget(this.budgetKey, this.costPerLookup, this.monthlyCap);
    if (!allowed) {
      throw new PropertyLookupError(
        `${this.inner.name} monthly budget (${this.monthlyCap} calls) exhausted — skipping to protect against overage billing.`,
        this.inner.name
      );
    }
    return this.inner.lookup(address);
  }
}
