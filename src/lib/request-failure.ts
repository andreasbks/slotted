import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";
import { readSetupVariable, setupCopy, type SetupVariable } from "./setup-status";
import { logServerIssue } from "./server-log";

export type FailureAudience = "host" | "guest";

const NO_STORE = { "Cache-Control": "no-store" };

function setupResponse(audience: FailureAudience, variable: SetupVariable) {
  logServerIssue(new Error(`${variable} is not configured`));
  if (audience === "guest") {
    return NextResponse.json(
      { code: "not_ready", error: "Not ready yet." },
      { status: 503, headers: NO_STORE }
    );
  }
  const copy = setupCopy(variable);
  return NextResponse.json(
    {
      code: "setup",
      error: copy.sentence,
      step: copy.step,
      variable,
    },
    { status: 503, headers: NO_STORE }
  );
}

export function blockedBySetup(audience: FailureAudience) {
  const variable = readSetupVariable();
  if (!variable) return null;
  return setupResponse(audience, variable);
}

function knownMessage(raw: string): { error: string; status: number } | null {
  if (raw === "Invalid request origin" || raw === "JSON requests only") {
    return { error: "That request didn’t go through.", status: 403 };
  }
  if (raw === "This poll is locked") {
    return { error: "This poll is locked.", status: 400 };
  }
  if (raw === "The response window has closed") {
    return { error: "The response window has closed.", status: 400 };
  }
  if (
    raw === "Invalid duration for this poll window" ||
    raw.startsWith("Duration must")
  ) {
    return { error: "Choose a duration that fits this poll.", status: 400 };
  }
  return null;
}

export function respondToFailure(
  error: unknown,
  fallback: string,
  audience: FailureAudience
) {
  unstable_rethrow(error);
  const raw = error instanceof Error ? error.message : "";
  const variable = readSetupVariable();
  if (
    variable &&
    (raw.includes("SLOTTED_TOKEN_PEPPER") ||
      raw.includes("DATABASE_URL") ||
      raw.includes("Neon store") ||
      raw.includes("JSON persistence"))
  ) {
    return setupResponse(audience, variable);
  }
  const known = knownMessage(raw);
  if (known) {
    return NextResponse.json(
      { error: known.error },
      { status: known.status, headers: NO_STORE }
    );
  }
  logServerIssue(error);
  return NextResponse.json(
    { error: fallback },
    { status: 500, headers: NO_STORE }
  );
}
