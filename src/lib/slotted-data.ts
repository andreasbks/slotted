export type AvailabilityState = "available" | "if_needed";

export type BrushMode = "available" | "if_needed" | "clear";

export type VisibilityMode = "public" | "hidden_until_voted" | "host_only";

export type PollMode = "dates_and_hours" | "full_days";

export type ScheduleType = "specific_dates" | "days_of_week";

export interface RecurrenceRule {
  weekdays: number[]; // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  spanMode: "weeks" | "date_range";
  weeksCount: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null; // YYYY-MM-DD
}

export interface TimezoneOption {
  id: string;
  label: string;
  shortCode: string;
  city: string;
  region: string;
  offsetMinutes: number;
  offsetHoursFromEDT: number;
  utcLabel: string;
  searchKeywords: string;
}

const FALLBACK_IANA_TIMEZONES: string[] = [
  "UTC",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Vancouver",
  "America/Tijuana",
  "America/Phoenix",
  "America/Denver",
  "America/Edmonton",
  "America/Chicago",
  "America/Winnipeg",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/New_York",
  "America/Toronto",
  "America/Detroit",
  "America/Caracas",
  "America/Santiago",
  "America/Halifax",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "America/St_Johns",
  "Atlantic/Azores",
  "Atlantic/Reykjavik",
  "Europe/London",
  "Europe/Dublin",
  "Europe/Lisbon",
  "Africa/Casablanca",
  "Africa/Lagos",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Amsterdam",
  "Europe/Brussels",
  "Europe/Zurich",
  "Europe/Vienna",
  "Europe/Stockholm",
  "Europe/Oslo",
  "Europe/Copenhagen",
  "Europe/Warsaw",
  "Europe/Prague",
  "Europe/Budapest",
  "Europe/Belgrade",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Europe/Athens",
  "Europe/Helsinki",
  "Europe/Bucharest",
  "Europe/Sofia",
  "Europe/Kyiv",
  "Europe/Istanbul",
  "Asia/Jerusalem",
  "Asia/Beirut",
  "Asia/Riyadh",
  "Africa/Nairobi",
  "Europe/Moscow",
  "Asia/Tehran",
  "Asia/Dubai",
  "Asia/Baku",
  "Asia/Tbilisi",
  "Asia/Yerevan",
  "Asia/Kabul",
  "Asia/Karachi",
  "Asia/Tashkent",
  "Asia/Kolkata",
  "Asia/Colombo",
  "Asia/Kathmandu",
  "Asia/Dhaka",
  "Asia/Almaty",
  "Asia/Yangon",
  "Asia/Bangkok",
  "Asia/Ho_Chi_Minh",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Hong_Kong",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Manila",
  "Australia/Perth",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Darwin",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Hobart",
  "Pacific/Guam",
  "Pacific/Noumea",
  "Pacific/Auckland",
  "Pacific/Fiji",
];

const CITY_DISPLAY_OVERRIDES: Record<
  string,
  { city: string; aliases: string }
