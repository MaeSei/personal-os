/** Typography tokens and repeatable text roles for the Atlas interface. */
const typography = {
  body: "var(--text-body)",
  display: "var(--text-display)",
  fontFamily: "var(--font-sans)",
  heading: "var(--text-heading)",
  label: "var(--text-label)",
  lead: "var(--text-lead)",
  metric: "var(--text-metric)",
  small: "var(--text-small)",
  title: "var(--text-title)",
} as const;

const typographyStyles = {
  body: "text-body",
  button: "font-semibold tracking-[-0.01em]",
  cardTitle: "text-heading font-semibold",
  description: "text-small text-pretty",
  display: "text-display text-balance font-semibold",
  label: "text-label font-semibold uppercase",
  lead: "text-lead text-pretty",
  metric: "text-metric font-semibold tabular-nums",
  metricLabel: "text-sm font-semibold",
  metricValue: "text-sm tabular-nums",
  rating: "text-heading sm:text-2xl",
  itemTitle: "text-heading font-semibold sm:text-xl",
  sectionTitle: "text-title text-balance font-semibold",
} as const;

export { typography, typographyStyles };
