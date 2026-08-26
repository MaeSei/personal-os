import type { CalendarEvent } from "@/calendar";
import type {
  AnalyticsReport,
  DailyReviewResult,
  MemoryEntry,
  Pattern,
} from "@/domain";
import type { AIItemContext } from "./types";

type BriefingEvidence = {
  readonly calendar: readonly string[];
  readonly deadlines: readonly string[];
  readonly energy: readonly string[];
  readonly patterns: readonly string[];
  readonly projects: readonly string[];
};

type BriefingRequest = {
  readonly analytics: AnalyticsReport;
  readonly calendarEvents: readonly CalendarEvent[];
  readonly date: string;
  readonly deadlines: readonly AIItemContext[];
  /** Exact server-built references the model is permitted to cite. */
  readonly evidenceCatalog: BriefingEvidence;
  readonly memory: readonly MemoryEntry[];
  readonly patterns: readonly Pattern[];
  readonly projects: readonly AIItemContext[];
  readonly review: DailyReviewResult | null;
  readonly tasks: readonly AIItemContext[];
  readonly timeZone: string;
};

type BriefingSuggestion = {
  readonly confidence: number;
  readonly evidence: BriefingEvidence;
  readonly itemIds: readonly string[];
  readonly reason: string;
  readonly title: string;
};

type BriefingTimeBlockSuggestion = BriefingSuggestion & {
  readonly durationMinutes: number;
  readonly preferredWindow: string;
};

type ExecutiveBriefing = {
  readonly attentionBudget: number | null;
  readonly deepWork: readonly BriefingSuggestion[];
  readonly greeting: string;
  readonly observations: readonly BriefingSuggestion[];
  readonly opportunities: readonly BriefingSuggestion[];
  readonly quickWins: readonly BriefingSuggestion[];
  readonly risks: readonly BriefingSuggestion[];
  readonly suggestedTimeBlocks: readonly BriefingTimeBlockSuggestion[];
  readonly suggestedWorkspace: readonly BriefingSuggestion[];
};

/** Produces an evidence-linked briefing and has no write capability. */
interface BriefingService {
  brief(request: BriefingRequest): Promise<ExecutiveBriefing>;
}

export type {
  BriefingEvidence,
  BriefingRequest,
  BriefingService,
  BriefingSuggestion,
  BriefingTimeBlockSuggestion,
  ExecutiveBriefing,
};
