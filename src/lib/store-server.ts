import fs from "fs";
import path from "path";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  AvailabilityState,
  INITIAL_POLLS,
  PollData,
  PollMode,
  PollParticipant,
  VisibilityMode,
} from "@/lib/slotted-data";

const LOCAL_DB_DIR = path.join(process.cwd(), ".data");
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, "slotted-db.json");

export function hashSecret(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function getNeonDb() {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith("postgres")) return null;
  try {
    const sql = neon(url);
    return drizzle(sql, { schema });
  } catch {
    return null;
  }
}

interface LocalDbFileShape {
  polls: PollData[];
}

function readLocalDb(): LocalDbFileShape {
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    if (!fs.existsSync(LOCAL_DB_FILE)) {
      const initial: LocalDbFileShape = {
        polls: JSON.parse(JSON.stringify(INITIAL_POLLS)),
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
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

function sanitizePollForClient(poll: PollData): PollData {
  const { accessPassword, hostTokenHash, ...rest } = poll;
  return {
    ...rest,
    hasPassword: Boolean(accessPassword || poll.hasPassword),
  };
}

export async function listAllPolls(): Promise<PollData[]> {
  const db = getNeonDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.polls)
        .orderBy(desc(schema.polls.createdAt));
      const allParticipants = await db.select().from(schema.pollParticipants);
      return rows.map((r) => {
        const parts: PollParticipant[] = allParticipants
          .filter((p) => p.pollId === r.id)
          .map((p) => ({
            id: p.id,
            guestSessionId: p.guestSessionId,
            clerkUserId: p.clerkUserId,
            name: p.name,
            city: p.city,
            timezone: p.timezone,
            avatarColor: p.avatarColor,
            slots: p.slots || {},
          }));
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          description: r.description,
          location: r.location,
          pollMode: r.pollMode,
          hostName: r.hostName,
          hostClerkUserId: r.hostClerkUserId,
          timezone: r.timezone,
          candidateDates: r.candidateDates,
          dayStartHour: r.dayStartHour,
          dayEndHour: r.dayEndHour,
          slotMinutes: r.slotMinutes,
          durationMinutes: r.durationMinutes,
          hasPassword: Boolean(r.accessPasswordHash),
          visibilityMode: r.visibilityMode,
          allowIfNeeded: r.allowIfNeeded,
          deadlineAt: r.deadlineAt,
          status: r.status,
          lockedSlotStart: r.lockedSlotStart || undefined,
          lockedSlotEnd: r.lockedSlotEnd || undefined,
          lockedLocation: r.lockedLocation || undefined,
          createdAt: r.createdAt.toISOString(),
          participants: parts,
        };
      });
    } catch {
      // Fallback to local file DB if Neon table isn't migrated yet
    }
  }

  const local = readLocalDb();
  return local.polls.map(sanitizePollForClient);
}

export async function getPollBySlug(slug: string): Promise<PollData | null> {
  const db = getNeonDb();
  if (db) {
    try {
      const rows = await db
        .select()
        .from(schema.polls)
        .where(eq(schema.polls.slug, slug));
      const r = rows[0];
      if (r) {
        const parts = await db
          .select()
          .from(schema.pollParticipants)
          .where(eq(schema.pollParticipants.pollId, r.id));
        return {
          id: r.id,
          slug: r.slug,
          title: r.title,
          description: r.description,
          location: r.location,
          pollMode: r.pollMode,
          hostName: r.hostName,
          hostClerkUserId: r.hostClerkUserId,
          timezone: r.timezone,
          candidateDates: r.candidateDates,
          dayStartHour: r.dayStartHour,
          dayEndHour: r.dayEndHour,
          slotMinutes: r.slotMinutes,
          durationMinutes: r.durationMinutes,
          hasPassword: Boolean(r.accessPasswordHash),
          visibilityMode: r.visibilityMode,
          allowIfNeeded: r.allowIfNeeded,
          deadlineAt: r.deadlineAt,
          status: r.status,
          lockedSlotStart: r.lockedSlotStart || undefined,
          lockedSlotEnd: r.lockedSlotEnd || undefined,
          lockedLocation: r.lockedLocation || undefined,
          createdAt: r.createdAt.toISOString(),
          participants: parts.map((p) => ({
            id: p.id,
            guestSessionId: p.guestSessionId,
            clerkUserId: p.clerkUserId,
            name: p.name,
            city: p.city,
            timezone: p.timezone,
            avatarColor: p.avatarColor,
            slots: p.slots || {},
          })),
        };
      }
    } catch {}
  }

  const local = readLocalDb();
  const found = local.polls.find((p) => p.slug === slug);
  return found ? sanitizePollForClient(found) : null;
}

