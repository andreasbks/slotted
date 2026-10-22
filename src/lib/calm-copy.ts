const LEAK =
  /SLOTTED_|DATABASE_URL|required in deployed|Error:|postgres(?:ql)?:\/\/|\/[A-Za-z0-9_.-]+\.(?:ts|js|tsx):\d+|node_modules/i;

export function setupLine(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || text.length > 160 || /Error:|postgres(?:ql)?:\/\//i.test(text)) {
    return fallback;
  }
  return text;
}

export function calmFailure(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text || text.length > 180 || LEAK.test(text)) return fallback;
  return text;
}
