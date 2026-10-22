import { NextResponse } from "next/server";
import {
  accessCookieName,
  assertSameOrigin,
  secureCookie,
} from "@/lib/auth-server";
import {
  clearRateLimit,
  consumeRateLimit,
  issueAccessGrant,
  verifyPollPassword,
} from "@/lib/store-server";
import {
  PASSWORD_ATTEMPT_LIMIT,
  PASSWORD_WINDOW_MS,
} from "@/lib/rate-limit";
import { blockedBySetup, respondToFailure } from "@/lib/request-failure";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const blocked = blockedBySetup("guest");
  if (blocked) return blocked;
  try {
    assertSameOrigin(request);
    const { slug } = await context.params;
    const source =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    const key = `password:${slug}:${source}`;
    const limit = await consumeRateLimit(
      key,
      PASSWORD_ATTEMPT_LIMIT,
      PASSWORD_WINDOW_MS
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { valid: false, error: "Try again in a few minutes." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
      );
    }
    const body = await request.json();
    const valid = await verifyPollPassword(slug, String(body.password || ""));
    if (!valid) {
      return NextResponse.json(
        { valid: false, error: "That password doesn’t match." },
        { status: 401 }
      );
    }
    await clearRateLimit(key);
    const grant = await issueAccessGrant(slug);
    const response = NextResponse.json({ valid: true });
    response.cookies.set(accessCookieName(slug), grant.token, {
      ...secureCookie,
      expires: grant.expiresAt,
    });
    return response;
  } catch (error) {
    return respondToFailure(
      error,
      "Couldn’t check that password. Try again.",
      "guest"
    );
  }
}
