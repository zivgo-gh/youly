/**
 * Chart colours, mirrored from the design tokens in app/globals.css.
 *
 * Recharts needs literal values rather than CSS custom properties, so these are
 * the one place hex lives outside globals.css. Previously every chart inlined its
 * own hex, including a `#6366f1` indigo that appeared nowhere else in the product.
 */
export const CHART = {
  calories: "#0f5e6a", // brand-600, petrol
  // Ochre, not blue: teal-vs-amber sits on the blue-yellow axis and so survives
  // red-green colour blindness, where teal-vs-blue would not.
  protein: "#a87200",
  weight: "#0b4a55", // brand-700
  goal: "#0f5e6a",
  grid: "#e7e1d8",
  axis: "#57534e",
} as const;

export const AXIS_TICK = { fontSize: 11, fill: CHART.axis } as const;

export const TOOLTIP_STYLE = {
  fontSize: 12,
  border: "1px solid #e7e1d8",
  borderRadius: 12,
  boxShadow: "0 4px 14px -3px rgb(68 64 60 / 0.10)",
} as const;
