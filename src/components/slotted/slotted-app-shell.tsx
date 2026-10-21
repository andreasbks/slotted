"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Clock,
  Copy,
  CornerDownLeft,
  Globe,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import {
  BrushMode,
  INITIAL_POLLS,
  PollData,
  STORAGE_KEY_GUEST,
  STORAGE_KEY_TZ,
  TIMEZONE_OPTIONS,
  computeRankedWindows,
  formatDateHeader,
  formatMinutesToDisplay,
  loadStoredPolls,
  parseNaturalLanguagePoll,
  saveStoredPolls,
} from "@/lib/slotted-data";
import { PollWorkspace } from "./poll-workspace";

const MANUAL_CALENDAR_DAYS = [
  { iso: "2026-10-26", day: "Mon", num: "26", month: "Oct" },
  { iso: "2026-10-27", day: "Tue", num: "27", month: "Oct" },
  { iso: "2026-10-28", day: "Wed", num: "28", month: "Oct" },
  { iso: "2026-10-29", day: "Thu", num: "29", month: "Oct" },
  { iso: "2026-10-30", day: "Fri", num: "30", month: "Oct" },
  { iso: "2026-11-02", day: "Mon", num: "02", month: "Nov" },
  { iso: "2026-11-03", day: "Tue", num: "03", month: "Nov" },
  { iso: "2026-11-04", day: "Wed", num: "04", month: "Nov" },
  { iso: "2026-11-05", day: "Thu", num: "05", month: "Nov" },
  { iso: "2026-11-06", day: "Fri", num: "06", month: "Nov" },
];

interface SlottedAppShellProps {
  initialSlug?: string;
  initialViewMode?: "landing" | "poll";
  initialLocked?: boolean;
  initialManualMode?: boolean;
}