export interface CreatePollInput {
  title: string;
  description?: string;
  location?: string;
  pollMode?: PollMode;
  hostName?: string;
  hostClerkUserId?: string | null;
  guestSessionId?: string;
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
  const id = `pol_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const slugBase = (input.title || "poll")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
  const slug = `${slugBase || "poll"}-${Math.floor(100 + Math.random() * 899)}`;
  const hostToken = `ht_${crypto.randomBytes(12).toString("hex")}`;
  const hostTokenHash = hashSecret(hostToken);
  const passwordClean = input.accessPassword?.trim() || null;
  const passwordHash = passwordClean ? hashSecret(passwordClean) : null;
  const pollMode: PollMode =
    input.pollMode === "full_days" ? "full_days" : "dates_and_hours";

  const newPoll: PollData = {
    id,
    slug,
    title: input.title.trim() || "Untitled Poll",
    description: input.description?.trim() || "",
    location:
      input.location?.trim() || `meet.slotted.app/${slugBase || "room"}`,
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
    lockedLocation:
      input.location?.trim() || `meet.slotted.app/${slugBase || "room"}`,
    createdAt: new Date().toISOString(),
    participants: [
      {
        id: `p_${Date.now().toString(36)}`,
        guestSessionId: input.guestSessionId || "slt_guest_local",
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

  const db = getNeonDb();
  if (db) {
    try {
      await db.insert(schema.polls).values({
        id: newPoll.id,
        slug: newPoll.slug,
        title: newPoll.title,
        description: newPoll.description,
        location: newPoll.location || "",
        pollMode: newPoll.pollMode || "dates_and_hours",
        hostClerkUserId: newPoll.hostClerkUserId || null,
        hostTokenHash,
        hostName: newPoll.hostName,
        timezone: newPoll.timezone,
        candidateDates: newPoll.candidateDates,
        dayStartHour: newPoll.dayStartHour,
        dayEndHour: newPoll.dayEndHour,
        slotMinutes: newPoll.slotMinutes,
        durationMinutes: newPoll.durationMinutes,
        accessPasswordHash: passwordHash,
        visibilityMode: newPoll.visibilityMode,
        allowIfNeeded: newPoll.allowIfNeeded,
        deadlineAt: newPoll.deadlineAt || null,
        status: "OPEN",
        lockedLocation: newPoll.lockedLocation || null,
      });

      const hostPart = newPoll.participants[0];
      await db.insert(schema.pollParticipants).values({
        id: hostPart.id,
        pollId: newPoll.id,
        guestSessionId: hostPart.guestSessionId,
        clerkUserId: hostPart.clerkUserId || null,
        name: hostPart.name,
        city: hostPart.city,
        timezone: hostPart.timezone,
        avatarColor: hostPart.avatarColor,
        slots: hostPart.slots,
      });
    } catch {}
  }

  const local = readLocalDb();
  local.polls.unshift(newPoll);
  writeLocalDb(local);

  return { poll: sanitizePollForClient(newPoll), hostToken };
}

export async function upsertParticipantVote(
  slug: string,
  payload: {
    guestSessionId: string;
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
  const existingIdx = poll.participants.findIndex(
    (p) => p.guestSessionId === payload.guestSessionId
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
      id: `p_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 5)}`,
      guestSessionId: payload.guestSessionId,
      name: payload.name.trim() || "Guest",
      city: payload.city || "NYC",
      timezone: payload.timezone || poll.timezone,
      avatarColor: colors[poll.participants.length % colors.length],
      slots: payload.slots,
    });
  }

  writeLocalDb(local);
  return sanitizePollForClient(poll);
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
  return poll.accessPassword === hashSecret(passwordAttempt.trim());
}

export async function deletePollBySlug(slug: string): Promise<boolean> {
  const local = readLocalDb();
  if (local.polls.length <= 1) return false;
  const next = local.polls.filter((p) => p.slug !== slug);
  local.polls = next;
  writeLocalDb(local);
  return true;
}
