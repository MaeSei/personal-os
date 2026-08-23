/** Shape tokens distinguish content surfaces, controls, and status capsules. */
const radius = {
  card: "var(--radius-card)",
  control: "var(--radius-control)",
  pill: "var(--radius-pill)",
} as const;

const radiusStyles = {
  card: "rounded-card",
  control: "rounded-control",
  pill: "rounded-pill",
} as const;

export { radius, radiusStyles };
