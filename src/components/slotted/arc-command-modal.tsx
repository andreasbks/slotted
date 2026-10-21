"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  Command,
  CornerDownLeft,
  Sparkles,
  Wand2,
  X,
  ArrowRight,
  Globe,
} from "lucide-react";
import {
  AtmosphereTheme,
  PollData,
  parseNaturalLanguagePoll,
} from "@/lib/slotted-data";

interface ArcCommandModalProps {
  open: boolean;
  onClose: () => void;
  polls: PollData[];
  activePollSlug: string;
  onSelectPoll: (slug: string) => void;
  onCreatePoll: (newPoll: PollData) => void;
  atmosphere: AtmosphereTheme;
  onChangeAtmosphere: (theme: AtmosphereTheme) => void;
}

const CANDIDATE_MINI_DATES = [
  { iso: "2026-10-26", label: "Mon 26" },
  { iso: "2026-10-27", label: "Tue 27" },
  { iso: "2026-10-28", label: "Wed 28" },
  { iso: "2026-10-29", label: "Thu 29" },
  { iso: "2026-10-30", label: "Fri 30" },
  { iso: "2026-11-02", label: "Mon 02" },
  { iso: "2026-11-03", label: "Tue 03" },
  { iso: "2026-11-04", label: "Wed 04" },
];

