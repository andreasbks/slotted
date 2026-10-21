"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MapPin,
  Sparkles,
  Unlock,
  Users,
} from "lucide-react";
import {
  PollData,
  RankedWindow,
  TIMEZONE_OPTIONS,
  formatDateHeader,
  formatMinutesToDisplay,
  generateIcsContent,
} from "@/lib/slotted-data";

interface ArcEaselTicketProps {
  poll: PollData;
  lockedWindow: RankedWindow;
  viewerTimezone: string;
  onUnlock: () => void;
  onToggleReaction: (emoji: string) => void;
  onUpdateLocation?: (location: string) => void;
}

export function ArcEaselTicket({
  poll,
  lockedWindow,
  viewerTimezone,
  onUnlock,
  onToggleReaction,
}: ArcEaselTicketProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const [downloadedIcs, setDownloadedIcs] = useState(false);

  const dateHeader = formatDateHeader(lockedWindow.date);
  const startDisp = formatMinutesToDisplay(
    lockedWindow.startTimeMinutes,
    viewerTimezone,
    poll.timezone
  );
  const endDisp = formatMinutesToDisplay(
    lockedWindow.endTimeMinutes,
    viewerTimezone,
    poll.timezone
  );
  const tzOption =
    TIMEZONE_OPTIONS.find((t) => t.id === viewerTimezone) || TIMEZONE_OPTIONS[1];

  const handleCopyEaselLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${poll.slug}?locked=1`
        : `https://slotted.app/p/${poll.slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2200);
  };

  const handleDownloadIcs = () => {
    const ics = generateIcsContent(poll, lockedWindow);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${poll.slug}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedIcs(true);
    setTimeout(() => setDownloadedIcs(false), 2200);
  };

  const googleCalendarUrl = (() => {
    const [y, m, d] = lockedWindow.date.split("-");
    const sH = String(Math.floor(lockedWindow.startTimeMinutes / 60)).padStart(2, "0");
    const sM = String(lockedWindow.startTimeMinutes % 60).padStart(2, "0");
    const eH = String(Math.floor(lockedWindow.endTimeMinutes / 60)).padStart(2, "0");
    const eM = String(lockedWindow.endTimeMinutes % 60).padStart(2, "0");
    const datesParam = `${y}${m}${d}T${sH}${sM}00/${y}${m}${d}T${eH}${eM}00`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: poll.title,
      dates: datesParam,
      details: `${poll.description} — Confirmed via Slotted (${lockedWindow.totalAttendingCount}/${lockedWindow.totalParticipants} attending)`,
      location: poll.lockedLocation || "Video Room",
      ctz: poll.timezone,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  const consensusPercent = Math.round(
    (lockedWindow.totalAttendingCount / Math.max(1, lockedWindow.totalParticipants)) * 100
  );

  return (
    <div className="relative mx-auto w-full max-w-3xl my-2">
      {/* Subtle Emerald Ambient Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-3 rounded-[28px] bg-gradient-to-br from-emerald-400/20 via-emerald-500/5 to-amber-300/10 blur-xl"
      />

      <div className="arc-easel-card relative overflow-hidden p-6 sm:p-8">
        {/* Top Perforated Ticket Notch & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E1DA] pb-5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <CalendarCheck2 className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-emerald-800">
                  CONFIRMED INVITE · #{poll.id.slice(-4).toUpperCase()}
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-600/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-900">
                  READY
                </span>
              </div>
              <p className="text-xs text-[#575551]">
                Hosted by <span className="font-medium text-[#141413]">{poll.hostName}</span> · Times shown in each attendee&apos;s city
              </p>
            </div>
          </div>

          {/* Tactile Rotated Editorial Wax/Ink Stamp */}
          <div className="-rotate-3 select-none rounded-xl border-2 border-emerald-700/80 bg-emerald-50/95 px-3.5 py-1.5 shadow-xs transition-transform">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-900">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              LOCKED · {consensusPercent}% MATCH
            </div>
          </div>
        </div>

        {/* Main Ticket Body */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left 7 Cols: Title, Date/Time Hero, Location */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <h3 className="text-2xl sm:text-3xl font-normal tracking-[-0.035em] text-[#141413]">
                {poll.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#575551]">
                {poll.description}
              </p>
            </div>

            {/* Highlighted Time Box */}
            <div className="rounded-2xl border border-emerald-600/25 bg-emerald-500/[0.07] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-900 font-medium">
                  SELECTED TIME
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#575551] tabular-nums">
                  <Globe className="h-3 w-3 text-emerald-700" />
                  {tzOption.shortCode} ({tzOption.utcLabel})
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-serif italic text-2xl sm:text-3xl text-[#141413]">
                  {dateHeader.weekdayLong}, {dateHeader.monthShort} {dateHeader.dayNum}
                </span>
                <span className="font-mono text-lg sm:text-xl font-semibold text-emerald-950 tabular-nums">
                  {startDisp.timeLabel} – {endDisp.timeLabel}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-[#575551]">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] text-[#141413] border border-[#E4E1DA]">
                  <MapPin className="h-3 w-3 text-emerald-700" />
                  {poll.lockedLocation || "meet.slotted.app/room"}
                </span>
                <span className="font-mono text-[11px] text-emerald-800 font-medium tabular-nums">
                  {poll.durationMinutes}m
                </span>
              </div>
            </div>

            {/* Local Times Across Every Participant's City */}
            <div className="rounded-xl border border-[#E4E1DA] bg-[#F7F6F2]/80 p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#8A8780] mb-2">
                LOCAL TIME BY CITY
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {poll.participants.map((p) => {
                  const localStart = formatMinutesToDisplay(
                    lockedWindow.startTimeMinutes,
                    p.timezone,
                    poll.timezone,
                    true
                  );
                  const localEnd = formatMinutesToDisplay(
                    lockedWindow.endTimeMinutes,
                    p.timezone,
                    poll.timezone,
                    true
                  );
                  const isIfNeeded = lockedWindow.ifNeededParticipants.some(
                    (ip) => ip.id === p.id
                  );
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 border border-[#E4E1DA]/80 text-xs"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: p.avatarColor }}
                        />
                        <span className="font-medium text-[#141413] truncate">
                          {p.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#8A8780]">
                          {p.city}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isIfNeeded ? "text-amber-700 font-medium" : "text-[#575551]"
                        }`}
                      >
                        {localStart.timeLabel}–{localEnd.timeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Roster, Reaction Stickers & Calendar Dispatch */}
          <div className="md:col-span-5 flex flex-col justify-between rounded-2xl border border-[#E4E1DA] bg-[#FAF9F5] p-4 sm:p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#575551] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-emerald-700" />
                  ATTENDING
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-800 tabular-nums">
                  {lockedWindow.totalAttendingCount}/{lockedWindow.totalParticipants}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {lockedWindow.availableParticipants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-600/30 px-2.5 py-1 text-xs font-medium text-[#141413]"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.avatarColor }}
                    />
                    {p.name}
                    <Check className="h-3 w-3 text-emerald-700" />
                  </span>
                ))}
                {lockedWindow.ifNeededParticipants.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-600/30 px-2.5 py-1 text-xs font-medium text-amber-950"
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {p.name} (flex)
                  </span>
                ))}
              </div>

              {/* Reaction Stickers */}
              <div className="mt-5 pt-4 border-t border-[#E4E1DA]">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[#8A8780] mb-2">
                  REACTIONS
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {poll.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => onToggleReaction(r.emoji)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono tabular-nums transition-all cursor-pointer active:scale-95 ${
                        r.userReacted
                          ? "bg-[#141413] text-[#F7F6F2] shadow-xs"
                          : "bg-white text-[#575551] border border-[#E4E1DA] hover:border-[#141413]/40"
                      }`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 1-Click Calendar Actions */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadIcs}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#141413] px-3.5 py-2.5 text-xs font-medium text-[#F7F6F2] transition hover:bg-[#292927] cursor-pointer"
                >
                  {downloadedIcs ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      Saved .ics
                    </>
                  ) : (
                    <>
                      <Download className="h-3.5 w-3.5" />
                      Download .ics
                    </>
                  )}
                </button>
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#CFCBC2] bg-white px-3.5 py-2.5 text-xs font-medium text-[#141413] transition hover:bg-[#EFECE6] cursor-pointer"
                >
                  Google Calendar
                  <ExternalLink className="h-3 w-3 text-[#575551]" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyEaselLink}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#E4E1DA] bg-white/80 px-3 py-2 text-xs font-medium text-[#575551] hover:text-[#141413] transition cursor-pointer"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Link Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Invite Link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onUnlock}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-mono text-[11px] text-[#575551] hover:text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
                  title="Reopen availability grid to keep editing"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Unlock to edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
