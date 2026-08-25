type MorningStepId =
  | "review"
  | "calendar"
  | "availability"
  | "workspace"
  | "timeBlocks"
  | "confirm";

type MorningStage = MorningStepId | "started";

const morningSteps = [
  { id: "review", label: "Review" },
  { id: "calendar", label: "Calendar" },
  { id: "availability", label: "Available time" },
  { id: "workspace", label: "Today" },
  { id: "timeBlocks", label: "Time blocks" },
  { id: "confirm", label: "Review" },
] as const satisfies readonly { readonly id: MorningStepId; readonly label: string }[];

export { morningSteps };
export type { MorningStage, MorningStepId };
