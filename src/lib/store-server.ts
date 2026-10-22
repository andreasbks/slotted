import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  AvailabilityState,
  INITIAL_POLLS,
  PollData,
  PollMode,
  VisibilityMode,
} from "@/lib/slotted-data";

const LOCAL_DB_DIR = path.join(process.cwd(), ".data");
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, "slotted-db.json");

export function hashSecret(raw: string): string {
  const pepper = process.env.SLOTTED_TOKEN_PEPPER || "slotted-local-development";
  return crypto
    .createHmac("sha256", pepper)
    .update(`slotted:v1:${raw}`)
    .digest("hex");
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

function sanitizePollForClient(
  poll: PollData,
  deviceHash?: string,
  canManagePoll = false
): PollData {
  const rest = { ...poll };
  delete rest.accessPassword;
  delete rest.hostTokenHash;
  return {
    ...rest,
    hasPassword: Boolean(poll.accessPassword || poll.hasPassword),
    canManagePoll,
    viewerParticipantId:
      poll.participants.find((participant) => participant.guestSessionId === deviceHash)
        ?.id || null,
    participants: poll.participants.map((participant) => ({
      ...participant,
      guestSessionId: "",
      clerkUserId: undefined,
      isCurrentUser: participant.guestSessionId === deviceHash,
    })),
  };
}

export async function listAllPolls(): Promise<PollData[]> {
  const local = readLocalDb();
  return local.polls.map((poll) => sanitizePollForClient(poll));
}

export async function getPollBySlug(slug: string): Promise<PollData | null> {
  const local = readLocalDb();
  const found = local.polls.find((p) => p.slug === slug);
  return found ? sanitizePollForClient(found) : null;
}

export async function getPollForViewer(
  slug: string,
  deviceHash?: string,
  hostToken?: string
): Promise<PollData | null> {
  const local = readLocalDb();
  const found = local.polls.find((poll) => poll.slug === slug);
  if (!found) return null;
  const canManage = Boolean(
    hostToken &&
      found.hostTokenHash &&
      crypto.timingSafeEqual(
        Buffer.from(found.hostTokenHash),
        Buffer.from(hashSecret(hostToken))
      )
  );
  return sanitizePollForClient(found, deviceHash, canManage);
}

export async function listPollsForViewer(
  deviceHash?: string,
  hostTokens: Record<string, string> = {}
): Promise<PollData[]> {
  if (!deviceHash && Object.keys(hostTokens).length === 0) return [];
  const local = readLocalDb();
  return local.polls
    .filter((poll) => {
      const isParticipant = poll.participants.some(
        (participant) => participant.guestSessionId === deviceHash
      );
      const hostToken = hostTokens[poll.slug];
      return (
        isParticipant ||
        Boolean(hostToken && poll.hostTokenHash === hashSecret(hostToken))
      );
    })
    .map((poll) =>
      sanitizePollForClient(
        poll,
        deviceHash,
        Boolean(
          hostTokens[poll.slug] &&
            poll.hostTokenHash === hashSecret(hostTokens[poll.slug])
        )
      )
    );
}

export interface CreatePollInput {
  title: string;
  description?: string;
  location?: string;
  pollMode?: PollMode;
  hostName?: string;
  hostClerkUserId?: string | null;
  deviceHash: string;
  timezone: string;
  candidateDates: string[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes?: number;
  durationMinutes: number;
  accessPassword?: string | null;
  visibilityMode?: VisibilityMode;
  allowIfNeeded?: boolean;
  deadlineAt?: string | null;
}

export async function createNewPoll(
  input: CreatePollInput
): Promise<{ poll: PollData; hostToken: string }> {
  const id = `pol_${crypto.randomUUID()}`;
  const slugBase = (input.title || "poll")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  const slug = `${slugBase || "poll"}-${crypto.randomBytes(5).toString("hex")}`;
  const hostToken = crypto.randomBytes(32).toString("base64url");
  const hostTokenHash = hashSecret(hostToken);
  const passwordClean = input.accessPassword?.trim() || null;
  const passwordHash = passwordClean ? hashPassword(passwordClean) : null;
  const pollMode: PollMode =
    input.pollMode === "full_days" ? "full_days" : "dates_and_hours";

  const newPoll: PollData = {
    id,
    slug,
    title: input.title.trim() || "Untitled Poll",
    description: input.description?.trim() || "",
    location: input.location?.trim() || "",
    pollMode,
    hostName: input.hostName?.trim() || "Organizer",
    hostClerkUserId: input.hostClerkUserId || null,
    hostTokenHash,
    timezone: input.timezone || "America/New_York",
    candidateDates:
      input.candidateDates.length > 0
        ? input.candidateDates
        : ["2026-10-27", "2026-10-28", "2026-10-29"],
    dayStartHour: input.dayStartHour ?? 9,
    dayEndHour: Math.max((input.dayStartHour ?? 9) + 2, input.dayEndHour ?? 17),
    slotMinutes: input.slotMinutes ?? 30,
    durationMinutes: input.durationMinutes ?? 30,
    hasPassword: Boolean(passwordClean),
    accessPassword: passwordHash,
    visibilityMode: input.visibilityMode || "public",
    allowIfNeeded: input.allowIfNeeded ?? true,
    deadlineAt: input.deadlineAt || null,
    status: "OPEN",
    lockedLocation: input.location?.trim() || "",
    createdAt: new Date().toISOString(),
    participants: [
      {
        id: `p_${Date.now().toString(36)}`,
        guestSessionId: input.deviceHash,
        clerkUserId: input.hostClerkUserId || null,
        name: input.hostName?.trim() || "Alex",
        city: "NYC",
        timezone: input.timezone || "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: {},
      },
    ],
  };

  const local = readLocalDb();
  local.polls.unshift(newPoll);
  writeLocalDb(local);

  return {
    poll: sanitizePollForClient(newPoll, input.deviceHash, true),
    hostToken,
  };
}

export async function upsertParticipantVote(
  slug: string,
  payload: {
    deviceHash: string;
    name: string;
    timezone: string;
    city?: string;
    slots: Record<string, AvailabilityState>;
  }
): Promise<PollData | null> {
  const local = readLocalDb();
  const pollIdx = local.polls.findIndex((p) => p.slug === slug);
  if (pollIdx === -1) return null;

  const poll = local.polls[pollIdx];
  if (poll.status !== "OPEN") {
    throw new Error("This poll is locked");
  }
  if (poll.deadlineAt && Date.now() >= new Date(poll.deadlineAt).getTime()) {
    throw new Error("The response window has closed");
  }
  const existingIdx = poll.participants.findIndex(
    (p) => p.guestSessionId === payload.deviceHash
  );

  const colors = ["#10B981", "#141413", "#2563EB", "#D97706", "#7C3AED"];
  if (existingIdx >= 0) {
    poll.participants[existingIdx] = {
      ...poll.participants[existingIdx],
      name: payload.name.trim() || poll.participants[existingIdx].name,
      timezone: payload.timezone || poll.participants[existingIdx].timezone,
      city: payload.city || poll.participants[existingIdx].city,
      slots: payload.slots,
    };
  } else {
    poll.participants.push({
      id: `p_${crypto.randomUUID()}`,
      guestSessionId: payload.deviceHash,
      name: payload.name.trim() || "Guest",
      city: payload.city || "NYC",
      timezone: payload.timezone || poll.timezone,
      avatarColor: colors[poll.participants.length % colors.length],
      slots: payload.slots,
    });
  }

  writeLocalDb(local);
  return sanitizePollForClient(poll, payload.deviceHash);
}

export async function updatePollLockState(
  slug: string,
  payload: {
    status: "OPEN" | "LOCKED";
    lockedSlotStart?: string;
    lockedSlotEnd?: string;
    lockedLocation?: string;
    durationMinutes?: number;
  }
): Promise<PollData | null> {
  const local = readLocalDb();
  const pollIdx = local.polls.findIndex((p) => p.slug === slug);
  if (pollIdx === -1) return null;

  const poll = local.polls[pollIdx];
  poll.status = payload.status;
  if (payload.lockedSlotStart !== undefined) {
    poll.lockedSlotStart = payload.lockedSlotStart;
  }
  if (payload.lockedSlotEnd !== undefined) {
    poll.lockedSlotEnd = payload.lockedSlotEnd;
  }
  if (payload.lockedLocation !== undefined) {
    poll.lockedLocation = payload.lockedLocation;
  }
  if (payload.durationMinutes !== undefined) {
    poll.durationMinutes = payload.durationMinutes;
  }

  writeLocalDb(local);
  return sanitizePollForClient(poll);
}

export async function verifyPollPassword(
  slug: string,
  passwordAttempt: string
): Promise<boolean> {
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
  const local = readLocalDb();
  const poll = local.polls.find((item) => item.slug === slug);
  if (!poll || !isHostTokenValid(poll, hostToken)) return false;
  const next = local.polls.filter((p) => p.slug !== slug);
  local.polls = next;
  writeLocalDb(local);
  return true;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith("scrypt$")) {
    const legacy = crypto.createHash("sha256").update(password).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(legacy), Buffer.from(stored));
  }
  const [, saltRaw, digestRaw] = stored.split("$");
  const expected = Buffer.from(digestRaw, "base64url");
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltRaw, "base64url"),
    expected.length
  );
  return crypto.timingSafeEqual(expected, actual);
}

export function isHostTokenValid(poll: PollData, hostToken?: string): boolean {
  if (!hostToken || !poll.hostTokenHash) return false;
  const expected = Buffer.from(poll.hostTokenHash);
  const actual = Buffer.from(hashSecret(hostToken));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export async function requireHost(
  slug: string,
  hostToken?: string
): Promise<boolean> {
  const local = readLocalDb();
  const poll = local.polls.find((item) => item.slug === slug);
  return Boolean(poll && isHostTokenValid(poll, hostToken));
}

export async function issueAccessGrant(
  slug: string
): Promise<{ token: string; expiresAt: Date }> {
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
