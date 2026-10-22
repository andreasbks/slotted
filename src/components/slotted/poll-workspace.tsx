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
  EyeOff,
  GripVertical,
  Info,
  KeyRound,
  Lock,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  AvailabilityState,
  BrushMode,
  PollData,
  PollParticipant,
  RankedWindow,
  computeRankedWindows,
  formatDateHeader,
  formatDurationBadge,
  formatMinutesToDisplay,
  formatRecurrenceSummary,
  generateDayTimeSlots,
  getTimezoneInfo,
  makeSlotKey,
  parseSlotKey,
} from "@/lib/slotted-data";
import { calmFailure } from "@/lib/calm-copy";
import { ArcEaselTicket } from "./arc-easel-ticket";
import { Avatar } from "./avatar";
import { TimezoneCombobox } from "./timezone-combobox";
import { DurationControls } from "./duration-controls";

interface PollWorkspaceProps {
  poll: PollData;
  onUpdatePoll: (updated: PollData) => void;
  guestName: string;
  onChangeGuestName: (name: string) => void;
  viewerTimezone: string;
  onChangeViewerTimezone: (tz: string) => void;
  activeBrush: BrushMode;
  onChangeBrush: (brush: BrushMode) => void;
  justCreated?: boolean;
  onReloadPoll: () => Promise<void>;
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
  justCreated = false,
  onReloadPoll,
}: PollWorkspaceProps) {
  const [isolatedParticipantId, setIsolatedParticipantId] = useState<
    string | null
  >(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [inspectedSlotKey, setInspectedSlotKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(justCreated);
  const [showCreatedBanner, setShowCreatedBanner] = useState(justCreated);

  // Password gate state
  const [passwordAttempt, setPasswordAttempt] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveDetail, setSaveDetail] = useState("Not saved. Try again.");
  const [focusedCellKey, setFocusedCellKey] = useState<string | null>(null);

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
    if (justCreated) {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/p/${poll.slug}`
          : `https://slotted.app/p/${poll.slug}`;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard
          .writeText(url)
          .then(() => setCopiedLink(true))
          .catch(() => setCopiedLink(false));
      }
    }
  }, [justCreated, poll.slug]);

  const rankedWindows = useMemo(() => computeRankedWindows(poll), [poll]);
  const bestWindow: RankedWindow | undefined = rankedWindows[0];

  const activeRankedWindow = useMemo(() => {
    if (poll.status === "LOCKED" && poll.lockedSlotStart) {
      const locked = rankedWindows.find(
        (window) => window.startSlotKey === poll.lockedSlotStart
      );
      if (locked) return locked;
    }
    if (selectedWindowId) {
      const found = rankedWindows.find((w) => w.id === selectedWindowId);
      if (found) return found;
    }
    return bestWindow;
  }, [
    poll.status,
    poll.lockedSlotStart,
    rankedWindows,
    selectedWindowId,
    bestWindow,
  ]);

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
    const existing = poll.participants.find(
      (participant) =>
        participant.id === poll.viewerParticipantId ||
        participant.isCurrentUser
    );
    if (existing) return existing;
    return {
      id: "viewer-new",
      guestSessionId: "",
      name: guestName,
      city: "",
      timezone: viewerTimezone,
      avatarColor: "#0F766E",
      isCurrentUser: true,
      slots: {},
    } satisfies PollParticipant;
  }, [
    poll.participants,
    poll.viewerParticipantId,
    guestName,
    viewerTimezone,
  ]);

  const currentUserHasVoted = useMemo(() => {
    return Object.keys(currentUserParticipant?.slots || {}).length > 0;
  }, [currentUserParticipant]);

  const hideGroupResponses =
    (poll.visibilityMode === "hidden_until_voted" && !currentUserHasVoted) ||
    (poll.visibilityMode === "host_only" && !poll.canManagePoll);

  // Sync slots to backend API and optimistic local state
  const applySlotsToCurrentUser = useCallback(
    async (slotKeys: string[], mode: BrushMode) => {
      const nextSlots = { ...currentUserParticipant.slots };
      for (const k of slotKeys) {
        if (mode === "clear") {
          delete nextSlots[k];
        } else {
          nextSlots[k] = mode;
        }
      }

      let foundViewer = false;
      const updatedParticipants = poll.participants.map((p) => {
        if (p.id === currentUserParticipant.id) foundViewer = true;
        return (
        p.id === currentUserParticipant.id
          ? {
              ...p,
              name: guestName || p.name,
              slots: nextSlots,
            }
          : p
        );
      });
      if (!foundViewer) {
        updatedParticipants.push({
          ...currentUserParticipant,
          name: guestName.trim(),
          slots: nextSlots,
        });
      }

      const optimisticPoll: PollData = {
        ...poll,
        participants: updatedParticipants,
      };
      onUpdatePoll(optimisticPoll);

      // Persist asynchronously to API
      setSaveState("saving");
      try {
        const response = await fetch(`/api/polls/${poll.slug}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: guestName || currentUserParticipant.name,
            timezone: viewerTimezone,
            slots: nextSlots,
          }),
        });
        if (!response.ok) {
          const failure = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(calmFailure(failure.error, "Not saved. Try again."));
        }
        const data = await response.json();
        onUpdatePoll(data.poll as PollData);
        setSaveState("saved");
      } catch (error) {
        setSaveDetail(
          calmFailure(
            error instanceof Error ? error.message : "",
            "Not saved. Try again."
          )
        );
        setSaveState("error");
      }
    },
    [currentUserParticipant, guestName, onUpdatePoll, poll, viewerTimezone]
  );

  const getRectangularSlotKeys = useCallback(
    (startKey: string, endKey: string): string[] => {
      const [startDate, startTime] = startKey.split("T");
      const [endDate, endTime] = endKey.split("T");
      const d1 = poll.candidateDates.indexOf(startDate);
      const d2 = poll.candidateDates.indexOf(endDate);

      if (poll.pollMode === "full_days" || startTime === "ALLDAY") {
        if (d1 === -1 || d2 === -1) return [endKey];
        const minD = Math.min(d1, d2);
        const maxD = Math.max(d1, d2);
        return poll.candidateDates
          .slice(minD, maxD + 1)
          .map((d) => `${d}TALLDAY`);
      }

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
    [poll.candidateDates, poll.pollMode, dayTimes]
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
      } else if (
        (e.key === "2" || e.key.toLowerCase() === "i") &&
        poll.allowIfNeeded !== false
      ) {
        onChangeBrush("if_needed");
      } else if (e.key === "3" || e.key.toLowerCase() === "e") {
        onChangeBrush("clear");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onChangeBrush, poll.allowIfNeeded]);

  const handleCellPointerDown = (
    slotKey: string,
    e: React.PointerEvent<HTMLElement>,
    forceActiveBrush = false
  ) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const currentVal = currentUserParticipant?.slots[slotKey];

    let effectiveBrush: BrushMode = activeBrush;
    if (e.shiftKey && poll.allowIfNeeded !== false) {
      effectiveBrush = "if_needed";
    } else if (
      !forceActiveBrush &&
      activeBrush !== "clear" &&
      currentVal === activeBrush
    ) {
      effectiveBrush = "clear";
    }

    e.currentTarget.setPointerCapture?.(e.pointerId);
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

  const handleLockSlot = async (windowToLock?: RankedWindow) => {
    const target = windowToLock || activeRankedWindow;
    if (!target) return;
    const date = formatDateHeader(target.date).fullLabel;
    const time =
      poll.pollMode === "full_days"
        ? "All day"
        : `${
            formatMinutesToDisplay(
              target.startTimeMinutes,
              viewerTimezone,
              poll.timezone,
              true
            ).timeLabel
          }–${
            formatMinutesToDisplay(
              target.endTimeMinutes,
              viewerTimezone,
              poll.timezone,
              true
            ).timeLabel
          }`;
    if (
      !window.confirm(
        `Lock ${date} · ${time} for ${target.totalAttendingCount} attending?`
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/polls/${poll.slug}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "LOCKED",
          lockedSlotStart: target.startSlotKey,
          lockedSlotEnd: target.endSlotKey,
        }),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        window.alert(
          calmFailure(failure.error, "Couldn’t lock the time. Try again.")
        );
        return;
      }
      const data = await response.json();
      onUpdatePoll(data.poll as PollData);
      setMobileDrawerOpen(false);
    } catch {
      window.alert("Couldn’t lock the time. Try again.");
    }
  };

  const handleUnlockPoll = async () => {
    try {
      const response = await fetch(`/api/polls/${poll.slug}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "OPEN" }),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        window.alert(
          calmFailure(failure.error, "Couldn’t unlock the poll. Try again.")
        );
        return;
      }
      const data = await response.json();
      onUpdatePoll(data.poll as PollData);
    } catch {
      window.alert("Couldn’t unlock the poll. Try again.");
    }
  };

  const handleDurationChange = (newDuration: number) => {
    onUpdatePoll({
      ...poll,
      durationMinutes: newDuration,
    });
    setSelectedWindowId(null);
    fetch(`/api/polls/${poll.slug}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: poll.status,
        durationMinutes: newDuration,
      }),
    }).catch(() => {});
  };

  const handleCopyShareLink = async () => {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/p/${poll.slug}`
        : `https://slotted.app/p/${poll.slug}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2200);
        return;
      } catch {}
    }
    window.prompt("Copy the link below.", url);
    setCopiedLink(false);
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyingPassword(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/polls/${poll.slug}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordAttempt }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        valid?: boolean;
        error?: string;
      };
      if (res.ok && data.valid) {
        await onReloadPoll();
      } else {
        setPasswordError(
          calmFailure(data.error, "Couldn’t check that password. Try again.")
        );
      }
    } catch {
      setPasswordError("Couldn’t check that password. Try again.");
    } finally {
      setVerifyingPassword(false);
    }
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

  const currentTzOption = getTimezoneInfo(
    viewerTimezone,
    poll.candidateDates[0]
  );

  const getCellMetrics = (slotKey: string) => {
    let availableCount = 0;
    let ifNeededCount = 0;

    const participantsToEvaluate = hideGroupResponses
      ? poll.participants.filter((p) => p.id === currentUserParticipant?.id)
      : poll.participants;

    for (const p of participantsToEvaluate) {
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

    const totalParticipants = participantsToEvaluate.length;
    const userState: AvailabilityState | undefined = previewSlotKeys.has(
      slotKey
    )
      ? dragBrushUsed === "clear"
        ? undefined
        : dragBrushUsed
      : currentUserParticipant?.slots[slotKey];

    const isInActiveWindow =
      !hideGroupResponses &&
      (activeRankedWindow?.slotKeys.includes(slotKey) ?? false);
    const isFirstOfActiveWindow =
      !hideGroupResponses && activeRankedWindow?.startSlotKey === slotKey;

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

  const focusGridCell = (slotKey: string) => {
    setFocusedCellKey(slotKey);
    requestAnimationFrame(() => {
      const cells = gridRef.current?.querySelectorAll<HTMLElement>(
        "[data-grid-cell='true']"
      );
      Array.from(cells || [])
        .find((cell) => cell.dataset.slotKey === slotKey)
        ?.focus();
    });
  };

  const handleGridCellKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    dateIndex: number,
    rowIndex: number,
    slotKey: string
  ) => {
    let nextDate = dateIndex;
    let nextRow = rowIndex;
    if (event.key === "ArrowLeft") nextDate -= 1;
    else if (event.key === "ArrowRight") nextDate += 1;
    else if (event.key === "ArrowUp") nextRow -= 1;
    else if (event.key === "ArrowDown") nextRow += 1;
    else if (event.key === "Home") nextDate = 0;
    else if (event.key === "End") nextDate = poll.candidateDates.length - 1;
    else if (event.key === "PageUp") nextRow = 0;
    else if (event.key === "PageDown") nextRow = dayTimes.length - 1;
    else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      void applySlotsToCurrentUser([slotKey], "clear");
      return;
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      void applySlotsToCurrentUser(
        [slotKey],
        event.shiftKey && poll.allowIfNeeded !== false
          ? "if_needed"
          : activeBrush
      );
      return;
    } else {
      return;
    }
    event.preventDefault();
    nextDate = Math.max(0, Math.min(poll.candidateDates.length - 1, nextDate));
    nextRow = Math.max(0, Math.min(dayTimes.length - 1, nextRow));
    focusGridCell(
      makeSlotKey(poll.candidateDates[nextDate], dayTimes[nextRow])
    );
  };

  /* =========================================================
     PASSWORD PROTECTION GATE (Matching Rounded-[24px] Modal)
     ========================================================= */
  if (poll.requiresPassword) {
    return (
      <div className="mx-auto flex min-h-[65dvh] max-w-md items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full overflow-hidden rounded-2xl border border-[#DDDAD1] bg-white shadow-sm"
        >
          <div className="p-6 sm:p-7 space-y-4">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FAF9F6] border border-[#E4E2DA] text-[#141413]">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#141413]">
                {poll.title}
              </h1>
              <p className="mt-1 text-xs font-mono text-[#575550]">
                Enter the password to join this poll.
              </p>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-3 pt-1">
              <input
                type="password"
                aria-label="Password"
                value={passwordAttempt}
                onChange={(e) => setPasswordAttempt(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3.5 py-2.5 font-mono text-sm text-[#141413] placeholder:text-[#8A8780] focus:border-[#141413] focus:bg-white focus:outline-none"
                autoFocus
              />
              <div className="min-h-5" aria-live="polite">
              {passwordError && (
                <p role="alert" className="text-xs text-rose-700">
                  {passwordError}
                </p>
              )}
              </div>
              <button
                type="submit"
                disabled={verifyingPassword}
                className="w-full rounded-xl bg-[#141413] py-2.5 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
              >
                {verifyingPassword ? "Verifying…" : "Open poll"}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-5">
      {/* Floating Cursor Duration Pill while drag-painting on Desktop */}
      {isDragging && dragBadgeText && cursorPos && (
        <div
          style={{
            left: cursorPos.x + 14,
            top: cursorPos.y + 14,
          }}
          className="pointer-events-none fixed z-50 hidden md:flex items-center gap-2 rounded-full border border-[#141413] bg-[#141413] px-3 py-1 font-mono text-xs text-[#F6F5F2] tabular-nums shadow-md"
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

      {/* =========================================================
          INSTANT SHARE MICROANIMATION BANNER (When Poll Is Created)
         ========================================================= */}
      <AnimatePresence>
        {showCreatedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-emerald-600/35 bg-emerald-500/[0.08] px-5 py-3.5"
          >
            <div className="flex items-center gap-3">
              <motion.span
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white"
              >
                <Check className="h-4 w-4" />
              </motion.span>
              <div>
                <div className="font-mono text-xs font-semibold text-[#141413]">
                  Link copied to clipboard — ready to paste
                </div>
                <div className="font-mono text-[11px] text-[#575550]">
                  Send <span className="underline">slotted.app/p/{poll.slug}</span> to your group, or paint your own hours below.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-3.5 py-2 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowCreatedBanner(false)}
                className="rounded-xl p-1.5 text-[#575550] hover:bg-black/5 cursor-pointer"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================
          COHESIVE ROUNDED-[24PX] POLL HEADER CARD
         ========================================================= */}
      {poll.status === "OPEN" && (
      <div className="rounded-2xl border border-[#DDDAD1] bg-white p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#171715] px-3 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-[#F6F5F2]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Open
              </span>

              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#141413]">
                {poll.title}
              </h1>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs text-[#575550]">
              <span>Hosted by {poll.hostName}</span>
              <span>·</span>
              <span>{poll.candidateDates.length} days</span>
              {formatRecurrenceSummary(poll.recurrenceRule) ? (
                <>
                  <span>·</span>
                  <span>{formatRecurrenceSummary(poll.recurrenceRule)}</span>
                </>
              ) : null}
              <span>·</span>
              <span>
                {currentTzOption.shortCode} ({currentTzOption.utcLabel})
              </span>
              {poll.hasPassword && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-emerald-800">
                    <KeyRound className="h-3 w-3" /> Password protected
                  </span>
                </>
              )}
              {poll.visibilityMode !== "public" && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-amber-800">
                    <EyeOff className="h-3 w-3" />
                    {poll.visibilityMode === "hidden_until_voted"
                      ? "Hidden until you vote"
                      : "Host-only visibility"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Controls: Duration, Timezone & Share Link */}
          <div className="flex flex-wrap items-center gap-2">
            {poll.canManagePoll && (
              <DurationControls
                pollMode={poll.pollMode || "dates_and_hours"}
                durationMinutes={poll.durationMinutes}
                maxMinutes={
                  poll.pollMode === "full_days"
                    ? Math.max(1440, poll.candidateDates.length * 1440)
                    : Math.max(30, (poll.dayEndHour - poll.dayStartHour) * 60)
                }
                onChange={handleDurationChange}
                layout="inline"
              />
            )}

            <TimezoneCombobox
              value={viewerTimezone}
              onChange={onChangeViewerTimezone}
              referenceDateIso={poll.candidateDates[0]}
              ariaLabel="Select timezone"
              variant="compact"
            />

            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-4 py-2 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Link copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* =========================================================
          MAIN WORKSPACE: EITHER LOCKED CARD OR TWO-COLUMN AVAILABILITY LAYOUT
         ========================================================= */}
      {poll.status === "LOCKED" && activeRankedWindow ? (
        <ArcEaselTicket
          poll={poll}
          lockedWindow={activeRankedWindow}
          viewerTimezone={viewerTimezone}
          onUnlock={handleUnlockPoll}
          canManage={Boolean(poll.canManagePoll)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-start">
          {/* LEFT 8 COLS: AVAILABILITY CARD (rounded-[24px]) */}
          <div className="lg:col-span-8 rounded-[24px] border border-[#E4E2DA] bg-white p-4 sm:p-6">
            {/* Inline Identity & Brush Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E4E2DA]">
              {/* Left: Your Name Input */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#8A8780]">
                  Your name:
                </span>
                <input
                  type="text"
                  aria-label="Your name"
                  value={guestName}
                  onChange={(e) => onChangeGuestName(e.target.value)}
                  placeholder="Alex"
                  className="w-32 rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3 py-1.5 font-mono text-xs font-semibold text-[#141413] focus:border-[#141413] focus:bg-white focus:outline-none"
                />
                <span
                  role="status"
                  aria-live="polite"
                  className={`text-xs ${
                    saveState === "error" ? "text-rose-700" : "text-[#6F6C65]"
                  }`}
                >
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                      ? "Saved"
                      : saveState === "error"
                        ? saveDetail
                        : ""}
                </span>
              </div>

              {/* Right: Brush Mode Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeBrush("available")}
                  aria-pressed={activeBrush === "available"}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition cursor-pointer ${
                    activeBrush === "available"
                      ? "bg-emerald-600 text-white"
                      : "bg-[#FAF9F6] border border-[#E4E2DA] text-[#575550] hover:text-[#141413]"
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
                </button>

                {poll.allowIfNeeded !== false && (
                  <button
                    type="button"
                    onClick={() => onChangeBrush("if_needed")}
                    aria-pressed={activeBrush === "if_needed"}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition cursor-pointer ${
                      activeBrush === "if_needed"
                        ? "bg-amber-500 text-[#141413] font-semibold"
                        : "bg-[#FAF9F6] border border-[#E4E2DA] text-[#575550] hover:text-[#141413]"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    <span>If needed</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onChangeBrush("clear")}
                  aria-pressed={activeBrush === "clear"}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-xs font-medium transition cursor-pointer ${
                    activeBrush === "clear"
                      ? "bg-[#141413] text-white"
                      : "bg-[#FAF9F6] border border-[#E4E2DA] text-[#575550] hover:text-[#141413]"
                  }`}
                >
                  <Eraser className="h-3.5 w-3.5" />
                  <span>Erase</span>
                </button>
              </div>
            </div>

            {poll.pollMode === "full_days" ? (
              /* =========================================================
                 FULL-DAYS MULTI-DATE AVAILABILITY MATRIX (Holidays / Trips / Offsites)
                 ========================================================= */
              <div className="space-y-3 select-none">
                <div className="flex items-center justify-between font-mono text-xs text-[#575550]">
                  <span>Click or drag across candidate days to mark availability</span>
                  <span className="text-[#8A8780]">Whole-day voting</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {poll.candidateDates.map((dateStr) => {
                    const slotKey = `${dateStr}TALLDAY`;
                    const hdr = formatDateHeader(dateStr);
                    const metrics = getCellMetrics(slotKey);
                    const ratio =
                      metrics.totalParticipants > 0
                        ? metrics.availableCount / metrics.totalParticipants
                        : 0;

                    let bgStyle: React.CSSProperties = {};
                    if (metrics.isInActiveWindow) {
                      bgStyle = {
                        backgroundColor: "rgba(16, 185, 129, 0.22)",
                      };
                    } else if (ratio > 0) {
                      const alpha = (0.06 + ratio * 0.18).toFixed(3);
                      bgStyle = {
                        backgroundColor: `rgba(16, 185, 129, ${alpha})`,
                      };
                    }

                    return (
                      <div
                        key={slotKey}
                        data-slot-key={slotKey}
                        role="button"
                        tabIndex={0}
                        onPointerDown={(e) => handleCellPointerDown(slotKey, e)}
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
                        className={`relative flex flex-col justify-between rounded-2xl border p-4 min-h-[118px] transition cursor-pointer ${
                          metrics.ifNeededCount > 0 ? "slot-hatch-mixed" : ""
                        } ${
                          metrics.isInActiveWindow
                            ? "border-emerald-700 ring-1 ring-emerald-700"
                            : "border-[#E4E2DA] bg-[#FAF9F6]/60 hover:bg-[#FAF9F6]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="block font-mono text-[11px] uppercase tracking-wider text-[#8A8780]">
                              {hdr.weekdayLong}
                            </span>
                            <span className="font-mono text-xl font-semibold text-[#141413] tabular-nums">
                              {hdr.monthShort} {hdr.dayNum}
                            </span>
                          </div>

                          <span className="rounded-full bg-white/90 border border-[#E4E2DA] px-2.5 py-0.5 font-mono text-xs font-semibold text-[#141413] tabular-nums">
                            {metrics.totalAttending}/{metrics.totalParticipants}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {metrics.isFirstOfActiveWindow && (
                              <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                                Best match
                              </span>
                            )}
                            {metrics.userState === "available" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-600/40 bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                <Check className="h-2.5 w-2.5 text-emerald-700" />
                                You: Free
                              </span>
                            )}
                            {metrics.userState === "if_needed" && (
                              <span className="rounded-full border border-amber-600/50 bg-amber-500/25 px-2.5 py-0.5 font-mono text-[10px] font-medium text-amber-950">
                                You: If needed
                              </span>
                            )}
                            {!metrics.userState && (
                              <span className="font-mono text-[11px] text-[#8A8780]">
                                Tap to mark
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
            {/* Mobile Day Switcher & Thumb Scrub Rail (< 768px) */}
            <div className="md:hidden mb-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#E4E2DA] bg-[#FAF9F6] p-1.5">
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
                        className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-1.5 font-mono text-xs transition cursor-pointer ${
                          isSelected
                            ? "bg-[#141413] text-[#F6F5F2] font-semibold"
                            : "text-[#575550]"
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
                    setMobileViewMode((v) => (v === "1day" ? "3day" : "1day"))
                  }
                  className="shrink-0 rounded-xl border border-[#E4E2DA] bg-white px-2.5 py-1.5 font-mono text-[10px] font-semibold text-[#141413]"
                >
                  {mobileViewMode === "1day" ? "All days" : "1-Day"}
                </button>
              </div>

              {mobileViewMode === "1day" && (
                <div className="rounded-2xl border border-[#E4E2DA] bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#E4E2DA] bg-[#FAF9F6] px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[#575550]">
                    <span>Tap to toggle</span>
                    <span className="text-emerald-800 font-semibold">
                      Swipe rail to paint ↕
                    </span>
                  </div>

                  <div
                    className="divide-y divide-[#E4E2DA]"
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
                            metrics.ifNeededCount > 0 ? "slot-hatch-mixed" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleMobileRowTap(slotKey)}
                            className="flex w-[74%] items-center justify-between px-3.5 py-2 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium text-[#141413] tabular-nums">
                                {disp.timeLabel}
                              </span>
                              {metrics.isFirstOfActiveWindow && (
                                <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                                  Best
                                </span>
                              )}
                              {metrics.userState === "available" && (
                                <span className="rounded-full border border-emerald-600/40 bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                  Free
                                </span>
                              )}
                              {metrics.userState === "if_needed" && (
                                <span className="rounded-full border border-amber-600/40 bg-amber-500/25 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-950">
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
                            role="button"
                            tabIndex={0}
                            aria-label={`Paint from ${disp.timeLabel} with ${
                              activeBrush === "available"
                                ? "Available"
                                : activeBrush === "if_needed"
                                  ? "If needed"
                                  : "Erase"
                            }`}
                            style={{ touchAction: "none" }}
                            onPointerDown={(e) =>
                              handleCellPointerDown(slotKey, e, true)
                            }
                            onPointerEnter={(e) =>
                              handleCellPointerEnter(slotKey, e)
                            }
                            className={`flex w-[26%] select-none items-center justify-center gap-1 border-l border-[#E4E2DA] cursor-ns-resize ${
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

            {/* Desktop & Multi-Column Availability Grid */}
            <div
              ref={gridRef}
              role="grid"
              aria-label="Availability"
              className={`${
                mobileViewMode === "1day" ? "hidden md:block" : "block"
              } relative select-none overflow-hidden rounded-2xl border border-[#E4E2DA] bg-white`}
            >
              {/* Column Headers */}
              <div
                className="grid border-b border-[#E4E2DA] bg-[#FAF9F6]"
                style={{
                  gridTemplateColumns: `84px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                }}
              >
                <div className="flex flex-col justify-center border-r border-[#E4E2DA] px-3 py-3">
                  <span className="font-mono text-[10px] font-semibold uppercase text-[#141413] tabular-nums">
                    {currentTzOption.shortCode}
                  </span>
                  <span className="font-mono text-[10px] text-[#8A8780] tabular-nums">
                    {currentTzOption.utcLabel}
                  </span>
                </div>

                {poll.candidateDates.map((dateStr) => {
                  const hdr = formatDateHeader(dateStr);
                  const hasBestSlot =
                    !hideGroupResponses && activeRankedWindow?.date === dateStr;
                  return (
                    <div
                      key={dateStr}
                      className={`flex items-center justify-between border-r last:border-r-0 border-[#E4E2DA] px-3 py-3 ${
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
                        <span className="rounded-full bg-emerald-600/15 border border-emerald-600/30 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-900">
                          Best
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time Slots */}
              <div className="divide-y divide-[#E4E2DA]">
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
                        isHourBoundary ? "border-t border-[#D5D2C8]" : ""
                      }`}
                      style={{
                        gridTemplateColumns: `84px repeat(${poll.candidateDates.length}, minmax(0, 1fr))`,
                      }}
                    >
                      <div className="flex items-center justify-end border-r border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1.5">
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

                      {poll.candidateDates.map((dateStr, dateIdx) => {
                        const slotKey = makeSlotKey(dateStr, timeStr);
                        const metrics = getCellMetrics(slotKey);
                        const ratio =
                          metrics.totalParticipants > 0
                            ? metrics.availableCount / metrics.totalParticipants
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
                            data-grid-cell="true"
                            role="gridcell"
                            tabIndex={
                              focusedCellKey === slotKey ||
                              (!focusedCellKey && rowIdx === 0 && dateIdx === 0)
                                ? 0
                                : -1
                            }
                            aria-label={`${formatDateHeader(dateStr).fullLabel}, ${disp.timeLabel}. ${metrics.userState === "available" ? "Available for you" : metrics.userState === "if_needed" ? "If needed for you" : "Not selected"}.`}
                            onFocus={() => setFocusedCellKey(slotKey)}
                            onPointerDown={(e) =>
                              handleCellPointerDown(slotKey, e)
                            }
                            onPointerEnter={(e) =>
                              handleCellPointerEnter(slotKey, e)
                            }
                            onKeyDown={(e) =>
                              handleGridCellKeyDown(
                                e,
                                dateIdx,
                                rowIdx,
                                slotKey
                              )
                            }
                            style={bgStyle}
                            className={`group relative flex h-9 items-center justify-between border-r last:border-r-0 border-[#E4E2DA] px-2 cursor-pointer ${
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
                                ? "ring-1 ring-inset ring-emerald-700 z-10"
                                : "hover:bg-[#FAF9F6]"
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {metrics.isFirstOfActiveWindow && (
                                <span className="rounded-full bg-emerald-700 px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                                  Best time
                                </span>
                              )}

                              {!metrics.isFirstOfActiveWindow &&
                                metrics.userState === "available" && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-600/40 bg-emerald-600/15 px-1.5 py-0.5 font-mono text-[10px] font-medium text-emerald-950">
                                    <Check className="h-2.5 w-2.5 text-emerald-700" />
                                    <span className="hidden xl:inline">
                                      You
                                    </span>
                                  </span>
                                )}

                              {!metrics.isFirstOfActiveWindow &&
                                metrics.userState === "if_needed" && (
                                  <span className="rounded-full border border-amber-600/50 bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-amber-950">
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

                              {!hideGroupResponses && <button
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
                              </button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Slot Local-Time Inspector */}
            {inspectedSlotDetails && (
              <div className="mt-3 rounded-2xl border border-[#E4E2DA] bg-[#FAF9F6] p-4">
                <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-2">
                  <span className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                    {inspectedSlotDetails.dateHdr.fullLabel} ·{" "}
                    {inspectedSlotDetails.viewerTime.timeLabel} (
                    {currentTzOption.shortCode})
                  </span>
                  <button
                    type="button"
                    onClick={() => setInspectedSlotKey(null)}
                    className="rounded-lg p-1 text-[#575550] hover:bg-[#EFECE6] cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                        className="rounded-xl border border-[#E4E2DA] bg-white p-2.5 font-mono text-xs"
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
                            <span className="text-amber-700">◐ If needed</span>
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
              </>
            )}
          </div>

          {/* RIGHT 4 COLS: CONSENSUS & RESPONDERS CARD (rounded-[24px]) */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Best Times Card */}
            <div className="rounded-[24px] border border-[#E4E2DA] bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-[#575550]" />
                  Best times
                </span>
                <span className="font-mono text-xs text-[#8A8780] tabular-nums">
                  {formatDurationBadge(poll.durationMinutes, poll.pollMode)}
                </span>
              </div>

              {hideGroupResponses ? (
                <div className="py-6 text-center font-mono text-xs text-[#575550]">
                  {poll.visibilityMode === "hidden_until_voted"
                    ? "Paint at least one available slot on the grid to reveal group overlap."
                    : "Responses are visible only to the poll organizer."}
                </div>
              ) : rankedWindows.length === 0 ? (
                <div className="py-6 text-center font-mono text-xs text-[#8A8780]">
                  Paint your available hours on the grid to see the best times.
                </div>
              ) : (
                <div className="mt-3.5 space-y-2.5">
                  {rankedWindows.slice(0, 4).map((w, idx) => {
                    const hdr = formatDateHeader(w.date);
                    const endHdr =
                      w.endDate && w.endDate !== w.date
                        ? formatDateHeader(w.endDate)
                        : null;
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
                    const windowLabel = w.isFullDaysWindow
                      ? endHdr
                        ? `${hdr.weekdayShort} ${hdr.dayNum} – ${endHdr.weekdayShort} ${endHdr.dayNum} (${w.daysCount || 1}d)`
                        : `${hdr.weekdayLong}, ${hdr.monthShort} ${hdr.dayNum}`
                      : `${hdr.weekdayShort} ${hdr.dayNum} · ${sDisp.timeLabel}–${eDisp.timeLabel}`;

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
                        className={`rounded-2xl border p-3.5 transition cursor-pointer ${
                          isSelected
                            ? "border-[#141413] bg-[#FAF9F6]"
                            : "border-[#E4E2DA] bg-white hover:bg-[#FAF9F6]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums">
                          <span className="font-semibold text-[#141413]">
                            #{idx + 1} {windowLabel}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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

                        {isSelected && poll.canManagePoll && (
                          <div className="mt-3 flex items-center justify-end border-t border-[#E4E2DA] pt-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLockSlot(w);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-[#141413] px-3.5 py-1.5 font-mono text-xs font-semibold text-[#F6F5F2] hover:bg-emerald-700 transition cursor-pointer"
                            >
                              <Lock className="h-3 w-3" />
                              Lock time
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Responders Card */}
            <div className="rounded-[24px] border border-[#E4E2DA] bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#E4E2DA] pb-3">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#141413] flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#575550]" />
                  Responded ({poll.participants.length})
                </span>
                <div className="flex items-center gap-2">
                  {isolatedParticipantId && (
                    <button
                      type="button"
                      onClick={() => setIsolatedParticipantId(null)}
                      className="font-mono text-[10px] text-[#141413] underline cursor-pointer"
                    >
                      Show all
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                {poll.participants.map((p) => {
                  const isIsolated = isolatedParticipantId === p.id;
                  const slotCount = Object.keys(p.slots).length;
                  const tz = getTimezoneInfo(p.timezone, poll.candidateDates[0]);
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
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left font-mono text-xs transition cursor-pointer ${
                        isIsolated
                          ? "border-[#141413] bg-[#FAF9F6]"
                          : "border-transparent hover:border-[#E4E2DA] hover:bg-[#FAF9F6]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Avatar seed={p.id} name={p.name} />
                        <span className="font-medium text-[#141413]">
                          {p.isCurrentUser ? guestName || p.name : p.name}
                        </span>
                        <span className="text-[10px] text-[#8A8780]">
                          {p.city} ({tz.shortCode})
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#8A8780] tabular-nums">
                        {isIsolated && <Eye className="h-3 w-3 text-[#141413]" />}
                        {slotCount} slots
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Bar (< 768px) */}
      {poll.status === "OPEN" &&
        poll.canManagePoll &&
        activeRankedWindow &&
        !hideGroupResponses && (
        <div className="md:hidden sticky bottom-2 z-30 mt-3">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-2xl border border-[#141413] bg-[#141413] px-4 py-3 text-left font-mono text-xs text-[#F6F5F2] shadow-lg"
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
            <span className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[11px]">
              {mobileDrawerOpen ? "Close" : "Lock time"}
              <ChevronRight className="h-3 w-3" />
            </span>
          </button>

          {mobileDrawerOpen && (
            <div className="mt-2 rounded-2xl border border-[#E4E2DA] bg-white p-4 shadow-xl">
              <div className="space-y-2">
                {rankedWindows.slice(0, 3).map((w, i) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] p-2.5 font-mono text-xs"
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
                      className="rounded-lg bg-[#141413] px-3 py-1.5 text-[11px] font-semibold text-white"
                    >
                      Lock time
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
