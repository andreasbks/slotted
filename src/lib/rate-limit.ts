export interface RateLimitSnapshot {
  attempts: number;
  windowStartedAtMs: number;
}

export interface RateLimitDecision {
  attempts: number;
  windowStartedAtMs: number;
  allowed: boolean;
  retryAfterSeconds: number;
}

export function advanceRateLimit(
  current: RateLimitSnapshot | null,
  nowMs: number,
  windowMs: number,
  limit: number
): RateLimitDecision {
  const fresh =
    !current || nowMs >= current.windowStartedAtMs + windowMs;
  const attempts = fresh ? 1 : current.attempts + 1;
  const windowStartedAtMs = fresh ? nowMs : current.windowStartedAtMs;
  const allowed = attempts <= limit;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(
        1,
        Math.ceil((windowStartedAtMs + windowMs - nowMs) / 1000)
      );
  return { attempts, windowStartedAtMs, allowed, retryAfterSeconds };
}

export const PASSWORD_ATTEMPT_LIMIT = 5;
export const PASSWORD_WINDOW_MS = 15 * 60 * 1000;
export const RECOVERY_ATTEMPT_LIMIT = 20;
export const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