> = {
  UTC: { city: "UTC", aliases: "Coordinated Universal Time GMT Z" },
  "America/Los_Angeles": {
    city: "San Francisco",
    aliases: "SF LA Los Angeles Seattle Silicon Valley Pacific PST PDT",
  },
  "America/New_York": {
    city: "New York",
    aliases: "NYC NY Boston Miami Washington DC Atlanta Eastern EST EDT",
  },
  "America/Chicago": {
    city: "Chicago",
    aliases: "Austin Dallas Houston Central CST CDT",
  },
  "America/Denver": {
    city: "Denver",
    aliases: "Salt Lake City Mountain MST MDT",
  },
  "America/Phoenix": {
    city: "Phoenix",
    aliases: "Arizona MST",
  },
  "America/Toronto": {
    city: "Toronto",
    aliases: "Montreal Ottawa Canada Eastern EST EDT",
  },
  "America/Vancouver": {
    city: "Vancouver",
    aliases: "Canada Pacific PST PDT",
  },
  "America/Sao_Paulo": {
    city: "São Paulo",
    aliases: "Sao Paulo Brazil Rio BRT",
  },
  "Europe/London": {
    city: "London",
    aliases: "LDN UK Britain United Kingdom GMT BST",
  },
  "Europe/Berlin": {
    city: "Berlin",
    aliases: "BER Germany Frankfurt Munich CET CEST",
  },
  "Europe/Paris": {
    city: "Paris",
    aliases: "France CET CEST",
  },
  "Europe/Amsterdam": {
    city: "Amsterdam",
    aliases: "Netherlands CET CEST",
  },
  "Europe/Zurich": {
    city: "Zurich",
    aliases: "Switzerland Geneva CET CEST",
  },
  "Europe/Madrid": {
    city: "Madrid",
    aliases: "Spain Barcelona CET CEST",
  },
  "Europe/Rome": {
    city: "Rome",
    aliases: "Italy Milan CET CEST",
  },
  "Europe/Athens": {
    city: "Athens",
    aliases: "Greece EET EEST",
  },
  "Europe/Istanbul": {
    city: "Istanbul",
    aliases: "Turkey TRT",
  },
  "Asia/Dubai": {
    city: "Dubai",
    aliases: "UAE Abu Dhabi GST",
  },
  "Asia/Kolkata": {
    city: "Mumbai / Kolkata",
    aliases: "India Bangalore Bengaluru Delhi New Delhi Kolkata IST",
  },
  "Asia/Singapore": {
    city: "Singapore",
    aliases: "SG SGT",
  },
  "Asia/Hong_Kong": {
    city: "Hong Kong",
    aliases: "HK HKT",
  },
  "Asia/Shanghai": {
    city: "Shanghai / Beijing",
    aliases: "China Shenzhen CST",
  },
  "Asia/Tokyo": {
    city: "Tokyo",
    aliases: "TYO Japan Osaka JST",
  },
  "Asia/Seoul": {
    city: "Seoul",
    aliases: "Korea South Korea KST",
  },
  "Australia/Sydney": {
    city: "Sydney",
    aliases: "Australia Canberra AEST AEDT",
  },
  "Pacific/Auckland": {
    city: "Auckland",
    aliases: "New Zealand NZ NZST NZDT",
  },
};

const POPULAR_TIMEZONE_IDS = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Europe/Athens",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

let cachedSupportedTimezones: string[] | null = null;

export function getSupportedTimezones(): string[] {
  if (cachedSupportedTimezones) return cachedSupportedTimezones;
  let runtimeZones: string[] = [];
  try {
    if (
      typeof Intl !== "undefined" &&
      typeof Intl.supportedValuesOf === "function"
    ) {
      runtimeZones = Intl.supportedValuesOf("timeZone");
    }
  } catch {}
  const merged = new Set<string>(["UTC", ...POPULAR_TIMEZONE_IDS, ...runtimeZones, ...FALLBACK_IANA_TIMEZONES]);
  cachedSupportedTimezones = Array.from(merged);
  return cachedSupportedTimezones;
}

export function getBrowserTimezone(fallback = "America/New_York"): string {
  try {
    if (typeof Intl !== "undefined") {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected && isValidTimezone(detected)) {
        return detected;
      }
    }
  } catch {}
  return fallback;
}

export function isValidTimezone(tzId: string): boolean {
  if (!tzId) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzId });
    return true;
  } catch {
    return false;
  }
}

const tzInfoCache = new Map<string, TimezoneOption>();

function deriveShortCode(
  tzId: string,
  offsetMinutes: number,
  intlShortName: string
): string {
  if (tzId === "UTC" || tzId === "Etc/UTC" || tzId === "Etc/GMT") return "UTC";
  if (tzId === "Europe/London" || tzId === "Europe/Dublin") {
    return offsetMinutes === 60 ? "BST" : "GMT";
  }
  if (
    tzId === "Europe/Berlin" ||
    tzId === "Europe/Paris" ||
    tzId === "Europe/Madrid" ||
    tzId === "Europe/Rome" ||
    tzId === "Europe/Amsterdam" ||
    tzId === "Europe/Brussels" ||
    tzId === "Europe/Zurich" ||
    tzId === "Europe/Vienna" ||
    tzId === "Europe/Stockholm" ||
    tzId === "Europe/Oslo" ||
    tzId === "Europe/Copenhagen" ||
    tzId === "Europe/Warsaw" ||
    tzId === "Europe/Prague"
  ) {
    return offsetMinutes === 120 ? "CEST" : "CET";
  }
  if (
    tzId === "Europe/Athens" ||
    tzId === "Europe/Helsinki" ||
    tzId === "Europe/Bucharest" ||
    tzId === "Europe/Sofia" ||
    tzId === "Europe/Kyiv"
  ) {
    return offsetMinutes === 180 ? "EEST" : "EET";
  }
  if (tzId === "Asia/Tokyo") return "JST";
  if (tzId === "Asia/Seoul") return "KST";
  if (tzId === "Asia/Kolkata" || tzId === "Asia/Calcutta") return "IST";
  if (tzId === "Asia/Singapore") return "SGT";
  if (tzId === "Asia/Hong_Kong") return "HKT";
  if (tzId === "Asia/Shanghai" || tzId === "Asia/Taipei") return "CST";
  if (tzId === "Asia/Dubai") return "GST";
  if (tzId === "Australia/Sydney" || tzId === "Australia/Melbourne") {
    return offsetMinutes === 660 ? "AEDT" : "AEST";
  }
  if (tzId === "Pacific/Auckland") {
    return offsetMinutes === 780 ? "NZDT" : "NZST";
  }
  if (intlShortName && !intlShortName.startsWith("GMT")) {
    return intlShortName;
  }
  if (offsetMinutes === 0) return "UTC";
  const sign = offsetMinutes > 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0
    ? `UTC${sign}${h}`
    : `UTC${sign}${h}:${String(m).padStart(2, "0")}`;
}

