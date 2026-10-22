import crypto from "crypto";
import { and, desc, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import {
  accessGrants,
  pollParticipants,
  polls,
  recoveryCredentials,
} from "@/db/schema";
import { getDb, getSql } from "./db";
import { hashSecret, isHostTokenValid, verifyPassword } from "./poll-crypto";
import {
  LockInput,
  VoteInput,
  applyLockState,
  mutateParticipantVote,
  sanitizePollForClient,
} from "./poll-record";
import type { PollData, PollParticipant } from "./slotted-data";

type PollRow = typeof polls.$inferSelect;
type ParticipantRow = typeof pollParticipants.$inferSelect;

const APPLICATION_ERRORS = new Set([
  "This poll is locked",
  "The response window has closed",
  "Invalid duration for this poll window",
]);

function isApplicationError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (APPLICATION_ERRORS.has(error.message) ||
      error.message.startsWith("Duration must"))
  );
}

async function withDatabase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isApplicationError(error)) throw error;
    console.error("[slotted] database request failed");
    throw new Error("Database request failed");
  }
}

function toParticipant(row: ParticipantRow): PollParticipant {
  return {
    id: row.id,
    guestSessionId: row.guestSessionId,
    clerkUserId: row.clerkUserId,
    name: row.name,
    city: row.city,
    timezone: row.timezone,
    avatarColor: row.avatarColor,
    slots: row.slots || {},
  };
}

function toPoll(row: PollRow, participants: PollParticipant[]): PollData {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    location: row.location,
    pollMode: row.pollMode,
    scheduleType: row.scheduleType,
    recurrenceRule: row.recurrenceRule,
    hostName: row.hostName,
    hostClerkUserId: row.hostClerkUserId,
    hostTokenHash: row.hostTokenHash,
    timezone: row.timezone,
    candidateDates: row.candidateDates,
    dayStartHour: row.dayStartHour,
    dayEndHour: row.dayEndHour,
    slotMinutes: row.slotMinutes,
    durationMinutes: row.durationMinutes,
    hasPassword: Boolean(row.accessPasswordHash),
    accessPassword: row.accessPasswordHash,
    visibilityMode: row.visibilityMode,
    allowIfNeeded: row.allowIfNeeded,
    deadlineAt: row.deadlineAt,
    status: row.status,
    lockedSlotStart: row.lockedSlotStart ?? undefined,
    lockedSlotEnd: row.lockedSlotEnd ?? undefined,
    lockedLocation: row.lockedLocation ?? undefined,
    createdAt: row.createdAt.toISOString(),
    participants,
  };
}

async function loadRawPoll(slug: string): Promise<PollData | null> {
  const db = getDb();
  const pollRows = await db
    .select()
    .from(polls)
    .where(eq(polls.slug, slug))
    .limit(1);
  const row = pollRows[0];
  if (!row) return null;
  const people = await db
    .select()
    .from(pollParticipants)
    .where(eq(pollParticipants.pollId, row.id));
  return toPoll(row, people.map(toParticipant));
}

async function loadPollsByIds(ids: string[]): Promise<PollData[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  const [pollRows, people] = await Promise.all([
    db
      .select()
      .from(polls)
      .where(inArray(polls.id, ids))
      .orderBy(desc(polls.createdAt)),
    db
      .select()
      .from(pollParticipants)
      .where(inArray(pollParticipants.pollId, ids)),
  ]);
  const byPoll = new Map<string, PollParticipant[]>();
  for (const person of people) {
    const list = byPoll.get(person.pollId) || [];
    list.push(toParticipant(person));
    byPoll.set(person.pollId, list);
  }
  return pollRows.map((row) => toPoll(row, byPoll.get(row.id) || []));
}

function participantValues(pollId: string, participant: PollParticipant) {
  return {
    id: participant.id,
    pollId,
    clerkUserId: participant.clerkUserId || null,
    guestSessionId: participant.guestSessionId,
    name: participant.name,
    city: participant.city || "NYC",
    timezone: participant.timezone || "America/New_York",
    avatarColor: participant.avatarColor || "#10B981",
    slots: participant.slots || {},
    updatedAt: new Date(),
  };
}

