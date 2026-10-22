import fs from "fs";
import path from "path";
import crypto from "crypto";
import { INITIAL_POLLS, PollData } from "@/lib/slotted-data";
import { resolveStoreKind } from "./store-mode";
import { hashSecret, isHostTokenValid, verifyPassword } from "./poll-crypto";
import {
  CreatePollInput,
  LockInput,
  VoteInput,
  applyLockState,
  assembleNewPoll,
  mutateParticipantVote,
  sanitizePollForClient,
} from "./poll-record";
import { advanceRateLimit } from "./rate-limit";
import {
  neonClaimDeviceIdentity,
  neonClearRateLimit,
  neonConsumeRateLimit,
  neonDeletePollBySlug,
  neonGetPollBySlug,
  neonGetPollForViewer,
  neonHasValidAccessGrant,
  neonInsertPoll,
  neonIssueAccessGrant,
  neonIssueRecoveryKey,
  neonListAllPolls,
  neonListPollsForViewer,
  neonRedeemRecoveryKey,
  neonRequireHost,
  neonRotateDeviceIdentity,
  neonUpdatePollLockState,
  neonUpsertParticipantVote,
  neonVerifyPollPassword,
} from "./neon-store";

export { hashSecret, isHostTokenValid };
export type { CreatePollInput };

const LOCAL_DB_DIR = path.join(process.cwd(), ".data");
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, "slotted-db.json");

let persistenceLogged = false;

function storeKind() {
  const kind = resolveStoreKind();
  if (!persistenceLogged) {
    persistenceLogged = true;
    console.info(`[slotted] persistence=${kind}`);
  }
  return kind;
}

interface LocalDbFileShape {
  polls: PollData[];
  accessGrants?: Array<{
    slug: string;
    tokenHash: string;
    expiresAt: string;
  }>;
  recoveryCredentials?: Array<{
    selector: string;
    verifierHash: string;
    deviceHash: string;
    createdAt: string;
    usedAt?: string;
  }>;
  rateLimits?: Array<{
    key: string;
    attempts: number;
    windowStartedAt: string;
  }>;
}

function readLocalDb(): LocalDbFileShape {
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      const initial: LocalDbFileShape = {
        polls: JSON.parse(JSON.stringify(INITIAL_POLLS)),
        accessGrants: [],
        recoveryCredentials: [],
      };
      fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const raw = fs.readFileSync(LOCAL_DB_FILE, "utf8");
    const parsed = JSON.parse(raw) as LocalDbFileShape;
    if (!parsed || !Array.isArray(parsed.polls)) {
      return { polls: JSON.parse(JSON.stringify(INITIAL_POLLS)) };
    }
    return parsed;
  } catch {
    return { polls: JSON.parse(JSON.stringify(INITIAL_POLLS)) };
  }
}

