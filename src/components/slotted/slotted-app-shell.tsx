"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Command,
  CornerDownLeft,
  Sparkles,
  Wand2,
  ArrowDown,
  RotateCcw,
} from "lucide-react";
import {
  AtmosphereTheme,
  BrushMode,
  INITIAL_POLLS,
  PollData,
  parseNaturalLanguagePoll,
} from "@/lib/slotted-data";
import { PollWorkspace } from "./poll-workspace";
import { ArcCommandModal } from "./arc-command-modal";
import { EditorialBentoAndComparison } from "./editorial-bento";

const STORAGE_KEY_POLLS = "slotted_prototype_polls_v2";
const STORAGE_KEY_GUEST = "slotted_prototype_guest_v2";
const STORAGE_KEY_ATMOSPHERE = "slotted_prototype_atmosphere_v2";

interface SlottedAppShellProps {
  initialSlug?: string;
  initialViewMode?: "landing" | "poll";
  initialLocked?: boolean;
}

export function SlottedAppShell({
  initialSlug,
  initialViewMode = "landing",
  initialLocked = false,
}: SlottedAppShellProps) {
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
  const [atmosphere, setAtmosphere] = useState<AtmosphereTheme>("linen");
  const [guestName, setGuestName] = useState<string>("Alex");
  const [viewerTimezone, setViewerTimezone] =
    useState<string>("America/New_York");
  const [activeBrush, setActiveBrush] = useState<BrushMode>("available");
  const [commandModalOpen, setCommandModalOpen] = useState<boolean>(false);

  // Hero Natural-Language Quick-Create input state
  const [heroInput, setHeroInput] = useState<string>(
    "Series A Partner Sync next Tue-Thu 9am-4pm 60m"
  );

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const savedPolls = localStorage.getItem(STORAGE_KEY_POLLS);
      if (savedPolls) {
        const parsed = JSON.parse(savedPolls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPolls(parsed);
        }
      }
      const savedGuest = localStorage.getItem(STORAGE_KEY_GUEST);
      if (savedGuest) {
        setGuestName(savedGuest);
      }
      const savedAtmo = localStorage.getItem(
        STORAGE_KEY_ATMOSPHERE
      ) as AtmosphereTheme | null;
      if (
        savedAtmo &&
        ["linen", "emerald", "sunset", "slate"].includes(savedAtmo)
      ) {
        setAtmosphere(savedAtmo);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, []);

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

  const handleCreatePoll = (newPoll: PollData) => {
    setPolls((prev) => {
      const next = [newPoll, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY_POLLS, JSON.stringify(next));
      } catch {}
      return next;
    });
    setActiveSlug(newPoll.slug);
  };

  const handleChangeGuestName = (name: string) => {
    setGuestName(name);
    try {
      localStorage.setItem(STORAGE_KEY_GUEST, name);
    } catch {}
  };

  const handleChangeAtmosphere = (nextTheme: AtmosphereTheme) => {
    setAtmosphere(nextTheme);
    try {
      localStorage.setItem(STORAGE_KEY_ATMOSPHERE, nextTheme);
    } catch {}
  };

  const handleResetDemoState = () => {
    setPolls(INITIAL_POLLS);
    setActiveSlug(INITIAL_POLLS[0].slug);
    setAtmosphere("linen");
    try {
      localStorage.removeItem(STORAGE_KEY_POLLS);
    } catch {}
  };

  const heroParsed = useMemo(
    () => parseNaturalLanguagePoll(heroInput),
    [heroInput]
  );

  const handleHeroInstantCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const slugBase = heroParsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28);
    const slug = `${slugBase || "team-sync"}-${Math.floor(100 + Math.random() * 899)}`;
    const dates = heroParsed.candidateDates;
    const d0 = dates[0];
    const d1 = dates[1] || dates[0];

    const created: PollData = {
      id: `pol_${Date.now().toString(36)}`,
      slug,
      title: heroParsed.title,
      description: `${heroParsed.timeRangeLabel} · ${heroParsed.durationMinutes}m`,
      themeTint: atmosphere,
      hostName: guestName || "Alex",
      timezone: viewerTimezone,
      candidateDates: dates,
      dayStartHour: heroParsed.dayStartHour,
      dayEndHour: heroParsed.dayEndHour,
      slotMinutes: 30,
      durationMinutes: heroParsed.durationMinutes,
      status: "OPEN",
      lockedLocation: "meet.slotted.app/instant",
      reactions: [
        { emoji: "🔥", label: "Locked in", count: 3, userReacted: true },
        { emoji: "👍", label: "Ready", count: 4, userReacted: false },
        { emoji: "☕", label: "Coffee", count: 2, userReacted: false },
      ],
      participants: [
        {
          id: "p_hero_elena",
          guestSessionId: "slt_elena",
          name: "Elena",
          role: "Partner",
          city: "SF",
          timezone: "America/Los_Angeles",
          avatarColor: "#059669",
          slots: {
            [`${d0}T10:00`]: "available",
            [`${d0}T10:30`]: "available",
            [`${d1}T10:00`]: "available",
            [`${d1}T10:30`]: "available",
            [`${d1}T11:00`]: "available",
            [`${d1}T11:30`]: "available",
          },
        },
        {
          id: "p_hero_marcus",
          guestSessionId: "slt_marcus",
          name: "Marcus",
          role: "Founder",
          city: "NYC",
          timezone: "America/New_York",
          avatarColor: "#141413",
          slots: {
            [`${d0}T10:00`]: "available",
            [`${d0}T10:30`]: "available",
            [`${d1}T10:00`]: "available",
            [`${d1}T10:30`]: "available",
            [`${d1}T11:00`]: "available",
            [`${d1}T14:00`]: "if_needed",
            [`${d1}T14:30`]: "if_needed",
          },
        },
        {
          id: "p_hero_you",
          guestSessionId: "slt_guest_local",
          name: guestName || "Alex",
          role: "You",
          city: "NYC",
          timezone: viewerTimezone,
          avatarColor: "#10B981",
          isCurrentUser: true,
          slots: {
            [`${d0}T10:00`]: "available",
            [`${d0}T10:30`]: "available",
            [`${d1}T10:00`]: "available",
            [`${d1}T10:30`]: "available",
            [`${d1}T11:00`]: "available",
          },
        },
      ],
    };

    handleCreatePoll(created);
    const el = document.getElementById("live-poll-workspace");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Dynamic outer frame state
  const frameState =
    activePoll.status === "LOCKED"
      ? "locked"
      : activeBrush === "if_needed"
      ? "flex"
      : "polling";

  return (
    <div
      className="arc-viewport-shell"
      data-atmosphere={atmosphere}
      data-state={frameState}
    >
      <div className="arc-inner-canvas flex flex-col justify-between">
        {/* =========================================================
            STICKY LIQUID GLASS NAVBAR (h-14)
           ========================================================= */}
        <header className="liquid-glass sticky top-2 z-40 mx-2 sm:mx-4 mt-2 rounded-full px-3.5 sm:px-5 h-14 flex items-center justify-between gap-2">
          {/* Left: Logomark + Wordmark + Theme Dot Picker */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-2 group"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#141413] text-[#F7F6F2] shadow-2xs">
                <span className="flex gap-0.5">
                  <span className="h-3.5 w-1 rounded-full bg-emerald-400" />
                  <span className="h-3.5 w-1 translate-y-0.5 rounded-full bg-[#F7F6F2]" />
                </span>
              </span>
              <span className="text-base font-medium tracking-[-0.03em] text-[#141413]">
                Slotted
              </span>
            </Link>

            <span className="hidden sm:inline-block h-4 w-[1px] bg-[#E4E1DA]" />

            {/* Theme Dot Picker */}
            <div
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E4E1DA] bg-white/80 px-2.5 py-1"
              title="Theme"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#8A8780] mr-0.5">
                Theme
              </span>
              {(
                [
                  { id: "linen", label: "Linen", color: "#DFDAD0" },
                  { id: "emerald", label: "Mint", color: "#6EE7B7" },
                  { id: "sunset", label: "Clay", color: "#F5B8A6" },
                  { id: "slate", label: "Slate", color: "#94A3B8" },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`Theme ${t.label}`}
                  onClick={() => handleChangeAtmosphere(t.id)}
                  className={`h-3.5 w-3.5 rounded-full transition-transform cursor-pointer ${
                    atmosphere === t.id
                      ? "scale-115 ring-2 ring-[#141413] ring-offset-1"
                      : "opacity-75 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: t.color }}
                  title={t.label}
                />
              ))}
            </div>
          </div>

          {/* Center: Canonical Nav Links */}
          <div className="flex items-center gap-1 rounded-full border border-[#E4E1DA] bg-[#EFECE6]/80 p-1">
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition cursor-pointer ${
                viewMode === "landing"
                  ? "bg-white text-[#141413] font-medium shadow-2xs"
                  : "text-[#575551] hover:text-[#141413]"
              }`}
            >
              Live poll
            </button>
            <a
              href="#how-it-works"
              onClick={() => setViewMode("landing")}
              className="hidden md:inline-flex items-center rounded-full px-3 py-1 font-mono text-[11px] text-[#575551] hover:text-[#141413] transition cursor-pointer"
            >
              How it works
            </a>
            <button
              type="button"
              onClick={() => setViewMode("poll")}
              className={`rounded-full px-3 py-1 font-mono text-[11px] transition cursor-pointer ${
                viewMode === "poll"
                  ? "bg-white text-[#141413] font-medium shadow-2xs"
                  : "text-[#575551] hover:text-[#141413]"
              }`}
            >
              My polls
            </button>
          </div>

          {/* Right: ⌘K Trigger & New poll CTA */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandModalOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#CFCBC2] bg-white px-3 py-1.5 font-mono text-xs text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
            >
              <Command className="h-3.5 w-3.5 text-[#575551]" />
              <span>⌘K</span>
            </button>

            <button
              type="button"
              onClick={() => setCommandModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-3.5 py-1.5 text-xs font-medium text-[#F7F6F2] shadow-2xs hover:bg-[#2a2a28] transition cursor-pointer"
            >
              <span>New poll</span>
            </button>
          </div>
        </header>

        {/* =========================================================
            ARCHITECTURAL GUIDE RAILS CONTAINER
           ========================================================= */}
        <main className="mx-auto w-full max-w-[1320px] flex-1 border-x border-[#E4E1DA]/80">
          {/* EDITORIAL HERO SECTION */}
          {viewMode === "landing" && (
            <section className="relative border-b border-[#E4E1DA] px-4 pt-10 pb-9 sm:px-8 sm:pt-12">
              {/* Architectural + Crosshair Markers at Bottom Corners */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 left-3 font-mono text-xs text-[#8A8780]"
              >
                +
              </span>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 right-3 font-mono text-xs text-[#8A8780]"
              >
                +
              </span>

              <div className="mx-auto max-w-3xl text-center">
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E1DA] bg-[#EFECE6]/90 px-3.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="font-mono text-[11px] font-medium tracking-wide text-[#575551]">
                    Group scheduling
                  </span>
                </div>

                {/* Display Hero Headline: Scale Without Weight (400 Regular, -0.045em) + Instrument Serif Italic */}
                <h1 className="mt-4 text-[40px] sm:text-[64px] md:text-[68px] font-normal leading-[1.02] tracking-[-0.045em] text-[#141413]">
                  Find the hour everyone can{" "}
                  <span className="font-serif italic font-normal text-emerald-800">
                    actually
                  </span>{" "}
                  make.
                </h1>

                <p className="mx-auto mt-3.5 max-w-xl text-base sm:text-lg leading-[1.5] tracking-[-0.01em] text-[#575551]">
                  Pick a few days, send one link, and watch the overlap appear.
                </p>

                {/* Instant Natural-Language Quick-Create Bar right in the Hero */}
                <form
                  onSubmit={handleHeroInstantCreate}
                  className="mx-auto mt-6 max-w-2xl rounded-[20px] border border-[#CFCBC2] bg-white p-2 shadow-sm transition focus-within:border-[#141413]"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2.5 px-3 py-1.5">
                      <Wand2 className="h-4 w-4 shrink-0 text-emerald-600" />
                      <input
                        type="text"
                        aria-label="Quick-create poll prompt"
                        value={heroInput}
                        onChange={(e) => setHeroInput(e.target.value)}
                        placeholder="Team dinner next Tue–Thu evening..."
                        className="w-full bg-transparent text-sm text-[#141413] placeholder:text-[#8A8780] focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#141413] px-5 py-2.5 text-xs font-medium text-[#F7F6F2] transition hover:bg-emerald-700 cursor-pointer shrink-0"
                    >
                      <span>Create poll</span>
                      <CornerDownLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Live Parsed Token Chips */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E1DA]/80 px-3 pt-2 text-left">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 border border-emerald-600/25 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-950">
                        <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
                        {heroParsed.title}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EFECE6] px-2 py-0.5 font-mono text-[11px] text-[#141413]">
                        <Calendar className="h-2.5 w-2.5 text-[#575551]" />
                        {heroParsed.dateLabels.join(", ")}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EFECE6] px-2 py-0.5 font-mono text-[11px] text-[#141413] tabular-nums">
                        <Clock className="h-2.5 w-2.5 text-[#575551]" />
                        {heroParsed.timeRangeLabel} · {heroParsed.durationMinutes}m
                      </span>
                    </div>

                    <a
                      href="#live-poll-workspace"
                      className="inline-flex items-center gap-1 font-mono text-[11px] text-[#575551] hover:text-[#141413]"
                    >
                      <span>Try the live grid below</span>
                      <ArrowDown className="h-3 w-3" />
                    </a>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* =========================================================
              EMBEDDED LIVE MULTI-PARTICIPANT POLL WORKSPACE
             ========================================================= */}
          <section
            id="live-poll-workspace"
            className="px-2 pt-5 pb-8 sm:px-6 sm:pt-7"
          >
            {/* Pre-Seeded Poll Switcher Tabs & Reset Button */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {polls.map((p) => {
                  const isSelected = p.slug === activePoll.slug;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveSlug(p.slug)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] transition cursor-pointer ${
                        isSelected
                          ? "bg-[#141413] text-[#F7F6F2] font-medium shadow-2xs"
                          : "border border-[#E4E1DA] bg-white text-[#575551] hover:text-[#141413]"
                      }`}
                    >
                      <span>{p.title}</span>
                      {p.status === "LOCKED" && (
                        <span className="rounded-full bg-emerald-400/20 px-1.5 text-[9px] text-emerald-300">
                          Locked
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/p/${activePoll.slug}`}
                  className="font-mono text-[11px] text-[#575551] underline decoration-[#CFCBC2] underline-offset-2 hover:text-[#141413]"
                >
                  `/p/{activePoll.slug}` →
                </Link>
                <button
                  type="button"
                  onClick={handleResetDemoState}
                  className="inline-flex items-center gap-1 rounded-full border border-[#E4E1DA] bg-white px-2.5 py-1 font-mono text-[10px] text-[#575551] hover:text-[#141413] transition cursor-pointer"
                  title="Reset demo polls"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Interactive Poll Workspace Component */}
            <PollWorkspace
              poll={activePoll}
              onUpdatePoll={handleUpdatePoll}
              guestName={guestName}
              onChangeGuestName={handleChangeGuestName}
              viewerTimezone={viewerTimezone}
              onChangeViewerTimezone={setViewerTimezone}
              activeBrush={activeBrush}
              onChangeBrush={setActiveBrush}
            />
          </section>

          {/* EDITORIAL BENTO GRID & CLOSING SECTION */}
          {viewMode === "landing" && (
            <EditorialBentoAndComparison
              onOpenCommandBar={() => setCommandModalOpen(true)}
              onTriggerLockDemo={() => {
                handleUpdatePoll({
                  ...activePoll,
                  status: "LOCKED",
                });
                const el = document.getElementById("live-poll-workspace");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
          )}
        </main>

        {/* =========================================================
            ARCHITECTURAL FOOTER WITH KEYBOARD SHORTCUT STRIP
           ========================================================= */}
        <footer className="border-t border-[#E4E1DA] bg-[#EFECE6]/60 px-4 py-7 sm:px-8">
          <div className="mx-auto flex max-w-[1320px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-base font-medium tracking-[-0.03em] text-[#141413]">
                Slotted
              </span>
              <span className="text-xs text-[#8A8780]">·</span>
              <span className="text-xs text-[#575551]">
                Pick a few days, send one link, and watch the overlap appear.
              </span>
            </div>

            {/* Keyboard Shortcut Strip */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-[#575551]">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[#CFCBC2] bg-white px-1.5 py-0.5 text-[10px] text-[#141413]">
                  ⌘K
                </kbd>
                New poll
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[#CFCBC2] bg-white px-1.5 py-0.5 text-[10px] text-[#141413]">
                  1
                </kbd>
                Free
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[#CFCBC2] bg-white px-1.5 py-0.5 text-[10px] text-[#141413]">
                  2
                </kbd>
                If needed
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border border-[#CFCBC2] bg-white px-1.5 py-0.5 text-[10px] text-[#141413]">
                  3
                </kbd>
                Erase
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Command Modal (⌘K) */}
      <ArcCommandModal
        open={commandModalOpen}
        onClose={() => setCommandModalOpen(false)}
        polls={polls}
        activePollSlug={activePoll.slug}
        onSelectPoll={(slug) => setActiveSlug(slug)}
        onCreatePoll={handleCreatePoll}
        atmosphere={atmosphere}
        onChangeAtmosphere={handleChangeAtmosphere}
      />
    </div>
  );
}
