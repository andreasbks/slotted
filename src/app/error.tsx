"use client";

import { FailureScreen } from "@/components/slotted/status-screens";

export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <FailureScreen title="Something went wrong." onRetry={retry} />;
}
