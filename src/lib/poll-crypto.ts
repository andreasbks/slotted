import crypto from "crypto";
import { resolveTokenPepper } from "./token-pepper";

export function hashSecret(raw: string): string {
  return crypto
    .createHmac("sha256", resolveTokenPepper())
    .update(`slotted:v1:${raw}`)
    .digest("hex");
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scrypt$")) {
    const legacy = crypto.createHash("sha256").update(password).digest("hex");
    const expected = Buffer.from(stored);
    const actual = Buffer.from(legacy);
    return (
      expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
    );
  }
  const [, saltRaw, digestRaw] = stored.split("$");
  if (!saltRaw || !digestRaw) return false;
  const expected = Buffer.from(digestRaw, "base64url");
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltRaw, "base64url"),
    expected.length
  );
  return crypto.timingSafeEqual(expected, actual);
}

export function isHostTokenValid(
  poll: { hostTokenHash?: string | null },
  hostToken?: string
): boolean {
  if (!hostToken || !poll.hostTokenHash) return false;
  const expected = Buffer.from(poll.hostTokenHash);
  const actual = Buffer.from(hashSecret(hostToken));
  return (
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
  );
}
