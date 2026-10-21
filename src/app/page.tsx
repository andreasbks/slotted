"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlottedAppShell } from "@/components/slotted/slotted-app-shell";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialAdvanced = searchParams?.get("advanced") === "1";
  return (
    <SlottedAppShell
      initialViewMode="landing"
      initialAdvancedOpen={initialAdvanced}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
