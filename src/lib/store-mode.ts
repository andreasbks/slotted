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
