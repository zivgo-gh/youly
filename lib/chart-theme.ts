/**
 * Chart colours, mirrored from the design tokens in app/globals.css.
 *
 * Recharts needs literal values rather than CSS custom properties, so these are
 * the one place hex lives outside globals.css. Previously every chart inlined its
 * own hex, including a `#6366f1` indigo that appeared nowhere else in the product.
 */
export const CHART = {
  calories: "#059669", // brand-600
  protein: "#2563eb",
  weight: "#047857", // brand-700 — was an orphan indigo
  goal: "#059669",
  grid: "#e5e7eb",
  axis: "#4b5563", // clears contrast; was #9ca3af at ~2.5:1
} as const;

export const AXIS_TICK = { fontSize: 11, fill: CHART.axis } as const;

export const TOOLTIP_STYLE = {
  fontSize: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  boxShadow: "0 4px 12px -2px rgb(0 0 0 / 0.08)",
} as const;
