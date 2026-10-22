import { NextResponse } from "next/server";
import {
  accessCookieName,
  assertSameOrigin,
  secureCookie,
} from "@/lib/auth-server";
import {
  issueAccessGrant,
  verifyPollPassword,
} from "@/lib/store-server";

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    const source =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    const key = `${slug}:${source}`;
    const now = Date.now();
    const current = attempts.get(key);
    if (current && current.resetAt > now && current.count >= 5) {
      return NextResponse.json(
        { valid: false, error: "Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    } else {
      current.count += 1;
    }
    const body = await request.json();
    const valid = await verifyPollPassword(slug, String(body.password || ""));
    if (!valid) {
      return NextResponse.json(
        { valid: false, error: "That password doesn’t match." },
        { status: 401 }
      );
    }
    attempts.delete(key);
    const grant = await issueAccessGrant(slug);
    const response = NextResponse.json({ valid: true });
    response.cookies.set(accessCookieName(slug), grant.token, {
      ...secureCookie,
      expires: grant.expiresAt,
    });
    return response;
  } catch {
    return NextResponse.json(
      { valid: false, error: "Verification failed" },
      { status: 400 }
    );
  }
}
