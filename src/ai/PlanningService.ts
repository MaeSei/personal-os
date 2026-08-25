import type { CalendarEvent } from "@/calendar";
import type { AIItemContext, AISuggestion } from "./types";

type PlanningRequest = {
  readonly attentionBudget: number | null;
  readonly calendarEvents: readonly CalendarEvent[];
  readonly date: string;
  readonly tasks: readonly AIItemContext[];
  readonly timeZone: string;
};

type PlanningProposal = {
  readonly end: Date | null;
  readonly start: Date | null;
  readonly taskId: string;
};

/** Produces proposals only; it has no scheduling command or repository. */
interface PlanningService {
  propose(request: PlanningRequest): Promise<readonly AISuggestion<PlanningProposal>[]>;
}

export type { PlanningProposal, PlanningRequest, PlanningService };
