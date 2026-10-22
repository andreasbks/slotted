import { Suspense } from "react";
import { io } from "next/cache";
import { HomeClient } from "./home-client";
import { readSetupVariable, setupCopy } from "@/lib/setup-status";
import { OpeningScreen, SetupScreen } from "@/components/slotted/status-screens";

async function HomeBody() {
  await io();
  const variable = readSetupVariable();
  if (!variable) return <HomeClient />;
  const copy = setupCopy(variable);
  return <SetupScreen sentence={copy.sentence} step={copy.step} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<OpeningScreen />}>
      <HomeBody />
    </Suspense>
  );
}
