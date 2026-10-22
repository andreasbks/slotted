"use client";

import React, { useEffect, useRef, useState } from "react";
import { KeyRound, UserRound } from "lucide-react";
import Link from "next/link";
import { calmFailure } from "@/lib/calm-copy";
import { Avatar } from "./avatar";

export function IdentityMenu({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const clerkConfigured = Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_")
  );

  const issueRecovery = async () => {
    setStatus("Creating key…");
    const response = await fetch("/api/identity/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "issue" }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      key?: string;
      error?: string;
    };
    if (response.ok && data.key) {
      setRecoveryKey(data.key);
      setStatus("Save this key somewhere private.");
    } else {
      setStatus(
        calmFailure(data.error, "Couldn’t create a recovery key. Try again.")
      );
    }
  };

  const restoreRecovery = async () => {
    const key = window.prompt("Enter your one-time recovery key.");
    if (!key) return;
    const response = await fetch("/api/identity/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "redeem", key }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      replacementKey?: string;
      error?: string;
    };
    if (response.ok) {
      setRecoveryKey(data.replacementKey ?? null);
      setStatus("Access restored. Save the replacement key now.");
      window.location.reload();
    } else {
      setStatus(calmFailure(data.error, "Couldn’t restore access. Try again."));
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Open identity menu for ${name || "Guest"}`}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-black/30 px-2.5 text-sm text-white"
      >
        <Avatar seed="current-device" name={name || "Guest"} size={24} />
        <span className="hidden sm:inline">{name || "Guest"}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-72 rounded-xl border border-[#DDDAD1] bg-white p-4 text-[#171715] shadow-[0_20px_55px_rgb(20_20_19/0.24)]">
          <p className="font-semibold">Voting as {name || "Guest"}</p>
          <p className="mt-1 text-xs text-[#6F6C65]">Saved on this device</p>
          <div className="mt-4 grid gap-2">
            {clerkConfigured && (
              <Link href="/sign-in" className="min-h-11 cursor-pointer rounded-lg bg-[#171715] px-3 py-3 text-center text-sm font-semibold text-white">
                Save with Google or Apple
              </Link>
            )}
            <button
              type="button"
              onClick={() => void issueRecovery()}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#DDDAD1] px-3 text-sm"
            >
              <KeyRound className="h-4 w-4" /> Save a recovery key
            </button>
            <button
              type="button"
              onClick={() => void restoreRecovery()}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#DDDAD1] px-3 text-sm"
            >
              <UserRound className="h-4 w-4" /> Use a recovery key
            </button>
          </div>
          {recoveryKey && (
            <textarea
              readOnly
              value={recoveryKey}
              aria-label="Your recovery key"
              className="mt-3 h-20 w-full resize-none rounded-lg border border-[#DDDAD1] bg-[#F0EEE8] p-2 font-mono text-xs"
            />
          )}
          <p role="status" className="mt-2 text-xs text-[#56534D]">
            {status}
          </p>
        </div>
      )}
    </div>
  );
}
