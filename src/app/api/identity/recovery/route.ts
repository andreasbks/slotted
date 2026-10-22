import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  newDeviceToken,
  readDeviceToken,
  secureCookie,
} from "@/lib/auth-server";
import {
  consumeRateLimit,
  hashSecret,
  issueRecoveryKey,
  redeemRecoveryKey,
  rotateDeviceIdentity,
} from "@/lib/store-server";
import { RECOVERY_ATTEMPT_LIMIT, RECOVERY_WINDOW_MS } from "@/lib/rate-limit";
import { blockedBySetup, respondToFailure } from "@/lib/request-failure";

export async function POST(request: Request) {
  const blocked = blockedBySetup("guest");
  if (blocked) return blocked;
  try {
    assertSameOrigin(request);
    const body = await request.json();
    if (body.action === "issue") {
      const deviceToken = await readDeviceToken();
      if (!deviceToken) {
        return NextResponse.json({ error: "No guest access to save." }, { status: 401 });
      }
      const key = await issueRecoveryKey(hashSecret(deviceToken));
      return NextResponse.json(
        { key },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const source =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limitKey = `recovery:${source}`;
    const limit = await consumeRateLimit(
      limitKey,
      RECOVERY_ATTEMPT_LIMIT,
      RECOVERY_WINDOW_MS
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        }
      );
    }
    const previousHash = await redeemRecoveryKey(String(body.key || ""));
    if (!previousHash) {
      return NextResponse.json(
        { error: "That key is invalid, expired, or already used." },
        { status: 400 }
      );
    }
    const nextToken = newDeviceToken();
    const nextHash = hashSecret(nextToken);
    await rotateDeviceIdentity(previousHash, nextHash);
    const replacementKey = await issueRecoveryKey(nextHash);
    const response = NextResponse.json(
      { restored: true, replacementKey },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set("__Host-slotted-device", nextToken, {
      ...secureCookie,
      maxAge: 400 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return respondToFailure(error, "Couldn’t do that. Try again.", "guest");
  }
}
