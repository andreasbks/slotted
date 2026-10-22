import { NextResponse } from "next/server";
import {
  assertSameOrigin,
  newDeviceToken,
  readDeviceToken,
  secureCookie,
} from "@/lib/auth-server";
import {
  hashSecret,
  issueRecoveryKey,
  redeemRecoveryKey,
  rotateDeviceIdentity,
} from "@/lib/store-server";

const recoveryAttempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
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
    const now = Date.now();
    const current = recoveryAttempts.get(source);
    if (current && current.resetAt > now && current.count >= 20) {
      return NextResponse.json(
        { error: "Try again later." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }
    if (!current || current.resetAt <= now) {
      recoveryAttempts.set(source, { count: 1, resetAt: now + 60 * 60 * 1000 });
    } else {
      current.count += 1;
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
  } catch {
    return NextResponse.json({ error: "Recovery failed." }, { status: 400 });
  }
}
