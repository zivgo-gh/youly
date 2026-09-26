import { cn } from "@/lib/cn";

/**
 * The project's icon set. Hand-rolled rather than pulled from lucide because
 * npm can't reach the registry from this environment — and because it keeps the
 * stroke weight and corner radius consistent by construction.
 *
 * Replaces 11 inline <svg> literals plus every emoji that was being used as a
 * structural icon (emoji are font-dependent, render differently per platform,
 * and can't be themed).
 */
export type IconName =
  | "mic"
  | "send"
  | "close"
  | "camera"
  | "check"
  | "plus"
  | "trash"
  | "pencil"
  | "user"
  | "lock"
  | "chevron-up"
  | "chevron-down"
  | "chevron-left"
  | "chevron-right"
  | "chat"
  | "chart"
  | "meal"
  | "sparkles"
  | "target"
  | "shield"
  | "phone"
  | "menu";

const PATHS: Record<IconName, React.ReactNode> = {
  mic: (
    <>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </>
  ),
  send: <path d="M4.5 12h15m0 0-6-6m6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  camera: (
    <>
      <path d="M3 9a2 2 0 0 1 2-2h1.5l1.2-2h6.6l1.2 2H17a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
      <circle cx="11" cy="13" r="3.2" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </>
  ),
  pencil: <path d="M4 20h4L20 8l-4-4L4 16v4Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  "chevron-up": <path d="M6 15l6-6 6 6" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
  "chevron-right": <path d="M9 6l6 6-6 6" />,
  chat: <path d="M20 12a7 7 0 0 1-7 7H9l-4 3v-4.3A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7Z" />,
  chart: <path d="M4 19h16M7 16V9M12 16V5M17 16v-5" />,
  meal: (
    <>
      <path d="M6 3v8a2 2 0 0 0 4 0V3M8 11v10" />
      <path d="M16 3c-1.5 1.2-2 3-2 5s.5 3 2 3 2-1 2-3-.5-3.8-2-5Zm0 8v10" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
      <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  shield: <path d="M12 3.5 5 6v6c0 4 3 7.2 7 8.5 4-1.3 7-4.5 7-8.5V6l-7-2.5Z" />,
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

export function Icon({
  name,
  className,
  size = 20,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      // Decorative by default: the accessible name lives on the button or the
      // adjacent text, never on the glyph.
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