function writeLocalDb(data: LocalDbFileShape): void {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
  const temp = `${LOCAL_DB_FILE}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });
  fs.renameSync(temp, LOCAL_DB_FILE);
}

export async function listAllPolls(): Promise<PollData[]> {
  if (storeKind() === "neon") return neonListAllPolls();
  const local = readLocalDb();
  return local.polls.map((poll) => sanitizePollForClient(poll));
}

export async function getPollBySlug(slug: string): Promise<PollData | null> {
  if (storeKind() === "neon") return neonGetPollBySlug(slug);
  const local = readLocalDb();
  const found = local.polls.find((p) => p.slug === slug);
  return found ? sanitizePollForClient(found) : null;
}

export async function getPollForViewer(
  slug: string,
  deviceHash?: string,
  hostToken?: string
): Promise<PollData | null> {
  if (storeKind() === "neon") return neonGetPollForViewer(slug, deviceHash, hostToken);
  const local = readLocalDb();
  const found = local.polls.find((poll) => poll.slug === slug);
  if (!found) return null;
  return sanitizePollForClient(
    found,
    deviceHash,
    isHostTokenValid(found, hostToken)
  );
}

export async function listPollsForViewer(
  deviceHash?: string,
  hostTokens: Record<string, string> = {}
): Promise<PollData[]> {
  if (storeKind() === "neon") return neonListPollsForViewer(deviceHash, hostTokens);
  if (!deviceHash && Object.keys(hostTokens).length === 0) return [];
  const local = readLocalDb();
  return local.polls
    .filter((poll) => {
      const isParticipant = poll.participants.some(
        (participant) => participant.guestSessionId === deviceHash
      );
      return isParticipant || isHostTokenValid(poll, hostTokens[poll.slug]);
    })
    .map((poll) =>
      sanitizePollForClient(
        poll,
        deviceHash,
        isHostTokenValid(poll, hostTokens[poll.slug])
      )
    );
}

export async function createNewPoll(
  input: CreatePollInput
): Promise<{ poll: PollData; hostToken: string }> {
  const assembled = assembleNewPoll(input);
  if (storeKind() === "neon") return neonInsertPoll(assembled);
  const local = readLocalDb();
  local.polls.unshift(assembled.poll);
  writeLocalDb(local);
  return {
    poll: sanitizePollForClient(assembled.poll, input.deviceHash, true),
    hostToken: assembled.hostToken,
  };
}

export async function upsertParticipantVote(
  slug: string,
  payload: VoteInput
): Promise<PollData | null> {
  if (storeKind() === "neon") return neonUpsertParticipantVote(slug, payload);
  const local = readLocalDb();
  const pollIdx = local.polls.findIndex((p) => p.slug === slug);
  if (pollIdx === -1) return null;
  const poll = local.polls[pollIdx];
  mutateParticipantVote(poll, payload);
  writeLocalDb(local);
  return sanitizePollForClient(poll, payload.deviceHash);
}

export async function updatePollLockState(
  slug: string,
  payload: LockInput
): Promise<PollData | null> {
  if (storeKind() === "neon") return neonUpdatePollLockState(slug, payload);
  const local = readLocalDb();
  const pollIdx = local.polls.findIndex((p) => p.slug === slug);
  if (pollIdx === -1) return null;
  const poll = local.polls[pollIdx];
  applyLockState(poll, payload);
  writeLocalDb(local);
  return sanitizePollForClient(poll);
}

export async function verifyPollPassword(
  slug: string,
  passwordAttempt: string
): Promise<boolean> {
  if (storeKind() === "neon") return neonVerifyPollPassword(slug, passwordAttempt);
  const local = readLocalDb();
  const poll = local.polls.find((p) => p.slug === slug);
  if (!poll) return false;
  if (!poll.accessPassword) return true;
  return verifyPassword(passwordAttempt.trim(), poll.accessPassword);
}

export async function deletePollBySlug(
  slug: string,
  hostToken: string
): Promise<boolean> {
  if (storeKind() === "neon") return neonDeletePollBySlug(slug, hostToken);
  const local = readLocalDb();
  const poll = local.polls.find((item) => item.slug === slug);
  if (!poll || !isHostTokenValid(poll, hostToken)) return false;
  const next = local.polls.filter((p) => p.slug !== slug);
  local.polls = next;
  writeLocalDb(local);
  return true;
}

export async function requireHost(
  slug: string,
  hostToken?: string
): Promise<boolean> {
  if (storeKind() === "neon") return neonRequireHost(slug, hostToken);
  const local = readLocalDb();
  const poll = local.polls.find((item) => item.slug === slug);
  return Boolean(poll && isHostTokenValid(poll, hostToken));
}

export async function issueAccessGrant(
  slug: string
): Promise<{ token: string; expiresAt: Date }> {
  if (storeKind() === "neon") return neonIssueAccessGrant(slug);
  const local = readLocalDb();
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  local.accessGrants = (local.accessGrants || []).filter(
    (grant) => new Date(grant.expiresAt).getTime() > Date.now()
  );
  local.accessGrants.push({
    slug,
    tokenHash: hashSecret(token),
    expiresAt: expiresAt.toISOString(),
  });
  writeLocalDb(local);
  return { token, expiresAt };
}

export async function hasValidAccessGrant(
  slug: string,
  token?: string
): Promise<boolean> {
  if (storeKind() === "neon") return neonHasValidAccessGrant(slug, token);
  if (!token) return false;
  const local = readLocalDb();
  const digest = hashSecret(token);
  return Boolean(
    local.accessGrants?.some(
      (grant) =>
        grant.slug === slug &&
        grant.tokenHash === digest &&
        new Date(grant.expiresAt).getTime() > Date.now()
    )
  );
}

export async function issueRecoveryKey(
  deviceHash: string
): Promise<string> {
  if (storeKind() === "neon") return neonIssueRecoveryKey(deviceHash);
  const local = readLocalDb();
  const selector = crypto.randomBytes(8).toString("hex").toUpperCase();
  const verifier = crypto.randomBytes(16).toString("base64url").toUpperCase();
  local.recoveryCredentials = (local.recoveryCredentials || []).filter(
    (credential) => credential.deviceHash !== deviceHash || credential.usedAt
  );
  local.recoveryCredentials.push({
    selector,
    verifierHash: hashSecret(verifier),
    deviceHash,
    createdAt: new Date().toISOString(),
  });
  writeLocalDb(local);
  return `S1-${selector}-${verifier}`;
}

export async function redeemRecoveryKey(
  key: string
): Promise<string | null> {
  if (storeKind() === "neon") return neonRedeemRecoveryKey(key);
  const normalized = key.trim().toUpperCase();
  const [, selector, verifier] = normalized.split("-");
  if (!selector || !verifier) return null;
  const local = readLocalDb();
  const credential = local.recoveryCredentials?.find(
    (item) => item.selector === selector && !item.usedAt
  );
  if (!credential) return null;
  const expected = Buffer.from(credential.verifierHash);
  const actual = Buffer.from(hashSecret(verifier));
  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return null;
  }
  credential.usedAt = new Date().toISOString();
  writeLocalDb(local);
  return credential.deviceHash;
}

export async function rotateDeviceIdentity(
  previousHash: string,
  nextHash: string
): Promise<void> {
  if (storeKind() === "neon") return neonRotateDeviceIdentity(previousHash, nextHash);
  const local = readLocalDb();
  for (const poll of local.polls) {
    for (const participant of poll.participants) {
      if (participant.guestSessionId === previousHash) {
        participant.guestSessionId = nextHash;
      }
    }
  }
  for (const credential of local.recoveryCredentials || []) {
    if (credential.deviceHash === previousHash && !credential.usedAt) {
      credential.deviceHash = nextHash;
    }
  }
  writeLocalDb(local);
}

export async function claimDeviceIdentity(
  guestHash: string,
  accountHash: string
): Promise<void> {
  if (storeKind() === "neon") return neonClaimDeviceIdentity(guestHash, accountHash);
  const local = readLocalDb();
  for (const poll of local.polls) {
    const guest = poll.participants.find(
      (participant) => participant.guestSessionId === guestHash
    );
    const account = poll.participants.find(
      (participant) => participant.guestSessionId === accountHash
    );
    if (!guest) continue;
    if (!account) {
      guest.guestSessionId = accountHash;
      continue;
    }
    // One principal may have only one response per poll. Keep the account row
    // and only fill fields that are still empty; never union availability.
    if (Object.keys(account.slots).length === 0) account.slots = guest.slots;
    if (!account.name.trim()) account.name = guest.name;
    poll.participants = poll.participants.filter(
      (participant) => participant.id !== guest.id
    );
  }
  for (const credential of local.recoveryCredentials || []) {
    if (credential.deviceHash === guestHash && !credential.usedAt) {
      credential.usedAt = new Date().toISOString();
    }
  }
  writeLocalDb(local);
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  if (storeKind() === "neon") return neonConsumeRateLimit(key, limit, windowMs);
  const local = readLocalDb();
  const buckets = local.rateLimits || [];
  const index = buckets.findIndex((bucket) => bucket.key === key);
  const current = index >= 0 ? buckets[index] : null;
  const decision = advanceRateLimit(
    current
      ? {
          attempts: current.attempts,
          windowStartedAtMs: Date.parse(current.windowStartedAt),
        }
      : null,
    Date.now(),
    windowMs,
    limit
  );
  const record = {
    key,
    attempts: decision.attempts,
    windowStartedAt: new Date(decision.windowStartedAtMs).toISOString(),
  };
  if (index >= 0) buckets[index] = record;
  else buckets.push(record);
  local.rateLimits = buckets;
  writeLocalDb(local);
  return {
    allowed: decision.allowed,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export async function clearRateLimit(key: string): Promise<void> {
  if (storeKind() === "neon") return neonClearRateLimit(key);
  const local = readLocalDb();
  local.rateLimits = (local.rateLimits || []).filter((bucket) => bucket.key !== key);
  writeLocalDb(local);
}
