"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
  Globe,
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
  STORAGE_KEY_GUEST,
  STORAGE_KEY_HOST_TOKENS,
  STORAGE_KEY_POLLS,
  STORAGE_KEY_TZ,
  TIMEZONE_OPTIONS,
  VisibilityMode,
  computeRankedWindows,
  formatDateHeader,
  formatDurationBadge,
  formatMinutesToDisplay,
  getOrCreateGuestSessionId,
} from "@/lib/slotted-data";
import { PollWorkspace } from "./poll-workspace";

const CALENDAR_GRID_DAYS = [
  { iso: "2026-10-26", day: "Mon", num: "26", month: "Oct", weekend: false },
  { iso: "2026-10-27", day: "Tue", num: "27", month: "Oct", weekend: false },
  { iso: "2026-10-28", day: "Wed", num: "28", month: "Oct", weekend: false },
  { iso: "2026-10-29", day: "Thu", num: "29", month: "Oct", weekend: false },
  { iso: "2026-10-30", day: "Fri", num: "30", month: "Oct", weekend: true },
  { iso: "2026-10-31", day: "Sat", num: "31", month: "Oct", weekend: true },
  { iso: "2026-11-01", day: "Sun", num: "01", month: "Nov", weekend: true },
  { iso: "2026-11-02", day: "Mon", num: "02", month: "Nov", weekend: false },
  { iso: "2026-11-03", day: "Tue", num: "03", month: "Nov", weekend: false },
  { iso: "2026-11-04", day: "Wed", num: "04", month: "Nov", weekend: false },
  { iso: "2026-11-05", day: "Thu", num: "05", month: "Nov", weekend: false },
  { iso: "2026-11-06", day: "Fri", num: "06", month: "Nov", weekend: true },
  { iso: "2026-11-07", day: "Sat", num: "07", month: "Nov", weekend: true },
  { iso: "2026-11-08", day: "Sun", num: "08", month: "Nov", weekend: true },
];

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
  initialLocked = false,
  initialAdvancedOpen = false,
  initialCreated = false,
}: SlottedAppShellProps) {
  const router = useRouter();

  const [polls, setPolls] = useState<PollData[]>(() => {
    if (!initialLocked) return INITIAL_POLLS;
    return INITIAL_POLLS.map((p, idx) =>
      (initialSlug ? p.slug === initialSlug : idx === 0)
        ? { ...p, status: "LOCKED" }
        : p
    );
  });

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
  const [selectedDates, setSelectedDates] = useState<string[]>([
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
  ]);
  const [startHour, setStartHour] = useState<number>(9);
  const [endHour, setEndHour] = useState<number>(17);

  // Drag-selecting dates on the creation calendar
  const [draggingCalendar, setDraggingCalendar] = useState<boolean>(false);
  const [dragCalendarAction, setDragCalendarAction] = useState<
    "add" | "remove"
  >("add");

  // Advanced Settings Disclosure State
  const [advancedOpen, setAdvancedOpen] =
    useState<boolean>(initialAdvancedOpen);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [passwordProtected, setPasswordProtected] = useState<boolean>(false);
  const [accessPassword, setAccessPassword] = useState<string>("");
  const [visibilityMode, setVisibilityMode] =
    useState<VisibilityMode>("public");
  const [allowIfNeeded, setAllowIfNeeded] = useState<boolean>(true);
  const [deadlineAt, setDeadlineAt] = useState<string>("");

  // Creation microanimation state before routing
  const [creatingState, setCreatingState] = useState<
    "idle" | "creating" | "copied"
  >("idle");
  const [createdSlugPreview, setCreatedSlugPreview] = useState<string | null>(
    null
  );

  useEffect(() => {
    setAdvancedOpen(initialAdvancedOpen);
  }, [initialAdvancedOpen]);

  // Fetch live polls from server API on mount + merge local storage
  useEffect(() => {
    let cancelled = false;

    async function loadFromServer() {
      try {
        const res = await fetch("/api/polls", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.polls) && data.polls.length > 0) {
            const list: PollData[] = data.polls;
            if (initialLocked && initialSlug) {
              setPolls(
                list.map((p) =>
                  p.slug === initialSlug ? { ...p, status: "LOCKED" } : p
                )
              );
            } else {
              setPolls(list);
            }
          }
        }
      } catch {
        // Fallback to localStorage if offline
      }
    }

    loadFromServer();

    try {
      const g = localStorage.getItem(STORAGE_KEY_GUEST);
      if (g) setGuestName(g);
      const tz = localStorage.getItem(STORAGE_KEY_TZ);
      if (tz && TIMEZONE_OPTIONS.some((o) => o.id === tz)) {
        setViewerTimezone(tz);
      }
    } catch {}

    return () => {
      cancelled = true;
    };
  }, [initialLocked, initialSlug]);

  // Global pointerup for calendar drag
  useEffect(() => {
    if (!draggingCalendar) return;
    const stop = () => setDraggingCalendar(false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, [draggingCalendar]);

  const handleSwitchPollMode = (nextMode: PollMode) => {
    setPollMode(nextMode);
    if (nextMode === "full_days") {
      setDurationMinutes(1440); // Default 1 full day (or user can pick 2d / 3d)
      setSelectedDates(["2026-10-30", "2026-10-31", "2026-11-01"]);
    } else {
      if (durationMinutes >= 1440) {
        setDurationMinutes(30);
      }
      setSelectedDates(["2026-10-27", "2026-10-28", "2026-10-29"]);
    }
  };

  const applyQuickPreset = (
    preset: "call_30m" | "dinner_2h" | "weekend_trip" | "next_week"
  ) => {
    if (preset === "call_30m") {
      setPollMode("dates_and_hours");
      setSelectedDates(["2026-10-27", "2026-10-28", "2026-10-29"]);
      setStartHour(9);
      setEndHour(17);
      setDurationMinutes(30);
      if (!pollTitle) setPollTitle("30m Intro Call");
    } else if (preset === "dinner_2h") {
      setPollMode("dates_and_hours");
      setSelectedDates(["2026-10-28", "2026-10-29", "2026-10-30"]);
      setStartHour(18);
      setEndHour(22);
      setDurationMinutes(120);
      if (!pollTitle) setPollTitle("Team Dinner");
    } else if (preset === "weekend_trip") {
      setPollMode("full_days");
      setSelectedDates(["2026-10-30", "2026-10-31", "2026-11-01"]);
      setDurationMinutes(4320); // 3 days
      if (!pollTitle) setPollTitle("Weekend Group Trip");
    } else if (preset === "next_week") {
      setSelectedDates([
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
        "2026-11-05",
        "2026-11-06",
      ]);
    }
  };

  const handleDatePointerDown = (iso: string) => {
    const isCurrentlySelected = selectedDates.includes(iso);
    const action = isCurrentlySelected ? "remove" : "add";
    setDragCalendarAction(action);
    setDraggingCalendar(true);

    setSelectedDates((prev) => {
      if (action === "remove") {
        return prev.length > 1 ? prev.filter((d) => d !== iso) : prev;
      }
      return prev.includes(iso) ? prev : [...prev, iso].sort();
    });
  };

  const handleDatePointerEnter = (iso: string) => {
    if (!draggingCalendar) return;
    setSelectedDates((prev) => {
      if (dragCalendarAction === "remove") {
        return prev.length > 1 ? prev.filter((d) => d !== iso) : prev;
      }
      return prev.includes(iso) ? prev : [...prev, iso].sort();
    });
  };

  const activePoll = useMemo(() => {
    return polls.find((p) => p.slug === activeSlug) || polls[0];
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
    if (polls.length <= 1) return;
    setPolls((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/polls/${slug}`, { method: "DELETE" });
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
    const finalTitle =
      pollTitle.trim() ||
      (pollMode === "full_days" ? "Group Trip" : "Team Sync");
    const sessionId = getOrCreateGuestSessionId();

    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: finalTitle,
          pollMode,
          hostName: guestName || "Alex",
          guestSessionId: sessionId,
          timezone: viewerTimezone,
          candidateDates: selectedDates,
          dayStartHour: startHour,
          dayEndHour: Math.max(startHour + 2, endHour),
          slotMinutes: 30,
          durationMinutes,
          accessPassword:
            passwordProtected && accessPassword.trim()
              ? accessPassword.trim()
              : null,
          visibilityMode,
          allowIfNeeded,
          deadlineAt: deadlineAt || null,
        }),
      });

      if (res.ok) {
        const { poll, hostToken } = (await res.json()) as {
          poll: PollData;
          hostToken: string;
        };

        // Copy share link immediately
        const shareUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/p/${poll.slug}`
            : `https://slotted.app/p/${poll.slug}`;
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          navigator.clipboard.writeText(shareUrl).catch(() => {});
        }

        // Save hostToken locally
        try {
          const rawTokens = localStorage.getItem(STORAGE_KEY_HOST_TOKENS);
          const map = rawTokens ? JSON.parse(rawTokens) : {};
          map[poll.slug] = hostToken;
          localStorage.setItem(STORAGE_KEY_HOST_TOKENS, JSON.stringify(map));
        } catch {}

        setPolls((prev) => [poll, ...prev]);
        setCreatedSlugPreview(poll.slug);
        setCreatingState("copied");

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
    } catch {}

    setCreatingState("idle");
  };

  const handleCopyPollLink = (slug: string, id: string) => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${slug}`
        : `https://slotted.app/p/${slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedPollId(id);
    setTimeout(() => setCopiedPollId(null), 1800);
  };

  const currentTzOption =
    TIMEZONE_OPTIONS.find((t) => t.id === viewerTimezone) || TIMEZONE_OPTIONS[1];

  /* =========================================================
     POLL VIEW (/p/[slug]) — Matching Rounded-[24px] Design System
     ========================================================= */
  if (viewMode === "poll") {
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
        <img
          src="/hero-landscape.jpg"
          alt=""
          aria-hidden="true"
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
        <header className="relative z-10 mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
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

          <div className="flex items-center gap-2 font-mono text-xs">
            <a
              href="#my-polls"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3.5 py-1.5 text-xs font-medium text-[#FAF9F6] hover:bg-black/50 transition"
            >
              <span>My polls</span>
              <span className="rounded-full bg-white/15 px-1.5 py-0.2 text-[10px] text-white tabular-nums">
                {polls.length}
              </span>
            </a>

            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-[11px] text-white/85 tabular-nums">
              <Globe className="h-3 w-3 text-white/70" />
              <span>
                {currentTzOption.shortCode} · {currentTzOption.utcLabel}
              </span>
            </div>
          </div>
        </header>

        {/* Centered Direct Poll Creation Card Over the Painting */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
          <div className="w-full max-w-xl">
            <form
              onSubmit={handleCreatePoll}
              className="overflow-hidden rounded-[24px] border border-[#E4E2DA]/95 bg-[#FAF9F6] shadow-[0_28px_70px_-15px_rgba(0,0,0,0.6)]"
            >
              <div className="p-5 sm:p-6 space-y-5 select-none">
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {/* Dates + Hours vs Full Days Toggle */}
                  <div className="inline-flex items-center rounded-xl border border-[#E4E2DA] bg-white p-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => handleSwitchPollMode("dates_and_hours")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                        pollMode === "dates_and_hours"
                          ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      <span>Dates + hours</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchPollMode("full_days")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition cursor-pointer ${
                        pollMode === "full_days"
                          ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                          : "text-[#575550] hover:text-[#141413]"
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>Full days</span>
                    </button>
                  </div>

                  {/* Quick Intent Presets ("30m call", "Dinner", "Weekend") */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => applyQuickPreset("call_30m")}
                      className="rounded-lg border border-[#E4E2DA] bg-white px-2.5 py-1 text-[#575550] hover:border-[#141413] hover:text-[#141413] transition cursor-pointer"
                    >
                      30m call
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset("dinner_2h")}
                      className="rounded-lg border border-[#E4E2DA] bg-white px-2.5 py-1 text-[#575550] hover:border-[#141413] hover:text-[#141413] transition cursor-pointer"
                    >
                      Dinner
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset("weekend_trip")}
                      className="rounded-lg border border-[#E4E2DA] bg-white px-2.5 py-1 text-[#575550] hover:border-[#141413] hover:text-[#141413] transition cursor-pointer"
                    >
                      Holiday
                    </button>
                  </div>
                </div>

                {/* 3. Direct Interactive Calendar Date Picker (Click or Drag Across Dates) */}
                <div>
                  <div className="flex items-center justify-between mb-2 font-mono text-[11px] text-[#575550]">
                    <span className="uppercase tracking-wider text-[#8A8780]">
                      Candidate dates ({selectedDates.length} selected)
                    </span>
                    <button
                      type="button"
                      onClick={() => applyQuickPreset("next_week")}
                      className="text-[#575550] underline decoration-[#C9C6BC] underline-offset-2 hover:text-[#141413] cursor-pointer"
                    >
                      Select next Mon–Fri
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {CALENDAR_GRID_DAYS.map((d) => {
                      const isSelected = selectedDates.includes(d.iso);
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          onPointerDown={() => handleDatePointerDown(d.iso)}
                          onPointerEnter={() => handleDatePointerEnter(d.iso)}
                          className={`flex flex-col items-center rounded-xl border py-2 font-mono text-xs transition cursor-pointer ${
                            isSelected
                              ? "border-[#141413] bg-[#141413] text-[#F6F5F2] font-semibold"
                              : d.weekend
                              ? "border-[#E4E2DA] bg-[#F2F0E9]/70 text-[#575550] hover:border-[#141413]/40"
                              : "border-[#E4E2DA] bg-white text-[#141413] hover:border-[#141413]/40"
                          }`}
                        >
                          <span className="text-[10px] opacity-70">
                            {d.day}
                          </span>
                          <span className="text-sm tabular-nums">{d.num}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Candidate Hours Window (Only shown in "Dates + hours" mode) */}
                {pollMode === "dates_and_hours" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E4E2DA] bg-white px-3.5 py-2.5 font-mono text-xs">
                    <span className="text-[#575550]">Candidate hours</span>
                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Start hour"
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1 font-medium text-[#141413] tabular-nums focus:outline-none cursor-pointer"
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
                        className="rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1 font-medium text-[#141413] tabular-nums focus:outline-none cursor-pointer"
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
                          {pollMode === "full_days" ? (
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { mins: 1440, label: "1 Full day" },
                                { mins: 2880, label: "2 Days (Weekend)" },
                                { mins: 4320, label: "3 Days (Holiday)" },
                              ].map((d) => (
                                <button
                                  key={d.mins}
                                  type="button"
                                  onClick={() => setDurationMinutes(d.mins)}
                                  className={`rounded-xl border py-1.5 text-center transition cursor-pointer ${
                                    durationMinutes === d.mins
                                      ? "border-[#141413] bg-[#141413] text-[#F6F5F2] font-semibold"
                                      : "border-[#E4E2DA] bg-[#FAF9F6] text-[#575550] hover:text-[#141413]"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="grid grid-cols-5 gap-1.5">
                              {[
                                { mins: 15, label: "15m" },
                                { mins: 30, label: "30m" },
                                { mins: 60, label: "1h" },
                                { mins: 120, label: "2h" },
                                { mins: 180, label: "3h" },
                              ].map((d) => (
                                <button
                                  key={d.mins}
                                  type="button"
                                  onClick={() => setDurationMinutes(d.mins)}
                                  className={`rounded-xl border py-1.5 text-center tabular-nums transition cursor-pointer ${
                                    durationMinutes === d.mins
                                      ? "border-[#141413] bg-[#141413] text-[#F6F5F2] font-semibold"
                                      : "border-[#E4E2DA] bg-[#FAF9F6] text-[#575550] hover:text-[#141413]"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Access & Password Protection + Response Visibility */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E2DA] pt-3">
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

                          <div className="flex items-center gap-1.5">
                            <span className="text-[#8A8780]">TZ:</span>
                            <select
                              aria-label="Poll Timezone"
                              value={viewerTimezone}
                              onChange={(e) =>
                                handleChangeTimezone(e.target.value)
                              }
                              className="rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2 py-1 text-[11px] text-[#141413] focus:outline-none"
                            >
                              {TIMEZONE_OPTIONS.map((tz) => (
                                <option key={tz.id} value={tz.id}>
                                  {tz.city} ({tz.shortCode})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom Action Bar Inside the Creation Card */}
              <div className="flex items-center justify-between border-t border-[#E4E2DA] bg-[#F2F0E9] px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-medium transition cursor-pointer ${
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
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-mono text-xs font-semibold transition cursor-pointer ${
                    creatingState === "copied"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#141413] text-[#F6F5F2] hover:bg-emerald-700"
                  }`}
                >
                  {creatingState === "copied" ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Link copied — opening {createdSlugPreview}</span>
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
            {polls.map((p) => {
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