export function ArcCommandModal({
  open,
  onClose,
  polls,
  activePollSlug,
  onSelectPoll,
  onCreatePoll,
  atmosphere,
  onChangeAtmosphere,
}: ArcCommandModalProps) {
  const [query, setQuery] = useState(
    "Design Review next Tue-Thu 10am-4pm 45m"
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
  ]);
  const [duration, setDuration] = useState<number>(60);
  const [hostName, setHostName] = useState("Alex");

  const parsed = parseNaturalLanguagePoll(query);

  useEffect(() => {
    setDuration(parsed.durationMinutes);
  }, [parsed.durationMinutes]);

  const toggleDate = (iso: string) => {
    setSelectedDates((prev) =>
      prev.includes(iso)
        ? prev.length > 1
          ? prev.filter((d) => d !== iso)
          : prev
        : [...prev, iso].sort()
    );
  };

  const handleInstantCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const slugBase = parsed.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 28);
    const slug = `${slugBase || "quick-sync"}-${Math.floor(100 + Math.random() * 899)}`;
    const datesToUse =
      selectedDates.length > 0 ? selectedDates : parsed.candidateDates;

    const firstDate = datesToUse[0];
    const secondDate = datesToUse[1] || datesToUse[0];

    const newPoll: PollData = {
      id: `pol_${Date.now().toString(36)}`,
      slug,
      title: parsed.title,
      description: `${duration}m session across ${datesToUse.length} days.`,
      themeTint: atmosphere,
      hostName: hostName || "Alex",
      timezone: "America/New_York",
      candidateDates: datesToUse,
      dayStartHour: parsed.dayStartHour,
      dayEndHour: parsed.dayEndHour,
      slotMinutes: 30,
      durationMinutes: duration,
      status: "OPEN",
      lockedLocation: "meet.slotted.app/instant",
      reactions: [
        { emoji: "🔥", label: "Locked in", count: 2, userReacted: true },
        { emoji: "👍", label: "Works", count: 3, userReacted: false },
        { emoji: "☕", label: "Coffee", count: 1, userReacted: false },
      ],
      participants: [
        {
          id: "p_host_alex",
          guestSessionId: "slt_guest_local",
          name: hostName || "Alex",
          role: "You",
          city: "NYC",
          timezone: "America/New_York",
          avatarColor: "#10B981",
          isCurrentUser: true,
          slots: {
            [`${firstDate}T10:00`]: "available",
            [`${firstDate}T10:30`]: "available",
            [`${firstDate}T11:00`]: "available",
            [`${secondDate}T10:00`]: "available",
            [`${secondDate}T10:30`]: "available",
            [`${secondDate}T11:00`]: "available",
            [`${secondDate}T14:00`]: "if_needed",
            [`${secondDate}T14:30`]: "if_needed",
          },
        },
        {
          id: "p_teammate_elena",
          guestSessionId: "slt_elena",
          name: "Elena",
          role: "Design",
          city: "SF",
          timezone: "America/Los_Angeles",
          avatarColor: "#059669",
          slots: {
            [`${firstDate}T10:00`]: "available",
            [`${firstDate}T10:30`]: "available",
            [`${secondDate}T10:00`]: "available",
            [`${secondDate}T10:30`]: "available",
            [`${secondDate}T11:00`]: "available",
            [`${secondDate}T14:00`]: "available",
            [`${secondDate}T14:30`]: "available",
          },
        },
        {
          id: "p_teammate_sora",
          guestSessionId: "slt_sora",
          name: "Sora",
          role: "Engineering",
          city: "London",
          timezone: "Europe/London",
          avatarColor: "#D97706",
          slots: {
            [`${firstDate}T10:00`]: "if_needed",
            [`${firstDate}T10:30`]: "if_needed",
            [`${secondDate}T10:00`]: "available",
            [`${secondDate}T10:30`]: "available",
            [`${secondDate}T11:00`]: "available",
          },
        },
      ],
    };

    onCreatePoll(newPoll);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#141413]/35 backdrop-blur-xs"
          />

          {/* Centered Dark Liquid Glass Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.75 }}
            className="liquid-glass-dark relative z-10 w-full max-w-2xl rounded-[22px] p-5 sm:p-6 text-[#F7F6F2] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                  <Command className="h-3.5 w-3.5" />
                </span>
                <span className="font-mono text-xs uppercase tracking-wider text-white/80">
                  NEW POLL · ⌘K
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white transition cursor-pointer"
                aria-label="Close Command Bar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Natural Language Input Form */}
            <form onSubmit={handleInstantCreate} className="mt-4 space-y-4">
              <div className="relative">
                <Wand2 className="absolute left-3.5 top-3.5 h-4 w-4 text-emerald-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Series A Partner Sync next Tue-Thu 9am-5pm 45m..."
                  className="w-full rounded-xl border border-white/15 bg-white/[0.07] pl-10 pr-24 py-3 text-sm sm:text-base text-white placeholder:text-white/40 focus:border-emerald-400/60 focus:outline-none"
                  autoFocus
                />
                <span className="absolute right-3 top-3 hidden sm:inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-mono text-[10px] text-white/70">
                  ↵ Create
                </span>
              </div>

              {/* Live Parsed Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  PARSED:
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 font-mono text-[11px] text-emerald-200">
                  <Sparkles className="h-3 w-3" />
                  {parsed.title}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-white/85">
                  <Calendar className="h-3 w-3 text-amber-300" />
                  {selectedDates.length} days
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-white/85 tabular-nums">
                  <Clock className="h-3 w-3 text-sky-300" />
                  {parsed.timeRangeLabel}
                </span>
              </div>

              {/* Interactive Date Pills & Duration */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 rounded-xl border border-white/10 bg-black/25 p-3.5">
                <div className="sm:col-span-8">
                  <label className="block font-mono text-[10px] uppercase tracking-wider text-white/55 mb-2">
                    DATES
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CANDIDATE_MINI_DATES.map((d) => {
                      const active = selectedDates.includes(d.iso);
                      return (
                        <button
                          key={d.iso}
                          type="button"
                          onClick={() => toggleDate(d.iso)}
                          className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition cursor-pointer ${
                            active
                              ? "bg-emerald-500 text-[#141413] font-semibold shadow-xs"
                              : "bg-white/8 text-white/65 hover:bg-white/15"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-4 flex flex-col justify-between">
                  <div>
                    <label className="block font-mono text-[10px] uppercase tracking-wider text-white/55 mb-2">
                      DURATION &amp; HOST
                    </label>
                    <div className="flex gap-1">
                      {[30, 45, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setDuration(m)}
                          className={`flex-1 rounded-lg py-1 font-mono text-[11px] tabular-nums transition cursor-pointer ${
                            duration === m
                              ? "bg-white text-[#141413] font-semibold"
                              : "bg-white/8 text-white/65 hover:bg-white/15"
                          }`}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2">
                    <input
                      type="text"
                      value={hostName}
                      onChange={(e) => setHostName(e.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-white/15 bg-white/8 px-2.5 py-1 text-xs text-white placeholder:text-white/40 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Atmosphere Swatch & Submit */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">
                    AURA:
                  </span>
                  {(
                    [
                      { id: "linen", label: "Warm Paper", color: "#E5E0D5" },
                      { id: "emerald", label: "Sage Glass", color: "#A7F3D0" },
                      { id: "sunset", label: "Warm Clay", color: "#F5D0C5" },
                      { id: "slate", label: "Slate", color: "#CBD5E1" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onChangeAtmosphere(t.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] transition cursor-pointer ${
                        atmosphere === t.id
                          ? "bg-white/20 text-white ring-1 ring-white/50"
                          : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2.5 text-xs font-semibold text-[#141413] shadow-md transition hover:bg-emerald-300 cursor-pointer"
                >
                  Create Poll
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Quick Jump to Pre-Seeded Polls */}
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  RECENT POLLS
                </span>
                <span className="font-mono text-[10px] text-white/40 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Live state
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {polls.map((p) => {
                  const isCurrent = p.slug === activePollSlug;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        onSelectPoll(p.slug);
                        onClose();
                      }}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition cursor-pointer ${
                        isCurrent
                          ? "border-emerald-400/50 bg-emerald-500/15"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-medium text-white">
                          {p.title}
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-white/50" />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-white/55 tabular-nums">
                        <span>{p.participants.length} people</span>
                        <span>{p.status === "LOCKED" ? "★ LOCKED" : `${p.durationMinutes}m`}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
