/** Restrained motion tokens for state feedback, never decorative animation. */
const motion = {
  duration: {
    fast: "var(--motion-duration-fast)",
    standard: "var(--motion-duration-standard)",
  },
  easing: {
    emphasized: "var(--motion-ease-emphasized)",
    standard: "var(--motion-ease-standard)",
  },
} as const;

const motionStyles = {
  control:
    "transition-[background-color,border-color,color,box-shadow,transform] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] hover:-translate-y-px active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0",
  field:
    "transition-[background-color,border-color,box-shadow] [transition-duration:var(--motion-duration-fast)] [transition-timing-function:var(--motion-ease-standard)] motion-reduce:transition-none",
  surface:
    "transition-[border-color,box-shadow,transform] [transition-duration:var(--motion-duration-standard)] [transition-timing-function:var(--motion-ease-emphasized)] hover:-translate-y-0.5 focus-within:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0",
} as const;

export { motion, motionStyles };
