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
  /**
   * Keyed by canonical slot ISO string in the poll's base date/time, e.g. "2026-10-28T10:00"
   */
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
  timezone: string; // Base timezone of the poll (default "America/New_York")
  candidateDates: string[]; // ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]
  dayStartHour: number; // e.g., 9
  dayEndHour: number; // e.g., 16
  slotMinutes: number; // 30
  durationMinutes: number; // 30 | 45 | 60 | 90
  status: "OPEN" | "LOCKED";
  lockedSlotStart?: string; // e.g. "2026-10-28T10:00"
  lockedSlotEnd?: string; // e.g. "2026-10-28T11:00"
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

export function parseSlotKey(slotKey: string): { date: string; time: string; minutesFromMidnight: number } {
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
  const diffMinutes = (targetTz.offsetHoursFromEDT - baseTz.offsetHoursFromEDT) * 60;

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
      timeLabel: mins === 0 ? `${hours12}${period.toLowerCase()}` : `${hours12}:${mmStr}${period.toLowerCase()}`,
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

/**
 * Real-time Consensus & Best-Slot Ranking Engine
 * Score(W) = (100 * C_available) + (65 * C_if_needed) + EarlinessBonus(W)
 */
export function computeRankedWindows(poll: PollData): RankedWindow[] {
  const slotsNeeded = Math.max(1, Math.round(poll.durationMinutes / poll.slotMinutes));
  const dayTimes = generateDayTimeSlots(poll.dayStartHour, poll.dayEndHour, poll.slotMinutes);
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

      // Earliness & optimal mid-day bonus so 10:00 AM - 2:00 PM beats 4:30 PM on ties
      const midDayBonus =
        startParsed.minutesFromMidnight >= 600 && startParsed.minutesFromMidnight <= 840
          ? 8
          : 0;
      const earlinessBonus = Math.max(0, 20 - dateIdx * 3 - i * 0.4) + midDayBonus;

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
        isPerfectStrict: strictAvailableCount === totalParticipants && totalParticipants > 0,
        isFullWithFlex: totalAttendingCount === totalParticipants && totalParticipants > 0,
      });
    }
  });

  windows.sort((a, b) => b.score - a.score);

  // Deduplicate overlapping adjacent windows so Top 4 leaderboard shows distinct actionable blocks
  const distinct: RankedWindow[] = [];
  for (const w of windows) {
    const overlapsExisting = distinct.some(
      (existing) =>
        existing.date === w.date &&
        Math.abs(existing.startTimeMinutes - w.startTimeMinutes) < poll.durationMinutes
    );
    if (!overlapsExisting || distinct.length === 0) {
      distinct.push(w);
    }
    if (distinct.length >= 6) break;
  }

  return distinct;
}

