import type { IconName } from "@/components/ui/Icon";

/**
 * Single source of truth for in-app navigation. Keeping it here means the app's
 * URL prefix moves in one edit rather than across every screen.
 */
export const NAV_ITEMS: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/app/chat", label: "Coach", icon: "chat" },
  { href: "/app/progress", label: "Progress", icon: "chart" },
  { href: "/app/meals", label: "Meals", icon: "meal" },
];
