const LOCAL_DEVELOPMENT_PEPPER = "slotted-local-development";
const MINIMUM_PEPPER_LENGTH = 32;

function isDeployedRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "production" || env.VERCEL === "1";
}

export function resolveTokenPepper(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.SLOTTED_TOKEN_PEPPER;
  if (typeof configured === "string" && configured.length >= MINIMUM_PEPPER_LENGTH) {
    return configured;
  }
  if (!isDeployedRuntime(env)) return LOCAL_DEVELOPMENT_PEPPER;
  throw new Error("SLOTTED_TOKEN_PEPPER is required in deployed environments");
}
