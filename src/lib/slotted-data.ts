export type AvailabilityState = "available" | "if_needed";

export type BrushMode = "available" | "if_needed" | "clear";

export type VisibilityMode = "public" | "hidden_until_voted" | "host_only";

export type PollMode = "dates_and_hours" | "full_days";

export interface TimezoneOption {
  id: string;
  label: string;
  shortCode: string;
  city: string;
  offsetHoursFromEDT: number;
  utcLabel: string;
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  {
    id: "America/Los_Angeles",
    label: "San Francisco (PDT)",
    shortCode: "PDT",
    city: "SF",
    offsetHoursFromEDT: -3,
    utcLabel: "UTC-7",
  },
  {
    id: "America/New_York",
    label: "New York (EDT)",
    shortCode: "EDT",
    city: "NYC",
    offsetHoursFromEDT: 0,
    utcLabel: "UTC-4",
  },
  {
    id: "Europe/London",
    label: "London (BST)",
    shortCode: "BST",
    city: "LDN",
    offsetHoursFromEDT: 5,
    utcLabel: "UTC+1",
  },
  {
    id: "Europe/Berlin",
    label: "Berlin (CEST)",
    shortCode: "CEST",
    city: "BER",
    offsetHoursFromEDT: 6,
    utcLabel: "UTC+2",
  },
  {
    id: "Asia/Tokyo",
    label: "Tokyo (JST)",
    shortCode: "JST",
    city: "TYO",
    offsetHoursFromEDT: 13,
    utcLabel: "UTC+9",
  },
];

export interface PollParticipant {
  id: string;
  guestSessionId: string;
  clerkUserId?: string | null;
  name: string;
  role?: string;
  city: string;
  timezone: string;
  avatarColor: string;
  isCurrentUser?: boolean;
  isRequired?: boolean;
  slots: Record<string, AvailabilityState>;
}

