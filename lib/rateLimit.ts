import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

/**
 * Cost protection for the property-lookup endpoint, backed by Upstash Redis
 * (Vercel's "Storage" tab -> Marketplace -> Upstash for Redis, free tier).
 *
 * Two independent guards:
 *  - Per-IP rate limit: blocks a single abusive client from hammering the
 *    endpoint.
 *  - Per-provider monthly budget: hard-caps how many calls we'll ever make
 *    to a paid provider (RentCast, ATTOM) in a calendar month, regardless
 *    of how many different clients are asking — this is the real protection
 *    against a surprise bill, since those vendors don't offer a hard cap
 *    themselves.
 *
 * Fails OPEN (no protection) if Redis env vars aren't configured, so the
 * app still works before you've set up Upstash — but that means there is
 * NO cost protection until you do. Set it up before sharing this publicly.
 */

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Max requests per IP per hour. Fails open (allows) if Redis isn't configured. */
export async function checkIpRateLimit(ip: string, maxPerHour = 20): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;

  const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
  const key = `ratelimit:ip:${ip}:${bucket}`;
  const count = await client.incr(key);
  if (count === 1) await client.expire(key, 60 * 60);
  return count <= maxPerHour;
}

/**
 * Atomically reserves `cost` units of a named monthly budget (e.g. one
 * provider's paid API calls). Returns false — and does NOT reserve anything
 * — if this would exceed `monthlyCap`. Fails open (allows, uncapped) if
 * Redis isn't configured.
 */
export async function reserveMonthlyBudget(
  budgetKey: string,
  cost: number,
  monthlyCap: number
): Promise<boolean> {
  const client = getRedis();
  if (!client) return true;

  const month = new Date().toISOString().slice(0, 7); // "2026-09"
  const key = `budget:${budgetKey}:${month}`;

  const newTotal = await client.incrby(key, cost);
  if (newTotal === cost) {
    // First increment this month — set expiry ~35 days out so old keys clean themselves up.
    await client.expire(key, 35 * 24 * 60 * 60);
  }
  if (newTotal > monthlyCap) {
    // Back out our reservation since we're refusing the call.
    await client.decrby(key, cost);
    return false;
  }
  return true;
}
