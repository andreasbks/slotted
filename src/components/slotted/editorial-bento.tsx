"use client";

import React, { useState } from "react";
import {
  Command,
  Globe,
  Smartphone,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface EditorialBentoAndComparisonProps {
  onOpenCommandBar: () => void;
  onTriggerLockDemo: () => void;
}

export function EditorialBentoAndComparison({
  onOpenCommandBar,
  onTriggerLockDemo,
}: EditorialBentoAndComparisonProps) {
  const [flexEnabled, setFlexEnabled] = useState(true);
  const [selectedCity, setSelectedCity] = useState<"NYC" | "LDN" | "TYO">("NYC");

  const cityExamples = {
    NYC: { sf: "7:00 AM PDT", nyc: "10:00 AM EDT", ldn: "3:00 PM BST", tyo: "11:00 PM JST" },
    LDN: { sf: "9:00 AM PDT", nyc: "12:00 PM EDT", ldn: "5:00 PM BST", tyo: "1:00 AM JST" },
    TYO: { sf: "5:00 PM PDT", nyc: "8:00 PM EDT", ldn: "1:00 AM BST", tyo: "9:00 AM JST" },
  }[selectedCity];

  return (
    <div className="space-y-16 py-12">
      {/* =========================================================
          QUIET PROOF STRIP
         ========================================================= */}
      <section className="relative border-y border-[#E4E1DA] bg-[#EFECE6]/45 py-5 px-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 md:flex-row font-mono text-xs text-[#575551]">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            <span>
              <strong className="text-[#141413]">142,800+</strong> meetings scheduled without a single &ldquo;Wait, whose timezone?&rdquo; reply.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 tracking-tight text-[#141413]/60">
            <span>SF · PDT</span>
            <span>/</span>
            <span>NYC · EDT</span>
            <span>/</span>
            <span>LDN · BST</span>
            <span>/</span>
            <span>BER · CEST</span>
            <span>/</span>
            <span>TYO · JST</span>
          </div>
        </div>
      </section>

      {/* =========================================================
          ARCHITECTURAL BENTO FEATURE GRID (4-CARD LAYOUT)
         ========================================================= */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="max-w-xl">
          <span className="font-mono text-xs uppercase tracking-widest text-[#8A8780]">
            How it works
          </span>
          <h2 className="mt-2 text-3xl sm:text-[42px] font-normal leading-[1.08] tracking-[-0.035em] text-[#141413]">
            Three steps.{" "}
            <span className="font-serif italic text-emerald-800">
              Under a minute.
            </span>
          </h2>
          <p className="mt-2.5 text-base text-[#575551]">
            Everything you need to find a time, and nothing that gets in the way.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1 (2 Cols — Natural Language & Drag-to-Create) */}
          <div className="md:col-span-2 flex flex-col justify-between rounded-[22px] border border-[#E4E1DA] bg-[#EFECE6]/55 p-6 sm:p-7">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E4E1DA] px-3 py-1 font-mono text-[11px] font-medium text-[#141413]">
                  <Command className="h-3.5 w-3.5 text-emerald-700" />
                  ⌘K
                </span>
              </div>
              <h3 className="mt-4 text-xl sm:text-2xl font-medium tracking-[-0.02em] text-[#141413]">
                Type it or drag it.
              </h3>
              <p className="mt-1.5 text-sm text-[#575551]">
                Type &ldquo;Next Tue–Thu mornings&rdquo; or drag across the calendar. Your poll is live before you finish your coffee.
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-[#141413] p-4 text-[#F7F6F2] shadow-md">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs sm:text-sm">
                <span className="rounded bg-white/10 px-2 py-1 text-white">
                  Q4 Design &amp; Product Sync
                </span>
                <span className="rounded bg-emerald-500/25 border border-emerald-400/40 px-2 py-1 text-emerald-300">
                  Tue–Thu
                </span>
                <span className="rounded bg-amber-500/25 border border-amber-400/40 px-2 py-1 text-amber-200">
                  Mornings
                </span>
                <span className="rounded bg-sky-500/25 border border-sky-400/40 px-2 py-1 text-sky-200">
                  45m
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="font-mono text-[11px] text-white/60">
                  Hit ⌘K anywhere
                </span>
                <button
                  type="button"
                  onClick={onOpenCommandBar}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-400 px-3 py-1 font-mono text-[11px] font-semibold text-[#141413] hover:bg-emerald-300 transition cursor-pointer"
                >
                  New poll
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2 (1 Col — "If Needed" State) */}
          <div className="flex flex-col justify-between rounded-[22px] border border-[#E4E1DA] bg-white p-6 sm:p-7">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-600/30 px-3 py-1 font-mono text-[11px] font-medium text-amber-950">
                <Layers className="h-3.5 w-3.5 text-amber-700" />
                ◐ If needed
              </span>
              <h3 className="mt-4 text-xl font-medium tracking-[-0.02em] text-[#141413]">
                Free, or free if necessary.
              </h3>
              <p className="mt-1.5 text-sm text-[#575551]">
                Mark the hours you love in green, and the hours you can rearrange in amber. Useful when six calendars refuse to agree.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E4E1DA] bg-[#F7F6F2] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold text-[#141413]">
                  Thu 2:00 PM
                </span>
                <button
                  type="button"
                  onClick={() => setFlexEnabled((v) => !v)}
                  className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold transition cursor-pointer ${
                    flexEnabled
                      ? "bg-amber-500 text-[#141413]"
                      : "bg-[#EFECE6] text-[#575551]"
                  }`}
                >
                  {flexEnabled ? "Sora: If needed" : "Sora: Busy"}
                </button>
              </div>
              <div
                className={`mt-3 rounded-xl border p-3 transition ${
                  flexEnabled
                    ? "border-emerald-600/40 bg-emerald-500/12 slot-hatch-mixed"
                    : "border-rose-400/40 bg-rose-500/10"
                }`}
              >
                <div className="font-mono text-xs font-semibold text-[#141413] tabular-nums">
                  {flexEnabled
                    ? "5 of 6 free · +1 if needed"
                    : "5 of 6 free — missing Sora"}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 (1 Col — Automatic Timezones) */}
          <div className="flex flex-col justify-between rounded-[22px] border border-[#E4E1DA] bg-white p-6 sm:p-7">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-600/30 px-3 py-1 font-mono text-[11px] font-medium text-emerald-950">
                <Globe className="h-3.5 w-3.5 text-emerald-700" />
                Timezones
              </span>
              <h3 className="mt-4 text-xl font-medium tracking-[-0.02em] text-[#141413]">
                Everyone in their own timezone.
              </h3>
              <p className="mt-1.5 text-sm text-[#575551]">
                You propose 10am in New York. London sees 3pm. Tokyo sees 11pm. Nobody has to count on their fingers.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[#E4E1DA] bg-[#F7F6F2] p-4">
              <div className="flex gap-1 mb-2.5">
                {(["NYC", "LDN", "TYO"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedCity(c)}
                    className={`flex-1 rounded-lg py-1 font-mono text-[10px] font-semibold transition cursor-pointer ${
                      selectedCity === c
                        ? "bg-[#141413] text-[#F7F6F2]"
                        : "bg-white text-[#575551]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="space-y-1 font-mono text-[11px] tabular-nums">
                <div className="flex justify-between text-[#575551]">
                  <span>San Francisco</span>
                  <span className="text-[#141413] font-medium">{cityExamples.sf}</span>
                </div>
                <div className="flex justify-between text-[#575551]">
                  <span>New York</span>
                  <span className="text-[#141413] font-medium">{cityExamples.nyc}</span>
                </div>
                <div className="flex justify-between text-[#575551]">
                  <span>London</span>
                  <span className="text-[#141413] font-medium">{cityExamples.ldn}</span>
                </div>
                <div className="flex justify-between text-[#575551]">
                  <span>Tokyo</span>
                  <span className="text-[#141413] font-medium">{cityExamples.tyo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4 (2 Cols — Mobile Thumb Rail & Instant Lock) */}
          <div className="md:col-span-2 flex flex-col justify-between rounded-[22px] border border-[#E4E1DA] bg-[#EFECE6]/55 p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E4E1DA] px-3 py-1 font-mono text-[11px] font-medium text-[#141413]">
                <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
                Mobile &amp; Calendar
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 items-center">
              <div>
                <h3 className="text-xl sm:text-2xl font-medium tracking-[-0.02em] text-[#141413]">
                  Made for one thumb. Closed in one click.
                </h3>
                <p className="mt-2 text-sm text-[#575551] leading-relaxed">
                  Swipe down the side rail on your phone to paint a whole afternoon. Once everyone replies, lock the winning hour and send the calendar hold.
                </p>
                <button
                  type="button"
                  onClick={onTriggerLockDemo}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#141413] px-4 py-2 font-mono text-[11px] font-medium text-[#F7F6F2] hover:bg-emerald-800 transition cursor-pointer"
                >
                  Lock this time ↑
                </button>
              </div>

              <div className="rounded-2xl border border-[#CFCBC2] bg-white p-3.5 shadow-2xs">
                <div className="space-y-1.5">
                  {[
                    { t: "10:00 AM", state: "All 6 free", active: true },
                    { t: "10:30 AM", state: "All 6 free", active: true },
                    { t: "11:00 AM", state: "5 of 6 free", active: false },
                  ].map((r) => (
                    <div
                      key={r.t}
                      className={`flex items-center overflow-hidden rounded-lg border border-[#E4E1DA] text-xs ${
                        r.active ? "bg-emerald-500/15" : "bg-[#F7F6F2]"
                      }`}
                    >
                      <div className="flex w-[74%] items-center justify-between px-2.5 py-2">
                        <span className="font-mono font-medium text-[#141413] tabular-nums">
                          {r.t}
                        </span>
                        <span className="font-mono text-[10px] text-[#575551]">
                          {r.state}
                        </span>
                      </div>
                      <div className="flex w-[26%] items-center justify-center border-l border-[#E4E1DA] bg-emerald-600/20 py-2 font-mono text-[10px] font-semibold text-emerald-950">
                        ⋮ Scrub
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          BOTTOM CALLOUT CARD
         ========================================================= */}
      <section className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-[22px] border border-[#E4E1DA] bg-white p-7 sm:flex-row sm:p-9">
          <div>
            <h3 className="text-2xl sm:text-3xl font-normal tracking-[-0.03em] text-[#141413]">
              Have a group to wrangle?
            </h3>
            <p className="mt-1 text-sm text-[#575551]">
              Spin up a poll in ten seconds.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCommandBar}
            className="inline-flex items-center gap-2 rounded-full bg-[#141413] px-5 py-2.5 text-xs font-medium text-[#F7F6F2] hover:bg-emerald-800 transition cursor-pointer"
          >
            <span>New poll</span>
            <kbd className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>
        </div>
      </section>
    </div>
  );
}