export function getTimezoneInfo(
  tzId: string,
  referenceDateIso?: string
): TimezoneOption {
  const safeTz = isValidTimezone(tzId) ? tzId : "America/New_York";
  const dateKey =
    referenceDateIso && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateIso)
      ? referenceDateIso
      : "2026-10-27";
  const cacheKey = `${safeTz}__${dateKey}`;
  const cached = tzInfoCache.get(cacheKey);
  if (cached) return cached;

  const [y, m, d] = dateKey.split("-").map(Number);
  const utcMidday = Date.UTC(y || 2026, (m || 10) - 1, d || 27, 12, 0, 0);
  const sampleDate = new Date(utcMidday);

  let offsetMinutes = -240;
  let intlShort = "EDT";

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: safeTz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZoneName: "short",
    }).formatToParts(sampleDate);

    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    const tzY = Number(map.year);
    const tzM = Number(map.month);
    const tzD = Number(map.day);
    const tzH = Number(map.hour) === 24 ? 0 : Number(map.hour);
    const tzMin = Number(map.minute);
    const tzUtcMs = Date.UTC(tzY, tzM - 1, tzD, tzH, tzMin, 0);
    offsetMinutes = Math.round((tzUtcMs - utcMidday) / 60000);
    if (map.timeZoneName) {
      intlShort = map.timeZoneName;
    }
  } catch {}

  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMins = Math.abs(offsetMinutes);
  const offHours = Math.floor(absMins / 60);
  const offRem = absMins % 60;
  const utcLabel =
    offsetMinutes === 0
      ? "UTC+0"
      : offRem === 0
        ? `UTC${sign}${offHours}`
        : `UTC${sign}${offHours}:${String(offRem).padStart(2, "0")}`;

  const override = CITY_DISPLAY_OVERRIDES[safeTz];
  const segments = safeTz.split("/");
  const region = segments.length > 1 ? segments[0].replace(/_/g, " ") : "Global";
  const rawCity =
    override?.city ||
    segments[segments.length - 1]?.replace(/_/g, " ") ||
    safeTz;
  const shortCode = deriveShortCode(safeTz, offsetMinutes, intlShort);
  const label = `${rawCity} (${shortCode} · ${utcLabel})`;
  const searchKeywords = [
    safeTz.replace(/_/g, " "),
    safeTz,
    rawCity,
    region,
    shortCode,
    utcLabel,
    override?.aliases || "",
  ]
    .join(" ")
    .toLowerCase();

  const info: TimezoneOption = {
    id: safeTz,
    label,
    shortCode,
    city: rawCity,
    region,
    offsetMinutes,
    offsetHoursFromEDT: (offsetMinutes - -240) / 60,
    utcLabel,
    searchKeywords,
  };

  tzInfoCache.set(cacheKey, info);
  return info;
}

export function getAllTimezoneOptions(
  referenceDateIso?: string
): TimezoneOption[] {
  const zones = getSupportedTimezones();
  return zones.map((id) => getTimezoneInfo(id, referenceDateIso));
}

