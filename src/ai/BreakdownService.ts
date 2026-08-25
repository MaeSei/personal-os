import type { AISuggestion } from "./types";

type BreakdownRequest = {
  readonly areaId: string;
  readonly description: string | null;
  readonly outcome: string;
  readonly projectId: string;
  readonly projectTitle: string;
};

type BreakdownTaskSuggestion = {
  readonly description: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly energy: number | null;
  readonly title: string;
};

/** Suggests Project actions; it never creates Tasks. */
interface BreakdownService {
  breakDown(
    request: BreakdownRequest,
  ): Promise<readonly AISuggestion<BreakdownTaskSuggestion>[]>;
}

export type {
  BreakdownRequest,
  BreakdownService,
  BreakdownTaskSuggestion,
};