export async function neonListAllPolls(): Promise<PollData[]> {
  return withDatabase(async () => {
    const db = getDb();
    const rows = await db.select({ id: polls.id }).from(polls);
    const loaded = await loadPollsByIds(rows.map((row) => row.id));
    return loaded.map((poll) => sanitizePollForClient(poll));
  });
}

export async function neonGetPollBySlug(slug: string): Promise<PollData | null> {
  return withDatabase(async () => {
    const poll = await loadRawPoll(slug);
    return poll ? sanitizePollForClient(poll) : null;
  });
}

export async function neonGetPollForViewer(
  slug: string,
  deviceHash?: string,
  hostToken?: string
): Promise<PollData | null> {
  return withDatabase(async () => {
    const poll = await loadRawPoll(slug);
    if (!poll) return null;
    return sanitizePollForClient(
      poll,
      deviceHash,
      isHostTokenValid(poll, hostToken)
    );
  });
}

export async function neonListPollsForViewer(
  deviceHash?: string,
  hostTokens: Record<string, string> = {}
): Promise<PollData[]> {
  return withDatabase(async () => {
    if (!deviceHash && Object.keys(hostTokens).length === 0) return [];
    const db = getDb();
    const ids = new Set<string>();
    if (deviceHash) {
      const matches = await db
        .select({ pollId: pollParticipants.pollId })
        .from(pollParticipants)
        .where(eq(pollParticipants.guestSessionId, deviceHash));
      for (const match of matches) ids.add(match.pollId);
    }
    for (const [slug, token] of Object.entries(hostTokens)) {
      const poll = await loadRawPoll(slug);
      if (poll && isHostTokenValid(poll, token)) ids.add(poll.id);
    }
    const loaded = await loadPollsByIds(Array.from(ids));
    return loaded.map((poll) =>
      sanitizePollForClient(
        poll,
        deviceHash,
        isHostTokenValid(poll, hostTokens[poll.slug])
      )
    );
  });
}

export async function neonInsertPoll(assembled: {
  poll: PollData;
  hostToken: string;
}): Promise<{ poll: PollData; hostToken: string }> {
  return withDatabase(async () => {
    const db = getDb();
    const { poll, hostToken } = assembled;
    const host = poll.participants[0];
    await db.insert(polls).values({
      id: poll.id,
      slug: poll.slug,
      title: poll.title,
      description: poll.description,
      location: poll.location || "",
      pollMode: poll.pollMode || "dates_and_hours",
      scheduleType: poll.scheduleType || "specific_dates",
      recurrenceRule: poll.recurrenceRule ?? null,
      hostClerkUserId: poll.hostClerkUserId || null,
      hostTokenHash: poll.hostTokenHash || "",
      hostName: poll.hostName,
      timezone: poll.timezone,
      candidateDates: poll.candidateDates,
      dayStartHour: poll.dayStartHour,
      dayEndHour: poll.dayEndHour,
      slotMinutes: poll.slotMinutes,
      durationMinutes: poll.durationMinutes,
      accessPasswordHash: poll.accessPassword || null,
      visibilityMode: poll.visibilityMode,
      allowIfNeeded: poll.allowIfNeeded,
      deadlineAt: poll.deadlineAt || null,
      status: poll.status,
      lockedSlotStart: poll.lockedSlotStart || null,
      lockedSlotEnd: poll.lockedSlotEnd || null,
      lockedLocation: poll.lockedLocation || null,
      createdAt: poll.createdAt ? new Date(poll.createdAt) : new Date(),
    });
    try {
      if (host) {
        await db.insert(pollParticipants).values(participantValues(poll.id, host));
      }
    } catch (error) {
      await db.delete(polls).where(eq(polls.id, poll.id));
      throw error;
    }
    return {
      poll: sanitizePollForClient(poll, host?.guestSessionId, true),
      hostToken,
    };
  });
}

export async function neonUpsertParticipantVote(
  slug: string,
  payload: VoteInput
): Promise<PollData | null> {
  return withDatabase(async () => {
    const poll = await loadRawPoll(slug);
    if (!poll) return null;
    const participant = mutateParticipantVote(poll, payload);
    const db = getDb();
    await db
      .insert(pollParticipants)
      .values(participantValues(poll.id, participant))
      .onConflictDoUpdate({
        target: [pollParticipants.pollId, pollParticipants.guestSessionId],
        set: {
          name: participant.name,
          timezone: participant.timezone,
          city: participant.city,
          slots: participant.slots,
          updatedAt: new Date(),
        },
      });
    return sanitizePollForClient(poll, payload.deviceHash);
  });
}

