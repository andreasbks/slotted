import crypto from "crypto";
import { cookies } from "next/headers";

const DEVICE_COOKIE = "__Host-slotted-device";

function suffix(slug: string): string {
  return crypto.createHash("sha256").update(slug).digest("hex").slice(0, 16);
}

export function hostCookieName(slug: string): string {
  return `__Host-slotted-host-${suffix(slug)}`;
}

export function accessCookieName(slug: string): string {
  return `__Host-slotted-access-${suffix(slug)}`;
}

export async function readDeviceToken(): Promise<string | undefined> {
  return (await cookies()).get(DEVICE_COOKIE)?.value;
}

export async function readHostToken(slug: string): Promise<string | undefined> {
  return (await cookies()).get(hostCookieName(slug))?.value;
}

export async function readAccessToken(
  slug: string
): Promise<string | undefined> {
  return (await cookies()).get(accessCookieName(slug))?.value;
}

export function newDeviceToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export const secureCookie = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new Error("Invalid request origin");
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new Error("JSON requests only");
  }
}
