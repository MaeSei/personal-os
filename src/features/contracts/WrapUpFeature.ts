import type { CalendarEvent } from "@/calendar";
import type {
  DailyWrapUp,
  DailyWrapUpMetrics,
  DailyWrapUpReflection,
  TimeBlockType,
} from "@/domain";

type WrapUpTaskEvidence = {
  readonly actualDurationSeconds: number | null;
  readonly completed: boolean;
  readonly estimatedDurationMinutes: number | null;
  readonly id: string;
  readonly projectTitle: string | null;
  readonly title: string;
};

type WrapUpTimeBlockEvidence = {
  readonly end: number;
  readonly id: string;
  readonly linkedTaskTitles: readonly string[];
  readonly start: number;
  readonly title: string;
  readonly type: TimeBlockType;
};

type DailyWrapUpData = {
  readonly calendar: {
    readonly connected: boolean;
    readonly events: readonly CalendarEvent[];
    readonly message: string;
    readonly timeZone: string;
  };
  readonly completedTasks: readonly WrapUpTaskEvidence[];
  readonly dateLabel: string;
  readonly incompleteTasks: readonly WrapUpTaskEvidence[];
  readonly metrics: DailyWrapUpMetrics;
  readonly name: string;
  readonly review: DailyWrapUp | null;
  readonly timeBlocks: readonly WrapUpTimeBlockEvidence[];
};

/** UI-facing end-of-day evidence and the single explicit completion command. */
interface WrapUpFeature {
  completeWrapUp(input: DailyWrapUpReflection): Promise<DailyWrapUpData>;
  loadWrapUp(): Promise<DailyWrapUpData>;
}

export type {
  DailyWrapUpData,
  WrapUpFeature,
  WrapUpTaskEvidence,
  WrapUpTimeBlockEvidence,
};