export async function neonUpdatePollLockState(
  slug: string,
  payload: LockInput
): Promise<PollData | null> {
  return withDatabase(async () => {
    const poll = await loadRawPoll(slug);
    if (!poll) return null;
    applyLockState(poll, payload);
    const db = getDb();
    await db
      .update(polls)
      .set({
        status: poll.status,
        lockedSlotStart: poll.lockedSlotStart || null,
        lockedSlotEnd: poll.lockedSlotEnd || null,
        lockedLocation: poll.lockedLocation || null,
        durationMinutes: poll.durationMinutes,
      })
      .where(eq(polls.id, poll.id));
    return sanitizePollForClient(poll);
  });
}

export async function neonVerifyPollPassword(
  slug: string,
  passwordAttempt: string
): Promise<boolean> {
  return withDatabase(async () => {
    const db = getDb();
    const rows = await db
      .select({ accessPasswordHash: polls.accessPasswordHash })
      .from(polls)
      .where(eq(polls.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return false;
    if (!row.accessPasswordHash) return true;
    return verifyPassword(passwordAttempt.trim(), row.accessPasswordHash);
  });
}

export async function neonDeletePollBySlug(
  slug: string,
  hostToken: string
): Promise<boolean> {
  return withDatabase(async () => {
    const poll = await loadRawPoll(slug);
    if (!poll || !isHostTokenValid(poll, hostToken)) return false;
    const db = getDb();
    await db.delete(polls).where(eq(polls.id, poll.id));
    return true;
  });
}

export async function neonRequireHost(
  slug: string,
  hostToken?: string
): Promise<boolean> {
  return withDatabase(async () => {
    const db = getDb();
    const rows = await db
      .select({ hostTokenHash: polls.hostTokenHash })
      .from(polls)
      .where(eq(polls.slug, slug))
      .limit(1);
    return Boolean(rows[0] && isHostTokenValid(rows[0], hostToken));
  });
}

export async function neonIssueAccessGrant(
  slug: string
): Promise<{ token: string; expiresAt: Date }> {
  return withDatabase(async () => {
    const db = getDb();
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await db.delete(accessGrants).where(lt(accessGrants.expiresAt, new Date()));
    await db.insert(accessGrants).values({
      id: `grant_${crypto.randomUUID()}`,
      slug,
      tokenHash: hashSecret(token),
      expiresAt,
    });
    return { token, expiresAt };
  });
}

export async function neonHasValidAccessGrant(
  slug: string,
  token?: string
): Promise<boolean> {
  return withDatabase(async () => {
    if (!token) return false;
    const db = getDb();
    const rows = await db
      .select({ id: accessGrants.id })
      .from(accessGrants)
      .where(
        and(
          eq(accessGrants.slug, slug),
          eq(accessGrants.tokenHash, hashSecret(token)),
          gt(accessGrants.expiresAt, new Date())
        )
      )
      .limit(1);
    return rows.length > 0;
  });
}

export async function neonIssueRecoveryKey(deviceHash: string): Promise<string> {
  return withDatabase(async () => {
    const db = getDb();
    const selector = crypto.randomBytes(8).toString("hex").toUpperCase();
    const verifier = crypto.randomBytes(16).toString("base64url").toUpperCase();
    await db
      .delete(recoveryCredentials)
      .where(
        and(
          eq(recoveryCredentials.deviceHash, deviceHash),
          isNull(recoveryCredentials.usedAt)
        )
      );
    await db.insert(recoveryCredentials).values({
      id: `rec_${crypto.randomUUID()}`,
      selector,
      verifierHash: hashSecret(verifier),
      deviceHash,
    });
    return `S1-${selector}-${verifier}`;
  });
}

export async function neonRedeemRecoveryKey(key: string): Promise<string | null> {
  return withDatabase(async () => {
    const normalized = key.trim().toUpperCase();
    const [, selector, verifier] = normalized.split("-");
    if (!selector || !verifier) return null;
    const db = getDb();
    const rows = await db
      .select()
      .from(recoveryCredentials)
      .where(
        and(
          eq(recoveryCredentials.selector, selector),
          isNull(recoveryCredentials.usedAt)
        )
      )
      .limit(1);
    const credential = rows[0];
    if (!credential) return null;
    const expected = Buffer.from(credential.verifierHash);
    const actual = Buffer.from(hashSecret(verifier));
    if (
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      return null;
    }
    const updated = await db
      .update(recoveryCredentials)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(recoveryCredentials.id, credential.id),
          isNull(recoveryCredentials.usedAt)
        )
      )
      .returning({ deviceHash: recoveryCredentials.deviceHash });
    return updated[0]?.deviceHash || null;
  });
}

