"use client";

import { useEffect } from "react";

export function IdentityClaim() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_")) return;
    void fetch("/api/identity/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  }, []);
  return null;
}
