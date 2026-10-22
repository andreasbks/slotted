export type StoreKind = "neon" | "json";

function hasDatabaseUrl(env: NodeJS.ProcessEnv): boolean {
  return typeof env.DATABASE_URL === "string" && env.DATABASE_URL.length > 0;
}

export function isDeployedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" || env.VERCEL === "1";
}

/**
 * Neon is selected whenever DATABASE_URL is present.
 * JSON is only the local fallback when that variable is absent.
 * Deployed environments never fall back to the JSON file.
 */
export function resolveStoreKind(env: NodeJS.ProcessEnv = process.env): StoreKind {
  if (hasDatabaseUrl(env)) return "neon";
  if (!isDeployedRuntime(env)) return "json";
  throw new Error(
    "DATABASE_URL is required when deployed. JSON persistence is only a local fallback."
  );
}

export type SetupVariable = "DATABASE_URL" | "SLOTTED_TOKEN_PEPPER";

const MINIMUM_PEPPER_LENGTH = 32;

function pepperConfigured(env: NodeJS.ProcessEnv): boolean {
  const configured = env.SLOTTED_TOKEN_PEPPER;
  return typeof configured === "string" && configured.length >= MINIMUM_PEPPER_LENGTH;
}

/**
 * First missing production setting. Local development keeps the JSON store
 * and the local pepper; this never substitutes a default pepper when deployed.
 */
export function readSetupVariable(
  env: NodeJS.ProcessEnv = process.env
): SetupVariable | null {
  if (!isDeployedRuntime(env)) return null;
  if (!hasDatabaseUrl(env)) return "DATABASE_URL";
  if (!pepperConfigured(env)) return "SLOTTED_TOKEN_PEPPER";
  return null;
}

export function setupCopy(variable: SetupVariable): {
  sentence: string;
  step: string;
} {
  if (variable === "DATABASE_URL") {
    return {
      sentence: "Set DATABASE_URL to open Slotted.",
      step: "Add the Neon connection string in Vercel, then reload.",
    };
  }
  return {
    sentence: "Set SLOTTED_TOKEN_PEPPER to open Slotted.",
    step: "Add a long random value in Vercel, then reload.",
  };
}
