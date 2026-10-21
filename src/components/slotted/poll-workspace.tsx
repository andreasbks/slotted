"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eraser,
  Eye,
  Globe,
  Info,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Star,
  UserCheck,
  Users,
  X,
  GripVertical,
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
  compactHeader?: boolean;
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
  const [isolatedParticipantId, setIsolatedParticipantId] = useState<string | null>(
    null
  );
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [inspectedSlotKey, setInspectedSlotKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState(false);

  // Mobile specific states
  const [mobileDayIdx, setMobileDayIdx] = useState(1); // Default to Wed Oct 28 (index 1) where Best Slot lives
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

  // Ensure mobileDayIdx is within bounds when switching polls
  useEffect(() => {
    if (mobileDayIdx >= poll.candidateDates.length) {
      setMobileDayIdx(0);
    }
  }, [poll.candidateDates.length, mobileDayIdx]);

  // Compute live ranked windows
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

  // Apply slot mutation for current guest user in <16ms
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

  // Compute rectangular slot selection between two slotKeys
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
    if (!isDragging || !dragStartSlot || !dragCurrentSlot) return new Set<string>();
    return new Set(getRectangularSlotKeys(dragStartSlot, dragCurrentSlot));
  }, [isDragging, dragStartSlot, dragCurrentSlot, getRectangularSlotKeys]);

  // Global pointerup handler to commit drag selection
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

  // Keyboard shortcuts: 1/A (Available), 2/I (If-Needed), 3/E (Erase), S (Sidebar), L (Lock)
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

    // Determine effective brush: Shift forces If-Needed; clicking an already matching slot toggles it off
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

  // Mobile tap-to-cycle on Left 75% zone
  const handleMobileRowTap = (slotKey: string) => {
    const currentVal = currentUserParticipant?.slots[slotKey];
    let nextMode: BrushMode = activeBrush;
    if (currentVal === activeBrush) {
      nextMode = "clear";
    }
    applySlotsToCurrentUser([slotKey], nextMode);
  };

  // Mobile Touch-Scrub Rail handler (Right 25% rail with touch-action: none)
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

  const handleToggleReaction = (emoji: string) => {
    const updatedReactions = poll.reactions.map((r) => {
      if (r.emoji !== emoji) return r;
      const nextReacted = !r.userReacted;
      return {
        ...r,
        userReacted: nextReacted,
        count: nextReacted ? r.count + 1 : Math.max(0, r.count - 1),
      };
    });
    onUpdatePoll({
      ...poll,
      reactions: updatedReactions,
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

  // Floating Drag Duration Badge info
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
    const totalHours = ((keys.length * poll.slotMinutes) / 60).toFixed(1).replace(/\.0$/, "");
    return `${dateHdr.weekdayShort} ${startDisp.timeLabel} – ${endDisp.timeLabel} · ${totalHours}h`;
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

  // Helper to evaluate a single cell's visual state
  const getCellMetrics = (slotKey: string) => {
    let availableCount = 0;
    let ifNeededCount = 0;
    const availableNames: string[] = [];
    const ifNeededNames: string[] = [];

    for (const p of poll.participants) {
      const isCurrentUser = p.id === currentUserParticipant?.id;
      let state: AvailabilityState | undefined = p.slots[slotKey];

      if (isCurrentUser && previewSlotKeys.has(slotKey)) {
        state = dragBrushUsed === "clear" ? undefined : dragBrushUsed;
      }

      if (state === "available") {
        availableCount++;
        availableNames.push(p.name);
      } else if (state === "if_needed") {
        ifNeededCount++;
        ifNeededNames.push(p.name);
      }
    }

    const totalParticipants = poll.participants.length;
    const userState: AvailabilityState | undefined = previewSlotKeys.has(slotKey)
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
      availableNames,
      ifNeededNames,
    };
  };

  return (
    <div className="relative w-full">
      {/* Floating Cursor Duration Pill while drag-painting on Desktop */}
      <AnimatePresence>
        {isDragging && dragBadgeText && cursorPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              left: cursorPos.x + 16,
              top: cursorPos.y + 14,
            }}
            className="liquid-glass-dark pointer-events-none fixed z-50 hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-xs text-white shadow-xl tabular-nums"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Workspace Control Bar: Poll Title, Guest Identity Pill, Duration, Timezone & Share */}
      <div className="rounded-t-[18px] border border-[#E4E1DA] bg-[#EFECE6]/65 px-4 py-3.5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Poll Title + Live Status Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${
                poll.status === "LOCKED"
                  ? "bg-emerald-500/20 text-emerald-900 border border-emerald-600/30"
                  : "bg-[#141413] text-[#F7F6F2]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  poll.status === "LOCKED"
                    ? "bg-emerald-600"
                    : "bg-emerald-400 animate-pulse"
                }`}
              />
              {poll.status === "LOCKED" ? "Locked" : "Open"}
            </span>

            <h2 className="text-lg sm:text-xl font-medium tracking-[-0.025em] text-[#141413]">
              {poll.title}
            </h2>

            <span className="hidden xl:inline-block font-mono text-xs text-[#8A8780]">
              · {poll.durationMinutes} min · Shown in your timezone ({currentTzOption.shortCode} · {currentTzOption.utcLabel})
            </span>
          </div>

          {/* Right: Zero-Friction Guest Identity Pill, Meeting Duration, Timezone Selector & Share */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Zero-Friction Guest Identity Pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#CFCBC2] bg-white px-3 py-1 text-xs shadow-2xs">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="text-[#8A8780]">Voting as</span>
              {editingGuestName ? (
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => onChangeGuestName(e.target.value)}
                  onBlur={() => setEditingGuestName(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingGuestName(false);
                  }}
                  className="w-24 border-b border-emerald-600 bg-transparent font-medium text-[#141413] focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingGuestName(true)}
                  className="font-semibold text-[#141413] underline decoration-[#CFCBC2] underline-offset-2 hover:decoration-[#141413] cursor-pointer"
                  title="Click to edit your guest name (zero signup required)"
                >
                  {guestName || "Alex"}
                </button>
              )}
            </div>

            {/* Duration Switcher (30m / 45m / 60m) */}
            <div className="inline-flex items-center rounded-full border border-[#E4E1DA] bg-[#F7F6F2] p-0.5 font-mono text-[11px] tabular-nums">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleDurationChange(mins)}
                  className={`rounded-full px-2.5 py-0.5 transition cursor-pointer ${
                    poll.durationMinutes === mins
                      ? "bg-[#141413] text-[#F7F6F2] font-medium"
                      : "text-[#575551] hover:text-[#141413]"
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>

            {/* Timezone Auto-Shift Selector */}
            <div className="relative inline-flex items-center">
              <Globe className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#575551]" />
              <select
                aria-label="Select Timezone"
                value={viewerTimezone}
                onChange={(e) => onChangeViewerTimezone(e.target.value)}
                className="appearance-none rounded-full border border-[#CFCBC2] bg-white pl-7 pr-6 py-1 font-mono text-[11px] font-medium text-[#141413] tabular-nums hover:border-[#141413]/40 focus:outline-none cursor-pointer"
              >
                {TIMEZONE_OPTIONS.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.city} · {tz.shortCode} ({tz.utcLabel})
                  </option>
                ))}
              </select>
            </div>

            {/* Copy Share Link Pill */}
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#CFCBC2] bg-white px-3 py-1 font-mono text-[11px] font-medium text-[#141413] hover:bg-[#EFECE6] transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Link copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[#575551]" />
                  <span>Copy link</span>
                </>
              )}
            </button>

            {/* Desktop Sidebar Collapse Toggle */}
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="hidden lg:inline-flex items-center justify-center rounded-full border border-[#E4E1DA] bg-white p-1.5 text-[#575551] hover:text-[#141413] transition cursor-pointer"
              title="Toggle Consensus & Roster Sidebar (S)"
            >
              {sidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Surface: Either Locked Arc Easel Ticket OR Live Split Availability Matrix */}
      <div className="rounded-b-[18px] border-x border-b border-[#E4E1DA] bg-[#F7F6F2] p-3 sm:p-5">
        {poll.status === "LOCKED" && activeRankedWindow ? (
          <ArcEaselTicket
            poll={poll}
            lockedWindow={activeRankedWindow}
            viewerTimezone={viewerTimezone}
            onUnlock={handleUnlockPoll}
            onToggleReaction={handleToggleReaction}
          />
        ) : (
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            {/* LEFT / MAIN CANVAS (72% Desktop when sidebar open, 100% when collapsed) */}
            <div className="flex-1 min-w-0">
              {/* Top Brush & Isolation Status Ribbon */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E4E1DA] bg-white/90 px-3.5 py-2.5 shadow-2xs">
                {/* Brush Selector Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeBrush("available")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      activeBrush === "available"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-[#EFECE6] text-[#575551] hover:text-[#141413]"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        activeBrush === "available" ? "bg-white" : "bg-emerald-500"
                      }`}
                    />
                    <span>Free</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/15 px-1 font-mono text-[10px]">
                      1
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeBrush("if_needed")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      activeBrush === "if_needed"
                        ? "bg-amber-500 text-[#141413] font-semibold shadow-xs"
                        : "bg-[#EFECE6] text-[#575551] hover:text-[#141413]"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    <span>If needed</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/10 px-1 font-mono text-[10px]">
                      2
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={() => onChangeBrush("clear")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                      activeBrush === "clear"
                        ? "bg-[#141413] text-white"
                        : "bg-[#EFECE6] text-[#575551] hover:text-[#141413]"
                    }`}
                  >
                    <Eraser className="h-3 w-3" />
                    <span>Erase</span>
                    <kbd className="hidden sm:inline-block rounded bg-black/10 px-1 font-mono text-[10px]">
                      3
                    </kbd>
                  </button>
                </div>

                {/* Right hint or Participant Isolation Banner */}
                {isolatedParticipant ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-500/40 px-3 py-1 text-xs text-amber-950">
                    <Eye className="h-3.5 w-3.5 text-amber-700" />
                    <span>
                      Isolating{" "}
                      <strong>
                        {isolatedParticipant.name} ({isolatedParticipant.city})
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsolatedParticipantId(null)}
                      className="rounded-full bg-amber-900/10 p-0.5 hover:bg-amber-900/20 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#575551]">
                    <span>Click or drag to paint your hours</span>
                  </div>
                )}
              </div>

              {/* =========================================================
                  MOBILE ERGONOMICS (< 768px): Sticky Day-Switcher Pill Strip
                 ========================================================= */}
              <div className="md:hidden mb-3 space-y-2">
                <div className="liquid-glass sticky top-14 z-20 flex items-center justify-between gap-2 rounded-2xl p-2">
                  {/* Day Switcher Pills */}
                  <div className="flex flex-1 items-center gap-1 overflow-x-auto">
                    {poll.candidateDates.map((d, idx) => {
                      const hdr = formatDateHeader(d);
                      const isBestDay = bestWindow?.date === d;
                      const isSelected = mobileDayIdx === idx && mobileViewMode === "1day";
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setMobileDayIdx(idx);
                            setMobileViewMode("1day");
                          }}
                          className={`flex flex-1 flex-col items-center rounded-xl px-2.5 py-1.5 font-mono text-xs transition cursor-pointer ${
                            isSelected
                              ? "bg-[#141413] text-[#F7F6F2] shadow-xs"
                              : "bg-white/70 text-[#575551]"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">
                              {hdr.weekdayShort} {hdr.dayNum}
                            </span>
                            {isBestDay && (
                              <Star className="h-3 w-3 fill-emerald-400 text-emerald-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 1-Day Thumb View vs 3-Day Compact Toggle */}
                  <button
                    type="button"
                    onClick={() =>
                      setMobileViewMode((v) => (v === "1day" ? "3day" : "1day"))
                    }
                    className="shrink-0 rounded-xl border border-[#CFCBC2] bg-white px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#141413]"
                  >
                    {mobileViewMode === "1day" ? "3-Day Grid" : "1-Day Thumb"}
                  </button>
                </div>

                {/* Mobile 1-Day Thumb-First View with Left 75% Tap & Right 25% Touch-Scrub Rail */}
                {mobileViewMode === "1day" && (
                  <div className="rounded-2xl border border-[#E4E1DA] bg-white overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#E4E1DA] bg-[#EFECE6]/60 px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#575551]">
                      <span>Tap to toggle</span>
                      <span className="text-emerald-800 font-semibold">
                        Swipe rail to paint ↕
                      </span>
                    </div>

                    <div
                      className="divide-y divide-[#E4E1DA]"
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
                            className={`relative flex items-stretch min-h-[48px] transition-colors ${
                              metrics.isInActiveWindow
                                ? "bg-emerald-500/18"
                                : metrics.availableCount > 0
                                ? "bg-emerald-500/[0.07]"
                                : "bg-white"
                            } ${
                              metrics.ifNeededCount > 0 ? "slot-hatch-mixed" : ""
                            }`}
                          >
                            {/* Left 75%: Safe Vertical Scroll + Single-Tap Toggle */}
                            <button
                              type="button"
                              onClick={() => handleMobileRowTap(slotKey)}
                              className="flex w-[74%] items-center justify-between px-3.5 py-2.5 text-left"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-medium text-[#141413] tabular-nums">
                                  {disp.timeLabel}
                                </span>
                                {metrics.isFirstOfActiveWindow && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                                    ★ Best
                                  </span>
                                )}
                                {metrics.userState === "available" && (
                                  <span className="rounded-md bg-emerald-500/20 border border-emerald-600/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-900">
                                    You: Free
                                  </span>
                                )}
                                {metrics.userState === "if_needed" && (
                                  <span className="rounded-md bg-amber-500/25 border border-amber-600/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-900">
                                    You: Flex
                                  </span>
                                )}
                              </div>

                              <span className="font-mono text-xs text-[#575551] tabular-nums">
                                {metrics.totalAttending}/{metrics.totalParticipants}
                              </span>
                            </button>

                            {/* Right 26%: Dedicated Touch-Scrub Paint Rail (touch-action: none) */}
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
                              className={`flex w-[26%] select-none items-center justify-center gap-1 border-l border-[#E4E1DA] cursor-ns-resize transition ${
                                metrics.userState === "available"
                                  ? "bg-emerald-500/30 text-emerald-950 font-semibold"
                                  : metrics.userState === "if_needed"
                                  ? "bg-amber-500/30 text-amber-950 font-semibold"
                                  : "bg-[#EFECE6]/75 text-[#8A8780]"
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

              {/* =========================================================
                  DESKTOP & 3-DAY COMPACT MULTI-PARTICIPANT TIME MATRIX
                 ========================================================= */}
              <div
                ref={gridRef}
                className={`${
                  mobileViewMode === "1day" ? "hidden md:block" : "block"
                } relative select-none overflow-hidden rounded-2xl border border-[#E4E1DA] bg-white shadow-2xs`}
              >
                {/* Column Headers: Timezone Column + Candidate Days */}
                <div
                  className="grid border-b border-[#E4E1DA] bg-[#EFECE6]/75"
                  style={{
                    gridTemplateColumns: `88px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                  }}
                >
                  {/* Top-Left Timezone Indicator Corner */}
                  <div className="flex flex-col justify-center border-r border-[#E4E1DA] px-2.5 py-3">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#141413] tabular-nums">
                      {currentTzOption.shortCode}
                    </span>
                    <span className="font-mono text-[10px] text-[#8A8780] tabular-nums">
                      {currentTzOption.utcLabel}
                    </span>
                  </div>

                  {/* Candidate Day Headers */}
                  {poll.candidateDates.map((dateStr) => {
                    const hdr = formatDateHeader(dateStr);
                    const hasBestSlot = activeRankedWindow?.date === dateStr;
                    return (
                      <div
                        key={dateStr}
                        className={`relative flex flex-col justify-between border-r last:border-r-0 border-[#E4E1DA] px-3 py-2.5 ${
                          hasBestSlot ? "bg-emerald-500/[0.06]" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] uppercase tracking-wider text-[#575551]">
                            {hdr.weekdayShort}
                          </span>
                          {hasBestSlot && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 border border-emerald-600/30 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-900">
                              ★ Optimal
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-lg sm:text-xl font-medium tracking-tight text-[#141413] tabular-nums">
                            {hdr.dayNum}
                          </span>
                          <span className="text-xs text-[#8A8780]">
                            {hdr.monthShort}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Matrix Rows */}
                <div className="divide-y divide-[#E4E1DA]/80">
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
                          isHourBoundary ? "border-t border-[#CFCBC2]/70" : ""
                        }`}
                        style={{
                          gridTemplateColumns: `88px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                        }}
                      >
                        {/* Left Time Label Cell */}
                        <div className="flex items-center justify-end border-r border-[#E4E1DA] bg-[#F7F6F2]/70 px-2.5 py-2">
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

                        {/* Day Cells for this Time Row */}
                        {poll.candidateDates.map((dateStr) => {
                          const slotKey = makeSlotKey(dateStr, timeStr);
                          const metrics = getCellMetrics(slotKey);
                          const ratio =
                            metrics.totalParticipants > 0
                              ? metrics.availableCount / metrics.totalParticipants
                              : 0;

                          // Calculate stepped botanical emerald opacity for group heatmap
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
                              // Soft coral conflict highlight when isolating a participant who is missing from a top window
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
                              aria-label={`${dateStr} ${disp.timeLabel} — ${metrics.totalAttending} of ${metrics.totalParticipants} available`}
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
                              className={`group relative flex h-9 sm:h-10 items-center justify-between border-r last:border-r-0 border-[#E4E1DA]/80 px-2.5 transition-transform duration-75 cursor-pointer ${
                                metrics.ifNeededCount > 0 && !isolatedParticipant
                                  ? "slot-hatch-mixed"
                                  : ""
                              } ${
                                isolatedParticipant &&
                                metrics.isolatedState === "if_needed"
                                  ? "slot-hatch-amber"
                                  : ""
                              } ${
                                metrics.isInActiveWindow
                                  ? "ring-1 ring-inset ring-emerald-600/80 z-10"
                                  : "hover:bg-[#EFECE6]/50"
                              } active:scale-[0.985]`}
                            >
                              {/* Left: Best Time Badge or Current User Painted Pill */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                {metrics.isFirstOfActiveWindow && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#059669] px-2 py-0.5 font-mono text-[10px] font-semibold text-white shadow-2xs">
                                    Best time
                                  </span>
                                )}

                                {!metrics.isFirstOfActiveWindow &&
                                  metrics.userState === "available" && (
                                    <span className="inline-flex items-center gap-1 rounded-sm bg-emerald-600/18 border border-emerald-600/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                      <Check className="h-2.5 w-2.5 text-emerald-700" />
                                      <span className="hidden xl:inline">You</span>
                                    </span>
                                  )}

                                {!metrics.isFirstOfActiveWindow &&
                                  metrics.userState === "if_needed" && (
                                    <span className="inline-flex items-center gap-1 rounded-sm bg-amber-500/25 border border-amber-600/50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-950">
                                      <span>Flex</span>
                                    </span>
                                  )}
                              </div>

                              {/* Right: Numeric Availability Ratio + Arc Peek Inspector Trigger */}
                              <div className="flex items-center gap-1">
                                {metrics.totalAttending > 0 && (
                                  <span
                                    className={`font-mono text-[11px] tabular-nums ${
                                      metrics.totalAttending ===
                                      metrics.totalParticipants
                                        ? "font-semibold text-emerald-950"
                                        : "text-[#575551]"
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
                                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded p-0.5 text-[#575551] hover:bg-black/10 hover:text-[#141413] transition cursor-pointer"
                                  title="Inspect local times for this hour"
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

              {/* Arc Peek Slot Inspector Popover Sheet (when user clicks Info on a slot) */}
              <AnimatePresence>
                {inspectedSlotDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    className="liquid-glass mt-3 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#141413] px-2 py-0.5 font-mono text-[10px] uppercase text-[#F7F6F2]">
                          Local times
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                          {inspectedSlotDetails.dateHdr.fullLabel} ·{" "}
                          {inspectedSlotDetails.viewerTime.timeLabel} (
                          {currentTzOption.shortCode})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInspectedSlotKey(null)}
                        className="rounded-full p-1 text-[#575551] hover:bg-black/5 hover:text-[#141413] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
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
                            className={`rounded-xl border p-2.5 text-xs ${
                              st === "available"
                                ? "border-emerald-600/30 bg-emerald-500/10"
                                : st === "if_needed"
                                ? "border-amber-600/35 bg-amber-500/15"
                                : "border-rose-500/25 bg-rose-500/[0.06]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-medium text-[#141413]">
                              <span>{p.name}</span>
                              <span className="font-mono text-[10px] text-[#575551]">
                                {p.city}
                              </span>
                            </div>
                            <div className="mt-1 font-mono text-[11px] text-[#575551] tabular-nums">
                              Local: {pLocal.timeLabel}
                            </div>
                            <div className="mt-1 font-mono text-[10px] uppercase font-semibold">
                              {st === "available" ? (
                                <span className="text-emerald-800">● Available</span>
                              ) : st === "if_needed" ? (
                                <span className="text-amber-800">◐ If-Needed</span>
                              ) : (
                                <span className="text-rose-700">✕ Unavailable</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Floating Liquid Glass Brush & Host Resolution Dock */}
              {activeRankedWindow && (
                <div className="liquid-glass-dark mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-[20px] px-4 py-3 text-[#F7F6F2]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                          Best time
                        </span>
                        <span className="rounded-full bg-white/15 px-2 py-0.5 font-mono text-[10px] text-white tabular-nums">
                          {activeRankedWindow.totalAttendingCount === activeRankedWindow.totalParticipants
                            ? `All ${activeRankedWindow.totalParticipants} free`
                            : `${activeRankedWindow.totalAttendingCount} of ${activeRankedWindow.totalParticipants} free`}
                        </span>
                      </div>
                      <div className="mt-0.5 font-mono text-xs sm:text-sm font-medium text-white tabular-nums">
                        {formatDateHeader(activeRankedWindow.date).weekdayShort}{" "}
                        {
                          formatMinutesToDisplay(
                            activeRankedWindow.startTimeMinutes,
                            viewerTimezone,
                            poll.timezone
                          ).timeLabel
                        }{" "}
                        works for everyone.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleLockSlot(activeRankedWindow)}
                      className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#141413] shadow-sm transition hover:bg-emerald-300 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Lock this time
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* =========================================================
                COLLAPSIBLE ARC SIDEBAR (28% Desktop): Consensus Leaderboard + Roster
               ========================================================= */}
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.aside
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="w-full lg:w-[330px] xl:w-[350px] shrink-0 space-y-4"
                >
                  {/* Card 1: Best-Slot Consensus Leaderboard */}
                  <div className="rounded-2xl border border-[#E4E1DA] bg-[#EFECE6]/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-emerald-700" />
                        Best times
                      </span>
                      <span className="font-mono text-[10px] text-[#8A8780] tabular-nums">
                        {poll.durationMinutes} min
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
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

                        // Explicit human-readable status of who is free vs if-needed vs missing
                        let statusNote = `All ${w.totalParticipants} free`;
                        if (w.missingParticipants.length > 0) {
                          const missingNames = w.missingParticipants
                            .map((p) => p.name)
                            .join(", ");
                          const flexPart =
                            w.ifNeededParticipants.length > 0
                              ? ` · +${w.ifNeededParticipants.length} if needed (${w.ifNeededParticipants
                                  .map((p) => p.name)
                                  .join(", ")})`
                              : "";
                          statusNote = `${w.strictAvailableCount} of ${w.totalParticipants} free${flexPart} — missing ${missingNames}`;
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
                            className={`rounded-xl border p-3 transition cursor-pointer ${
                              isSelected
                                ? "border-emerald-600 bg-white shadow-xs"
                                : "border-[#E4E1DA] bg-white/70 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-bold ${
                                    idx === 0
                                      ? "bg-emerald-600 text-white"
                                      : "bg-[#EFECE6] text-[#575551]"
                                  }`}
                                >
                                  #{idx + 1}
                                </span>
                                <span className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                                  {hdr.weekdayShort} {hdr.dayNum} ·{" "}
                                  {sDisp.timeLabel}–{eDisp.timeLabel}
                                </span>
                              </div>

                              <span
                                className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                                  w.isPerfectStrict
                                    ? "bg-emerald-500/20 text-emerald-900"
                                    : w.isFullWithFlex
                                    ? "bg-amber-500/20 text-amber-900"
                                    : "bg-[#EFECE6] text-[#575551]"
                                }`}
                              >
                                {w.totalAttendingCount}/{w.totalParticipants}
                              </span>
                            </div>

                            <p className="mt-1.5 text-[11px] leading-snug text-[#575551]">
                              {statusNote}
                            </p>

                            {isSelected && (
                              <div className="mt-2.5 flex items-center justify-between border-t border-[#E4E1DA] pt-2">
                                <span className="font-mono text-[10px] text-emerald-800 font-medium">
                                  Highlighted on grid
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLockSlot(w);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#141413] px-2.5 py-1 font-mono text-[10px] font-medium text-[#F7F6F2] hover:bg-emerald-700 transition cursor-pointer"
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

                  {/* Card 2: Interactive Participant Roster (Click or Hover to Isolate) */}
                  <div className="rounded-2xl border border-[#E4E1DA] bg-[#EFECE6]/70 p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[#575551]" />
                        PARTICIPANTS ({poll.participants.length})
                      </span>
                      {isolatedParticipantId && (
                        <button
                          type="button"
                          onClick={() => setIsolatedParticipantId(null)}
                          className="font-mono text-[10px] text-emerald-800 underline cursor-pointer"
                        >
                          Show all
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-[#8A8780]">
                      Click or hover any voter to isolate their schedule & city timezone.
                    </p>

                    <div className="mt-3 space-y-1.5">
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
                            className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition cursor-pointer ${
                              isIsolated
                                ? "border-[#141413] bg-white shadow-2xs"
                                : "border-[#E4E1DA] bg-white/80 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                                style={{ backgroundColor: p.avatarColor }}
                              >
                                {(p.isCurrentUser ? guestName : p.name)
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium text-[#141413]">
                                    {p.isCurrentUser ? guestName || p.name : p.name}
                                  </span>
                                  <span className="font-mono text-[10px] text-[#8A8780]">
                                    · {p.city}
                                  </span>
                                </div>
                                <div className="font-mono text-[10px] text-[#8A8780] tabular-nums">
                                  {tz?.shortCode || "EDT"} · {slotCount} blocks painted
                                </div>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-full bg-[#EFECE6] px-2 py-0.5 font-mono text-[10px] text-[#575551]">
                              <Eye className="h-2.5 w-2.5" />
                              Isolate
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* =========================================================
          MOBILE STICKY LIQUID GLASS CONSENSUS DRAWER TRIGGER (< 768px)
         ========================================================= */}
      {poll.status === "OPEN" && activeRankedWindow && (
        <div className="md:hidden sticky bottom-3 z-30 mt-3 px-1">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen((o) => !o)}
            className="liquid-glass-dark flex w-full items-center justify-between rounded-full px-4 py-3 text-left text-white shadow-xl"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[#141413] font-mono text-xs font-bold">
                ★
              </span>
              <div className="truncate">
                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">
                  BEST SLOT · {activeRankedWindow.totalAttendingCount}/
                  {activeRankedWindow.totalParticipants} FREE
                </div>
                <div className=" truncate font-mono text-xs font-semibold tabular-nums">
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
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px] font-medium">
              {mobileDrawerOpen ? "Hide" : "Best times"}
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </button>

          <AnimatePresence>
            {mobileDrawerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="liquid-glass mt-2 rounded-2xl p-4 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-[#E4E1DA] pb-2.5">
                  <span className="font-mono text-xs font-semibold uppercase text-[#141413]">
                    Top Consensus Windows
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="rounded-full p-1 text-[#575551]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {rankedWindows.slice(0, 3).map((w, i) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-xl border border-[#E4E1DA] bg-white p-2.5"
                    >
                      <div>
                        <div className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
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
                        <div className="text-[11px] text-[#575551]">
                          {w.totalAttendingCount}/{w.totalParticipants} available
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLockSlot(w)}
                        className="rounded-full bg-[#141413] px-3 py-1.5 font-mono text-[11px] font-semibold text-white"
                      >
                        Lock Slot
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
