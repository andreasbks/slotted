"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateHeader } from "@/lib/slotted-data";

interface CalendarPickerProps {
  selectedDates: string[];
  onChangeDates: (nextDates: string[]) => void;
  minDateIso: string;
  maxMonthsAhead?: number;
}

interface CalendarCell {
  iso: string;
  dayNum: number;
  inCurrentMonth: boolean;
  isDisabled: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

const WEEKDAY_HEADERS = [
  { short: "Mon", full: "Monday" },
  { short: "Tue", full: "Tuesday" },
  { short: "Wed", full: "Wednesday" },
  { short: "Thu", full: "Thursday" },
  { short: "Fri", full: "Friday" },
  { short: "Sat", full: "Saturday" },
  { short: "Sun", full: "Sunday" },
];

function parseIsoParts(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return {
    year: y || 2026,
    month: (m || 10) - 1,
    day: d || 1,
  };
}

function toIsoDate(year: number, monthZeroIndexed: number, day: number): string {
  const dt = new Date(Date.UTC(year, monthZeroIndexed, day));
  return dt.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, deltaDays: number): string {
  const { year, month, day } = parseIsoParts(iso);
  const dt = new Date(Date.UTC(year, month, day + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function expandDateRange(startIso: string, endIso: string, minDateIso: string): string[] {
  const a = startIso <= endIso ? startIso : endIso;
  const b = startIso <= endIso ? endIso : startIso;
  const result: string[] = [];
  let cursor = a < minDateIso ? minDateIso : a;
  let safety = 0;
  while (cursor <= b && safety < 366) {
    result.push(cursor);
    cursor = addDaysIso(cursor, 1);
    safety += 1;
  }
  return result;
}

export function CalendarPicker({
  selectedDates,
  onChangeDates,
  minDateIso,
  maxMonthsAhead = 36,
}: CalendarPickerProps) {
  const minParts = useMemo(() => parseIsoParts(minDateIso), [minDateIso]);
  const initialRefIso = selectedDates[0] || minDateIso;
  const initialParts = parseIsoParts(initialRefIso);

  const [viewYear, setViewYear] = useState<number>(initialParts.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParts.month);
  const [focusedIso, setFocusedIso] = useState<string>(initialRefIso);
  const [anchorIso, setAnchorIso] = useState<string | null>(
    selectedDates[0] || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragAction, setDragAction] = useState<"add" | "remove">("add");

  const gridRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const maxYearMonth = useMemo(() => {
    const dt = new Date(
      Date.UTC(minParts.year, minParts.month + maxMonthsAhead, 1)
    );
    return {
      year: dt.getUTCFullYear(),
      month: dt.getUTCMonth(),
    };
  }, [minParts.year, minParts.month, maxMonthsAhead]);

  const canGoPrev =
    viewYear > minParts.year ||
    (viewYear === minParts.year && viewMonth > minParts.month);

  const canGoNext =
    viewYear < maxYearMonth.year ||
    (viewYear === maxYearMonth.year && viewMonth < maxYearMonth.month);

  const navigateMonth = useCallback(
    (deltaMonths: number) => {
      const target = new Date(Date.UTC(viewYear, viewMonth + deltaMonths, 1));
      const nextY = target.getUTCFullYear();
      const nextM = target.getUTCMonth();

      const beforeMin =
        nextY < minParts.year ||
        (nextY === minParts.year && nextM < minParts.month);
      const afterMax =
        nextY > maxYearMonth.year ||
        (nextY === maxYearMonth.year && nextM > maxYearMonth.month);
      if (beforeMin || afterMax) return;

      setViewYear(nextY);
      setViewMonth(nextM);
    },
    [viewYear, viewMonth, minParts, maxYearMonth]
  );

  const monthYearLabel = useMemo(() => {
    const dt = new Date(Date.UTC(viewYear, viewMonth, 1, 12, 0, 0));
    return dt.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }, [viewYear, viewMonth]);

  const weeks = useMemo<CalendarCell[][]>(() => {
    const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1));
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstOfMonth.getUTCDay() + 6) % 7;
    const totalCells = 42;

    const cells: CalendarCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayOffset = i - startOffset + 1;
      const cellDate = new Date(Date.UTC(viewYear, viewMonth, dayOffset));
      const iso = cellDate.toISOString().slice(0, 10);
      const inCurrentMonth = cellDate.getUTCMonth() === viewMonth;
      const utcDay = cellDate.getUTCDay();
      cells.push({
        iso,
        dayNum: cellDate.getUTCDate(),
        inCurrentMonth,
        isDisabled: iso < minDateIso,
        isToday: iso === minDateIso,
        isWeekend: utcDay === 0 || utcDay === 6,
      });
    }

    const rows: CalendarCell[][] = [];
    for (let r = 0; r < cells.length; r += 7) {
      rows.push(cells.slice(r, r + 7));
    }
    return rows;
  }, [viewYear, viewMonth, minDateIso]);

