"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { SlottedAppShell } from "@/components/slotted/slotted-app-shell";

function PollSlugContent() {
  const params = useParams<{ slug?: string }>();
  const slug =
    typeof params?.slug === "string" ? params.slug : "series-a-sync-q4";

  return (
    <SlottedAppShell
      initialSlug={slug}
      initialViewMode="poll"
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
