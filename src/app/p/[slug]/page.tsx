"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SlottedAppShell } from "@/components/slotted/slotted-app-shell";

function PollSlugContent() {
  const params = useParams<{ slug?: string }>();
  const searchParams = useSearchParams();
  const slug = typeof params?.slug === "string" ? params.slug : "series-a-sync-q4";
  const initialLocked = searchParams?.get("locked") === "1";

  return (
    <SlottedAppShell
      initialSlug={slug}
      initialViewMode="poll"
      initialLocked={initialLocked}
    />
  );
}

export default function PollSlugPage() {
  return (
    <Suspense fallback={null}>
      <PollSlugContent />
    </Suspense>
  );
}
