/** Elevation tokens keep static surfaces quieter than interactive states. */
const shadows = {
  card: "var(--shadow-card)",
  cardHover: "var(--shadow-card-hover)",
  control: "var(--shadow-control)",
  controlHover: "var(--shadow-control-hover)",
} as const;

const shadowStyles = {
  card: "shadow-card",
  cardHover: "hover:shadow-card-hover focus-within:shadow-card-hover",
  control: "shadow-control",
  controlHover: "hover:shadow-control-hover",
} as const;

export { shadows, shadowStyles };
