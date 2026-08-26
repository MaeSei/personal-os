import type {
  BreakdownProposal,
  BriefingSuggestion,
  BriefingTimeBlockSuggestion,
  ClassificationResult,
  ExecutiveBriefing,
  ReflectionObservation,
  ReflectionResult,
} from "@/ai";

type AssistantStatus = {
  readonly enabled: boolean;
  readonly model: string | null;
  readonly provider: string | null;
};

type ProjectBreakdownPreview = {
  readonly generatedAt: Date;
  readonly projectId: string;
  readonly projectUpdatedAt: string;
  readonly proposal: BreakdownProposal;
};

type AcceptProjectBreakdownInput = {
  readonly acceptedMilestoneIds: readonly string[];
  readonly acceptedTaskIds: readonly string[];
  readonly preview: ProjectBreakdownPreview;
};

type AcceptedProjectBreakdown = {
  readonly milestoneCount: number;
  readonly taskCount: number;
};

type InboxClassificationPreview = ClassificationResult & {
  readonly areaTitle: string | null;
  readonly itemId: string;
  readonly projectTitle: string | null;
};

interface AssistantFeature {
  acceptProjectBreakdown(
    input: AcceptProjectBreakdownInput,
  ): Promise<AcceptedProjectBreakdown>;
  getExecutiveBriefing(): Promise<ExecutiveBriefing>;
  getReflection(): Promise<ReflectionResult>;
  getStatus(): Promise<AssistantStatus>;
  proposeProjectBreakdown(projectId: string): Promise<ProjectBreakdownPreview>;
  suggestInboxItem(itemId: string): Promise<InboxClassificationPreview>;
}

export type {
  AcceptProjectBreakdownInput,
  AcceptedProjectBreakdown,
  AssistantFeature,
  AssistantStatus,
  InboxClassificationPreview,
  ProjectBreakdownPreview,
  BriefingSuggestion,
  BriefingTimeBlockSuggestion,
  ExecutiveBriefing,
  ReflectionObservation,
  ReflectionResult,
};
