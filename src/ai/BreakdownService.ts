type BreakdownRequest = {
  readonly areaId: string;
  readonly description: string | null;
  readonly existingTasks: readonly {
    readonly id: string;
    readonly status: string;
    readonly title: string;
  }[];
  readonly outcome: string;
  readonly projectId: string;
  readonly projectTitle: string;
};

type BreakdownMilestoneSuggestion = {
  readonly confidence: number;
  readonly description: string | null;
  readonly id: string;
  readonly reason: string;
  readonly title: string;
};

type BreakdownTaskSuggestion = {
  readonly confidence: number;
  readonly contexts: readonly string[];
  readonly dependencies: readonly string[];
  readonly description: string | null;
  readonly estimatedDurationMinutes: number | null;
  readonly energy: number | null;
  readonly id: string;
  readonly milestoneId: string | null;
  readonly reason: string;
  readonly title: string;
};

type BreakdownProposal = {
  readonly milestones: readonly BreakdownMilestoneSuggestion[];
  readonly summary: string;
  readonly tasks: readonly BreakdownTaskSuggestion[];
  readonly warnings: readonly string[];
};

/** Suggests Project structure; it never creates Milestones or Tasks. */
interface BreakdownService {
  propose(request: BreakdownRequest): Promise<BreakdownProposal>;
}

export type {
  BreakdownMilestoneSuggestion,
  BreakdownProposal,
  BreakdownRequest,
  BreakdownService,
  BreakdownTaskSuggestion,
};
