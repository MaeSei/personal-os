type MorningStepId =
  | "review"
  | "attention"
  | "calendar"
  | "suggestions"
  | "adjustments";

type MorningStage = MorningStepId | "started";

const morningSteps = [
  { id: "review", label: "Review" },
  { id: "attention", label: "Attention" },
  { id: "calendar", label: "Calendar" },
  { id: "suggestions", label: "Suggestions" },
  { id: "adjustments", label: "Adjust" },
] as const satisfies readonly { readonly id: MorningStepId; readonly label: string }[];

export { morningSteps };
export type { MorningStage, MorningStepId };
