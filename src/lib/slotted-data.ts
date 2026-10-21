export type AvailabilityState = "available" | "if_needed";

export type BrushMode = "available" | "if_needed" | "clear";

export type AtmosphereTheme = "linen" | "emerald" | "sunset" | "slate";

export interface TimezoneOption {
  id: string;
  label: string;
  shortCode: string;
  city: string;
  offsetHoursFromEDT: number; // Base reference: America/New_York (EDT, UTC-4)
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
  name: string;
  role?: string;
  city: string;
  timezone: string;
  avatarColor: string;
  isCurrentUser?: boolean;
  isRequired?: boolean;
  slots: Record<string, AvailabilityState>;
}

export interface EaselReaction {
  emoji: string;
  label: string;
  count: number;
  userReacted?: boolean;
}

export interface PollData {
  id: string;
  slug: string;
  title: string;
  description: string;
  themeTint: AtmosphereTheme;
  hostName: string;
  timezone: string;
  candidateDates: string[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes: number;
  durationMinutes: number;
  status: "OPEN" | "LOCKED";
  lockedSlotStart?: string;
  lockedSlotEnd?: string;
  lockedLocation?: string;
  participants: PollParticipant[];
  reactions: EaselReaction[];
}

export interface RankedWindow {
  id: string;
  date: string;
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
}

export const STORAGE_KEY_POLLS = "slotted_flat_polls_v1";
export const STORAGE_KEY_GUEST = "slotted_flat_guest_v1";
export const STORAGE_KEY_TZ = "slotted_flat_tz_v1";

export function loadStoredPolls(): PollData[] {
  if (typeof window === "undefined") return INITIAL_POLLS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_POLLS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_POLLS;
}

export function saveStoredPolls(polls: PollData[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(polls));
  } catch {}
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
  const slotsNeeded = Math.max(
    1,
    Math.round(poll.durationMinutes / poll.slotMinutes)
  );
  const dayTimes = generateDayTimeSlots(
    poll.dayStartHour,
    poll.dayEndHour,
    poll.slotMinutes
  );
  const windows: RankedWindow[] = [];
  const totalParticipants = poll.participants.length;

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
    themeTint: "linen",
    hostName: "Elena Rostova",
    timezone: "America/New_York",
    candidateDates: ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"],
    dayStartHour: 9,
    dayEndHour: 16,
    slotMinutes: 30,
    durationMinutes: 60,
    status: "OPEN",
    lockedLocation: "meet.slotted.app/series-a-q4",
    reactions: [],
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
    id: "pol_yc_offsite",
    slug: "yc-w27-cofounder-offsite",
    title: "YC W27 Cofounder Offsite",
    description:
      "60-minute sprint planning and demo day narrative review.",
    themeTint: "emerald",
    hostName: "Marcus Vance",
    timezone: "America/Los_Angeles",
    candidateDates: ["2026-11-03", "2026-11-04", "2026-11-05"],
    dayStartHour: 9,
    dayEndHour: 15,
    slotMinutes: 30,
    durationMinutes: 60,
    status: "OPEN",
    lockedLocation: "San Francisco · Dogpatch Studio",
    reactions: [],
    participants: [
      {
        id: "p_yc_1",
        guestSessionId: "slt_devon",
        name: "Devon",
        role: "Cofounder",
        city: "SF",
        timezone: "America/Los_Angeles",
        avatarColor: "#059669",
        slots: buildSlots([
          [
            "2026-11-03",
            ["10:00", "10:30", "11:00", "11:30", "13:00", "13:30"],
            "available",
          ],
          [
            "2026-11-04",
            ["09:30", "10:00", "10:30", "11:00", "14:00", "14:30"],
            "available",
          ],
          ["2026-11-05", ["10:00", "10:30", "11:00", "11:30"], "available"],
        ]),
      },
      {
        id: "p_yc_2",
        guestSessionId: "slt_claire",
        name: "Claire",
        role: "Partner",
        city: "SF",
        timezone: "America/Los_Angeles",
        avatarColor: "#D97706",
        slots: {
          ...buildSlots([
            ["2026-11-03", ["10:00", "10:30", "11:00", "11:30"], "available"],
            ["2026-11-04", ["10:00", "10:30", "11:00", "11:30"], "available"],
            ["2026-11-05", ["13:00", "13:30", "14:00"], "available"],
          ]),
          "2026-11-05T10:00": "if_needed",
          "2026-11-05T10:30": "if_needed",
        },
      },
      {
        id: "p_yc_3",
        guestSessionId: "slt_kenji",
        name: "Kenji",
        role: "Design",
        city: "TYO",
        timezone: "Asia/Tokyo",
        avatarColor: "#2563EB",
        slots: {
          ...buildSlots([
            ["2026-11-03", ["10:00", "10:30", "11:00"], "available"],
            ["2026-11-04", ["10:00", "10:30", "11:00", "11:30"], "available"],
          ]),
          "2026-11-03T11:30": "if_needed",
        },
      },
      {
        id: "p_yc_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        role: "You",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: buildSlots([
          ["2026-11-03", ["10:00", "10:30", "11:00", "11:30"], "available"],
          [
            "2026-11-04",
            ["10:00", "10:30", "11:00", "11:30", "13:00", "13:30"],
            "available",
          ],
          ["2026-11-05", ["10:00", "10:30", "11:00"], "available"],
        ]),
      },
    ],
  },
  {
    id: "pol_design_crit",
    slug: "design-system-crit",
    title: "Design System Crit",
    description:
      "45-minute review of typographic scale, grid hairlines, and mobile touch gestures.",
    themeTint: "sunset",
    hostName: "Sora Takahashi",
    timezone: "America/New_York",
    candidateDates: ["2026-10-28", "2026-10-29", "2026-10-30"],
    dayStartHour: 10,
    dayEndHour: 16,
    slotMinutes: 30,
    durationMinutes: 45,
    status: "LOCKED",
    lockedSlotStart: "2026-10-28T11:00",
    lockedSlotEnd: "2026-10-28T12:00",
    lockedLocation: "meet.slotted.app/design-crit",
    reactions: [],
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

export interface ParsedNaturalPoll {
  title: string;
  dateLabels: string[];
  candidateDates: string[];
  timeRangeLabel: string;
  dayStartHour: number;
  dayEndHour: number;
  durationMinutes: number;
  participantsExtracted: string[];
}

export function parseNaturalLanguagePoll(input: string): ParsedNaturalPoll {
  const raw =
    input.trim() ||
    "Coffee with Alex and Sam next Tue or Thu afternoon 30m";

  let durationMinutes = 30;
  if (/\b15\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 15;
  } else if (/\b30\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 30;
  } else if (/\b45\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 45;
  } else if (/\b(60\s*(m|min|mins)|1\s*h|1\s*hr|hour)\b/i.test(raw)) {
    durationMinutes = 60;
  } else if (/\b90\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 90;
  } else if (/coffee|quick|catchup/i.test(raw)) {
    durationMinutes = 30;
  } else {
    durationMinutes = 45;
  }

  let dayStartHour = 9;
  let dayEndHour = 17;
  let timeRangeLabel = "09:00 – 17:00";

  if (/morning/i.test(raw)) {
    dayStartHour = 9;
    dayEndHour = 13;
    timeRangeLabel = "09:00 – 13:00";
  } else if (/afternoon/i.test(raw)) {
    dayStartHour = 13;
    dayEndHour = 18;
    timeRangeLabel = "13:00 – 18:00";
  } else if (/evening|dinner/i.test(raw)) {
    dayStartHour = 17;
    dayEndHour = 21;
    timeRangeLabel = "17:00 – 21:00";
  } else {
    const timeMatch = raw.match(
      /(\d{1,2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})\s*(am|pm)?/i
    );
    if (timeMatch) {
      let s = parseInt(timeMatch[1], 10);
      const sMeridiem = (timeMatch[2] || "am").toLowerCase();
      let e = parseInt(timeMatch[3], 10);
      const eMeridiem = (timeMatch[4] || "pm").toLowerCase();
      if (sMeridiem === "pm" && s < 12) s += 12;
      if (eMeridiem === "pm" && e < 12) e += 12;
      if (e > s && e - s >= 2 && e <= 22) {
        dayStartHour = s;
        dayEndHour = Math.min(s + 9, e);
        timeRangeLabel = `${String(dayStartHour).padStart(2, "0")}:00 – ${String(dayEndHour).padStart(2, "0")}:00`;
      }
    }
  }

  let candidateDates = ["2026-10-27", "2026-10-28", "2026-10-29"];
  if (/tue\s*(or|and|,)\s*thu/i.test(raw)) {
    candidateDates = ["2026-10-27", "2026-10-29"];
  } else if (/mon.*wed/i.test(raw)) {
    candidateDates = ["2026-10-26", "2026-10-27", "2026-10-28"];
  } else if (/wed.*fri/i.test(raw)) {
    candidateDates = ["2026-10-28", "2026-10-29", "2026-10-30"];
  } else if (/tue.*fri/i.test(raw)) {
    candidateDates = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
  }

  const dateLabels = candidateDates.map((d) => {
    const hdr = formatDateHeader(d);
    return `${hdr.weekdayShort} ${hdr.dayNum}`;
  });

  // Extract names after "with ..." if present
  const participantsExtracted: string[] = [];
  const withMatch = raw.match(/\bwith\s+([A-Z][a-z]+(?:\s+(?:and|&|,)\s+[A-Z][a-z]+)*)/);
  if (withMatch && withMatch[1]) {
    const names = withMatch[1]
      .split(/\s+(?:and|&|,)\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    participantsExtracted.push(...names);
  }

  const cleanedTitle = raw
    .replace(/\b(next|this)\s+[a-z\s,–-]+/gi, "")
    .replace(/(\d{1,2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})\s*(am|pm)?/gi, "")
    .replace(/\b(15|30|45|60|90)\s*(m|min|mins)\b/gi, "")
    .replace(/\b(mornings?|afternoons?|evenings?|between|and\s+\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const title =
    cleanedTitle.length >= 3 ? cleanedTitle : "Coffee with Alex and Sam";

  return {
    title,
    dateLabels,
    candidateDates,
    timeRangeLabel,
    dayStartHour,
    dayEndHour,
    durationMinutes,
    participantsExtracted,
  };
}

export function generateIcsContent(
  poll: PollData,
  window: RankedWindow
): string {
  const [y, m, d] = window.date.split("-");
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
    `LOCATION:${poll.lockedLocation || "Video call"}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
