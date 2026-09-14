import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME } from "@/lib/rateLimit";

/**
 * Visit /api/admin-login?key=<ADMIN_ACCESS_KEY> once in your browser to set
 * a long-lived cookie that exempts you from the per-IP rate limit on
 * /api/lookup. Bookmark that URL for yourself; nobody else knows the key.
 */
export async function GET(req: NextRequest) {
  const adminKey = process.env.ADMIN_ACCESS_KEY;
  const providedKey = req.nextUrl.searchParams.get("key");

  if (!adminKey || !providedKey || providedKey !== adminKey) {
    return NextResponse.json({ error: "Invalid or missing key." }, { status: 403 });
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(ADMIN_COOKIE_NAME, adminKey, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
  return res;
}
