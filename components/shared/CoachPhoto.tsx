"use client";

import type { CoachAvatar } from "@/lib/types";

// The coaches.png image is a 2×2 grid:
// Alex (top-left) | Dr. Maya (top-right)
// Sam (bottom-left) | Coach Rivera (bottom-right)
const POSITIONS: Record<CoachAvatar, string> = {
  alex:   "0% 0%",
  maya:   "100% 0%",
  sam:    "0% 100%",
  rivera: "100% 100%",
};

interface Props {
  avatar: CoachAvatar;
  size?: number;
  className?: string;
}

export function CoachPhoto({ avatar, size = 40, className = "" }: Props) {
  return (
    <div
      className={`rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/coaches.png)",
        backgroundSize: "200% 200%",
        backgroundPosition: POSITIONS[avatar],
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
