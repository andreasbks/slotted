"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eraser,
  Eye,
  Globe,
  GripVertical,
  Info,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Star,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  AvailabilityState,
  BrushMode,
  PollData,
  RankedWindow,
  TIMEZONE_OPTIONS,
  computeRankedWindows,
  formatDateHeader,
  formatMinutesToDisplay,
  generateDayTimeSlots,
  makeSlotKey,
  parseSlotKey,
} from "@/lib/slotted-data";
import { ArcEaselTicket } from "./arc-easel-ticket";

interface PollWorkspaceProps {
  poll: PollData;
  onUpdatePoll: (updated: PollData) => void;
  guestName: string;
  onChangeGuestName: (name: string) => void;
  viewerTimezone: string;
  onChangeViewerTimezone: (tz: string) => void;
  activeBrush: BrushMode;
  onChangeBrush: (brush: BrushMode) => void;
}

export function PollWorkspace({
  poll,
  onUpdatePoll,
  guestName,
  onChangeGuestName,
  viewerTimezone,
  onChangeViewerTimezone,
  activeBrush,
  onChangeBrush,
}: PollWorkspaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isolatedParticipantId, setIsolatedParticipantId] = useState<
    string | null
  >(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [inspectedSlotKey, setInspectedSlotKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState(false);

  // Mobile states
  const [mobileDayIdx, setMobileDayIdx] = useState(0);
  const [mobileViewMode, setMobileViewMode] = useState<"1day" | "3day">("1day");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Drag-painting state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartSlot, setDragStartSlot] = useState<string | null>(null);
  const [dragCurrentSlot, setDragCurrentSlot] = useState<string | null>(null);
  const [dragBrushUsed, setDragBrushUsed] = useState<BrushMode>("available");
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null
  );

  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mobileDayIdx >= poll.candidateDates.length) {
      setMobileDayIdx(0);
    }
  }, [poll.candidateDates.length, mobileDayIdx]);

  const rankedWindows = useMemo(() => computeRankedWindows(poll), [poll]);
  const bestWindow: RankedWindow | undefined = rankedWindows[0];

  const activeRankedWindow = useMemo(() => {
    if (selectedWindowId) {
      const found = rankedWindows.find((w) => w.id === selectedWindowId);
      if (found) return found;
    }
    return bestWindow;
  }, [rankedWindows, selectedWindowId, bestWindow]);

  const dayTimes = useMemo(
    () =>
      generateDayTimeSlots(
        poll.dayStartHour,
        poll.dayEndHour,
        poll.slotMinutes
      ),
    [poll.dayStartHour, poll.dayEndHour, poll.slotMinutes]
  );

  const currentUserParticipant = useMemo(() => {
    return (
      poll.participants.find((p) => p.isCurrentUser) ||
      poll.participants[poll.participants.length - 1]
    );
  }, [poll.participants]);

  const applySlotsToCurrentUser = useCallback(
    (slotKeys: string[], mode: BrushMode) => {
      if (!currentUserParticipant) return;
      const updatedParticipants = poll.participants.map((p) => {
        if (p.id !== currentUserParticipant.id) return p;
        const nextSlots = { ...p.slots };
        for (const k of slotKeys) {
          if (mode === "clear") {
            delete nextSlots[k];
          } else {
            nextSlots[k] = mode;
          }
        }
        return {
          ...p,
          name: guestName || p.name,
          slots: nextSlots,
        };
      });

      onUpdatePoll({
        ...poll,
        participants: updatedParticipants,
      });
    },
    [currentUserParticipant, guestName, onUpdatePoll, poll]
  );

  const getRectangularSlotKeys = useCallback(
    (startKey: string, endKey: string): string[] => {
      const [startDate, startTime] = startKey.split("T");
      const [endDate, endTime] = endKey.split("T");
      const d1 = poll.candidateDates.indexOf(startDate);
      const d2 = poll.candidateDates.indexOf(endDate);
      const t1 = dayTimes.indexOf(startTime);
      const t2 = dayTimes.indexOf(endTime);

      if (d1 === -1 || d2 === -1 || t1 === -1 || t2 === -1) {
        return [endKey];
      }

      const minD = Math.min(d1, d2);
      const maxD = Math.max(d1, d2);
      const minT = Math.min(t1, t2);
      const maxT = Math.max(t1, t2);

      const keys: string[] = [];
      for (let d = minD; d <= maxD; d++) {
        for (let t = minT; t <= maxT; t++) {
          keys.push(makeSlotKey(poll.candidateDates[d], dayTimes[t]));
        }
      }
      return keys;
    },
    [poll.candidateDates, dayTimes]
  );

  const previewSlotKeys = useMemo(() => {
    if (!isDragging || !dragStartSlot || !dragCurrentSlot)
      return new Set<string>();
    return new Set(getRectangularSlotKeys(dragStartSlot, dragCurrentSlot));
  }, [isDragging, dragStartSlot, dragCurrentSlot, getRectangularSlotKeys]);

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerUp = () => {
      if (dragStartSlot && dragCurrentSlot) {
        const keys = getRectangularSlotKeys(dragStartSlot, dragCurrentSlot);
        applySlotsToCurrentUser(keys, dragBrushUsed);
      }
      setIsDragging(false);
      setDragStartSlot(null);
      setDragCurrentSlot(null);
      setCursorPos(null);
    };

    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [
    isDragging,
    dragStartSlot,
    dragCurrentSlot,
    dragBrushUsed,
    getRectangularSlotKeys,
    applySlotsToCurrentUser,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "1" || e.key.toLowerCase() === "a") {
        onChangeBrush("available");
      } else if (e.key === "2" || e.key.toLowerCase() === "i") {
        onChangeBrush("if_needed");
      } else if (e.key === "3" || e.key.toLowerCase() === "e") {
        onChangeBrush("clear");
      } else if (e.key.toLowerCase() === "s") {
        setSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChangeBrush]);

  const handleCellPointerDown = (
    slotKey: string,
    e: React.PointerEvent<HTMLElement>
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const currentVal = currentUserParticipant?.slots[slotKey];

    let effectiveBrush: BrushMode = activeBrush;
    if (e.shiftKey) {
      effectiveBrush = "if_needed";
    } else if (activeBrush !== "clear" && currentVal === activeBrush) {
      effectiveBrush = "clear";
    }

    setDragBrushUsed(effectiveBrush);
    setDragStartSlot(slotKey);
    setDragCurrentSlot(slotKey);
    setIsDragging(true);
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleCellPointerEnter = (
    slotKey: string,
    e: React.PointerEvent<HTMLElement>
  ) => {
    if (!isDragging) return;
    setDragCurrentSlot(slotKey);
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleMobileRowTap = (slotKey: string) => {
    const currentVal = currentUserParticipant?.slots[slotKey];
    let nextMode: BrushMode = activeBrush;
    if (currentVal === activeBrush) {
      nextMode = "clear";
    }
    applySlotsToCurrentUser([slotKey], nextMode);
  };

  const handleMobileScrubMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const slotElem = elem?.closest("[data-slot-key]") as HTMLElement | null;
    if (slotElem) {
      const key = slotElem.getAttribute("data-slot-key");
      if (key) {
        setDragCurrentSlot(key);
      }
    }
  };

  const handleLockSlot = (windowToLock?: RankedWindow) => {
    const target = windowToLock || activeRankedWindow;
    if (!target) return;
    onUpdatePoll({
      ...poll,
      status: "LOCKED",
      lockedSlotStart: target.startSlotKey,
      lockedSlotEnd: target.endSlotKey,
    });
    setMobileDrawerOpen(false);
  };

  const handleUnlockPoll = () => {
    onUpdatePoll({
      ...poll,
      status: "OPEN",
    });
  };

  const handleDurationChange = (newDuration: number) => {
    onUpdatePoll({
      ...poll,
      durationMinutes: newDuration,
    });
    setSelectedWindowId(null);
  };

  const handleCopyShareLink = () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${poll.slug}`
        : `https://slotted.app/p/${poll.slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const dragBadgeText = useMemo(() => {
    if (!isDragging || !dragStartSlot || !dragCurrentSlot) return null;
    const keys = getRectangularSlotKeys(dragStartSlot, dragCurrentSlot);
    if (keys.length === 0) return null;
    const first = parseSlotKey(keys[0]);
    const last = parseSlotKey(keys[keys.length - 1]);
    const dateHdr = formatDateHeader(first.date);
    const startDisp = formatMinutesToDisplay(
      first.minutesFromMidnight,
      viewerTimezone,
      poll.timezone,
      true
    );
    const endDisp = formatMinutesToDisplay(
      last.minutesFromMidnight + poll.slotMinutes,
      viewerTimezone,
      poll.timezone,
      true
    );
    const totalHours = ((keys.length * poll.slotMinutes) / 60)
      .toFixed(1)
      .replace(/\.0$/, "");
    return `${dateHdr.weekdayShort} ${startDisp.timeLabel}–${endDisp.timeLabel} (${totalHours}h)`;
  }, [
    isDragging,
    dragStartSlot,
    dragCurrentSlot,
    getRectangularSlotKeys,
    viewerTimezone,
    poll.timezone,
    poll.slotMinutes,
  ]);

  const isolatedParticipant = useMemo(
    () => poll.participants.find((p) => p.id === isolatedParticipantId) || null,
    [poll.participants, isolatedParticipantId]
  );

  const inspectedSlotDetails = useMemo(() => {
    if (!inspectedSlotKey) return null;
    const parsed = parseSlotKey(inspectedSlotKey);
    const dateHdr = formatDateHeader(parsed.date);
    const viewerTime = formatMinutesToDisplay(
      parsed.minutesFromMidnight,
      viewerTimezone,
      poll.timezone
    );
    return {
      slotKey: inspectedSlotKey,
      dateHdr,
      viewerTime,
      minutesFromMidnight: parsed.minutesFromMidnight,
    };
  }, [inspectedSlotKey, viewerTimezone, poll.timezone]);

  const currentTzOption =
    TIMEZONE_OPTIONS.find((t) => t.id === viewerTimezone) || TIMEZONE_OPTIONS[1];

  const getCellMetrics = (slotKey: string) => {
    let availableCount = 0;
    let ifNeededCount = 0;

    for (const p of poll.participants) {
      const isCurrentUser = p.id === currentUserParticipant?.id;
      let state: AvailabilityState | undefined = p.slots[slotKey];

      if (isCurrentUser && previewSlotKeys.has(slotKey)) {
        state = dragBrushUsed === "clear" ? undefined : dragBrushUsed;
      }

      if (state === "available") {
        availableCount++;
      } else if (state === "if_needed") {
        ifNeededCount++;
      }
    }

    const totalParticipants = poll.participants.length;
    const userState: AvailabilityState | undefined = previewSlotKeys.has(
      slotKey
    )
      ? dragBrushUsed === "clear"
        ? undefined
        : dragBrushUsed
      : currentUserParticipant?.slots[slotKey];

    const isInActiveWindow =
      activeRankedWindow?.slotKeys.includes(slotKey) ?? false;
    const isFirstOfActiveWindow =
      activeRankedWindow?.startSlotKey === slotKey;

    const isolatedState = isolatedParticipant
      ? isolatedParticipant.slots[slotKey]
      : null;

    return {
      availableCount,
      ifNeededCount,
      totalAttending: availableCount + ifNeededCount,
      totalParticipants,
      userState,
      isInActiveWindow,
      isFirstOfActiveWindow,
      isolatedState,
    };
  };

  return (
    <div className="relative w-full">
      {/* Floating Cursor Duration Pill while drag-painting on Desktop */}
      {isDragging && dragBadgeText && cursorPos && (
        <div
          style={{
            left: cursorPos.x + 14,
            top: cursorPos.y + 14,
          }}
          className="pointer-events-none fixed z-50 hidden md:flex items-center gap-2 rounded-md border border-[#141413] bg-[#141413] px-2.5 py-1 font-mono text-xs text-[#F6F5F2] tabular-nums"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              dragBrushUsed === "available"
                ? "bg-emerald-400"
                : dragBrushUsed === "if_needed"
                ? "bg-amber-400"
                : "bg-rose-400"
            }`}
          />
          <span>{dragBadgeText}</span>
        </div>
      )}

      {/* Flat Top Poll Control Bar */}
      <div className="rounded-t-2xl border border-[#E2E0D8] bg-[#FAF9F6] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Status Badge + Poll Title + Meta */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${
                poll.status === "LOCKED"
                  ? "bg-emerald-600 text-white"
                  : "bg-[#141413] text-[#F6F5F2]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  poll.status === "LOCKED" ? "bg-white" : "bg-emerald-400"
                }`}
              />
              {poll.status === "LOCKED" ? "LOCKED" : "OPEN"}
            </span>

            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#141413]">
              {poll.title}
            </h1>

            <span className="hidden xl:inline-block font-mono text-xs text-[#8A8780]">
              · {poll.durationMinutes}m · {currentTzOption.shortCode} (
              {currentTzOption.utcLabel})
            </span>
          </div>

          {/* Right: Inline Guest Name, Duration, Timezone, Copy Link, Sidebar Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Guest Name Input */}
            <div className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E0D8] bg-white px-2.5 py-1 font-mono text-xs">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[#8A8780]">name:</span>
              {editingGuestName ? (
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => onChangeGuestName(e.target.value)}
                  onBlur={() => setEditingGuestName(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingGuestName(false);
                  }}
                  className="w-20 border-b border-[#141413] bg-transparent font-medium text-[#141413] focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingGuestName(true)}
                  className="font-semibold text-[#141413] underline decoration-[#C9C6BC] underline-offset-2 hover:decoration-[#141413] cursor-pointer"
                >
                  {guestName || "Alex"}
                </button>
              )}
            </div>

            {/* Duration Switcher */}
            <div className="inline-flex items-center rounded-md border border-[#E2E0D8] bg-[#EFECE6] p-0.5 font-mono text-[11px] tabular-nums">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationChange(mins)}
                  className={`rounded px-2 py-0.5 transition cursor-pointer ${
                    poll.durationMinutes === mins
                      ? "bg-[#141413] text-[#F6F5F2] font-medium"
                      : "text-[#575550] hover:text-[#141413]"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Timezone Selector */}
            <div className="relative inline-flex items-center">
              <Globe className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#575550]" />
              <select
                aria-label="Select Timezone"
                value={viewerTimezone}
                onChange={(e) => onChangeViewerTimezone(e.target.value)}
                className="appearance-none rounded-md border border-[#E2E0D8] bg-white pl-7 pr-6 py-1 font-mono text-[11px] font-medium text-[#141413] tabular-nums hover:border-[#141413] focus:outline-none cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.city} · {tz.shortCode} ({tz.utcLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Copy Link Button */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#E2E0D8] bg-white px-2.5 py-1 font-mono text-[11px] font-medium text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Link copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[#575550]" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="hidden lg:inline-flex items-center justify-center rounded-md border border-[#E2E0D8] bg-white p-1.5 text-[#575550] hover:text-[#141413] transition cursor-pointer"
              title="Toggle sidebar (S)"
            >
              {sidebarOpen ? (
                <PanelRightClose className="h-3.5 w-3.5" />
              ) : (
                <PanelRightOpen className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Poll Body */}
      <div className="rounded-b-2xl border-x border-b border-[#E2E0D8] bg-[#F6F5F2] p-3 sm:p-5">
        {poll.status === "LOCKED" && activeRankedWindow ? (
          <ArcEaselTicket
            poll={poll}
            lockedWindow={activeRankedWindow}
            viewerTimezone={viewerTimezone}
            onUnlock={handleUnlockPoll}
          />
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* Main Time Grid Column */}
            <div className="flex-1 min-w-0">
              {/* Flat Brush Bar */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E0D8] bg-white px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeBrush("available")}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-medium transition cursor-pointer ${
                      activeBrush === "available"
                        ? "bg-emerald-600 text-white"
                        : "bg-[#EFECE6] text-[#575550] hover:text-[#141413]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeBrush === "available"
                          ? "bg-white"
                          : "bg-emerald-600"
                      }`}
                    />
                    <span>Free</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/15 px-1 text-[10px]">
                      1
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeBrush("if_needed")}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-medium transition cursor-pointer ${
                      activeBrush === "if_needed"
                        ? "bg-amber-500 text-[#141413] font-semibold"
                        : "bg-[#EFECE6] text-[#575550] hover:text-[#141413]"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    <span>If needed</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/10 px-1 text-[10px]">
                      2
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeBrush("clear")}
                    className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-medium transition cursor-pointer ${
                      activeBrush === "clear"
                        ? "bg-[#141413] text-white"
                        : "bg-[#EFECE6] text-[#575550] hover:text-[#141413]"
                    }`}
                  >
                    <Eraser className="h-3 w-3" />
                    <span>Erase</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/10 px-1 text-[10px]">
                      3
                    </kbd>
                  </button>
                </div>

                {isolatedParticipant ? (
                  <div className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 font-mono text-xs text-amber-950">
                    <Eye className="h-3 w-3 text-amber-700" />
                    <span>
                      Isolating {isolatedParticipant.name} (
                      {isolatedParticipant.city})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsolatedParticipantId(null)}
                      className="rounded p-0.5 hover:bg-amber-900/15 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#8A8780]">
                    <span>Click or drag to paint hours</span>
                  </div>
                )}
              </div>

              {/* Mobile Day Switcher & Thumb Scrub Rail (< 768px) */}
              <div className="md:hidden mb-3 space-y-2">
                <div className="sticky top-12 z-20 flex items-center justify-between gap-2 rounded-md border border-[#E2E0D8] bg-white p-1.5">
                  <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                    {poll.candidateDates.map((d, idx) => {
                      const hdr = formatDateHeader(d);
                      const isBestDay = bestWindow?.date === d;
                      const isSelected =
                        mobileDayIdx === idx && mobileViewMode === "1day";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setMobileDayIdx(idx);
                            setMobileViewMode("1day");
                          }}
                          className={`flex flex-1 items-center justify-center gap-1 rounded px-2.5 py-1.5 font-mono text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                              : "bg-[#FAF9F6] text-[#575550]"
                          }`}
                        >
                          <span>
                            {hdr.weekdayShort} {hdr.dayNum}
                          </span>
                          {isBestDay && (
                            <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setMobileViewMode((v) =>
                        v === "1day" ? "3day" : "1day"
                      )
                    }
                    className="shrink-0 rounded border border-[#E2E0D8] bg-[#FAF9F6] px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#141413]"
                  >
                    {mobileViewMode === "1day" ? "3-Day" : "1-Day"}
                  </button>
                </div>

                {mobileViewMode === "1day" && (
                  <div className="rounded-md border border-[#E2E0D8] bg-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#E2E0D8] bg-[#FAF9F6] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[#575550]">
                      <span>Tap to toggle</span>
                      <span className="text-emerald-800 font-semibold">
                        Swipe rail to paint ↕
                      </span>
                    </div>

                    <div
                      className="divide-y divide-[#E2E0D8]"
                      onPointerMove={handleMobileScrubMove}
                    >
                      {dayTimes.map((timeStr) => {
                        const activeDate =
                          poll.candidateDates[mobileDayIdx] ||
                          poll.candidateDates[0];
                        const slotKey = makeSlotKey(activeDate, timeStr);
                        const parsed = parseSlotKey(slotKey);
                        const disp = formatMinutesToDisplay(
                          parsed.minutesFromMidnight,
                          viewerTimezone,
                          poll.timezone
                        );
                        const metrics = getCellMetrics(slotKey);

                        return (
                          <div
                            key={slotKey}
                            data-slot-key={slotKey}
                            className={`relative flex items-stretch min-h-[44px] ${
                              metrics.isInActiveWindow
                                ? "bg-emerald-500/18"
                                : metrics.availableCount > 0
                                ? "bg-emerald-500/[0.07]"
                                : "bg-white"
                            } ${
                              metrics.ifNeededCount > 0
                                ? "slot-hatch-mixed"
                                : ""
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleMobileRowTap(slotKey)}
                              className="flex w-[74%] items-center justify-between px-3 py-2 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-medium text-[#141413] tabular-nums">
                                  {disp.timeLabel}
                                </span>
                                {metrics.isFirstOfActiveWindow && (
                                  <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                                    Best
                                  </span>
                                )}
                                {metrics.userState === "available" && (
                                  <span className="rounded border border-emerald-600/40 bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                    Free
                                  </span>
                                )}
                                {metrics.userState === "if_needed" && (
                                  <span className="rounded border border-amber-600/40 bg-amber-500/25 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-950">
                                    If needed
                                  </span>
                                )}
                              </div>

                              <span className="font-mono text-xs text-[#575550] tabular-nums">
                                {metrics.totalAttending}/
                                {metrics.totalParticipants}
                              </span>
                            </button>

                            <div
                              role="slider"
                              aria-label={`Paint rail for ${disp.timeLabel}`}
                              aria-valuenow={metrics.totalAttending}
                              style={{ touchAction: "none" }}
                              onPointerDown={(e) =>
                                handleCellPointerDown(slotKey, e)
                              }
                              onPointerEnter={(e) =>
                                handleCellPointerEnter(slotKey, e)
                              }
                              className={`flex w-[26%] select-none items-center justify-center gap-1 border-l border-[#E2E0D8] cursor-ns-resize ${
                                metrics.userState === "available"
                                  ? "bg-emerald-500/30 text-emerald-950 font-semibold"
                                  : metrics.userState === "if_needed"
                                  ? "bg-amber-500/30 text-amber-950 font-semibold"
                                  : "bg-[#FAF9F6] text-[#8A8780]"
                              }`}
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                              <span className="font-mono text-[10px] uppercase">
                                Scrub
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop & 3-Day Multi-Participant Matrix */}
              <div
                ref={gridRef}
                className={`${
                  mobileViewMode === "1day" ? "hidden md:block" : "block"
                } relative select-none overflow-hidden rounded-xl border border-[#E2E0D8] bg-white`}
              >
                {/* Header Row */}
                <div
                  className="grid border-b border-[#E2E0D8] bg-[#FAF9F6]"
                  style={{
                    gridTemplateColumns: `84px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                  }}
                >
                  <div className="flex flex-col justify-center border-r border-[#E2E0D8] px-2.5 py-2.5">
                    <span className="font-mono text-[10px] font-semibold uppercase text-[#141413] tabular-nums">
                      {currentTzOption.shortCode}
                    </span>
                    <span className="font-mono text-[10px] text-[#8A8780] tabular-nums">
                      {currentTzOption.utcLabel}
                    </span>
                  </div>

                  {poll.candidateDates.map((dateStr) => {
                    const hdr = formatDateHeader(dateStr);
                    const hasBestSlot = activeRankedWindow?.date === dateStr;
                    return (
                      <div
                        key={dateStr}
                        className={`flex items-center justify-between border-r last:border-r-0 border-[#E2E0D8] px-3 py-2.5 ${
                          hasBestSlot ? "bg-emerald-500/[0.06]" : ""
                        }`}
                      >
                        <div>
                          <span className="block font-mono text-[10px] uppercase tracking-wider text-[#8A8780]">
                            {hdr.weekdayShort}
                          </span>
                          <span className="font-mono text-sm font-semibold text-[#141413] tabular-nums">
                            {hdr.monthShort} {hdr.dayNum}
                          </span>
                        </div>
                        {hasBestSlot && (
                          <span className="rounded bg-emerald-600/15 border border-emerald-600/30 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-900">
                            Best
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Time Rows */}
                <div className="divide-y divide-[#E2E0D8]">
                  {dayTimes.map((timeStr, rowIdx) => {
                    const [hh, mm] = timeStr.split(":").map(Number);
                    const minsFromMidnight = hh * 60 + mm;
                    const disp = formatMinutesToDisplay(
                      minsFromMidnight,
                      viewerTimezone,
                      poll.timezone
                    );
                    const isHourBoundary = mm === 0;

                    return (
                      <div
                        key={timeStr}
                        className={`grid ${
                          isHourBoundary ? "border-t border-[#C9C6BC]" : ""
                        }`}
                        style={{
                          gridTemplateColumns: `84px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                        }}
                      >
                        <div className="flex items-center justify-end border-r border-[#E2E0D8] bg-[#FAF9F6] px-2.5 py-1.5">
                          <span
                            className={`font-mono text-[11px] tabular-nums ${
                              isHourBoundary
                                ? "font-medium text-[#141413]"
                                : "text-[#8A8780]"
                            }`}
                          >
                            {disp.timeLabel}
                          </span>
                        </div>

                        {poll.candidateDates.map((dateStr) => {
                          const slotKey = makeSlotKey(dateStr, timeStr);
                          const metrics = getCellMetrics(slotKey);
                          const ratio =
                            metrics.totalParticipants > 0
                              ? metrics.availableCount /
                                metrics.totalParticipants
                              : 0;

                          let bgStyle: React.CSSProperties = {};
                          if (isolatedParticipant) {
                            if (metrics.isolatedState === "available") {
                              bgStyle = {
                                backgroundColor: "rgba(16, 185, 129, 0.28)",
                              };
                            } else if (metrics.isolatedState === "if_needed") {
                              bgStyle = {
                                backgroundColor: "rgba(245, 158, 11, 0.22)",
                              };
                            } else if (metrics.isInActiveWindow) {
                              bgStyle = {
                                backgroundColor: "rgba(244, 63, 94, 0.12)",
                              };
                            }
                          } else {
                            if (metrics.isInActiveWindow) {
                              bgStyle = {
                                backgroundColor: "rgba(16, 185, 129, 0.24)",
                              };
                            } else if (ratio > 0) {
                              const alpha = (0.06 + ratio * 0.2).toFixed(3);
                              bgStyle = {
                                backgroundColor: `rgba(16, 185, 129, ${alpha})`,
                              };
                            }
                          }

                          return (
                            <div
                              key={slotKey}
                              data-slot-key={slotKey}
                              role="button"
                              tabIndex={rowIdx === 0 ? 0 : -1}
                              aria-label={`${dateStr} ${disp.timeLabel}`}
                              onPointerDown={(e) =>
                                handleCellPointerDown(slotKey, e)
                              }
                              onPointerEnter={(e) =>
                                handleCellPointerEnter(slotKey, e)
                              }
                              onKeyDown={(e) => {
                                if (e.key === " " || e.key === "Enter") {
                                  e.preventDefault();
                                  handleMobileRowTap(slotKey);
                                }
                              }}
                              style={bgStyle}
                              className={`group relative flex h-9 items-center justify-between border-r last:border-r-0 border-[#E2E0D8] px-2 cursor-pointer ${
                                metrics.ifNeededCount > 0 &&
                                !isolatedParticipant
                                  ? "slot-hatch-mixed"
                                  : ""
                              } ${
                                isolatedParticipant &&
                                metrics.isolatedState === "if_needed"
                                  ? "slot-hatch-amber"
                                  : ""
                              } ${
                                metrics.isInActiveWindow
                                  ? "ring-1 ring-inset ring-emerald-700 z-10"
                                  : "hover:bg-[#EFECE6]/50"
                              }`}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                {metrics.isFirstOfActiveWindow && (
                                  <span className="rounded bg-emerald-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                                    Best time
                                  </span>
                                )}

                                {!metrics.isFirstOfActiveWindow &&
                                  metrics.userState === "available" && (
                                    <span className="inline-flex items-center gap-0.5 rounded border border-emerald-600/40 bg-emerald-600/15 px-1 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                      <Check className="h-2.5 w-2.5 text-emerald-700" />
                                      <span className="hidden xl:inline">
                                        You
                                      </span>
                                    </span>
                                  )}

                                {!metrics.isFirstOfActiveWindow &&
                                  metrics.userState === "if_needed" && (
                                    <span className="rounded border border-amber-600/50 bg-amber-500/20 px-1 py-0.5 font-mono text-[10px] font-medium text-amber-950">
                                      If needed
                                    </span>
                                  )}
                              </div>

                              <div className="flex items-center gap-1">
                                {metrics.totalAttending > 0 && (
                                  <span
                                    className={`font-mono text-[11px] tabular-nums ${
                                      metrics.totalAttending ===
                                      metrics.totalParticipants
                                        ? "font-semibold text-emerald-950"
                                        : "text-[#575550]"
                                    }`}
                                  >
                                    {metrics.totalAttending}/
                                    {metrics.totalParticipants}
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectedSlotKey((prev) =>
                                      prev === slotKey ? null : slotKey
                                    );
                                  }}
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-0.5 text-[#575550] hover:bg-black/10 hover:text-[#141413] cursor-pointer"
                                  title="Inspect local times"
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Flat Slot Inspector */}
              {inspectedSlotDetails && (
                <div className="mt-3 rounded-md border border-[#E2E0D8] bg-white p-3.5">
                  <div className="flex items-center justify-between border-b border-[#E2E0D8] pb-2">
                    <span className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                      {inspectedSlotDetails.dateHdr.fullLabel} ·{" "}
                      {inspectedSlotDetails.viewerTime.timeLabel} (
                      {currentTzOption.shortCode})
                    </span>
                    <button
                      type="button"
                      onClick={() => setInspectedSlotKey(null)}
                      className="rounded p-1 text-[#575550] hover:bg-[#EFECE6] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {poll.participants.map((p) => {
                      const st = p.slots[inspectedSlotDetails.slotKey];
                      const pLocal = formatMinutesToDisplay(
                        inspectedSlotDetails.minutesFromMidnight,
                        p.timezone,
                        poll.timezone,
                        true
                      );
                      return (
                        <div
                          key={p.id}
                          className="rounded border border-[#E2E0D8] bg-[#FAF9F6] p-2 font-mono text-xs"
                        >
                          <div className="flex items-center justify-between font-medium text-[#141413]">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-[#8A8780]">
                              {p.city}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#575550] tabular-nums">
                            {pLocal.timeLabel}
                          </div>
                          <div className="mt-1 text-[10px] font-semibold">
                            {st === "available" ? (
                              <span className="text-emerald-700">● Free</span>
                            ) : st === "if_needed" ? (
                              <span className="text-amber-700">
                                ◐ If needed
                              </span>
                            ) : (
                              <span className="text-[#8A8780]">— Busy</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flat Bottom Resolution Bar */}
              {activeRankedWindow && (
                <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-[#141413] bg-[#141413] px-4 py-3 text-[#F6F5F2]">
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
                    <span className="rounded bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                      Best time
                    </span>
                    <span className="font-medium text-white">
                      {formatDateHeader(activeRankedWindow.date).fullLabel} ·{" "}
                      {
                        formatMinutesToDisplay(
                          activeRankedWindow.startTimeMinutes,
                          viewerTimezone,
                          poll.timezone
                        ).timeLabel
                      }{" "}
                      –{" "}
                      {
                        formatMinutesToDisplay(
                          activeRankedWindow.endTimeMinutes,
                          viewerTimezone,
                          poll.timezone
                        ).timeLabel
                      }
                    </span>
                    <span className="text-white/60">
                      ({activeRankedWindow.totalAttendingCount}/
                      {activeRankedWindow.totalParticipants} free)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLockSlot(activeRankedWindow)}
                    className="inline-flex items-center justify-center gap-1.5 rounded bg-emerald-400 px-3.5 py-1.5 font-mono text-xs font-semibold text-[#141413] hover:bg-emerald-300 transition cursor-pointer"
                  >
                    <Lock className="h-3 w-3" />
                    Lock this time
                  </button>
                </div>
              )}
            </div>

            {/* Right Sidebar: Best Times & Participants */}
            {sidebarOpen && (
              <aside className="w-full lg:w-[320px] shrink-0 space-y-3">
                {/* Best Times Card */}
                <div className="rounded-xl border border-[#E2E0D8] bg-white p-4">
                  <div className="flex items-center justify-between border-b border-[#E2E0D8] pb-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[#575550]" />
                      Best times
                    </span>
                    <span className="font-mono text-[11px] text-[#8A8780] tabular-nums">
                      {poll.durationMinutes}m
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-2">
                    {rankedWindows.slice(0, 4).map((w, idx) => {
                      const hdr = formatDateHeader(w.date);
                      const sDisp = formatMinutesToDisplay(
                        w.startTimeMinutes,
                        viewerTimezone,
                        poll.timezone,
                        true
                      );
                      const eDisp = formatMinutesToDisplay(
                        w.endTimeMinutes,
                        viewerTimezone,
                        poll.timezone,
                        true
                      );
                      const isSelected = activeRankedWindow?.id === w.id;

                      let statusNote = `All ${w.totalParticipants} free`;
                      if (w.missingParticipants.length > 0) {
                        const missingNames = w.missingParticipants
                          .map((p) => p.name)
                          .join(", ");
                        statusNote = `${w.totalAttendingCount}/${w.totalParticipants} free — missing ${missingNames}`;
                      } else if (w.ifNeededParticipants.length > 0) {
                        statusNote = `${w.strictAvailableCount} free · +${
                          w.ifNeededParticipants.length
                        } if needed (${w.ifNeededParticipants
                          .map((p) => p.name)
                          .join(", ")})`;
                      }

                      return (
                        <div
                          key={w.id}
                          onClick={() => setSelectedWindowId(w.id)}
                          className={`rounded border p-2.5 transition cursor-pointer ${
                            isSelected
                              ? "border-[#141413] bg-[#FAF9F6]"
                              : "border-[#E2E0D8] bg-white hover:bg-[#FAF9F6]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums">
                            <span className="font-semibold text-[#141413]">
                              #{idx + 1} {hdr.weekdayShort} {hdr.dayNum} ·{" "}
                              {sDisp.timeLabel}–{eDisp.timeLabel}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                w.isPerfectStrict
                                  ? "bg-emerald-500/20 text-emerald-900"
                                  : "bg-[#EFECE6] text-[#575550]"
                              }`}
                            >
                              {w.totalAttendingCount}/{w.totalParticipants}
                            </span>
                          </div>

                          <p className="mt-1 font-mono text-[11px] text-[#575550]">
                            {statusNote}
                          </p>

                          {isSelected && (
                            <div className="mt-2 flex items-center justify-end border-t border-[#E2E0D8] pt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLockSlot(w);
                                }}
                                className="inline-flex items-center gap-1 rounded bg-[#141413] px-2.5 py-1 font-mono text-[10px] font-medium text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
                              >
                                <Lock className="h-2.5 w-2.5" />
                                Lock this time
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Participants Card */}
                <div className="rounded-xl border border-[#E2E0D8] bg-white p-4">
                  <div className="flex items-center justify-between border-b border-[#E2E0D8] pb-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#575550]" />
                      Responded ({poll.participants.length})
                    </span>
                    {isolatedParticipantId && (
                      <button
                        type="button"
                        onClick={() => setIsolatedParticipantId(null)}
                        className="font-mono text-[10px] text-[#141413] underline cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="mt-2.5 space-y-1">
                    {poll.participants.map((p) => {
                      const isIsolated = isolatedParticipantId === p.id;
                      const slotCount = Object.keys(p.slots).length;
                      const tz = TIMEZONE_OPTIONS.find(
                        (t) => t.id === p.timezone
                      );
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onMouseEnter={() => setIsolatedParticipantId(p.id)}
                          onMouseLeave={() => setIsolatedParticipantId(null)}
                          onClick={() =>
                            setIsolatedParticipantId((prev) =>
                              prev === p.id ? null : p.id
                            )
                          }
                          className={`flex w-full items-center justify-between rounded border px-2.5 py-1.5 text-left font-mono text-xs transition cursor-pointer ${
                            isIsolated
                              ? "border-[#141413] bg-[#FAF9F6]"
                              : "border-transparent hover:border-[#E2E0D8] hover:bg-[#FAF9F6]"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: p.avatarColor }}
                            />
                            <span className="font-medium text-[#141413]">
                              {p.isCurrentUser ? guestName || p.name : p.name}
                            </span>
                            <span className="text-[10px] text-[#8A8780]">
                              {p.city} ({tz?.shortCode || "EDT"})
                            </span>
                          </div>
                          <span className="text-[10px] text-[#8A8780] tabular-nums">
                            {slotCount} slots
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>

      {/* Mobile Bottom Bar (< 768px) */}
      {poll.status === "OPEN" && activeRankedWindow && (
        <div className="md:hidden sticky bottom-2 z-30 mt-3">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-md border border-[#141413] bg-[#141413] px-3.5 py-2.5 text-left font-mono text-xs text-[#F6F5F2]"
          >
            <div className="truncate">
              <span className="text-emerald-400 font-semibold mr-2">
                ★ {activeRankedWindow.totalAttendingCount}/
                {activeRankedWindow.totalParticipants}
              </span>
              <span className="tabular-nums">
                {formatDateHeader(activeRankedWindow.date).weekdayShort}{" "}
                {
                  formatMinutesToDisplay(
                    activeRankedWindow.startTimeMinutes,
                    viewerTimezone,
                    poll.timezone,
                    true
                  ).timeLabel
                }
                –
                {
                  formatMinutesToDisplay(
                    activeRankedWindow.endTimeMinutes,
                    viewerTimezone,
                    poll.timezone,
                    true
                  ).timeLabel
                }
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[11px]">
              {mobileDrawerOpen ? "Close" : "Lock"}
              <ChevronRight className="h-3 w-3" />
            </span>
          </button>

          {mobileDrawerOpen && (
            <div className="mt-1.5 rounded-md border border-[#E2E0D8] bg-white p-3 shadow-lg">
              <div className="space-y-1.5">
                {rankedWindows.slice(0, 3).map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded border border-[#E2E0D8] bg-[#FAF9F6] p-2 font-mono text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#141413] tabular-nums">
                        #{i + 1} {formatDateHeader(w.date).fullLabel} ·{" "}
                        {
                          formatMinutesToDisplay(
                            w.startTimeMinutes,
                            viewerTimezone,
                            poll.timezone,
                            true
                          ).timeLabel
                        }
                      </div>
                      <div className="text-[10px] text-[#575550]">
                        {w.totalAttendingCount}/{w.totalParticipants} free
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLockSlot(w)}
                      className="rounded bg-[#141413] px-2.5 py-1 text-[11px] font-semibold text-white"
                    >
                      Lock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
