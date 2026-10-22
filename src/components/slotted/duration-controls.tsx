"use client";

import type { PollMode } from "@/lib/slotted-data";

const HOUR_PRESETS = [
  { mins: 15, label: "15m" },
  { mins: 30, label: "30m" },
  { mins: 45, label: "45m" },
  { mins: 60, label: "1h" },
  { mins: 90, label: "90m" },
  { mins: 120, label: "2h" },
];

export function DurationControls({
  pollMode,
  durationMinutes,
  onChange,
  maxMinutes,
  layout = "grid",
}: {
  pollMode: PollMode;
  durationMinutes: number;
  onChange: (minutes: number) => void;
  maxMinutes: number;
  layout?: "grid" | "inline";
}) {
  const safeMax = Math.max(pollMode === "full_days" ? 1440 : 5, maxMinutes);

  if (pollMode === "full_days") {
    const days = Math.max(1, Math.round(durationMinutes / 1440));
    const maxDays = Math.max(1, Math.floor(safeMax / 1440));
    const dayPresets = [1, 2, 3].filter((day) => day <= maxDays);
    return (
      <div className={layout === "inline" ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
        <div
          className={
            layout === "inline"
              ? "inline-flex items-center rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] p-1 font-mono text-xs tabular-nums"
              : "flex flex-wrap gap-1.5"
          }
        >
          {dayPresets.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day * 1440)}
              className={chipClass(layout, durationMinutes === day * 1440)}
            >
              {layout === "inline" ? `${day}d` : day === 1 ? "1 day" : `${day} days`}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 font-mono text-xs text-[#575550]">
          <span>Custom</span>
          <input
            type="number"
            min={1}
            max={maxDays}
            inputMode="numeric"
            aria-label="Custom duration in days"
            value={Math.min(days, maxDays)}
            onChange={(event) => {
              const nextDays = Math.round(Number(event.target.value));
              if (!Number.isFinite(nextDays) || nextDays <= 0) return;
              onChange(Math.min(maxDays, nextDays) * 1440);
            }}
            className="w-16 rounded-lg border border-[#E4E2DA] bg-white px-2 py-1 text-[#141413] tabular-nums"
          />
          <span>days</span>
        </label>
      </div>
    );
  }

  return (
    <div className={layout === "inline" ? "flex flex-wrap items-center gap-2" : "space-y-2"}>
      <div
        className={
          layout === "inline"
            ? "inline-flex flex-wrap items-center rounded-xl border border-[#E4E2DA] bg-[#FAF9F6] p-1 font-mono text-xs tabular-nums"
            : "grid grid-cols-3 gap-1.5 sm:grid-cols-6"
        }
      >
        {HOUR_PRESETS.filter((preset) => preset.mins <= safeMax).map((preset) => (
          <button
            key={preset.mins}
            type="button"
            onClick={() => onChange(preset.mins)}
            className={chipClass(layout, durationMinutes === preset.mins)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="inline-flex items-center gap-2 font-mono text-xs text-[#575550]">
        <span>Custom</span>
        <input
          type="number"
          min={5}
          max={safeMax}
          step={5}
          inputMode="numeric"
          aria-label="Custom meeting duration in minutes"
          value={durationMinutes}
          onChange={(event) => {
            const next = Math.round(Number(event.target.value));
            if (!Number.isFinite(next) || next <= 0) return;
            onChange(Math.min(safeMax, next));
          }}
          className="w-20 rounded-lg border border-[#E4E2DA] bg-white px-2 py-1 text-[#141413] tabular-nums"
        />
        <span>min</span>
      </label>
    </div>
  );
}

function chipClass(layout: "grid" | "inline", active: boolean): string {
  if (layout === "inline") {
    return `cursor-pointer rounded-lg px-2.5 py-1 transition ${
      active
        ? "bg-[#141413] font-semibold text-[#F6F5F2]"
        : "text-[#575550] hover:text-[#141413]"
    }`;
  }
  return `cursor-pointer rounded-xl border py-1.5 text-center tabular-nums transition ${
    active
      ? "border-[#141413] bg-[#141413] font-semibold text-[#F6F5F2]"
      : "border-[#E4E2DA] bg-[#FAF9F6] text-[#575550] hover:text-[#141413]"
  }`;
}
