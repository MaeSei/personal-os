/** Semantic color tokens and Tailwind class groups used by Atlas components. */
const colors = {
  accent: "var(--color-accent)",
  accentSoft: "var(--color-accent-soft)",
  background: "var(--color-canvas)",
  border: "var(--color-border)",
  danger: "var(--color-danger)",
  foreground: "var(--color-ink)",
  mutedForeground: "var(--color-ink-muted)",
  surface: "var(--color-surface)",
  surfaceHover: "var(--color-surface-hover)",
  surfaceSubtle: "var(--color-surface-subtle)",
  warning: "var(--color-warning)",
} as const;

const colorStyles = {
  badge: {
    attention: "bg-accent-soft text-accent-strong",
    blocked: "bg-danger-soft text-danger",
    default: "bg-ink text-surface",
    neutral: "bg-surface-subtle text-ink-muted",
    success: "bg-accent text-primary-foreground",
    warning: "bg-warning-soft text-warning",
  },
  button: {
    danger: "bg-danger text-surface hover:bg-danger/90 active:bg-danger/95",
    ghost:
      "bg-transparent text-ink hover:bg-surface-subtle active:bg-surface-hover",
    primary: "bg-accent text-primary-foreground hover:bg-accent-strong",
    secondary:
      "border border-border bg-surface text-ink hover:border-accent/25 hover:bg-surface-subtle active:bg-surface-hover",
  },
  card: {
    accent: "border-accent/20 bg-accent-soft text-ink",
    default: "border-border bg-surface text-ink",
    subtle: "border-transparent bg-surface-subtle text-ink",
  },
  cardHover: "hover:border-accent/25 focus-within:border-accent/25",
  chip: "border-border bg-surface-subtle text-ink",
  divider: "border-border",
  field:
    "border-border bg-surface-subtle text-ink placeholder:text-ink-muted hover:border-accent/25",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
  page: "bg-canvas text-ink",
  rating: {
    accent: "text-accent",
    empty: "text-border",
    neutral: "text-ink",
  },
  itemList: "divide-border/70",
  text: {
    accent: "text-accent-strong",
    muted: "text-ink-muted",
    primary: "text-ink",
  },
} as const;

export { colors, colorStyles };
