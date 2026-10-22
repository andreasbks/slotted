import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { calmFailure } from "./calm-copy.ts";
import { readDatabaseUrl } from "./database-url.ts";
import { advanceRateLimit } from "./rate-limit.ts";
import { readSetupVariable, resolveStoreKind, setupCopy } from "./store-mode.ts";
import { resolveTokenPepper } from "./token-pepper.ts";
import {
  generateRecurringDates,
  searchTimezones,
} from "./slotted-data.ts";

const root = path.resolve(import.meta.dirname, "../..");

test("DATABASE_URL selects Neon and deployed environments refuse JSON", () => {
  assert.equal(
    resolveStoreKind({
      DATABASE_URL: "postgresql://example.invalid/slotted",
      NODE_ENV: "production",
      VERCEL: "1",
    }),
    "neon"
  );
  assert.equal(resolveStoreKind({ NODE_ENV: "development" }), "json");
  assert.throws(
    () => resolveStoreKind({ NODE_ENV: "production", VERCEL: "1" }),
    /DATABASE_URL is required/
  );
  assert.throws(
    () =>
      resolveStoreKind({
        NODE_ENV: "production",
        SLOTTED_STORE: "json",
      }),
    /DATABASE_URL is required/
  );
});

test("readDatabaseUrl reads DATABASE_URL and nothing else", () => {
  const url = readDatabaseUrl({
    DATABASE_URL: "postgresql://example.invalid/slotted",
    DATABASE_URL_UNPOOLED: "postgresql://direct.invalid/slotted",
    NODE_ENV: "test",
  });
  assert.equal(url, "postgresql://example.invalid/slotted");
  assert.throws(
    () => readDatabaseUrl({ NODE_ENV: "test" }),
    /DATABASE_URL is required for the Neon store/
  );
});

test("Neon client is constructed from readDatabaseUrl", () => {
  const source = fs.readFileSync(new URL("./db.ts", import.meta.url), "utf8");
  assert.match(source, /readDatabaseUrl\(\)/);
  assert.match(source, /drizzle-orm\/neon-http/);
  assert.match(source, /@neondatabase\/serverless/);
  const store = fs.readFileSync(
    new URL("./store-server.ts", import.meta.url),
    "utf8"
  );
  assert.match(store, /resolveStoreKind\(\)/);
  assert.match(store, /neonInsertPoll/);
  assert.match(store, /neonConsumeRateLimit/);
});

test("deployed token pepper is required and local development has a fallback", () => {
  assert.throws(
    () => resolveTokenPepper({ NODE_ENV: "production", VERCEL: "1" }),
    /SLOTTED_TOKEN_PEPPER is required/
  );
  assert.throws(
    () =>
      resolveTokenPepper({
        NODE_ENV: "production",
        SLOTTED_TOKEN_PEPPER: "too-short",
      }),
    /SLOTTED_TOKEN_PEPPER is required/
  );
  const configured = "a".repeat(32);
  assert.equal(
    resolveTokenPepper({ NODE_ENV: "production", SLOTTED_TOKEN_PEPPER: configured }),
    configured
  );
  assert.equal(typeof resolveTokenPepper({ NODE_ENV: "development" }), "string");
});

test("deployed setup names one missing variable and leaked errors stay off the page", () => {
  assert.equal(readSetupVariable({ NODE_ENV: "production" }), "DATABASE_URL");
  assert.equal(
    readSetupVariable({
      NODE_ENV: "production",
      VERCEL: "1",
      DATABASE_URL: "postgresql://example.invalid/slotted",
    }),
    "SLOTTED_TOKEN_PEPPER"
  );
  assert.equal(
    readSetupVariable({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example.invalid/slotted",
      SLOTTED_TOKEN_PEPPER: "too-short",
    }),
    "SLOTTED_TOKEN_PEPPER"
  );
  assert.equal(
    readSetupVariable({
      NODE_ENV: "development",
      VERCEL: "1",
      DATABASE_URL: "postgresql://example.invalid/slotted",
    }),
    "SLOTTED_TOKEN_PEPPER"
  );
  assert.equal(
    readSetupVariable({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://example.invalid/slotted",
      SLOTTED_TOKEN_PEPPER: "a".repeat(32),
    }),
    null
  );
  assert.equal(readSetupVariable({ NODE_ENV: "development" }), null);
  const pepper = setupCopy("SLOTTED_TOKEN_PEPPER");
  assert.match(pepper.sentence, /SLOTTED_TOKEN_PEPPER/);
  assert.match(pepper.step, /Vercel/);
  assert.doesNotMatch(pepper.sentence, /required in deployed/);
  assert.equal(
    calmFailure(
      "SLOTTED_TOKEN_PEPPER is required in deployed environments",
      "Couldn’t create the poll. Try again."
    ),
    "Couldn’t create the poll. Try again."
  );
  assert.equal(
    calmFailure("This poll is locked.", "Couldn’t save that. Try again."),
    "This poll is locked."
  );
});

test("durable rate limit allows the limit and then blocks inside the window", () => {
  const start = Date.parse("2026-10-22T00:00:00Z");
  let snapshot = null as { attempts: number; windowStartedAtMs: number } | null;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const decision = advanceRateLimit(snapshot, start + attempt, 15 * 60 * 1000, 5);
    assert.equal(decision.allowed, true);
    snapshot = {
      attempts: decision.attempts,
      windowStartedAtMs: decision.windowStartedAtMs,
    };
  }
  const blocked = advanceRateLimit(snapshot, start + 6, 15 * 60 * 1000, 5);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);
  const later = advanceRateLimit(
    snapshot,
    start + 15 * 60 * 1000 + 10,
    15 * 60 * 1000,
    5
  );
  assert.equal(later.allowed, true);
  assert.equal(later.attempts, 1);
});

test("weekday recurrence and IANA search cover future dates and distant zones", () => {
  const dates = generateRecurringDates({
    weekdays: [1, 3],
    spanMode: "weeks",
    weeksCount: 2,
    startDate: "2026-10-26",
  });
  assert.ok(dates.includes("2026-10-26"));
  assert.ok(dates.includes("2026-11-04"));
  assert.ok(dates.every((iso) => iso >= "2026-10-26"));

  const tokyo = searchTimezones("tokyo", "2026-10-27");
  assert.equal(tokyo[0]?.id, "Asia/Tokyo");
  const kathmandu = searchTimezones("kathmandu", "2026-10-27");
  assert.ok(kathmandu.some((zone) => zone.id === "Asia/Kathmandu"));
});

test("drizzle config loads .env.local and fails without DATABASE_URL_UNPOOLED", () => {
  const source = fs.readFileSync(path.join(root, "drizzle.config.ts"), "utf8");
  assert.match(source, /\.env\.local/);
  assert.match(source, /DATABASE_URL_UNPOOLED/);
  assert.doesNotMatch(source, /localhost:5432/);
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--eval",
      `await import(${JSON.stringify(path.join(root, "drizzle.config.ts"))})`,
    ],
    {
      cwd: os.tmpdir(),
      env: {
        PATH: process.env.PATH,
        HOME: os.homedir(),
        NODE_ENV: "test",
      },
      encoding: "utf8",
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(`${result.stderr}\n${result.stdout}`, /DATABASE_URL_UNPOOLED/);
  assert.doesNotMatch(`${result.stderr}\n${result.stdout}`, /postgresql:\/\//);
});
