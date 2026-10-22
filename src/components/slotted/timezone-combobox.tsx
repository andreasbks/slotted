"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useId,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";
import {
  getBrowserTimezone,
  getTimezoneInfo,
  searchTimezones,
} from "@/lib/slotted-data";

interface TimezoneComboboxProps {
  value: string;
  onChange: (nextTimezoneId: string) => void;
  referenceDateIso?: string;
  ariaLabel?: string;
  variant?: "light" | "dark" | "compact";
  align?: "left" | "right";
  className?: string;
}

interface PanelPlacement {
  left: number;
  width: number;
  maxHeight: number;
  top: number;
}

export function TimezoneCombobox({
  value,
  onChange,
  referenceDateIso,
  ariaLabel = "Select timezone",
  variant = "light",
  align = "right",
  className = "",
}: TimezoneComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const [browserTz] = useState<string>(() => getBrowserTimezone());

  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedInfo = useMemo(
    () => getTimezoneInfo(value, referenceDateIso),
    [value, referenceDateIso]
  );

  const options = useMemo(
    () => searchTimezones(query, referenceDateIso, value, 45),
    [query, referenceDateIso, value]
  );

  const closePopover = useCallback((returnFocus = false) => {
    setOpen(false);
    setPlacement(null);
    setQuery("");
    if (returnFocus) {
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const measure = useCallback((): PanelPlacement | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const width = Math.min(360, window.innerWidth - margin * 2);
    const maxPanel = Math.min(320, window.innerHeight - margin * 2);
    const above = rect.top - gap - margin;
    let top = rect.bottom + gap;
    let height = Math.min(maxPanel, window.innerHeight - margin - top);
    if (height < 180 && above > height) {
      height = Math.min(maxPanel, above);
      top = rect.top - gap - height;
    }
    top = Math.max(margin, Math.floor(top));
    height = Math.min(height, window.innerHeight - margin - top);
    height = Math.max(0, Math.floor(height));
    const preferredLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(margin, preferredLeft),
      Math.max(margin, window.innerWidth - width - margin)
    );
    return { left: Math.floor(left), width, maxHeight: height, top };
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      nudgedTrigger.current = false;
      return;
    }
    let frame = 0;
    const tick = () => {
      const trigger = triggerRef.current;
      if (trigger && !nudgedTrigger.current) {
        const rect = trigger.getBoundingClientRect();
        if (rect.top < 8 || rect.bottom > window.innerHeight - 16) {
          trigger.scrollIntoView({ block: "center", inline: "nearest" });
        }
        nudgedTrigger.current = true;
      }
      const next = measure();
      setPlacement((current) => {
        if (!next) return current;
        if (
          current &&
          current.left === next.left &&
          current.width === next.width &&
          current.maxHeight === next.maxHeight &&
          current.top === next.top
        ) {
          return current;
        }
        return next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [open, measure]);

  const didFocusPanel = useRef(false);
  const nudgedTrigger = useRef(false);
  useEffect(() => {
    if (!open) {
      didFocusPanel.current = false;
      return;
    }
    if (!placement || didFocusPanel.current) return;
    inputRef.current?.focus();
    didFocusPanel.current = true;
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closePopover(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePopover(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, closePopover]);

  const handleSelect = (tzId: string) => {
    onChange(tzId);
    closePopover(true);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0 ? 0 : (prev + 1) % options.length
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        options.length === 0
          ? 0
          : (prev - 1 + options.length) % options.length
      );
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(Math.max(0, options.length - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = options[activeIndex];
      if (target) {
        handleSelect(target.id);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closePopover(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const activeEl = list?.querySelector<HTMLElement>(
      `[data-tz-index="${activeIndex}"]`
    );
    if (!list || !activeEl) return;
    const top = activeEl.offsetTop;
    const bottom = top + activeEl.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }, [activeIndex, open, placement]);

  const triggerClassName =
    variant === "dark"
      ? "inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 font-mono text-xs text-[#FAF9F6] tabular-nums hover:bg-black/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition cursor-pointer"
      : variant === "compact"
        ? "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1 font-mono text-[11px] font-medium text-[#141413] tabular-nums hover:border-[#141413] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#141413] transition cursor-pointer"
        : "inline-flex max-w-full items-center gap-1.5 rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-3 py-2 font-mono text-xs font-medium text-[#141413] tabular-nums hover:border-[#141413] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#141413] transition cursor-pointer";

  const activeOption = options[activeIndex];

  return (
    <div ref={containerRef} className={`relative inline-flex min-w-0 max-w-full text-left ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => {
          setOpen((prev) => {
            const next = !prev;
            if (next) {
              setActiveIndex(0);
              triggerRef.current?.scrollIntoView({ block: "nearest" });
              setPlacement(measure());
            } else {
              setPlacement(null);
            }
            return next;
          });
        }}
        className={triggerClassName}
      >
        <Globe
          className={`h-3.5 w-3.5 shrink-0 ${
            variant === "dark" ? "text-white/75" : "text-[#575550]"
          }`}
        />
        <span className="max-w-[6.5rem] truncate sm:max-w-[210px]">
          {selectedInfo.city} ({selectedInfo.shortCode} ·{" "}
          {selectedInfo.utcLabel})
        </span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          } ${variant === "dark" ? "text-white/70" : "text-[#8A8780]"}`}
        />
      </button>

      {open && placement
        ? createPortal(
        <div
          ref={panelRef}
          data-timezone-panel
          style={{
            position: "fixed",
            left: placement.left,
            width: placement.width,
            height: placement.maxHeight,
            maxHeight: placement.maxHeight,
            top: placement.top,
            zIndex: 80,
          }}
          className="flex flex-col overflow-hidden rounded-2xl border border-[#E4E2DA] bg-white p-2.5 text-[#141413] shadow-[0_20px_50px_rgba(20,20,19,0.22)]"
        >
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-[#8A8780]" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-label="Search timezones"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                activeOption
                  ? `${listboxId}-opt-${activeOption.id.replace(/[^a-zA-Z0-9]/g, "-")}`
                  : undefined
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search city, IANA zone, or UTC..."
              className="w-full rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] pl-8 pr-7 py-1.5 font-mono text-xs text-[#141413] placeholder:text-[#8A8780] focus:border-[#141413] focus:bg-white focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="Clear timezone search"
                onClick={() => {
                  setQuery("");
                  setActiveIndex(0);
                  inputRef.current?.focus();
                }}
                className="absolute right-2 rounded p-0.5 text-[#8A8780] hover:text-[#141413] cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </div>

          {browserTz && browserTz !== value && !query ? (
            <button
              type="button"
              onClick={() => handleSelect(browserTz)}
              className="mt-1.5 flex w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] px-2.5 py-1.5 text-left font-mono text-[11px] text-[#141413] hover:border-[#141413] cursor-pointer"
            >
              <span className="min-w-0 truncate">
                Use current zone ({getTimezoneInfo(browserTz, referenceDateIso).city})
              </span>
              <span className="text-[#575550] tabular-nums">
                {getTimezoneInfo(browserTz, referenceDateIso).utcLabel}
              </span>
            </button>
          ) : null}

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="Matching timezones"
            className="mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain divide-y divide-[#F2F0E9]"
          >
            {options.length === 0 ? (
              <div className="px-3 py-4 text-center font-mono text-xs text-[#8A8780]">
                No matching timezone found
              </div>
            ) : (
              options.map((tz, idx) => {
                const isSelected = tz.id === value;
                const isActive = idx === activeIndex;
                const optionDomId = `${listboxId}-opt-${tz.id.replace(/[^a-zA-Z0-9]/g, "-")}`;
                return (
                  <div
                    key={tz.id}
                    id={optionDomId}
                    data-tz-index={idx}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => handleSelect(tz.id)}
                    className={`flex min-w-0 items-center justify-between gap-2 rounded-xl px-2.5 py-2 font-mono text-xs transition cursor-pointer ${
                      isActive
                        ? "bg-[#141413] text-[#F6F5F2]"
                        : isSelected
                          ? "bg-[#FAF9F6] font-semibold text-[#141413]"
                          : "text-[#141413] hover:bg-[#FAF9F6]"
                    }`}
                  >
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-medium truncate">{tz.city}</span>
                        <span
                          className={`text-[10px] ${
                            isActive ? "text-white/70" : "text-[#8A8780]"
                          }`}
                        >
                          {tz.id}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <span
                        className={`text-[11px] ${
                          isActive ? "text-white/90" : "text-[#575550]"
                        }`}
                      >
                        {tz.shortCode} · {tz.utcLabel}
                      </span>
                      {isSelected ? (
                        <Check
                          className={`h-3.5 w-3.5 ${
                            isActive ? "text-emerald-400" : "text-emerald-600"
                          }`}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )
        : null}
    </div>
  );
}