  useEffect(() => {
    if (!isDragging) return;
    const stop = () => setIsDragging(false);
    window.addEventListener("pointerup", stop);
    return () => window.removeEventListener("pointerup", stop);
  }, [isDragging]);

  const toggleOrRangeSelect = useCallback(
    (iso: string, shiftKey: boolean) => {
      if (iso < minDateIso) return;
      setFocusedIso(iso);

      if (shiftKey && anchorIso) {
        const rangeDates = expandDateRange(anchorIso, iso, minDateIso);
        const merged = Array.from(new Set([...selectedDates, ...rangeDates])).sort();
        onChangeDates(merged);
        return;
      }

      setAnchorIso(iso);
      const exists = selectedSet.has(iso);
      if (exists) {
        if (selectedDates.length > 1) {
          onChangeDates(selectedDates.filter((d) => d !== iso));
        }
      } else {
        onChangeDates([...selectedDates, iso].sort());
      }
    },
    [anchorIso, minDateIso, onChangeDates, selectedDates, selectedSet]
  );

  const handleCellPointerDown = (
    cell: CalendarCell,
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    if (cell.isDisabled) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;

    if (!cell.inCurrentMonth) {
      const p = parseIsoParts(cell.iso);
      setViewYear(p.year);
      setViewMonth(p.month);
    }

    if (event.shiftKey && anchorIso) {
      toggleOrRangeSelect(cell.iso, true);
      return;
    }

    const exists = selectedSet.has(cell.iso);
    const nextAction = exists ? "remove" : "add";
    setDragAction(nextAction);
    setIsDragging(true);
    setAnchorIso(cell.iso);
    setFocusedIso(cell.iso);

    if (nextAction === "remove") {
      if (selectedDates.length > 1) {
        onChangeDates(selectedDates.filter((d) => d !== cell.iso));
      }
    } else {
      onChangeDates(
        selectedSet.has(cell.iso)
          ? selectedDates
          : [...selectedDates, cell.iso].sort()
      );
    }
  };

  const handleCellPointerEnter = (cell: CalendarCell) => {
    if (!isDragging || cell.isDisabled) return;
    if (dragAction === "remove") {
      if (selectedDates.length > 1 && selectedSet.has(cell.iso)) {
        onChangeDates(selectedDates.filter((d) => d !== cell.iso));
      }
    } else if (!selectedSet.has(cell.iso)) {
      onChangeDates([...selectedDates, cell.iso].sort());
    }
  };

