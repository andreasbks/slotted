export function logServerIssue(error: unknown): void {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown failure";
  const redacted = raw.replace(
    /postgres(?:ql)?:\/\/\S+/gi,
    "postgresql://[redacted]"
  );
  console.error(`[slotted] ${redacted}`);
}
