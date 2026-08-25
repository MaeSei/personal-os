import type { AnalyticsReport, Pattern } from "@/domain";
import type { AISuggestion } from "./types";

type ReflectionRequest = {
  readonly analytics: AnalyticsReport;
  readonly notes: string | null;
  readonly patterns: readonly Pattern[];
};

type ReflectionObservation = {
  readonly evidence: readonly string[];
  readonly summary: string;
};

/** Returns optional observations without modifying Review history. */
interface ReflectionService {
  reflect(request: ReflectionRequest): Promise<readonly AISuggestion<ReflectionObservation>[]>;
}

export type { ReflectionObservation, ReflectionRequest, ReflectionService };