  const focusDateCell = (targetIso: string) => {
    const clampedIso = targetIso < minDateIso ? minDateIso : targetIso;
    const parts = parseIsoParts(clampedIso);
    if (parts.year !== viewYear || parts.month !== viewMonth) {
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
    setFocusedIso(clampedIso);
    requestAnimationFrame(() => {
      const btn = gridRef.current?.querySelector<HTMLButtonElement>(
        `[data-calendar-iso="${clampedIso}"]`
      );
      btn?.focus();
    });
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    iso: string
  ) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusDateCell(addDaysIso(iso, -1));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusDateCell(addDaysIso(iso, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusDateCell(addDaysIso(iso, -7));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusDateCell(addDaysIso(iso, 7));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      const p = parseIsoParts(iso);
      focusDateCell(toIsoDate(p.year, p.month - 1, p.day));
    } else if (event.key === "PageDown") {
      event.preventDefault();
      const p = parseIsoParts(iso);
      focusDateCell(toIsoDate(p.year, p.month + 1, p.day));
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggleOrRangeSelect(iso, event.shiftKey);
    }
  };

  return (
    <div className="rounded-2xl border border-[#E4E2DA] bg-white p-3 sm:p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex h-7 shrink-0 items-center">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canGoPrev}
            onClick={() => navigateMonth(-1)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] text-[#141413] hover:border-[#141413] disabled:pointer-events-none disabled:opacity-35 transition cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span
            aria-live="polite"
            className="mx-1.5 inline-flex h-7 w-36 shrink-0 items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap text-center font-mono text-xs font-semibold text-[#141413] tabular-nums"
          >
            {monthYearLabel}
          </span>
          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => navigateMonth(1)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] text-[#141413] hover:border-[#141413] disabled:pointer-events-none disabled:opacity-35 transition cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="font-mono text-[11px] tabular-nums text-[#575550]">
          {selectedDates.length} {selectedDates.length === 1 ? "date" : "dates"}
        </span>
      </div>

      {/* 7-Column Accessible Calendar Grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`Calendar for ${monthYearLabel}`}
        className="select-none"
      >
        <div role="row" className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_HEADERS.map((w) => (
            <div
              key={w.short}
              role="columnheader"
              aria-label={w.full}
              className="py-1 text-center font-mono text-[10px] font-medium uppercase tracking-wider text-[#8A8780]"
            >
              {w.short}
            </div>
          ))}
        </div>

        <div className="grid gap-1">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} role="row" className="grid grid-cols-7 gap-1">
              {week.map((cell) => {
                const isSelected = selectedSet.has(cell.iso);
                const hdr = formatDateHeader(cell.iso);
                const yearNum = cell.iso.slice(0, 4);
                const isTabStop = cell.iso === focusedIso;

                return (
                  <div key={cell.iso} role="gridcell">
                    <button
                      type="button"
                      data-calendar-iso={cell.iso}
                      disabled={cell.isDisabled}
                      tabIndex={isTabStop ? 0 : -1}
                      aria-label={`${hdr.weekdayLong}, ${hdr.monthShort} ${hdr.dayNum}, ${yearNum}${
                        isSelected ? " (Selected)" : ""
                      }`}
                      aria-pressed={isSelected}
                      onFocus={() => setFocusedIso(cell.iso)}
                      onPointerDown={(e) => handleCellPointerDown(cell, e)}
                      onPointerEnter={() => handleCellPointerEnter(cell)}
                      onKeyDown={(e) => handleCellKeyDown(e, cell.iso)}
                      className={`relative flex h-9 w-full items-center justify-center rounded-xl border font-mono text-xs tabular-nums transition ${
                        cell.isDisabled
                          ? "border-transparent bg-transparent text-[#C9C6BC] cursor-not-allowed"
                          : isSelected
                            ? "border-[#141413] bg-[#141413] text-[#F6F5F2] font-semibold cursor-pointer"
                            : !cell.inCurrentMonth
                              ? "border-transparent bg-[#FAF9F6]/60 text-[#8A8780] hover:border-[#E4E2DA] cursor-pointer"
                              : cell.isWeekend
                                ? "border-[#E4E2DA] bg-[#F2F0E9]/60 text-[#575550] hover:border-[#141413]/50 cursor-pointer"
                                : "border-[#E4E2DA] bg-white text-[#141413] hover:border-[#141413]/50 cursor-pointer"
                      }`}
                    >
                      <span>{cell.dayNum}</span>
                      {cell.isToday && !isSelected ? (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-600"
                        />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
