"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  CornerDownLeft,
  EyeOff,
  KeyRound,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import {
  BrushMode,
  INITIAL_POLLS,
  PollData,
  PollMode,
  RecurrenceRule,
  STORAGE_KEY_GUEST,
  STORAGE_KEY_POLLS,
  STORAGE_KEY_TZ,
  ScheduleType,
  VisibilityMode,
  WEEKDAY_LABELS,
  computeRankedWindows,
  formatDateHeader,
  formatDurationBadge,
  formatMinutesToDisplay,
  formatRecurrenceSummary,
  generateRecurringDates,
  isValidTimezone,
} from "@/lib/slotted-data";
import { calmFailure, setupLine } from "@/lib/calm-copy";
import { PollWorkspace } from "./poll-workspace";
import { IdentityMenu } from "./identity-menu";
import { CalendarPicker } from "./calendar-picker";
import { TimezoneCombobox } from "./timezone-combobox";
import { DurationControls } from "./duration-controls";
import { FailureScreen, NotReadyScreen, SetupScreen } from "./status-screens";

function localTodayIso(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function initialSpecificDates(): string[] {
  const today = localTodayIso();
  return [1, 2, 3].map((offset) => addDaysIso(today, offset));
}

interface SlottedAppShellProps {
  initialSlug?: string;
  initialViewMode?: "landing" | "poll";
  initialLocked?: boolean;
  initialAdvancedOpen?: boolean;
  initialCreated?: boolean;
}

export function SlottedAppShell({
  initialSlug,
  initialViewMode = "landing",
  initialAdvancedOpen = false,
  initialCreated = false,
}: SlottedAppShellProps) {
  const router = useRouter();

  const [polls, setPolls] = useState<PollData[]>([]);
  const [pollLoadState, setPollLoadState] = useState<
    "loading" | "ready" | "not-found" | "not-ready" | "error"
  >(initialViewMode === "poll" ? "loading" : "ready");
  const [reloadKey, setReloadKey] = useState(0);
  const [setupNotice, setSetupNotice] = useState<{
    sentence: string;
    step: string;
  } | null>(null);

  const [activeSlug, setActiveSlug] = useState<string>(
    initialSlug || INITIAL_POLLS[0].slug
  );
  const [viewMode, setViewMode] = useState<"landing" | "poll">(initialViewMode);
  const [guestName, setGuestName] = useState<string>("Alex");
  const [viewerTimezone, setViewerTimezone] =
    useState<string>("America/New_York");
  const [activeBrush, setActiveBrush] = useState<BrushMode>("available");
  const [copiedPollId, setCopiedPollId] = useState<string | null>(null);
  const [justCreatedFlag, setJustCreatedFlag] =
    useState<boolean>(initialCreated);

  // Direct Creation Modal State (Zero conversational prompt box)
  const [pollTitle, setPollTitle] = useState<string>("");
  const [pollMode, setPollMode] = useState<PollMode>("dates_and_hours");
  const [scheduleType, setScheduleType] =
    useState<ScheduleType>("specific_dates");
  const [todayIso] = useState<string>(localTodayIso);
  const [selectedDates, setSelectedDates] = useState<string[]>(
    initialSpecificDates
  );
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [spanMode, setSpanMode] = useState<"weeks" | "date_range">("weeks");
  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [rangeStart, setRangeStart] = useState<string>(localTodayIso);
  const [rangeEnd, setRangeEnd] = useState<string>(() =>
    addDaysIso(localTodayIso(), 28)
  );
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(17);

  // Advanced Settings Disclosure State
  const [advancedOpen, setAdvancedOpen] =
    useState<boolean>(initialAdvancedOpen);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passwordProtected, setPasswordProtected] = useState<boolean>(false);
  const [accessPassword, setAccessPassword] = useState<string>("");
  const [visibilityMode, setVisibilityMode] =
    useState<VisibilityMode>("public");
  const [allowIfNeeded, setAllowIfNeeded] = useState<boolean>(true);

  // Creation microanimation state before routing
  const [creatingState, setCreatingState] = useState<
    "idle" | "creating" | "copied"
  >("idle");
  const [createError, setCreateError] = useState<string>("");
  const [createdSlugPreview, setCreatedSlugPreview] = useState<string | null>(
    null
  );

  // Load only the requested poll, or the viewer-scoped device collection.
  useEffect(() => {
    let cancelled = false;

    async function loadFromServer() {
      try {
        const endpoint =
          initialViewMode === "poll" && initialSlug
            ? `/api/polls/${encodeURIComponent(initialSlug)}`
            : "/api/polls";
        const res = await fetch(endpoint, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          poll?: PollData;
          polls?: PollData[];
          code?: string;
          error?: string;
          step?: string;
        };
        if (cancelled) return;
        if (data.code === "not_ready" || (data.code === "setup" && initialViewMode === "poll")) {
          setPollLoadState("not-ready");
          return;
        }
        if (data.code === "setup") {
          setSetupNotice({
            sentence: setupLine(data.error, "Set the missing value to open Slotted."),
            step: setupLine(data.step, "Add it in Vercel, then reload."),
          });
          return;
        }
        if (res.status === 404) {
          setPollLoadState("not-found");
          return;
        }
        if (res.ok) {
          const list: PollData[] = data.poll
            ? [data.poll]
            : Array.isArray(data.polls)
              ? data.polls
              : [];
          setPolls(list);
          setPollLoadState("ready");
        } else {
          setPollLoadState("error");
        }
      } catch {
        if (!cancelled) setPollLoadState("error");
      }
    }

    loadFromServer();

    try {
      const g = localStorage.getItem(STORAGE_KEY_GUEST);
      const tz = localStorage.getItem(STORAGE_KEY_TZ);
      queueMicrotask(() => {
        if (g) setGuestName(g);
        if (tz && isValidTimezone(tz)) {
          setViewerTimezone(tz);
        }
      });
    } catch {}

    return () => {
      cancelled = true;
    };
  }, [initialSlug, initialViewMode, reloadKey]);

  const handleSwitchPollMode = (nextMode: PollMode) => {
    setPollMode(nextMode);
    setDurationMinutes((current) => {
      if (nextMode === "full_days") return current >= 1440 ? current : 1440;
      return current >= 1440 ? 30 : current;
    });
  };

  const recurrenceRule: RecurrenceRule = {
    weekdays,
    spanMode,
    weeksCount,
    startDate: rangeStart,
    endDate: spanMode === "date_range" ? rangeEnd : null,
  };
  const recurringDates =
    scheduleType === "days_of_week" ? generateRecurringDates(recurrenceRule) : [];
  const recurrenceSummary = formatRecurrenceSummary(recurrenceRule);
  const activeDateCount =
    scheduleType === "days_of_week" ? recurringDates.length : selectedDates.length;
  const maxDurationMinutes =
    pollMode === "full_days"
      ? Math.max(1440, activeDateCount * 1440)
      : Math.max(30, (endHour - startHour) * 60);

  const activePoll = useMemo(() => {
    return polls.find((p) => p.slug === activeSlug) || null;
  }, [polls, activeSlug]);

  const handleUpdatePoll = (updated: PollData) => {
    setPolls((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      try {
        localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDeletePoll = async (slug: string, id: string) => {
    if (!window.confirm("Delete this poll? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/polls/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) setPolls((prev) => prev.filter((p) => p.id !== id));
    } catch {}
  };

  const handleChangeGuestName = (name: string) => {
    setGuestName(name);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, name);
    } catch {}
  };

  const handleChangeTimezone = (tz: string) => {
    setViewerTimezone(tz);
    try {
      localStorage.setItem(STORAGE_KEY_TZ, tz);
    } catch {}
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingState !== "idle") return;

    setCreatingState("creating");
    setCreateError("");
    if (scheduleType === "days_of_week" && weekdays.length === 0) {
      setCreateError("Choose at least one day of the week.");
      setCreatingState("idle");
      return;
    }
    if (scheduleType === "specific_dates" && selectedDates.length === 0) {
      setCreateError("Choose at least one date.");
      setCreatingState("idle");
      return;
    }
    const finalTitle =
      pollTitle.trim() ||
      (pollMode === "full_days" ? "Group Trip" : "Team Sync");
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          pollMode,
          scheduleType,
          recurrenceRule: scheduleType === "days_of_week" ? recurrenceRule : null,
          hostName: guestName || "Alex",
          timezone: viewerTimezone,
          candidateDates:
            scheduleType === "days_of_week" ? recurringDates : selectedDates,
          dayStartHour: startHour,
          dayEndHour: Math.max(startHour + 2, endHour),
          slotMinutes: 30,
          durationMinutes,
          accessPassword:
            passwordProtected && accessPassword.trim()
              ? accessPassword.trim()
              : null,
          passwordProtected,
          visibilityMode,
          allowIfNeeded,
          deadlineAt: null,
        }),
      });

      if (res.ok) {
        const { poll } = (await res.json()) as {
          poll: PollData;
        };

        // Copy share link immediately
        const shareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/p/${poll.slug}`
            : `https://slotted.app/p/${poll.slug}`;
        let copied = false;
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(shareUrl);
            copied = true;
          } catch {}
        }

        setPolls((prev) => [poll, ...prev]);
        setCreatedSlugPreview(poll.slug);
        setCreatingState(copied ? "copied" : "idle");

        // Show satisfying microanimation for 550ms then transition to the new poll page
        setTimeout(() => {
          setActiveSlug(poll.slug);
          setJustCreatedFlag(true);
          setViewMode("poll");
          setCreatingState("idle");
          router.push(`/p/${poll.slug}?created=1`);
        }, 550);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        step?: string;
        code?: string;
      };
      if (data.code === "setup") {
        setSetupNotice({
          sentence: setupLine(data.error, "Set the missing value to open Slotted."),
          step: setupLine(data.step, "Add it in Vercel, then reload."),
        });
        setCreatingState("idle");
        return;
      }
      setCreateError(calmFailure(data.error, "Couldn’t create the poll. Try again."));
    } catch {
      setCreateError("Couldn’t create the poll. Try again.");
    }

    setCreatingState("idle");
  };

  const handleCopyPollLink = async (slug: string, id: string) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${slug}`
        : `https://slotted.app/p/${slug}`;
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy the link below.", url);
      return;
    }
    setCopiedPollId(id);
    setTimeout(() => setCopiedPollId(null), 1800);
  };

  const reloadActivePoll = async () => {
    if (!activeSlug) return;
    try {
      const response = await fetch(`/api/polls/${encodeURIComponent(activeSlug)}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => ({}))) as {
        poll?: PollData;
        code?: string;
      };
      if (data.code === "not_ready" || data.code === "setup") {
        setPollLoadState("not-ready");
        return;
      }
      if (!response.ok || !data.poll) {
        setPollLoadState("error");
        return;
      }
      setPolls([data.poll]);
      setPollLoadState("ready");
    } catch {
      setPollLoadState("error");
    }
  };

  /* =========================================================
     POLL VIEW (/p/[slug]) — Matching Rounded-[24px] Design System
     ========================================================= */
  if (setupNotice && viewMode === "landing") {
    return <SetupScreen sentence={setupNotice.sentence} step={setupNotice.step} />;
  }

  if (viewMode === "poll") {
    if (pollLoadState === "not-ready") return <NotReadyScreen />;
    if (pollLoadState === "loading") {
      return (
        <main
          className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-4"
          role="status"
        >
          <div className="w-full max-w-md animate-pulse space-y-3">
            <div className="h-8 w-48 rounded-lg bg-[#DDDAD1]" />
            <div className="h-48 rounded-2xl bg-white" />
            <span className="sr-only">Loading poll…</span>
          </div>
        </main>
      );
    }
    if (pollLoadState === "error") {
      return (
        <FailureScreen
          title="Couldn’t load this poll."
          onRetry={() => {
            setPollLoadState("loading");
            setReloadKey((key) => key + 1);
          }}
        />
      );
    }
    if (pollLoadState === "not-found" || !activePoll) {
      return (
        <main className="grid min-h-dvh place-items-center bg-[#F6F5F2] px-4">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-semibold">Poll not found</h1>
            <p className="mt-2 text-sm text-[#56534D]">
              This poll isn’t here. Check the link and try again.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-[#171715] px-5 text-sm font-semibold text-white"
            >
              Create a new poll
            </Link>
          </div>
        </main>
      );
    }
    return (
      <div className="min-h-dvh flex flex-col bg-[#F6F5F2] text-[#141413]">
        <header className="border-b border-[#E4E2DA] bg-[#F6F5F2]">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                onClick={() => setViewMode("landing")}
                className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight text-[#141413]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#141413] text-[#F6F5F2]">
                  <span className="flex gap-0.5">
                    <span className="h-2.5 w-0.5 rounded-full bg-emerald-400" />
                    <span className="h-2.5 w-0.5 translate-y-0.5 rounded-full bg-[#F6F5F2]" />
                  </span>
                </span>
                <span>slotted</span>
              </Link>
              <span className="font-mono text-xs text-[#C9C6BC]">/</span>
              <span className="font-mono text-xs text-[#575550] truncate max-w-[180px] sm:max-w-xs">
                {activePoll.slug}
              </span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <Link
                href="/"
                onClick={() => setViewMode("landing")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E2DA] bg-white px-3.5 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#EFECE6] transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>New poll</span>
              </Link>

              <Link
                href="/#my-polls"
                onClick={() => setViewMode("landing")}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E2DA] bg-[#FAF9F6] px-3.5 py-1.5 text-xs font-medium text-[#575550] hover:text-[#141413] transition"
              >
                <span>My polls</span>
                <span className="rounded-full bg-[#EFECE6] px-1.5 py-0.2 text-[10px] text-[#141413] tabular-nums">
                  {polls.length}
                </span>
              </Link>
              <IdentityMenu name={guestName} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <PollWorkspace
            poll={activePoll}
            onUpdatePoll={handleUpdatePoll}
            guestName={guestName}
            onChangeGuestName={handleChangeGuestName}
            viewerTimezone={viewerTimezone}
            onChangeViewerTimezone={handleChangeTimezone}
            activeBrush={activeBrush}
            onChangeBrush={setActiveBrush}
            justCreated={justCreatedFlag}
            onReloadPoll={reloadActivePoll}
          />
        </main>
      </div>
    );
  }

  /* =========================================================
     HOME VIEW (/):
     1. 100dvh Fullscreen Darkened Classical Landscape + Direct Creation Modal
     2. Below the fold: Single-Tone Flat Background with "My polls"
     ========================================================= */
  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F5F2] text-[#141413]">
      {/* FIRST SIGHT: FULLSCREEN DARKENED LANDSCAPE + DIRECT CREATION MODAL ONLY */}
      <section className="relative flex min-h-dvh w-full flex-col justify-between overflow-hidden">
        {/* Fullscreen Landscape Painting */}
        <Image
          src="/hero-landscape.jpg"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
        />

        {/* Darkening Scrim & Atmospheric Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-black/40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/60"
        />

        {/* Minimal Top Header on the Artwork */}
        <header className="relative z-10 mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-2 px-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight text-[#FAF9F6]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FAF9F6] text-[#141413]">
              <span className="flex gap-0.5">
                <span className="h-2.5 w-0.5 rounded-full bg-emerald-600" />
                <span className="h-2.5 w-0.5 translate-y-0.5 rounded-full bg-[#141413]" />
              </span>
            </span>
            <span>slotted</span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1.5 font-mono text-xs sm:gap-2">
            <a
              href="#my-polls"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3.5 py-1.5 text-xs font-medium text-[#FAF9F6] hover:bg-black/50 transition"
            >
              <span>My polls</span>
              <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[10px] text-white tabular-nums">
                {polls.length}
              </span>
            </a>

            <TimezoneCombobox
              value={viewerTimezone}
              onChange={handleChangeTimezone}
              referenceDateIso={selectedDates[0] || todayIso}
              ariaLabel="Your timezone"
              variant="dark"
              className="min-w-0"
            />
            <IdentityMenu name={guestName} />
          </div>
        </header>

        {/* Centered Direct Poll Creation Card Over the Painting */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
          <div className="w-full max-w-xl">
            <form
              onSubmit={handleCreatePoll}
              className="overflow-hidden rounded-[24px] border border-[#E4E2DA]/95 bg-[#FAF9F6] shadow-[0_28px_70px_-15px_rgba(0,0,0,0.6)]"
            >
              <div className="min-w-0 space-y-5 p-5 sm:p-6">
                {/* 1. Poll Name Input */}
                <div>
                  <input
                    type="text"
                    aria-label="Poll name"
                    value={pollTitle}
                    onChange={(e) => setPollTitle(e.target.value)}
                    placeholder="Poll name (e.g. Q4 Sync, Friday Dinner, Alps Trip)..."
                    className="w-full rounded-xl border border-[#E4E2DA] bg-white px-4 py-3 text-base sm:text-lg font-medium text-[#141413] placeholder:text-[#8A8780] focus:border-[#141413] focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* 2. Event Scale / Granularity Mode Switcher + Quick Templates */}
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 rounded-xl border border-[#E4E2DA] bg-white p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => handleSwitchPollMode("dates_and_hours")}
                      className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 whitespace-nowrap transition cursor-pointer ${
                        pollMode === "dates_and_hours"
                          ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>Dates + hours</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchPollMode("full_days")}
                      className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 whitespace-nowrap transition cursor-pointer ${
                        pollMode === "full_days"
                          ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>Full days</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 rounded-xl border border-[#E4E2DA] bg-white p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setScheduleType("specific_dates")}
                      aria-pressed={scheduleType === "specific_dates"}
                      className={`cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 transition ${
                        scheduleType === "specific_dates"
                          ? "bg-[#141413] font-semibold text-[#F6F5F2]"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      Specific dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType("days_of_week")}
                      aria-pressed={scheduleType === "days_of_week"}
                      className={`cursor-pointer whitespace-nowrap rounded-lg px-2 py-1.5 transition ${
                        scheduleType === "days_of_week"
                          ? "bg-[#141413] font-semibold text-[#F6F5F2]"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      Days of the week
                    </button>
                  </div>
                </div>

                {scheduleType === "specific_dates" ? (
                  <CalendarPicker
                    selectedDates={selectedDates}
                    onChangeDates={setSelectedDates}
                    minDateIso={todayIso}
                    maxMonthsAhead={120}
                  />
                ) : (
                  <div className="space-y-3 rounded-2xl border border-[#E4E2DA] bg-white p-3 sm:p-3.5">
                    <div className="grid grid-cols-7 gap-1">
                      {WEEKDAY_LABELS.map((weekday) => {
                        const selected = weekdays.includes(weekday.day);
                        return (
                          <button
                            key={weekday.day}
                            type="button"
                            aria-pressed={selected}
                            onClick={() =>
                              setWeekdays((current) =>
                                selected
                                  ? current.filter((day) => day !== weekday.day)
                                  : [...current, weekday.day]
                              )
                            }
                            className={`cursor-pointer rounded-lg border px-0 py-1.5 text-center font-mono text-[11px] transition sm:text-xs ${
                              selected
                                ? "border-[#141413] bg-[#141413] font-semibold text-[#F6F5F2]"
                                : "border-[#E4E2DA] bg-[#FAF9F6] text-[#575550] hover:border-[#141413]"
                            }`}
                          >
                            {weekday.short}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setSpanMode("weeks")}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1 ${
                          spanMode === "weeks"
                            ? "border-[#141413] bg-[#141413] text-[#F6F5F2]"
                            : "border-[#E4E2DA] text-[#575550]"
                        }`}
                      >
                        For weeks
                      </button>
                      <button
                        type="button"
                        onClick={() => setSpanMode("date_range")}
                        className={`cursor-pointer rounded-lg border px-2.5 py-1 ${
                          spanMode === "date_range"
                            ? "border-[#141413] bg-[#141413] text-[#F6F5F2]"
                            : "border-[#E4E2DA] text-[#575550]"
                        }`}
                      >
                        Until a date
                      </button>
                      <label className="col-span-2 grid min-w-0 gap-1 text-[#575550] sm:col-span-1">
                        Starting
                        <input
                          type="date"
                          aria-label="Recurrence start date"
                          min={todayIso}
                          value={rangeStart}
                          onChange={(event) => setRangeStart(event.target.value)}
                          className="w-full min-w-0 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2 py-1 text-[#141413]"
                        />
                      </label>
                      {spanMode === "weeks" ? (
                        <label className="col-span-2 grid min-w-0 gap-1 text-[#575550] sm:col-span-1">
                          Weeks
                          <input
                            type="number"
                            min={1}
                            max={26}
                            aria-label="Number of weeks"
                            value={weeksCount}
                            onChange={(event) =>
                              setWeeksCount(
                                Math.min(26, Math.max(1, Number(event.target.value) || 1))
                              )
                            }
                            className="w-full min-w-0 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2 py-1 text-[#141413]"
                          />
                        </label>
                      ) : (
                        <label className="col-span-2 grid min-w-0 gap-1 text-[#575550] sm:col-span-1">
                          Until
                          <input
                            type="date"
                            aria-label="Recurrence end date"
                            min={rangeStart || todayIso}
                            value={rangeEnd}
                            onChange={(event) => setRangeEnd(event.target.value)}
                            className="w-full min-w-0 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2 py-1 text-[#141413]"
                          />
                        </label>
                      )}
                    </div>
                    <p className="font-mono text-[11px] text-[#575550]">
                      {recurrenceSummary || "Choose at least one weekday"} · {recurringDates.length} dates
                    </p>
                  </div>
                )}

                {/* 4. Candidate Hours Window (Only shown in "Dates + hours" mode) */}
                {pollMode === "dates_and_hours" && (
                  <div className="grid grid-cols-1 items-center gap-2 rounded-xl border border-[#E4E2DA] bg-white px-3.5 py-2.5 font-mono text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
                    <span className="text-[#575550]">Candidate hours</span>
                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <select
                        aria-label="Start hour"
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="w-full min-w-0 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1 font-medium text-[#141413] tabular-nums focus:outline-none cursor-pointer"
                      >
                        {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19].map(
                          (h) => (
                            <option key={h} value={h}>
                              {h === 12
                                ? "12:00 PM"
                                : h > 12
                                ? `${h - 12}:00 PM`
                                : `${h}:00 AM`}
                            </option>
                          )
                        )}
                      </select>
                      <span className="text-[#8A8780]">to</span>
                      <select
                        aria-label="End hour"
                        value={endHour}
                        onChange={(e) => setEndHour(Number(e.target.value))}
                        className="w-full min-w-0 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1 font-medium text-[#141413] tabular-nums focus:outline-none cursor-pointer"
                      >
                        {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map(
                          (h) => (
                            <option key={h} value={h}>
                              {h === 12
                                ? "12:00 PM"
                                : h > 12
                                ? `${h - 12}:00 PM`
                                : `${h}:00 AM`}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* 5. Expandable Advanced Settings Accordion */}
                <AnimatePresence initial={false}>
                  {advancedOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3.5 rounded-2xl border border-[#E4E2DA] bg-white p-4 font-mono text-xs">
                        {/* Duration Selector inside Advanced Settings */}
                        <div>
                          <label className="block text-[10px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                            Event duration
                          </label>
                          <DurationControls
                            pollMode={pollMode}
                            durationMinutes={durationMinutes}
                            maxMinutes={maxDurationMinutes}
                            onChange={setDurationMinutes}
                          />
                        </div>

                        {/* Access & Password Protection + Response Visibility */}
                        <div className="grid grid-cols-1 items-start gap-3 pt-1 sm:grid-cols-2">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                              Access control
                            </label>
                            <div className="flex rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] p-0.5">
                              <button
                                type="button"
                                onClick={() => setPasswordProtected(false)}
                                className={`flex-1 rounded-lg py-1 text-[11px] transition cursor-pointer ${
                                  !passwordProtected
                                    ? "bg-[#141413] text-white font-semibold"
                                    : "text-[#575550]"
                                }`}
                              >
                                Anyone with link
                              </button>
                              <button
                                type="button"
                                onClick={() => setPasswordProtected(true)}
                                className={`flex-1 rounded-lg py-1 text-[11px] transition cursor-pointer ${
                                  passwordProtected
                                    ? "bg-[#141413] text-white font-semibold"
                                    : "text-[#575550]"
                                }`}
                              >
                                Password
                              </button>
                            </div>
                            {passwordProtected && (
                              <input
                                type="password"
                                aria-label="Set poll password"
                                value={accessPassword}
                                onChange={(e) =>
                                  setAccessPassword(e.target.value)
                                }
                                placeholder="Set password..."
                                className="mt-2 w-full rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                              />
                            )}
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                              Response visibility
                            </label>
                            <select
                              aria-label="Response visibility"
                              value={visibilityMode}
                              onChange={(e) =>
                                setVisibilityMode(
                                  e.target.value as VisibilityMode
                                )
                              }
                              className="w-full rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3 py-1.5 text-xs text-[#141413] focus:outline-none cursor-pointer"
                            >
                              <option value="public">
                                Everyone sees responses
                              </option>
                              <option value="hidden_until_voted">
                                Hidden until you vote
                              </option>
                              <option value="host_only">
                                Host only (blind poll)
                              </option>
                            </select>
                          </div>
                        </div>

                        {/* Allow "If needed" & Timezone */}
                        <div className="flex flex-col gap-3 border-t border-[#E4E2DA] pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allowIfNeeded}
                              onChange={(e) =>
                                setAllowIfNeeded(e.target.checked)
                              }
                              className="h-3.5 w-3.5 rounded accent-[#141413]"
                            />
                            <span className="text-[#141413]">
                              Allow &ldquo;If needed&rdquo; flex slots
                            </span>
                          </label>

                          <TimezoneCombobox
                            value={viewerTimezone}
                            onChange={handleChangeTimezone}
                            referenceDateIso={selectedDates[0] || todayIso}
                            ariaLabel="Poll timezone"
                            align="right"
                            className="max-w-full sm:max-w-none"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {createError ? (
                <p role="alert" className="px-5 pb-3 font-mono text-xs text-red-700">
                  {createError}
                </p>
              ) : null}

              {/* Bottom Action Bar Inside the Creation Card */}
              <div className="flex flex-col gap-2 border-t border-[#E4E2DA] bg-[#F2F0E9] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((prev) => !prev)}
                  className={`inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-medium transition cursor-pointer sm:justify-start ${
                    advancedOpen
                      ? "border-[#141413] bg-[#141413] text-[#F6F5F2]"
                      : "border-[#D8D5CB] bg-white text-[#141413] hover:bg-[#FAF9F6]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Advanced settings</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px] tabular-nums">
                    {formatDurationBadge(durationMinutes, pollMode)}
                  </span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <button
                  type="submit"
                  disabled={creatingState !== "idle"}
                  className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-mono text-xs font-semibold transition cursor-pointer ${
                    creatingState === "copied"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#141413] text-[#F6F5F2] hover:bg-emerald-700"
                  }`}
                >
                  {creatingState === "copied" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span className="truncate">Link copied — opening {createdSlugPreview}</span>
                    </>
                  ) : creatingState === "creating" ? (
                    <span>Creating...</span>
                  ) : (
                    <>
                      <span>Create poll</span>
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Spacer */}
        <div className="relative z-10 h-8" />
      </section>

      {/* =========================================================
          BELOW THE FOLD (WHEN SCROLLING): SINGLE-TONE FLAT BACKGROUND WITH "MY POLLS"
         ========================================================= */}
      <section
        id="my-polls"
        className="w-full bg-[#F6F5F2] py-16 sm:py-20 px-4 sm:px-6"
      >
        <div className="mx-auto max-w-4xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141413]">
                My polls
              </h2>
              <span className="rounded-full bg-[#EFECE6] px-2 py-0.5 font-mono text-[11px] text-[#575550] tabular-nums">
                {polls.length}
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#8A8780]">
              Click any poll to open
            </span>
          </div>

          <div className="space-y-3">
            {pollLoadState === "error" ? (
              <div className="rounded-[24px] border border-[#E4E2DA] bg-white p-5">
                <p className="text-sm text-[#141413]">Couldn’t load your polls.</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#171715] px-5 text-sm font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            ) : null}
            {pollLoadState === "error"
              ? null
              : polls.map((p) => {
              const topWin = computeRankedWindows(p)[0];
              const topDateHdr = topWin ? formatDateHeader(topWin.date) : null;
              const topStartDisp = topWin
                ? formatMinutesToDisplay(
                    topWin.startTimeMinutes,
                    viewerTimezone,
                    p.timezone,
                    true
                  )
                : null;

              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-3 rounded-[24px] border border-[#E4E2DA] bg-white p-5 sm:flex-row sm:items-center sm:justify-between hover:border-[#C9C6BC] transition"
                >
                  {/* Left: Status + Title + Meta */}
                  <div
                    onClick={() => {
                      setActiveSlug(p.slug);
                      setJustCreatedFlag(false);
                      setViewMode("poll");
                      router.push(`/p/${p.slug}`);
                    }}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                          p.status === "LOCKED"
                            ? "bg-emerald-600 text-white"
                            : "bg-[#EFECE6] text-[#141413]"
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="font-medium text-base text-[#141413] truncate">
                        {p.title}
                      </span>
                      <span className="font-mono text-xs text-[#8A8780] tabular-nums">
                        · {formatDurationBadge(p.durationMinutes, p.pollMode)}
                      </span>
                      {p.hasPassword && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF9F6] border border-[#E4E2DA] px-2 py-0.5 font-mono text-[10px] text-[#575550]">
                          <KeyRound className="h-2.5 w-2.5" /> Protected
                        </span>
                      )}
                      {p.visibilityMode !== "public" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF9F6] border border-[#E4E2DA] px-2 py-0.5 font-mono text-[10px] text-[#575550]">
                          <EyeOff className="h-2.5 w-2.5" />{" "}
                          {p.visibilityMode === "hidden_until_voted"
                            ? "Hidden until voted"
                            : "Host only"}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-xs text-[#575550] tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-[#8A8780]" />
                        {p.participants.length} responded
                      </span>
                      <span>·</span>
                      <span>{p.candidateDates.length} days</span>
                      {topWin && topDateHdr && topStartDisp && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-800 font-medium">
                            Best: {topDateHdr.weekdayShort} {topDateHdr.dayNum}{" "}
                            {p.pollMode === "full_days"
                              ? "(All day)"
                              : `at ${topStartDisp.timeLabel}`}{" "}
                            ({topWin.totalAttendingCount}/
                            {topWin.totalParticipants})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => handleCopyPollLink(p.slug, p.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3.5 py-2 text-xs text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
                    >
                      {copiedPollId === p.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-[#575550]" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/p/${p.slug}`}
                      onClick={() => {
                        setActiveSlug(p.slug);
                        setJustCreatedFlag(false);
                        setViewMode("poll");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#141413] px-4 py-2 text-xs font-medium text-[#F6F5F2] hover:bg-emerald-700 transition"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    {polls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePoll(p.slug, p.id)}
                        className="rounded-xl border border-[#E4E2DA] bg-white p-2 text-[#8A8780] hover:border-rose-300 hover:text-rose-600 transition cursor-pointer"
                        title="Delete poll"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
