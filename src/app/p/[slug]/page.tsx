import { Suspense } from "react";
import { io } from "next/cache";
import { readSetupVariable } from "@/lib/setup-status";
import { NotReadyScreen, OpeningScreen } from "@/components/slotted/status-screens";
import { PollClient } from "./poll-client";

async function PollBody() {
  await io();
  if (readSetupVariable()) return <NotReadyScreen />;
  return <PollClient />;
}

export default function PollSlugPage() {
  return (
    <Suspense fallback={<OpeningScreen />}>
      <PollBody />
    </Suspense>
  );
}