/**
 * Helper to create ranges of slots cleanly
 */
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
    reactions: [
      { emoji: "🔥", label: "Locked in", count: 4, userReacted: true },
      { emoji: "☕", label: "Coffee ready", count: 3, userReacted: false },
      { emoji: "👍", label: "Works for me", count: 5, userReacted: true },
      { emoji: "🎉", label: "Ship it", count: 2, userReacted: false },
    ],
    participants: [
      {
        id: "p_elena",
        guestSessionId: "slt_elena",
        name: "Elena",
        role: "Lead Partner",
        city: "SF",
        timezone: "America/Los_Angeles",
        avatarColor: "#059669",
        isRequired: true,
        slots: buildSlots([
          ["2026-10-27", ["10:30", "11:00", "11:30", "13:00", "13:30", "14:00"], "available"],
          ["2026-10-27", ["09:30", "10:00"], "if_needed"],
          ["2026-10-28", ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"], "available"],
          ["2026-10-29", ["11:00", "11:30", "12:00", "12:30", "14:00", "14:30"], "available"],
          ["2026-10-29", ["09:30", "10:00"], "if_needed"],
          ["2026-10-30", ["10:00", "10:30", "11:00", "13:00", "13:30"], "available"],
        ]),
      },
      {
        id: "p_marcus",
        guestSessionId: "slt_marcus",
        name: "Marcus",
        role: "Founder & CEO",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#141413",
        isRequired: true,
        slots: buildSlots([
          ["2026-10-27", ["09:00", "09:30", "10:00", "10:30", "11:00", "14:00", "14:30"], "available"],
          ["2026-10-28", ["09:30", "10:00", "10:30", "11:00", "11:30", "13:30", "14:00", "14:30"], "available"],
          ["2026-10-29", ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00"], "available"],
          ["2026-10-30", ["09:30", "10:00", "10:30", "11:00", "11:30"], "available"],
        ]),
      },
      {
        id: "p_sora",
        guestSessionId: "slt_sora",
        name: "Sora",
        role: "Design Partner",
        city: "London",
        timezone: "Europe/London",
        avatarColor: "#D97706",
        slots: {
          ...buildSlots([
            ["2026-10-27", ["09:30", "10:00", "10:30", "11:00", "11:30"], "available"],
            ["2026-10-28", ["10:00", "10:30", "11:00", "11:30", "12:00"], "available"],
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
            ["2026-10-27", ["10:00", "10:30", "11:00", "11:30", "12:00"], "available"],
            ["2026-10-28", ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"], "available"],
            ["2026-10-29", ["11:00", "11:30", "12:00", "14:00", "14:30"], "available"],
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
        role: "Head of Product",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#7C3AED",
        slots: {
          ...buildSlots([
            ["2026-10-27", ["10:30", "11:00", "11:30", "13:30", "14:00"], "available"],
            ["2026-10-28", ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"], "available"],
            ["2026-10-29", ["11:00", "11:30", "14:00", "14:30", "15:00"], "available"],
            ["2026-10-30", ["10:00", "10:30", "11:00", "11:30"], "available"],
          ]),
        },
      },
      {
        id: "p_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        role: "You · Guest",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: {
          ...buildSlots([
            ["2026-10-27", ["10:00", "10:30", "11:00", "11:30"], "available"],
            ["2026-10-28", ["10:00", "10:30", "11:00", "11:30", "14:00", "14:30"], "available"],
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
    title: "YC W27 Cofounder Offsite & Roadmap Jam",
    description:
      "Locking our 60-minute sprint planning and demo day narrative architecture session.",
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
    reactions: [
      { emoji: "🚀", label: "Demo day ready", count: 3, userReacted: true },
      { emoji: "☕", label: "Blue Bottle", count: 4, userReacted: false },
      { emoji: "🔥", label: "Let's go", count: 5, userReacted: true },
    ],
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
          ["2026-11-03", ["10:00", "10:30", "11:00", "11:30", "13:00", "13:30"], "available"],
          ["2026-11-04", ["09:30", "10:00", "10:30", "11:00", "14:00", "14:30"], "available"],
          ["2026-11-05", ["10:00", "10:30", "11:00", "11:30"], "available"],
        ]),
      },
      {
        id: "p_yc_2",
        guestSessionId: "slt_claire",
        name: "Claire",
        role: "Visiting Partner",
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
        role: "Founding Design",
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
        role: "You · Guest",
        city: "NYC",
        timezone: "America/New_York",
        avatarColor: "#10B981",
        isCurrentUser: true,
        slots: buildSlots([
          ["2026-11-03", ["10:00", "10:30", "11:00", "11:30"], "available"],
          ["2026-11-04", ["10:00", "10:30", "11:00", "11:30", "13:00", "13:30"], "available"],
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
    durationMinutes: 60,
    status: "OPEN",
    lockedLocation: "meet.slotted.app/design-crit",
    reactions: [
      { emoji: "✨", label: "Craft", count: 6, userReacted: true },
      { emoji: "👍", label: "Ready", count: 4, userReacted: false },
    ],
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
          ["2026-10-28", ["11:00", "11:30", "12:00", "12:30", "13:00"], "available"],
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
          ["2026-10-28", ["11:00", "11:30", "12:00", "14:00", "14:30"], "available"],
          ["2026-10-29", ["11:00", "11:30", "12:00", "13:30", "14:00"], "available"],
          ["2026-10-30", ["11:00", "11:30", "12:00"], "available"],
        ]),
      },
      {
        id: "p_dc_you",
        guestSessionId: "slt_guest_local",
        name: "Alex",
        role: "You · Guest",
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

/**
 * Natural Language Command Bar Parser
 * Parses strings like "Series A Partner Sync next Tue-Thu 9am-5pm 45m" into structured tokens
 */
export interface ParsedNaturalPoll {
  title: string;
  dateLabels: string[];
  candidateDates: string[];
  timeRangeLabel: string;
  dayStartHour: number;
  dayEndHour: number;
  durationMinutes: number;
  detectedTokens: Array<{ category: "title" | "dates" | "hours" | "duration"; text: string }>;
}

export function parseNaturalLanguagePoll(input: string): ParsedNaturalPoll {
  const raw = input.trim() || "Series A Partner Sync next Tue–Thu 9am–4pm 60m";

  let durationMinutes = 60;
  let durationText = "60m";
  if (/\b30\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 30;
    durationText = "30m";
  } else if (/\b45\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 45;
    durationText = "45m";
  } else if (/\b90\s*(m|min|mins)\b/i.test(raw)) {
    durationMinutes = 90;
    durationText = "90m";
  }

  let dayStartHour = 9;
  let dayEndHour = 16;
  let timeRangeLabel = "09:00 AM – 04:00 PM";

  if (/morning/i.test(raw)) {
    dayStartHour = 9;
    dayEndHour = 13;
    timeRangeLabel = "09:00 AM – 01:00 PM (Mornings)";
  } else if (/afternoon/i.test(raw)) {
    dayStartHour = 12;
    dayEndHour = 17;
    timeRangeLabel = "12:00 PM – 05:00 PM (Afternoons)";
  } else if (/evening|dinner/i.test(raw)) {
    dayStartHour = 17;
    dayEndHour = 21;
    timeRangeLabel = "05:00 PM – 09:00 PM (Evenings)";
  } else {
    const timeMatch = raw.match(/(\d{1,2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})\s*(am|pm)?/i);
    if (timeMatch) {
      let s = parseInt(timeMatch[1], 10);
      const sMeridiem = (timeMatch[2] || "am").toLowerCase();
      let e = parseInt(timeMatch[3], 10);
      const eMeridiem = (timeMatch[4] || "pm").toLowerCase();
      if (sMeridiem === "pm" && s < 12) s += 12;
      if (eMeridiem === "pm" && e < 12) e += 12;
      if (e > s && e - s >= 2 && e <= 22) {
        dayStartHour = s;
        dayEndHour = Math.min(s + 8, e);
        timeRangeLabel = `${s}:00 ${sMeridiem.toUpperCase()} – ${e}:00 ${eMeridiem.toUpperCase()}`;
      }
    }
  }

  let candidateDates = ["2026-10-27", "2026-10-28", "2026-10-29"];
  let dateLabels = ["Tue Oct 27", "Wed Oct 28", "Thu Oct 29"];

  if (/mon.*wed/i.test(raw)) {
    candidateDates = ["2026-10-26", "2026-10-27", "2026-10-28"];
    dateLabels = ["Mon Oct 26", "Tue Oct 27", "Wed Oct 28"];
  } else if (/wed.*fri/i.test(raw)) {
    candidateDates = ["2026-10-28", "2026-10-29", "2026-10-30"];
    dateLabels = ["Wed Oct 28", "Thu Oct 29", "Fri Oct 30"];
  } else if (/tue.*fri/i.test(raw)) {
    candidateDates = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"];
    dateLabels = ["Tue Oct 27", "Wed Oct 28", "Thu Oct 29", "Fri Oct 30"];
  }

  // Strip known time/day keywords for clean title
  const cleanedTitle = raw
    .replace(/\b(next|this)\s+[a-z–-]+/gi, "")
    .replace(/(\d{1,2})\s*(am|pm)?\s*[-–to]+\s*(\d{1,2})\s*(am|pm)?/gi, "")
    .replace(/\b(30|45|60|90)\s*(m|min|mins)\b/gi, "")
    .replace(/\b(mornings?|afternoons?|evenings?|between|and)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const title = cleanedTitle.length >= 3 ? cleanedTitle : "Product Architecture & Design Sync";

  return {
    title,
    dateLabels,
    candidateDates,
    timeRangeLabel,
    dayStartHour,
    dayEndHour,
    durationMinutes,
    detectedTokens: [
      { category: "title", text: title },
      { category: "dates", text: dateLabels.join(" · ") },
      { category: "hours", text: timeRangeLabel },
      { category: "duration", text: durationText },
    ],
  };
}

/**
 * Generates an RFC-5545 .ics calendar file string for downloading
 */
export function generateIcsContent(poll: PollData, window: RankedWindow): string {
  const [y, m, d] = window.date.split("-");
  const startHh = String(Math.floor(window.startTimeMinutes / 60)).padStart(2, "0");
  const startMm = String(window.startTimeMinutes % 60).padStart(2, "0");
  const endHh = String(Math.floor(window.endTimeMinutes / 60)).padStart(2, "0");
  const endMm = String(window.endTimeMinutes % 60).padStart(2, "0");

  const dtStart = `${y}${m}${d}T${startHh}${startMm}00`;
  const dtEnd = `${y}${m}${d}T${endHh}${endMm}00`;

  const attendees = poll.participants.map((p) => p.name).join(", ");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Slotted//Multiplayer Time Consensus//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${poll.id}@slotted.app`,
    `SUMMARY:${poll.title}`,
    `DTSTART;TZID=${poll.timezone}:${dtStart}`,
    `DTEND;TZID=${poll.timezone}:${dtEnd}`,
    `DESCRIPTION:${poll.description}\\n\\nConfirmed via Slotted (${window.totalAttendingCount}/${window.totalParticipants} attending: ${attendees})`,
    `LOCATION:${poll.lockedLocation || "Slotted Video Room"}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
