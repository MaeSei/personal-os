type ClassificationRequest = {
  readonly areas: readonly { readonly id: string; readonly title: string }[];
  readonly description: string | null;
  readonly projects: readonly {
    readonly areaId: string;
    readonly id: string;
    readonly title: string;
  }[];
  readonly title: string;
};

type ClassificationResult = {
  readonly areaId: string | null;
  readonly confidence: number;
  readonly contexts: readonly string[];
  readonly estimatedDurationMinutes: number | null;
  readonly energy: number | null;
  readonly projectId: string | null;
  readonly reason: string;
};

/** Suggests Inbox fields; callers must explicitly accept every value. */
interface ClassificationService {
  classify(request: ClassificationRequest): Promise<ClassificationResult>;
}

export type {
  ClassificationRequest,
  ClassificationResult,
  ClassificationService,
};
