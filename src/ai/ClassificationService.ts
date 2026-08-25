import type { AISuggestion } from "./types";

type ClassificationRequest = {
  readonly areas: readonly { readonly id: string; readonly title: string }[];
  readonly description: string | null;
  readonly projects: readonly { readonly id: string; readonly title: string }[];
  readonly title: string;
};

type ClassificationResult = {
  readonly areaId: AISuggestion<string | null>;
  readonly contexts: readonly AISuggestion<string>[];
  readonly projectId: AISuggestion<string | null>;
  readonly type: AISuggestion<string>;
};

/** Suggests classification; callers must explicitly accept every value. */
interface ClassificationService {
  classify(request: ClassificationRequest): Promise<ClassificationResult>;
}

export type {
  ClassificationRequest,
  ClassificationResult,
  ClassificationService,
};