export async function neonRotateDeviceIdentity(
  previousHash: string,
  nextHash: string
): Promise<void> {
  return withDatabase(async () => {
    const db = getDb();
    await db
      .update(pollParticipants)
      .set({ guestSessionId: nextHash, updatedAt: new Date() })
      .where(eq(pollParticipants.guestSessionId, previousHash));
    await db
      .update(recoveryCredentials)
      .set({ deviceHash: nextHash })
      .where(
        and(
          eq(recoveryCredentials.deviceHash, previousHash),
          isNull(recoveryCredentials.usedAt)
        )
      );
  });
}

export async function neonClaimDeviceIdentity(
  guestHash: string,
  accountHash: string
): Promise<void> {
  return withDatabase(async () => {
    const db = getDb();
    const guestRows = await db
      .select()
      .from(pollParticipants)
      .where(eq(pollParticipants.guestSessionId, guestHash));
    for (const guest of guestRows) {
      const accountRows = await db
        .select()
        .from(pollParticipants)
        .where(
          and(
            eq(pollParticipants.pollId, guest.pollId),
            eq(pollParticipants.guestSessionId, accountHash)
          )
        )
        .limit(1);
      const account = accountRows[0];
      if (!account) {
        await db
          .update(pollParticipants)
          .set({ guestSessionId: accountHash, updatedAt: new Date() })
          .where(eq(pollParticipants.id, guest.id));
        continue;
      }
      const guestSlots = guest.slots || {};
      const accountSlots = account.slots || {};
      await db
        .update(pollParticipants)
        .set({
          slots: Object.keys(accountSlots).length === 0 ? guestSlots : accountSlots,
          name: account.name.trim() ? account.name : guest.name,
          updatedAt: new Date(),
        })
        .where(eq(pollParticipants.id, account.id));
      await db.delete(pollParticipants).where(eq(pollParticipants.id, guest.id));
    }
    await db
      .update(recoveryCredentials)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(recoveryCredentials.deviceHash, guestHash),
          isNull(recoveryCredentials.usedAt)
        )
      );
  });
}

export async function neonConsumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  return withDatabase(async () => {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const sql = getSql();
    const rows = (await sql`
      INSERT INTO rate_limit_buckets (bucket_key, attempts, window_started_at, updated_at)
      VALUES (${key}, 1, now(), now())
      ON CONFLICT (bucket_key) DO UPDATE SET
        attempts = CASE
          WHEN rate_limit_buckets.window_started_at <= now() - (CAST(${windowSeconds} AS integer) * interval '1 second')
          THEN 1
          ELSE rate_limit_buckets.attempts + 1
        END,
        window_started_at = CASE
          WHEN rate_limit_buckets.window_started_at <= now() - (CAST(${windowSeconds} AS integer) * interval '1 second')
          THEN now()
          ELSE rate_limit_buckets.window_started_at
        END,
        updated_at = now()
      RETURNING attempts, window_started_at
    `) as Array<{
      attempts: number | string;
      window_started_at: string | Date;
    }>;
    const row = rows[0] as
      | { attempts: number | string; window_started_at: string | Date }
      | undefined;
    if (!row) {
      throw new Error("Database request failed");
    }
    const attempts = Number(row.attempts);
    const started = new Date(row.window_started_at).getTime();
    const allowed = Number.isFinite(attempts) && attempts <= limit;
    const retryAfterSeconds = allowed
      ? 0
      : Math.max(
          1,
          Number.isFinite(started)
            ? Math.ceil((started + windowMs - Date.now()) / 1000)
            : 1
        );
    return { allowed, retryAfterSeconds };
  });
}

export async function neonClearRateLimit(key: string): Promise<void> {
  return withDatabase(async () => {
    const sql = getSql();
    await sql`DELETE FROM rate_limit_buckets WHERE bucket_key = ${key}`;
  });
}
