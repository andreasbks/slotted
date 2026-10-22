import crypto from "crypto";
import {
  AvailabilityState,
  PollData,
  PollMode,
  PollParticipant,
  RecurrenceRule,
  ScheduleType,
  VisibilityMode,
  generateRecurringDates,
  getTimezoneInfo,
} from "@/lib/slotted-data";
import { hashPassword, hashSecret } from "./poll-crypto";

export interface CreatePollInput {
  title: string;
  description?: string;
  location?: string;
  pollMode?: PollMode;
  scheduleType?: ScheduleType;
  recurrenceRule?: RecurrenceRule | null;
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

export interface VoteInput {
  deviceHash: string;
  name: string;
  timezone: string;
  city?: string;
  slots: Record<string, AvailabilityState>;
}

export interface LockInput {
  status: "OPEN" | "LOCKED";
  lockedSlotStart?: string;
  lockedSlotEnd?: string;
  lockedLocation?: string;
  durationMinutes?: number;
}

export function sanitizePollForClient(
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
      poll.participants.find(
        (participant) => participant.guestSessionId === deviceHash
      )?.id || null,
    participants: poll.participants.map((participant) => ({
      ...participant,
      guestSessionId: "",
      clerkUserId: undefined,
      isCurrentUser: participant.guestSessionId === deviceHash,
    })),
  };
}

export function assembleNewPoll(input: CreatePollInput): {
  poll: PollData;
  hostToken: string;
} {
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
  const scheduleType: ScheduleType =
    input.scheduleType === "days_of_week" ? "days_of_week" : "specific_dates";
  const recurrenceRule: RecurrenceRule | null =
    scheduleType === "days_of_week" && input.recurrenceRule
      ? {
          weekdays: Array.isArray(input.recurrenceRule.weekdays)
            ? input.recurrenceRule.weekdays
            : [1, 2, 3, 4, 5],
          spanMode:
            input.recurrenceRule.spanMode === "date_range"
              ? "date_range"
              : "weeks",
          weeksCount: Math.max(
            1,
            Math.min(26, Number(input.recurrenceRule.weeksCount) || 1)
          ),
          startDate: input.recurrenceRule.startDate || "2026-10-26",
          endDate: input.recurrenceRule.endDate || null,
        }
      : null;

  const resolvedDates =
    scheduleType === "days_of_week" && recurrenceRule
      ? generateRecurringDates(recurrenceRule)
      : input.candidateDates;

  const candidateDates =
    resolvedDates.length > 0
      ? resolvedDates
      : ["2026-10-27", "2026-10-28", "2026-10-29"];

  const dayStartHour = input.dayStartHour ?? 9;
  const dayEndHour = Math.max(dayStartHour + 1, input.dayEndHour ?? 17);
  const maxDurationMinutes =
    pollMode === "full_days"
      ? candidateDates.length * 1440
      : (dayEndHour - dayStartHour) * 60;
  const requestedDuration = Math.round(Number(input.durationMinutes) || 30);
  if (requestedDuration <= 0 || requestedDuration > maxDurationMinutes) {
    throw new Error(
      pollMode === "full_days"
        ? `Duration must be between 1 day and ${candidateDates.length} days.`
        : `Duration must be greater than 0 and fit within the ${dayEndHour - dayStartHour}h candidate window.`
    );
  }

  const hostTz = input.timezone || "America/New_York";
  const hostTzInfo = getTimezoneInfo(hostTz, candidateDates[0]);

  const poll: PollData = {
    id,
    slug,
    title: input.title.trim() || "Untitled Poll",
    description: input.description?.trim() || "",
    location: input.location?.trim() || "",
    pollMode,
    scheduleType,
    recurrenceRule,
    hostName: input.hostName?.trim() || "Organizer",
    hostClerkUserId: input.hostClerkUserId || null,
    hostTokenHash,
    timezone: hostTz,
    candidateDates,
    dayStartHour,
    dayEndHour,
    slotMinutes: input.slotMinutes ?? 30,
    durationMinutes: requestedDuration,
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
        id: `p_${crypto.randomUUID()}`,
        guestSessionId: input.deviceHash,
        clerkUserId: input.hostClerkUserId || null,
        name: input.hostName?.trim() || "Alex",
        city: hostTzInfo.city,
        timezone: hostTz,
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: {},
      },
    ],
  };

  return { poll, hostToken };
}

export function mutateParticipantVote(poll: PollData, payload: VoteInput): PollParticipant {
  if (poll.status !== "OPEN") {
    throw new Error("This poll is locked");
  }
  if (poll.deadlineAt && Date.now() >= new Date(poll.deadlineAt).getTime()) {
    throw new Error("The response window has closed");
  }

  const colors = ["#10B981", "#141413", "#2563EB", "#D97706", "#7C3AED"];
  const voterTz = payload.timezone || poll.timezone;
  const voterCity =
    payload.city?.trim() || getTimezoneInfo(voterTz, poll.candidateDates[0]).city;
  const existingIdx = poll.participants.findIndex(
    (participant) => participant.guestSessionId === payload.deviceHash
  );

  if (existingIdx >= 0) {
    const next: PollParticipant = {
      ...poll.participants[existingIdx],
      name: payload.name.trim() || poll.participants[existingIdx].name,
      timezone: voterTz || poll.participants[existingIdx].timezone,
      city: voterCity || poll.participants[existingIdx].city,
      slots: payload.slots,
    };
    poll.participants[existingIdx] = next;
    return next;
  }

  const created: PollParticipant = {
    id: `p_${crypto.randomUUID()}`,
    guestSessionId: payload.deviceHash,
    name: payload.name.trim() || "Guest",
    city: voterCity,
    timezone: voterTz,
    avatarColor: colors[poll.participants.length % colors.length],
    slots: payload.slots,
  };
  poll.participants.push(created);
  return created;
}

export function applyLockState(poll: PollData, payload: LockInput): void {
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
    const requested = Math.round(Number(payload.durationMinutes));
    const maxMins =
      poll.pollMode === "full_days"
        ? poll.candidateDates.length * 1440
        : (poll.dayEndHour - poll.dayStartHour) * 60;
    if (!Number.isFinite(requested) || requested <= 0 || requested > maxMins) {
      throw new Error("Invalid duration for this poll window");
    }
    poll.durationMinutes = requested;
  }
}
