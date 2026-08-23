import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeTailwindClasses = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "body",
        "display",
        "heading",
        "label",
        "lead",
        "metric",
        "small",
        "title",
      ],
    },
  },
});

/** Merges conditional Tailwind classes without retaining conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return mergeTailwindClasses(clsx(inputs));
}
