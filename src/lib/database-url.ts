/**
 * Runtime read of the pooled Neon URL. Callers pass `process.env` by default
 * so Vercel can inject DATABASE_URL after the build.
 */
export function readDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL;
  if (typeof url !== "string" || url.length === 0) {
    throw new Error("DATABASE_URL is required for the Neon store");
  }
  return url;
}
