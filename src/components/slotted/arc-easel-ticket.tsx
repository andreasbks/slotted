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
  formatDurationBadge,
  formatMinutesToDisplay,
  generateIcsContent,
} from "@/lib/slotted-data";

interface ArcEaselTicketProps {
  poll: PollData;
  lockedWindow: RankedWindow;
  viewerTimezone: string;
  onUnlock: () => void;
}

export function ArcEaselTicket({
  poll,
  lockedWindow,
  viewerTimezone,
  onUnlock,
}: ArcEaselTicketProps) {
  const [copiedShare, setCopiedShare] = useState(false);
  const [downloadedIcs, setDownloadedIcs] = useState(false);

  const isFullDays =
    poll.pollMode === "full_days" || Boolean(lockedWindow.isFullDaysWindow);
  const dateHeader = formatDateHeader(lockedWindow.date);
  const endDateHeader =
    lockedWindow.endDate && lockedWindow.endDate !== lockedWindow.date
      ? formatDateHeader(lockedWindow.endDate)
      : null;

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
        ? `${window.location.origin}/p/${poll.slug}`
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
      details: `${poll.description || poll.title} (${lockedWindow.totalAttendingCount}/${lockedWindow.totalParticipants} attending)`,
      location: poll.lockedLocation || poll.location || "Video call",
      ctz: poll.timezone,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  })();

  const formattedConfirmedSlot = isFullDays
    ? endDateHeader
      ? `${dateHeader.fullLabel} – ${endDateHeader.fullLabel} · All day`
      : `${dateHeader.weekdayLong}, ${dateHeader.monthShort} ${dateHeader.dayNum} · All day`
    : `${dateHeader.weekdayLong}, ${dateHeader.monthShort} ${dateHeader.dayNum} · ${startDisp.timeLabel} – ${endDisp.timeLabel}`;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-[24px] border border-[#E4E2DA] bg-white">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E2DA] bg-[#FAF9F6] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Time locked
            </span>
            <span className="font-mono text-xs text-[#575550]">
              {formatDurationBadge(poll.durationMinutes, poll.pollMode)} ·{" "}
              {lockedWindow.totalAttendingCount}/
              {lockedWindow.totalParticipants} attending
            </span>
          </div>

          <button
            type="button"
            onClick={onUnlock}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E2DA] bg-white px-3.5 py-1.5 font-mono text-xs font-medium text-[#575550] hover:border-[#141413] hover:text-[#141413] transition cursor-pointer"
          >
            <Unlock className="h-3.5 w-3.5" />
            Reopen poll
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#141413]">
              {poll.title}
            </h2>
            {poll.description && (
              <p className="mt-1.5 text-sm text-[#575550]">{poll.description}</p>
            )}
          </div>

          {/* Selected Date & Time Card */}
          <div className="rounded-2xl border border-emerald-600/35 bg-emerald-500/[0.06] p-5">
            <div className="flex items-center justify-between font-mono text-xs text-[#575550]">
              <span className="font-semibold uppercase tracking-wider text-emerald-900">
                Confirmed calendar slot
              </span>
              {!isFullDays && (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Globe className="h-3.5 w-3.5 text-emerald-700" />
                  {tzOption.shortCode} ({tzOption.utcLabel})
                </span>
              )}
            </div>

            <div className="mt-2 font-mono text-xl sm:text-2xl font-semibold text-[#141413] tabular-nums">
              {formattedConfirmedSlot}
            </div>

            {(poll.lockedLocation || poll.location) && (
              <div className="mt-3 flex items-center gap-2 font-mono text-xs text-[#575550]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E2DA] bg-white px-3 py-1 text-[11px] text-[#141413]">
                  <MapPin className="h-3 w-3 text-[#575550]" />
                  {poll.lockedLocation || poll.location}
                </span>
              </div>
            )}
          </div>

          {/* Attendees & Local Time */}
          <div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A8780] mb-2.5">
              Attendees ({poll.participants.length})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
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
                const isFlex = lockedWindow.ifNeededParticipants.some(
                  (ip) => ip.id === p.id
                );
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3.5 py-2.5 font-mono text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isFlex ? "bg-amber-500" : "bg-emerald-600"
                        }`}
                      />
                      <span className="font-medium text-[#141413] truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-[#8A8780]">
                        {p.city}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#575550] tabular-nums">
                      {isFullDays
                        ? isFlex
                          ? "If needed"
                          : "All day"
                        : `${localStart.timeLabel}–${localEnd.timeLabel}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Calendar Export Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E4E2DA] pt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadIcs}
                className="inline-flex items-center gap-2 rounded-xl bg-[#141413] px-5 py-2.5 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
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

              <a
                href={googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E2DA] bg-white px-4 py-2.5 font-mono text-xs font-medium text-[#141413] hover:bg-[#FAF9F6] transition cursor-pointer"
              >
                Add to Google Calendar
                <ExternalLink className="h-3.5 w-3.5 text-[#575550]" />
              </a>
            </div>

            <button
              type="button"
              onClick={handleCopyInviteLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-4 py-2.5 font-mono text-xs font-medium text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Link copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-[#575550]" />
                  Copy invite link
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