export function SlottedAppShell({
  initialSlug,
  initialViewMode = "landing",
  initialLocked = false,
  initialManualMode = false,
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

  // Composer state
  const [promptText, setPromptText] = useState<string>("");
  const [manualMode, setManualMode] = useState<boolean>(initialManualMode);

  // Manual configuration fields
  const [manualTitle, setManualTitle] = useState<string>(
    "Q4 Architecture Sync"
  );
  const [manualDates, setManualDates] = useState<string[]>([
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
  ]);
  const [manualStartHour, setManualStartHour] = useState<number>(9);
  const [manualEndHour, setManualEndHour] = useState<number>(17);
  const [manualDuration, setManualDuration] = useState<number>(30);

  useEffect(() => {
    setManualMode(initialManualMode);
  }, [initialManualMode]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadStoredPolls();
    if (initialLocked && initialSlug) {
      setPolls(
        stored.map((p) =>
          p.slug === initialSlug ? { ...p, status: "LOCKED" } : p
        )
      );
    } else {
      setPolls(stored);
    }

    try {
      const g = localStorage.getItem(STORAGE_KEY_GUEST);
      if (g) setGuestName(g);
      const tz = localStorage.getItem(STORAGE_KEY_TZ);
      if (tz && TIMEZONE_OPTIONS.some((o) => o.id === tz)) {
        setViewerTimezone(tz);
      }
    } catch {}
  }, [initialLocked, initialSlug]);

  const parsedPrompt = useMemo(
    () => parseNaturalLanguagePoll(promptText),
    [promptText]
  );

  const handleToggleManualMode = () => {
    if (!manualMode && promptText.trim().length > 0) {
      setManualTitle(parsedPrompt.title);
      setManualDates(parsedPrompt.candidateDates);
      setManualStartHour(parsedPrompt.dayStartHour);
      setManualEndHour(parsedPrompt.dayEndHour);
      setManualDuration(parsedPrompt.durationMinutes);
    }
    setManualMode((prev) => !prev);
  };

  const toggleManualDate = (iso: string) => {
    setManualDates((prev) =>
      prev.includes(iso)
        ? prev.length > 1
          ? prev.filter((d) => d !== iso)
          : prev
        : [...prev, iso].sort()
    );
  };

  const activePoll = useMemo(() => {
    return polls.find((p) => p.slug === activeSlug) || polls[0];
  }, [polls, activeSlug]);

  const handleUpdatePoll = (updated: PollData) => {
    setPolls((prev) => {
      const next = prev.map((p) => (p.id === updated.id ? updated : p));
      saveStoredPolls(next);
      return next;
    });
  };

  const handleDeletePoll = (id: string) => {
    setPolls((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((p) => p.id !== id);
      saveStoredPolls(next);
      if (activePoll.id === id) {
        setActiveSlug(next[0].slug);
      }
      return next;
    });
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

  const handleCreatePoll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const title = manualMode
      ? manualTitle.trim() || "Untitled Poll"
      : parsedPrompt.title;
    const candidateDates = manualMode
      ? manualDates
      : parsedPrompt.candidateDates;
    const dayStartHour = manualMode
      ? manualStartHour
      : parsedPrompt.dayStartHour;
    const dayEndHour = manualMode
      ? Math.max(manualStartHour + 2, manualEndHour)
      : parsedPrompt.dayEndHour;
    const durationMinutes = manualMode
      ? manualDuration
      : parsedPrompt.durationMinutes;

    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28);
    const slug = `${slugBase || "poll"}-${Math.floor(
      100 + Math.random() * 899
    )}`;

    const d0 = candidateDates[0];
    const d1 = candidateDates[1] || candidateDates[0];
    const h1 = String(dayStartHour + 1).padStart(2, "0");
    const h2 = String(Math.min(dayEndHour - 1, dayStartHour + 2)).padStart(
      2,
      "0"
    );

    const extractedNames =
      !manualMode && parsedPrompt.participantsExtracted.length > 0
        ? parsedPrompt.participantsExtracted
        : ["Elena", "Sam"];

    const newPoll: PollData = {
      id: `pol_${Date.now().toString(36)}`,
      slug,
      title,
      description: `${String(dayStartHour).padStart(2, "0")}:00–${String(
        dayEndHour
      ).padStart(2, "0")}:00 · ${durationMinutes}m`,
      themeTint: "linen",
      hostName: guestName || "Alex",
      timezone: viewerTimezone,
      candidateDates,
      dayStartHour,
      dayEndHour,
      slotMinutes: 30,
      durationMinutes,
      status: "OPEN",
      lockedLocation: `meet.slotted.app/${slugBase || "room"}`,
      reactions: [],
      participants: [
        {
          id: "p_gen_1",
          guestSessionId: "slt_gen_1",
          name: extractedNames[0] || "Elena",
          city: "SF",
          timezone: "America/Los_Angeles",
          avatarColor: "#10B981",
          slots: {
            [`${d0}T${h1}:00`]: "available",
            [`${d0}T${h1}:30`]: "available",
            [`${d1}T${h1}:00`]: "available",
            [`${d1}T${h1}:30`]: "available",
            [`${d1}T${h2}:00`]: "available",
          },
        },
        {
          id: "p_gen_2",
          guestSessionId: "slt_gen_2",
          name: extractedNames[1] || "Sam",
          city: "London",
          timezone: "Europe/London",
          avatarColor: "#D97706",
          slots: {
            [`${d0}T${h1}:00`]: "if_needed",
            [`${d0}T${h1}:30`]: "if_needed",
            [`${d1}T${h1}:00`]: "available",
            [`${d1}T${h1}:30`]: "available",
            [`${d1}T${h2}:00`]: "available",
          },
        },
        {
          id: "p_gen_you",
          guestSessionId: "slt_guest_local",
          name: guestName || "Alex",
          city: "NYC",
          timezone: viewerTimezone,
          avatarColor: "#141413",
          isCurrentUser: true,
          slots: {
            [`${d1}T${h1}:00`]: "available",
            [`${d1}T${h1}:30`]: "available",
          },
        },
      ],
    };

    const nextPolls = [newPoll, ...polls];
    setPolls(nextPolls);
    saveStoredPolls(nextPolls);
    setActiveSlug(newPoll.slug);
    setViewMode("poll");
    router.push(`/p/${newPoll.slug}`);
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
     FOCUSED POLL VIEW (/p/[slug])
     ========================================================= */
  if (viewMode === "poll") {
    return (
      <div className="min-h-dvh flex flex-col bg-[#F6F5F2] text-[#141413]">
        <header className="border-b border-[#E2E0D8] bg-[#F6F5F2]">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                onClick={() => setViewMode("landing")}
                className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-[#141413]"
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E0D8] bg-white px-3 py-1.5 text-xs font-medium text-[#141413] hover:bg-[#EFECE6] transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>New / My polls ({polls.length})</span>
              </Link>

              <div className="hidden sm:inline-flex items-center gap-1 rounded-xl border border-[#E2E0D8] bg-[#FAF9F6] px-3 py-1.5 text-[11px] text-[#575550] tabular-nums">
                <Globe className="h-3 w-3 text-[#8A8780]" />
                <span>
                  {currentTzOption.shortCode} · {currentTzOption.utcLabel}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-6 sm:px-6">
          <PollWorkspace
            poll={activePoll}
            onUpdatePoll={handleUpdatePoll}
            guestName={guestName}
            onChangeGuestName={handleChangeGuestName}
            viewerTimezone={viewerTimezone}
            onChangeViewerTimezone={handleChangeTimezone}
            activeBrush={activeBrush}
            onChangeBrush={setActiveBrush}
          />
        </main>
      </div>
    );
  }

  /* =========================================================
     HOME VIEW (/):
     1. 100dvh Fullscreen Darkened Classical Landscape + Rounder Creation Box
     2. Below the fold: Single-Tone Grainy Flat "My polls"
     ========================================================= */
  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F5F2] text-[#141413]">
      {/* FIRST SIGHT: FULLSCREEN DARKENED LANDSCAPE + CREATION BOX ONLY */}
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
          className="pointer-events-none absolute inset-0 bg-black/38"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-black/25 to-black/55"
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

        {/* Centered Creation Box Over the Painting */}
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-xl">
            <form
              onSubmit={handleCreatePoll}
              className="overflow-hidden rounded-[24px] border border-[#E2E0D8]/90 bg-[#FAF9F6] shadow-[0_28px_70px_-15px_rgba(0,0,0,0.55)]"
            >
              {!manualMode ? (
                /* DEFAULT PROMPT TEXTBOX MODE */
                <div className="p-5 sm:p-6">
                  <textarea
                    rows={3}
                    aria-label="Poll description prompt"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleCreatePoll();
                      }
                    }}
                    placeholder="Coffee with Alex and Sam next Tue or Thu afternoon..."
                    className="w-full resize-none bg-transparent font-sans text-base sm:text-lg text-[#141413] placeholder:text-[#8A8780] focus:outline-none"
                    autoFocus
                  />

                  {/* Quiet Live Parsed Pills */}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-[#E2E0D8] font-mono text-[11px] text-[#575550]">
                    <span className="rounded-full border border-[#E2E0D8] bg-white px-2.5 py-0.5 text-[#141413] font-medium">
                      {parsedPrompt.title}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E0D8] bg-white px-2.5 py-0.5 tabular-nums">
                      <Calendar className="h-3 w-3 text-[#8A8780]" />
                      {parsedPrompt.dateLabels.join(", ")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E0D8] bg-white px-2.5 py-0.5 tabular-nums">
                      <Clock className="h-3 w-3 text-[#8A8780]" />
                      {parsedPrompt.timeRangeLabel}
                    </span>
                    <span className="rounded-full border border-[#E2E0D8] bg-white px-2.5 py-0.5 tabular-nums">
                      {parsedPrompt.durationMinutes}m
                    </span>
                  </div>
                </div>
              ) : (
                /* MANUAL CONFIGURATION MODE ("Set manually") */
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Title Input */}
                  <div>
                    <label className="block font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                      Title
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Q4 Architecture Sync"
                      className="w-full rounded-xl border border-[#E2E0D8] bg-white px-3.5 py-2 text-sm font-medium text-[#141413] placeholder:text-[#8A8780] focus:border-[#141413] focus:outline-none"
                    />
                  </div>

                  {/* Candidate Dates Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-mono text-[11px] uppercase tracking-wider text-[#8A8780]">
                        Dates ({manualDates.length} selected)
                      </label>
                      <span className="font-mono text-[10px] text-[#8A8780]">
                        Click to toggle
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {MANUAL_CALENDAR_DAYS.map((d) => {
                        const isSelected = manualDates.includes(d.iso);
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => toggleManualDate(d.iso)}
                            className={`flex flex-col items-center rounded-xl border py-2 font-mono text-xs transition cursor-pointer ${
                              isSelected
                                ? "border-[#141413] bg-[#141413] text-[#F6F5F2] font-semibold"
                                : "border-[#E2E0D8] bg-white text-[#575550] hover:border-[#141413]/40"
                            }`}
                          >
                            <span className="text-[10px] opacity-75">
                              {d.day}
                            </span>
                            <span className="text-sm tabular-nums">{d.num}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hours, Duration & Timezone Row */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                    {/* Hours */}
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                        Window
                      </label>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <select
                          aria-label="Start hour"
                          value={manualStartHour}
                          onChange={(e) =>
                            setManualStartHour(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-[#E2E0D8] bg-white px-2.5 py-1.5 text-[#141413] tabular-nums focus:outline-none"
                        >
                          {[8, 9, 10, 11, 12, 13, 14].map((h) => (
                            <option key={h} value={h}>
                              {String(h).padStart(2, "0")}:00
                            </option>
                          ))}
                        </select>
                        <span className="text-[#8A8780]">–</span>
                        <select
                          aria-label="End hour"
                          value={manualEndHour}
                          onChange={(e) =>
                            setManualEndHour(Number(e.target.value))
                          }
                          className="w-full rounded-xl border border-[#E2E0D8] bg-white px-2.5 py-1.5 text-[#141413] tabular-nums focus:outline-none"
                        >
                          {[13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                            <option key={h} value={h}>
                              {String(h).padStart(2, "0")}:00
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                        Duration
                      </label>
                      <div className="flex rounded-xl border border-[#E2E0D8] bg-white p-0.5 font-mono text-xs tabular-nums">
                        {[15, 30, 45, 60].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setManualDuration(m)}
                            className={`flex-1 rounded-lg py-1 transition cursor-pointer ${
                              manualDuration === m
                                ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                                : "text-[#575550] hover:text-[#141413]"
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Timezone */}
                    <div>
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-1.5">
                        Timezone
                      </label>
                      <select
                        aria-label="Manual Timezone"
                        value={viewerTimezone}
                        onChange={(e) => handleChangeTimezone(e.target.value)}
                        className="w-full rounded-xl border border-[#E2E0D8] bg-white px-2.5 py-1.5 font-mono text-xs text-[#141413] tabular-nums focus:outline-none"
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
              )}

              {/* Bottom Action Bar Inside the Creation Card */}
              <div className="flex items-center justify-between border-t border-[#E2E0D8] bg-[#F2F0E9] px-5 py-3">
                <button
                  type="button"
                  onClick={handleToggleManualMode}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-medium transition cursor-pointer ${
                    manualMode
                      ? "border-[#141413] bg-[#141413] text-[#F6F5F2]"
                      : "border-[#D8D5CB] bg-white text-[#141413] hover:bg-[#FAF9F6]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>{manualMode ? "Use textbox" : "Set manually"}</span>
                </button>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#141413] px-5 py-2 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
                >
                  <span>Create poll</span>
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Spacer to keep Creation Box centered on First Sight */}
        <div className="relative z-10 h-10" />
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

          <div className="space-y-2.5">
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
                  className="flex flex-col gap-3 rounded-2xl border border-[#E2E0D8] bg-white p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between hover:border-[#C9C6BC] transition"
                >
                  {/* Left: Status + Title + Meta */}
                  <div
                    onClick={() => {
                      setActiveSlug(p.slug);
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
                      <span className="font-medium text-sm sm:text-base text-[#141413] truncate">
                        {p.title}
                      </span>
                      <span className="font-mono text-xs text-[#8A8780] tabular-nums">
                        · {p.durationMinutes}m
                      </span>
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
                            at {topStartDisp.timeLabel} (
                            {topWin.totalAttendingCount}/
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E0D8] bg-[#FAF9F6] px-3 py-2 text-xs text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
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
                        setViewMode("poll");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#141413] px-3.5 py-2 text-xs font-medium text-[#F6F5F2] hover:bg-[#292927] transition"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>

                    {polls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeletePoll(p.id)}
                        className="rounded-xl border border-[#E2E0D8] bg-white p-2 text-[#8A8780] hover:border-rose-300 hover:text-rose-600 transition cursor-pointer"
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
