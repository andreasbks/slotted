import React from "react";

const PALETTES = [
  ["#CCFBF1", "#115E59"],
  ["#DBEAFE", "#1E3A8A"],
  ["#FCE7F3", "#831843"],
  ["#FEF3C7", "#78350F"],
  ["#EDE9FE", "#4C1D95"],
  ["#E2E8F0", "#1E293B"],
] as const;

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const character of `slotted-avatar:v1:${seed}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function Avatar({
  seed,
  name,
  size = 24,
}: {
  seed: string;
  name: string;
  size?: number;
}) {
  const hash = hashSeed(seed);
  const [background, foreground] = PALETTES[hash % PALETTES.length];
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const shape = hash % 3;
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="shrink-0 rounded-full ring-1 ring-[#B8B4AA]"
    >
      <rect width="32" height="32" rx="16" fill={background} />
      {shape === 0 && <circle cx="16" cy="10" r="7" fill={foreground} opacity=".2" />}
      {shape === 1 && (
        <path d="M4 24 16 4l12 20Z" fill={foreground} opacity=".18" />
      )}
      {shape === 2 && (
        <path d="M3 13c7-8 19-8 26 0v15H3Z" fill={foreground} opacity=".18" />
      )}
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fontSize="11"
        fontFamily="var(--font-geist)"
        fontWeight="700"
        fill={foreground}
      >
        {initials || "?"}
      </text>
    </svg>
  );
}
