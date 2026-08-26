import type {
  AnalyticsReport,
  DailyReviewResult,
  DailyWrapUp,
  Pattern,
} from "@/domain";

type ReflectionRequest = {
  readonly analytics: AnalyticsReport;
  readonly patterns: readonly Pattern[];
  readonly reviews: readonly DailyReviewResult[];
  readonly wrapUps: readonly DailyWrapUp[];
};

type ReflectionObservation = {
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly summary: string;
};

type ReflectionResult = {
  readonly learnings: readonly ReflectionObservation[];
  readonly reflections: readonly ReflectionObservation[];
  readonly suggestions: readonly ReflectionObservation[];
};

/** Returns observations only; it cannot modify Reviews or plans. */
interface ReflectionService {
  reflect(request: ReflectionRequest): Promise<ReflectionResult>;
}

export type {
  ReflectionObservation,
  ReflectionRequest,
  ReflectionResult,
  ReflectionService,
};