export function searchTimezones(
  query: string,
  referenceDateIso?: string,
  currentTimezoneId?: string,
  limit = 50
): TimezoneOption[] {
  const trimmed = query.trim().toLowerCase();
  const all = getAllTimezoneOptions(referenceDateIso);

  if (!trimmed) {
    const popularSet = new Set(POPULAR_TIMEZONE_IDS);
    const prioritized: TimezoneOption[] = [];
    if (currentTimezoneId) {
      const current = getTimezoneInfo(currentTimezoneId, referenceDateIso);
      prioritized.push(current);
    }
    for (const id of POPULAR_TIMEZONE_IDS) {
      if (id !== currentTimezoneId) {
        prioritized.push(getTimezoneInfo(id, referenceDateIso));
      }
    }
    for (const opt of all) {
      if (prioritized.length >= limit) break;
      if (opt.id !== currentTimezoneId && !popularSet.has(opt.id)) {
        prioritized.push(opt);
      }
    }
    return prioritized.slice(0, limit);
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const scored: Array<{ opt: TimezoneOption; score: number }> = [];

  for (const opt of all) {
    const matchesAll = tokens.every((tok) => opt.searchKeywords.includes(tok));
    if (!matchesAll) continue;
    let score = 0;
    const cityLower = opt.city.toLowerCase();
    const idLower = opt.id.toLowerCase();
    const shortLower = opt.shortCode.toLowerCase();
    if (cityLower === trimmed || shortLower === trimmed || idLower === trimmed) {
      score += 100;
    } else if (cityLower.startsWith(trimmed)) {
      score += 60;
    } else if (idLower.includes(trimmed)) {
      score += 40;
    }
    if (POPULAR_TIMEZONE_IDS.includes(opt.id)) {
      score += 15;
    }
    scored.push({ opt, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.opt.offsetMinutes - b.opt.offsetMinutes ||
      a.opt.city.localeCompare(b.opt.city)
  );
  return scored.slice(0, limit).map((item) => item.opt);
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = POPULAR_TIMEZONE_IDS.map((id) =>
  getTimezoneInfo(id, "2026-10-27")
);

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
  scheduleType?: ScheduleType; // "specific_dates" (default) | "days_of_week"
  recurrenceRule?: RecurrenceRule | null;
  hostName: string;
  hostClerkUserId?: string | null;
  hostTokenHash?: string;
  timezone: string;
  candidateDates: string[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes: number;
  /**
   * For "dates_and_hours": minutes (e.g. 15, 30, 45, 60, 75, 90, 120, or custom)
   * For "full_days": minutes representing N days (1440 = 1 day, 2880 = 2 days, etc.)
   */
  durationMinutes: number;
  // Advanced Settings
  hasPassword?: boolean;
  requiresPassword?: boolean;
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
  viewerParticipantId?: string | null;
  canManagePoll?: boolean;
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
export const STORAGE_KEY_TZ = "slotted_mlp_tz_v2";

export function formatDurationBadge(
  durationMinutes: number,
  pollMode?: PollMode
): string {
  const safeMins = Math.max(1, Math.round(durationMinutes || 30));
  if (pollMode === "full_days" || safeMins >= 1440) {
    if (safeMins % 1440 === 0) {
      const days = Math.max(1, Math.round(safeMins / 1440));
      return days === 1 ? "Full day" : `${days} days`;
    }
    const days = Math.floor(safeMins / 1440);
    const remHours = Math.round((safeMins % 1440) / 60);
    return remHours > 0 ? `${days}d ${remHours}h` : `${days} days`;
  }
  const hours = Math.floor(safeMins / 60);
  const mins = safeMins % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

export const WEEKDAY_LABELS: Array<{
  day: number;
  short: string;
  mini: string;
  long: string;
}> = [
  { day: 1, short: "Mon", mini: "M", long: "Monday" },
  { day: 2, short: "Tue", mini: "T", long: "Tuesday" },
  { day: 3, short: "Wed", mini: "W", long: "Wednesday" },
  { day: 4, short: "Thu", mini: "T", long: "Thursday" },
  { day: 5, short: "Fri", mini: "F", long: "Friday" },
  { day: 6, short: "Sat", mini: "S", long: "Saturday" },
  { day: 0, short: "Sun", mini: "S", long: "Sunday" },
];

export function generateRecurringDates(rule: RecurrenceRule): string[] {
  const weekdaysSet = new Set(
    Array.isArray(rule.weekdays) && rule.weekdays.length > 0
      ? rule.weekdays
      : [1, 2, 3, 4, 5]
  );
  const [sy, sm, sd] = (rule.startDate || "").split("-").map(Number);
  const startUtc =
    sy && sm && sd
      ? new Date(Date.UTC(sy, sm - 1, sd))
      : new Date(
          Date.UTC(
            new Date().getUTCFullYear(),
            new Date().getUTCMonth(),
            new Date().getUTCDate()
          )
        );

  let maxDays = Math.min(26, Math.max(1, Number(rule.weeksCount) || 1)) * 7;
  if (rule.spanMode === "date_range" && rule.endDate) {
    const [ey, em, ed] = rule.endDate.split("-").map(Number);
    if (ey && em && ed) {
      const endUtc = new Date(Date.UTC(ey, em - 1, ed));
      const diffDays =
        Math.floor((endUtc.getTime() - startUtc.getTime()) / 86400000) + 1;
      maxDays = Math.min(180, Math.max(1, diffDays));
    }
  }

  const dates: string[] = [];
  for (let offset = 0; offset < maxDays; offset++) {
    const cur = new Date(startUtc);
    cur.setUTCDate(startUtc.getUTCDate() + offset);
    if (weekdaysSet.has(cur.getUTCDay())) {
      dates.push(cur.toISOString().slice(0, 10));
    }
  }
  return dates;
}

export function formatRecurrenceSummary(
  rule?: RecurrenceRule | null
): string | null {
  if (!rule || !Array.isArray(rule.weekdays) || rule.weekdays.length === 0) {
    return null;
  }
  const ordered = [1, 2, 3, 4, 5, 6, 0].filter((d) =>
    rule.weekdays.includes(d)
  );
  const isMonFri =
    ordered.length === 5 &&
    ordered.every((d, idx) => d === [1, 2, 3, 4, 5][idx]);
  const isWeekend =
    ordered.length === 2 && ordered[0] === 6 && ordered[1] === 0;

  const daysText = isMonFri
    ? "Mon–Fri"
    : isWeekend
      ? "Sat–Sun"
      : ordered
          .map((d) => WEEKDAY_LABELS.find((w) => w.day === d)?.short || "")
          .filter(Boolean)
          .join(", ");

  if (rule.spanMode === "date_range" && rule.endDate) {
    const sHdr = formatDateHeader(rule.startDate);
    const eHdr = formatDateHeader(rule.endDate);
    return `Every ${daysText} (${sHdr.monthShort} ${sHdr.dayNum} – ${eHdr.monthShort} ${eHdr.dayNum})`;
  }
  const weeks = Math.max(1, rule.weeksCount || 1);
  return weeks === 1
    ? `Every ${daysText} · 1 week`
    : `Every ${daysText} · ${weeks} weeks`;
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
  compact: boolean = false,
  referenceDateIso?: string
): { timeLabel: string; dayShift: number } {
  const targetTz = getTimezoneInfo(targetTimezoneId, referenceDateIso);
  const baseTz = getTimezoneInfo(baseTimezoneId, referenceDateIso);
  const diffMinutes = targetTz.offsetMinutes - baseTz.offsetMinutes;

  let shifted = Math.round(minutesFromMidnight + diffMinutes);
  let dayShift = 0;
  while (shifted < 0) {
    shifted += 24 * 60;
    dayShift -= 1;
  }
  while (shifted >= 24 * 60) {
    shifted -= 24 * 60;
    dayShift += 1;
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
    Math.ceil(poll.durationMinutes / poll.slotMinutes)
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
    const attendees = [
      ...window.availableParticipants,
      ...window.ifNeededParticipants,
    ]
      .map((p) => p.name)
      .join(", ");
    const lines = [
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
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ];
    const location = poll.lockedLocation || poll.location;
    if (location) lines.splice(lines.indexOf("STATUS:CONFIRMED"), 0, `LOCATION:${location}`);
    return lines.join("\r\n");
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

  const attendees = [
    ...window.availableParticipants,
    ...window.ifNeededParticipants,
  ]
    .map((p) => p.name)
    .join(", ");

  const lines = [
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
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  const location = poll.lockedLocation || poll.location;
  if (location) lines.splice(lines.indexOf("STATUS:CONFIRMED"), 0, `LOCATION:${location}`);
  return lines.join("\r\n");
}