export interface PollData {
  id: string;
  slug: string;
  title: string;
  description: string;
  location?: string;
  pollMode?: PollMode; // "dates_and_hours" (default) | "full_days"
  hostName: string;
  hostClerkUserId?: string | null;
  hostTokenHash?: string;
  timezone: string;
  candidateDates: string[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes: number;
  /**
   * For "dates_and_hours": minutes (15, 30, 60, 120, 180)
   * For "full_days": minutes representing N days (1440 = 1 day, 2880 = 2 days, 4320 = 3 days)
   */
  durationMinutes: number;
  // Advanced Settings
  hasPassword?: boolean;
  accessPassword?: string | null;
  visibilityMode: VisibilityMode;
  allowIfNeeded: boolean;
  deadlineAt?: string | null;
  // Status
  status: "OPEN" | "LOCKED";
  lockedSlotStart?: string;
  lockedSlotEnd?: string;
  lockedLocation?: string;
  createdAt?: string;
  participants: PollParticipant[];
}

export interface RankedWindow {
  id: string;
  date: string;
  endDate?: string;
  startSlotKey: string;
  endSlotKey: string;
  slotKeys: string[];
  startTimeMinutes: number;
  endTimeMinutes: number;
  score: number;
  strictAvailableCount: number;
  ifNeededCount: number;
  totalAttendingCount: number;
  totalParticipants: number;
  availableParticipants: PollParticipant[];
  ifNeededParticipants: PollParticipant[];
  missingParticipants: PollParticipant[];
  isPerfectStrict: boolean;
  isFullWithFlex: boolean;
  isFullDaysWindow?: boolean;
  daysCount?: number;
}

export const STORAGE_KEY_POLLS = "slotted_mlp_polls_v2";
export const STORAGE_KEY_GUEST = "slotted_mlp_guest_v2";
export const STORAGE_KEY_SESSION_ID = "slotted_mlp_session_v2";
export const STORAGE_KEY_HOST_TOKENS = "slotted_mlp_host_tokens_v2";
export const STORAGE_KEY_UNLOCKED_SLUGS = "slotted_mlp_unlocked_v2";
export const STORAGE_KEY_TZ = "slotted_mlp_tz_v2";

export function formatDurationBadge(
  durationMinutes: number,
  pollMode?: PollMode
): string {
  if (pollMode === "full_days" || durationMinutes >= 1440) {
    const days = Math.max(1, Math.round(durationMinutes / 1440));
    return days === 1 ? "Full day" : `${days} days`;
  }
  if (durationMinutes >= 60 && durationMinutes % 60 === 0) {
    return `${durationMinutes / 60}h`;
  }
  return `${durationMinutes}m`;
}

export function getOrCreateGuestSessionId(): string {
  if (typeof window === "undefined") return "slt_guest_local";
  try {
    let existing = localStorage.getItem(STORAGE_KEY_SESSION_ID);
    if (!existing) {
      existing = `slt_guest_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(STORAGE_KEY_SESSION_ID, existing);
    }
    return existing;
  } catch {
    return "slt_guest_local";
  }
}

export function generateDayTimeSlots(
  dayStartHour: number,
  dayEndHour: number,
  slotMinutes: number = 30
): string[] {
  const times: string[] = [];
  for (let hour = dayStartHour; hour < dayEndHour; hour++) {
    for (let min = 0; min < 60; min += slotMinutes) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(min).padStart(2, "0");
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
}

export function makeSlotKey(date: string, timeStr: string): string {
  return `${date}T${timeStr}`;
}

export function parseSlotKey(slotKey: string): {
  date: string;
  time: string;
  minutesFromMidnight: number;
} {
  const [date, time] = slotKey.split("T");
  if (!time || time === "ALLDAY") {
    return { date, time: "ALLDAY", minutesFromMidnight: 540 };
  }
  const [hh, mm] = (time || "09:00").split(":").map(Number);
  return {
    date,
    time: time || "09:00",
    minutesFromMidnight: hh * 60 + mm,
  };
}

export function formatMinutesToDisplay(
  minutesFromMidnight: number,
  targetTimezoneId: string = "America/New_York",
  baseTimezoneId: string = "America/New_York",
  compact: boolean = false
): { timeLabel: string; dayShift: number } {
  const targetTz =
    TIMEZONE_OPTIONS.find((t) => t.id === targetTimezoneId) || TIMEZONE_OPTIONS[1];
  const baseTz =
    TIMEZONE_OPTIONS.find((t) => t.id === baseTimezoneId) || TIMEZONE_OPTIONS[1];
  const diffMinutes =
    (targetTz.offsetHoursFromEDT - baseTz.offsetHoursFromEDT) * 60;

  let shifted = minutesFromMidnight + diffMinutes;
  let dayShift = 0;
  if (shifted < 0) {
    shifted += 24 * 60;
    dayShift = -1;
  } else if (shifted >= 24 * 60) {
    shifted -= 24 * 60;
    dayShift = 1;
  }

  const hours24 = Math.floor(shifted / 60);
  const mins = shifted % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const mmStr = String(mins).padStart(2, "0");

  if (compact) {
    return {
      timeLabel:
        mins === 0
          ? `${hours12}${period.toLowerCase()}`
          : `${hours12}:${mmStr}${period.toLowerCase()}`,
      dayShift,
    };
  }

  return {
    timeLabel: `${String(hours12).padStart(2, "0")}:${mmStr} ${period}`,
    dayShift,
  };
}

export function formatDateHeader(isoDate: string): {
  weekdayShort: string;
  weekdayLong: string;
  monthShort: string;
  dayNum: string;
  fullLabel: string;
} {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekdayShort = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const weekdayLong = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const monthShort = dateObj.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const dayNum = String(d);
  return {
    weekdayShort,
    weekdayLong,
    monthShort,
    dayNum,
    fullLabel: `${weekdayShort}, ${monthShort} ${dayNum}`,
  };
}

export function computeRankedWindows(poll: PollData): RankedWindow[] {
  const totalParticipants = poll.participants.length;
  const windows: RankedWindow[] = [];

  // MODE A: FULL-DAYS POLL (For group holidays, weekend trips, offsites)
  if (poll.pollMode === "full_days" || poll.durationMinutes >= 1440) {
    const daysNeeded = Math.max(
      1,
      Math.min(
        poll.candidateDates.length,
        Math.round(poll.durationMinutes / 1440) || 1
      )
    );

    for (let i = 0; i <= poll.candidateDates.length - daysNeeded; i++) {
      const spanDates = poll.candidateDates.slice(i, i + daysNeeded);
      const slotKeys = spanDates.map((d) => `${d}TALLDAY`);

      const availableParticipants: PollParticipant[] = [];
      const ifNeededParticipants: PollParticipant[] = [];
      const missingParticipants: PollParticipant[] = [];

      for (const p of poll.participants) {
        let allAvailable = true;
        let canAttendWithFlex = true;

        for (const key of slotKeys) {
          const st = p.slots[key];
          if (!st) {
            allAvailable = false;
            canAttendWithFlex = false;
            break;
          }
          if (st === "if_needed") {
            allAvailable = false;
          }
        }

        if (allAvailable) {
          availableParticipants.push(p);
        } else if (canAttendWithFlex) {
          ifNeededParticipants.push(p);
        } else {
          missingParticipants.push(p);
        }
      }

      const strictAvailableCount = availableParticipants.length;
      const ifNeededCount = ifNeededParticipants.length;
      const totalAttendingCount = strictAvailableCount + ifNeededCount;
      if (totalAttendingCount === 0) continue;

      const score =
        100 * strictAvailableCount + 65 * ifNeededCount + Math.max(0, 15 - i);

      windows.push({
        id: `${slotKeys[0]}__${daysNeeded}d`,
        date: spanDates[0],
        endDate: spanDates[spanDates.length - 1],
        startSlotKey: slotKeys[0],
        endSlotKey: slotKeys[slotKeys.length - 1],
        slotKeys,
        startTimeMinutes: 540,
        endTimeMinutes: 1020,
        score,
        strictAvailableCount,
        ifNeededCount,
        totalAttendingCount,
        totalParticipants,
        availableParticipants,
        ifNeededParticipants,
        missingParticipants,
        isPerfectStrict:
          strictAvailableCount === totalParticipants && totalParticipants > 0,
        isFullWithFlex:
          totalAttendingCount === totalParticipants && totalParticipants > 0,
        isFullDaysWindow: true,
        daysCount: daysNeeded,
      });
    }

    windows.sort((a, b) => b.score - a.score);
    return windows.slice(0, 6);
  }

  // MODE B: DATES + HOURS POLL
  const slotsNeeded = Math.max(
    1,
    Math.round(poll.durationMinutes / poll.slotMinutes)
  );
  const dayTimes = generateDayTimeSlots(
    poll.dayStartHour,
    poll.dayEndHour,
    poll.slotMinutes
  );

  poll.candidateDates.forEach((date, dateIdx) => {
    for (let i = 0; i <= dayTimes.length - slotsNeeded; i++) {
      const windowTimes = dayTimes.slice(i, i + slotsNeeded);
      const slotKeys = windowTimes.map((t) => makeSlotKey(date, t));

      const availableParticipants: PollParticipant[] = [];
      const ifNeededParticipants: PollParticipant[] = [];
      const missingParticipants: PollParticipant[] = [];

      for (const p of poll.participants) {
        let allAvailable = true;
        let canAttendWithFlex = true;

        for (const key of slotKeys) {
          const st = p.slots[key];
          if (!st) {
            allAvailable = false;
            canAttendWithFlex = false;
            break;
          }
          if (st === "if_needed") {
            allAvailable = false;
          }
        }

        if (allAvailable) {
          availableParticipants.push(p);
        } else if (canAttendWithFlex) {
          ifNeededParticipants.push(p);
        } else {
          missingParticipants.push(p);
        }
      }

      const strictAvailableCount = availableParticipants.length;
      const ifNeededCount = ifNeededParticipants.length;
      const totalAttendingCount = strictAvailableCount + ifNeededCount;

      if (totalAttendingCount === 0) continue;

      const startParsed = parseSlotKey(slotKeys[0]);
      const endMinutes = startParsed.minutesFromMidnight + poll.durationMinutes;
      const endHh = String(Math.floor(endMinutes / 60)).padStart(2, "0");
      const endMm = String(endMinutes % 60).padStart(2, "0");
      const endSlotKey = `${date}T${endHh}:${endMm}`;

      const midDayBonus =
        startParsed.minutesFromMidnight >= 600 &&
        startParsed.minutesFromMidnight <= 840
          ? 8
          : 0;
      const earlinessBonus =
        Math.max(0, 20 - dateIdx * 3 - i * 0.4) + midDayBonus;

      const score =
        100 * strictAvailableCount + 65 * ifNeededCount + earlinessBonus;

      windows.push({
        id: `${slotKeys[0]}__${poll.durationMinutes}`,
        date,
        startSlotKey: slotKeys[0],
        endSlotKey,
        slotKeys,
        startTimeMinutes: startParsed.minutesFromMidnight,
        endTimeMinutes: endMinutes,
        score,
        strictAvailableCount,
        ifNeededCount,
        totalAttendingCount,
        totalParticipants,
        availableParticipants,
        ifNeededParticipants,
        missingParticipants,
        isPerfectStrict:
          strictAvailableCount === totalParticipants && totalParticipants > 0,
        isFullWithFlex:
          totalAttendingCount === totalParticipants && totalParticipants > 0,
      });
    }
  });

  windows.sort((a, b) => b.score - a.score);

  const distinct: RankedWindow[] = [];
  for (const w of windows) {
    const overlapsExisting = distinct.some(
      (existing) =>
        existing.date === w.date &&
        Math.abs(existing.startTimeMinutes - w.startTimeMinutes) <
          poll.durationMinutes
    );
    if (!overlapsExisting || distinct.length === 0) {
      distinct.push(w);
    }
    if (distinct.length >= 6) break;
  }

  return distinct;
}

function buildSlots(
  entries: Array<[string, string[], AvailabilityState?]>
): Record<string, AvailabilityState> {
  const map: Record<string, AvailabilityState> = {};
  for (const [date, times, state = "available"] of entries) {
    for (const t of times) {
      map[`${date}T${t}`] = state;
    }
  }
  return map;
}

export const INITIAL_POLLS: PollData[] = [
  {
    id: "pol_series_a_sync",
    slug: "series-a-sync-q4",
    title: "Series A Partner Sync — Q4",
    description:
      "Q4 metrics, partner memo review, and board rehearsal across SF, NYC, London, and Berlin.",
    pollMode: "dates_and_hours",
    hostName: "Elena Rostova",
    timezone: "America/New_York",
    candidateDates: ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
    dayStartHour: 9,
    dayEndHour: 16,
    slotMinutes: 30,
    durationMinutes: 60,
    hasPassword: false,
    accessPassword: null,
    visibilityMode: "public",
    allowIfNeeded: true,
    deadlineAt: null,
    status: "OPEN",
    lockedLocation: "meet.slotted.app/series-a-q4",
    createdAt: "2026-10-21T18:00:00.000Z",
    participants: [
      {
        id: "p_elena",
        guestSessionId: "slt_elena",
        name: "Elena",
        role: "Lead Partner",
        city: "SF",
        timezone: "America/Los_Angeles",
        avatarColor: "#10B981",
        isRequired: true,
        slots: buildSlots([
          [
            "2026-10-27",
            ["10:30", "11:00", "11:30", "13:00", "13:30", "14:00"],
            "available",
          ],
          ["2026-10-27", ["09:30", "10:00"], "if_needed"],
          [
            "2026-10-28",
            ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"],
            "available",
          ],
          [
            "2026-10-29",
            ["11:00", "11:30", "12:00", "12:30", "14:00", "14:30"],
            "available",
          ],
          ["2026-10-29", ["09:30", "10:00"], "if_needed"],
          [
            "2026-10-30",
            ["10:00", "10:30", "11:00", "13:00", "13:30"],
            "available",
          ],
        ]),
      },
      {
        id: "p_marcus",
        guestSessionId: "slt_marcus",
        name: "Marcus",
        role: "Founder",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#141413",
        isRequired: true,
        slots: buildSlots([
          [
            "2026-10-27",
            ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30"],
            "available",
          ],
          [
            "2026-10-28",
            [
              "09:30",
              "10:00",
              "10:30",
              "11:00",
              "11:30",
              "13:30",
              "14:00",
              "14:30",
            ],
            "available",
          ],
          [
            "2026-10-29",
            ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"],
            "available",
          ],
          [
            "2026-10-30",
            ["09:30", "10:00", "10:30", "11:00", "11:30"],
            "available",
          ],
        ]),
      },
      {
        id: "p_sora",
        guestSessionId: "slt_sora",
        name: "Sora",
        role: "Design",
        city: "London",
        timezone: "Europe/London",
        avatarColor: "#D97706",
        slots: {
          ...buildSlots([
            [
              "2026-10-27",
              ["09:30", "10:00", "10:30", "11:00", "11:30"],
              "available",
            ],
            [
              "2026-10-28",
              ["10:00", "10:30", "11:00", "11:30", "12:00"],
              "available",
            ],
            ["2026-10-29", ["09:00", "09:30", "10:00", "10:30"], "available"],
            ["2026-10-30", ["10:00", "10:30", "11:00"], "available"],
          ]),
          "2026-10-28T14:00": "if_needed",
          "2026-10-28T14:30": "if_needed",
          "2026-10-29T11:00": "if_needed",
          "2026-10-29T11:30": "if_needed",
          "2026-10-29T14:00": "if_needed",
          "2026-10-29T14:30": "if_needed",
        },
      },
      {
        id: "p_lucas",
        guestSessionId: "slt_lucas",
        name: "Lucas",
        role: "Staff Eng",
        city: "Berlin",
        timezone: "Europe/Berlin",
        avatarColor: "#2563EB",
        slots: {
          ...buildSlots([
            [
              "2026-10-27",
              ["10:00", "10:30", "11:00", "11:30", "12:00"],
              "available",
            ],
            [
              "2026-10-28",
              ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"],
              "available",
            ],
            [
              "2026-10-29",
              ["11:00", "11:30", "12:00", "14:00", "14:30"],
              "available",
            ],
            ["2026-10-30", ["09:30", "10:00", "10:30"], "available"],
          ]),
          "2026-10-27T13:00": "if_needed",
          "2026-10-27T13:30": "if_needed",
        },
      },
      {
        id: "p_priya",
        guestSessionId: "slt_priya",
        name: "Priya",
        role: "Product",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#7C3AED",
        slots: buildSlots([
          [
            "2026-10-27",
            ["10:30", "11:00", "11:30", "13:30", "14:00"],
            "available",
          ],
          [
            "2026-10-28",
            ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"],
            "available",
          ],
          [
            "2026-10-29",
            ["11:00", "11:30", "14:00", "14:30", "15:00"],
            "available",
          ],
          ["2026-10-30", ["10:00", "10:30", "11:00", "11:30"], "available"],
        ]),
      },
      {
        id: "p_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        role: "You",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#059669",
        isCurrentUser: true,
        slots: {
          ...buildSlots([
            ["2026-10-27", ["10:00", "10:30", "11:00", "11:30"], "available"],
            [
              "2026-10-28",
              ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"],
              "available",
            ],
            ["2026-10-29", ["11:00", "11:30", "14:00", "14:30"], "available"],
            ["2026-10-30", ["10:00", "10:30", "11:00"], "available"],
          ]),
          "2026-10-27T13:00": "if_needed",
          "2026-10-27T13:30": "if_needed",
        },
      },
    ],
  },
  {
    id: "pol_autumn_offsite",
    slug: "alps-group-holiday",
    title: "Autumn Alps Weekend Trip",
    description: "Picking a 3-day Friday–Sunday window for the cabin trip.",
    pollMode: "full_days",
    hostName: "Marcus Vance",
    timezone: "Europe/Berlin",
    candidateDates: [
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ],
    dayStartHour: 9,
    dayEndHour: 17,
    slotMinutes: 30,
    durationMinutes: 4320, // 3 days (3 * 1440)
    hasPassword: false,
    accessPassword: null,
    visibilityMode: "public",
    allowIfNeeded: true,
    deadlineAt: null,
    status: "OPEN",
    lockedLocation: "Chamonix Chalet",
    createdAt: "2026-10-21T16:30:00.000Z",
    participants: [
      {
        id: "p_hol_1",
        guestSessionId: "slt_devon",
        name: "Devon",
        city: "BER",
        timezone: "Europe/Berlin",
        avatarColor: "#059669",
        slots: {
          "2026-10-30TALLDAY": "available",
          "2026-10-31TALLDAY": "available",
          "2026-11-01TALLDAY": "available",
          "2026-11-06TALLDAY": "available",
          "2026-11-07TALLDAY": "available",
          "2026-11-08TALLDAY": "available",
        },
      },
      {
        id: "p_hol_2",
        guestSessionId: "slt_claire",
        name: "Claire",
        city: "LDN",
        timezone: "Europe/London",
        avatarColor: "#D97706",
        slots: {
          "2026-10-30TALLDAY": "if_needed",
          "2026-10-31TALLDAY": "available",
          "2026-11-01TALLDAY": "available",
          "2026-11-06TALLDAY": "available",
          "2026-11-07TALLDAY": "available",
          "2026-11-08TALLDAY": "available",
        },
      },
      {
        id: "p_hol_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: {
          "2026-11-06TALLDAY": "available",
          "2026-11-07TALLDAY": "available",
          "2026-11-08TALLDAY": "available",
        },
      },
    ],
  },
  {
    id: "pol_design_crit",
    slug: "design-system-crit",
    title: "Design System Crit",
    description:
      "45-minute review of typographic scale, grid hairlines, and mobile touch gestures.",
    pollMode: "dates_and_hours",
    hostName: "Sora Takahashi",
    timezone: "America/New_York",
    candidateDates: ["2026-10-28", "2026-10-29", "2026-10-30"],
    dayStartHour: 10,
    dayEndHour: 16,
    slotMinutes: 30,
    durationMinutes: 45,
    hasPassword: false,
    accessPassword: null,
    visibilityMode: "public",
    allowIfNeeded: true,
    deadlineAt: null,
    status: "LOCKED",
    lockedSlotStart: "2026-10-28T11:00",
    lockedSlotEnd: "2026-10-28T12:00",
    lockedLocation: "meet.slotted.app/design-crit",
    createdAt: "2026-10-20T14:00:00.000Z",
    participants: [
      {
        id: "p_dc_1",
        guestSessionId: "slt_sora",
        name: "Sora",
        role: "Design Lead",
        city: "London",
        timezone: "Europe/London",
        avatarColor: "#D97706",
        slots: buildSlots([
          [
            "2026-10-28",
            ["11:00", "11:30", "12:00", "12:30", "13:00"],
            "available",
          ],
          ["2026-10-29", ["10:30", "11:00", "11:30", "12:00"], "available"],
          ["2026-10-30", ["11:00", "11:30", "12:00"], "available"],
        ]),
      },
      {
        id: "p_dc_2",
        guestSessionId: "slt_elena",
        name: "Elena",
        role: "Product",
        city: "SF",
        timezone: "America/Los_Angeles",
        avatarColor: "#059669",
        slots: buildSlots([
          [
            "2026-10-28",
            ["11:00", "11:30", "12:00", "14:00", "14:30"],
            "available",
          ],
          [
            "2026-10-29",
            ["11:00", "11:30", "12:00", "13:30", "14:00"],
            "available",
          ],
          ["2026-10-30", ["11:00", "11:30", "12:00"], "available"],
        ]),
      },
      {
        id: "p_dc_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        role: "You",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: buildSlots([
          ["2026-10-28", ["11:00", "11:30", "12:00", "12:30"], "available"],
          ["2026-10-29", ["11:00", "11:30", "12:00"], "available"],
          ["2026-10-30", ["11:00", "11:30", "12:00"], "available"],
        ]),
      },
    ],
  },
];

export function generateIcsContent(
  poll: PollData,
  window: RankedWindow
): string {
  const [y, m, d] = window.date.split("-");

  if (poll.pollMode === "full_days" || window.isFullDaysWindow) {
    const endIso = window.endDate || window.date;
    const [ey, em, ed] = endIso.split("-").map(Number);
    const nextDay = new Date(Date.UTC(ey, em - 1, ed + 1));
    const ny = nextDay.getUTCFullYear();
    const nm = String(nextDay.getUTCMonth() + 1).padStart(2, "0");
    const nd = String(nextDay.getUTCDate()).padStart(2, "0");
    const attendees = poll.participants.map((p) => p.name).join(", ");
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//slotted//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${poll.id}@slotted.app`,
      `SUMMARY:${poll.title}`,
      `DTSTART;VALUE=DATE:${y}${m}${d}`,
      `DTEND;VALUE=DATE:${ny}${nm}${nd}`,
      `DESCRIPTION:${poll.description}\\n\\nConfirmed (${window.totalAttendingCount}/${window.totalParticipants}: ${attendees})`,
      `LOCATION:${poll.lockedLocation || poll.location || "All-day event"}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
  }

  const startHh = String(Math.floor(window.startTimeMinutes / 60)).padStart(
    2,
    "0"
  );
  const startMm = String(window.startTimeMinutes % 60).padStart(2, "0");
  const endHh = String(Math.floor(window.endTimeMinutes / 60)).padStart(2, "0");
  const endMm = String(window.endTimeMinutes % 60).padStart(2, "0");

  const dtStart = `${y}${m}${d}T${startHh}${startMm}00`;
  const dtEnd = `${y}${m}${d}T${endHh}${endMm}00`;

  const attendees = poll.participants.map((p) => p.name).join(", ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//slotted//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${poll.id}@slotted.app`,
    `SUMMARY:${poll.title}`,
    `DTSTART;TZID=${poll.timezone}:${dtStart}`,
    `DTEND;TZID=${poll.timezone}:${dtEnd}`,
    `DESCRIPTION:${poll.description}\\n\\nConfirmed (${window.totalAttendingCount}/${window.totalParticipants}: ${attendees})`,
    `LOCATION:${poll.lockedLocation || poll.location || "Video call"}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
