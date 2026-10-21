"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MapPin,
  Unlock,
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
  onToggleReaction?: (emoji: string) => void;
}

export function ArcEaselTicket({
  poll,
  lockedWindow,
  viewerTimezone,
  onUnlock,
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

  const handleCopyInviteLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${poll.slug}?locked=1`
        : `https://slotted.app/p/${poll.slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
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
    setTimeout(() => setDownloadedIcs(false), 2000);
  };

  const googleCalendarUrl = (() => {
    const [y, m, d] = lockedWindow.date.split("-");
    const sH = String(Math.floor(lockedWindow.startTimeMinutes / 60)).padStart(
      2,
      "0"
    );
    const sM = String(lockedWindow.startTimeMinutes % 60).padStart(2, "0");
    const eH = String(Math.floor(lockedWindow.endTimeMinutes / 60)).padStart(
      2,
      "0"
    );
    const eM = String(lockedWindow.endTimeMinutes % 60).padStart(2, "0");
    const datesParam = `${y}${m}${d}T${sH}${sM}00/${y}${m}${d}T${eH}${eM}00`;
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: poll.title,
      dates: datesParam,
      details: `${poll.description} (${lockedWindow.totalAttendingCount}/${lockedWindow.totalParticipants} attending)`,
      location: poll.lockedLocation || "Video call",
      ctz: poll.timezone,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-2xl border border-[#E2E0D8] bg-white">
        {/* Flat Technical Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E0D8] bg-[#FAF9F6] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              LOCKED
            </span>
            <span className="font-mono text-xs text-[#575550]">
              #{poll.id.slice(-6).toUpperCase()} · {poll.durationMinutes}m calendar hold
            </span>
          </div>

          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E0D8] bg-white px-2.5 py-1 font-mono text-xs text-[#575550] hover:border-[#141413] hover:text-[#141413] transition cursor-pointer"
          >
            <Unlock className="h-3 w-3" />
            Unlock to edit
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 divide-y md:grid-cols-12 md:divide-y-0 md:divide-x divide-[#E2E0D8]">
          {/* Left 7 Cols: Event Details & Local Times */}
          <div className="md:col-span-7 p-5 sm:p-6 space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#141413]">
                {poll.title}
              </h2>
              {poll.description && (
                <p className="mt-1 text-sm text-[#575550]">{poll.description}</p>
              )}
            </div>

            {/* Confirmed Time Block */}
            <div className="rounded-md border border-emerald-600/40 bg-emerald-500/[0.06] p-4">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#575550]">
                <span className="font-semibold uppercase text-emerald-900">
                  CONFIRMED SLOT
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Globe className="h-3 w-3 text-emerald-700" />
                  {tzOption.shortCode} ({tzOption.utcLabel})
                </span>
              </div>

              <div className="mt-1.5 font-mono text-lg sm:text-xl font-semibold text-[#141413] tabular-nums">
                {dateHeader.weekdayLong}, {dateHeader.monthShort}{" "}
                {dateHeader.dayNum} · {startDisp.timeLabel} – {endDisp.timeLabel}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[#575550]">
                <span className="inline-flex items-center gap-1.5 rounded border border-[#E2E0D8] bg-white px-2 py-0.5 text-[11px] text-[#141413]">
                  <MapPin className="h-3 w-3 text-[#575550]" />
                  {poll.lockedLocation || "meet.slotted.app/room"}
                </span>
              </div>
            </div>

            {/* City Timezone Breakdown */}
            <div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-2">
                PARTICIPANT LOCAL TIMES
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
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-md border border-[#E2E0D8] bg-[#FAF9F6] px-2.5 py-1.5 font-mono text-xs"
                    >
                      <span className="font-medium text-[#141413] truncate">
                        {p.name}{" "}
                        <span className="text-[10px] text-[#8A8780]">
                          {p.city}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#575550] tabular-nums">
                        {localStart.timeLabel}–{localEnd.timeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Roster & Calendar Export */}
          <div className="md:col-span-5 flex flex-col justify-between bg-[#FAF9F6]/60 p-5 sm:p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="uppercase tracking-wider text-[#8A8780]">
                  ATTENDING
                </span>
                <span className="font-semibold text-[#141413] tabular-nums">
                  {lockedWindow.totalAttendingCount}/
                  {lockedWindow.totalParticipants} confirmed
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {lockedWindow.availableParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-[#E2E0D8] bg-white px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600" />
                      <span className="font-medium text-[#141413]">{p.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-emerald-700">
                      Free
                    </span>
                  </div>
                ))}
                {lockedWindow.ifNeededParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-600" />
                      <span className="font-medium text-[#141413]">{p.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-amber-800">
                      If needed
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Export & Share Actions */}
            <div className="space-y-2 pt-2 border-t border-[#E2E0D8]">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#141413] px-4 py-2.5 font-mono text-xs font-medium text-[#F6F5F2] hover:bg-[#292927] transition cursor-pointer"
              >
                {downloadedIcs ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Downloaded .ics
                  </>
                ) : (
                  <>
                    <Download className="h-3.5 w-3.5" />
                    Download .ics
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={googleCalendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E2E0D8] bg-white px-3 py-2 font-mono text-xs font-medium text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
                >
                  Google Cal
                  <ExternalLink className="h-3 w-3 text-[#575550]" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E2E0D8] bg-white px-3 py-2 font-mono text-xs font-medium text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
                >
                  {copiedShare ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#575550]" />
                      Copy link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
