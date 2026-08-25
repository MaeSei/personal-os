import type { Effort, EnergyCost } from "./Attention";

/** How reliable the user believes the current Task estimate to be. */
enum EstimateConfidence {
  Low = "Low",
  Medium = "Medium",
  High = "High",
}

const estimateConfidenceLevels = Object.values(EstimateConfidence);

type EstimateSource = {
  readonly durationMinutes?: number | null;
  readonly effort: Effort;
  readonly energyCost: EnergyCost;
  readonly estimateConfidence?: EstimateConfidence | null;
  readonly estimatedDuration?: number | null;
};

type TaskEstimate = {
  readonly confidence: EstimateConfidence | null;
  readonly durationMinutes: number | null;
  readonly effort: Effort;
  readonly energy: EnergyCost;
};

function isEstimateConfidence(value: unknown): value is EstimateConfidence {
  return estimateConfidenceLevels.includes(value as EstimateConfidence);
}

/** Returns the current estimate only; actuals and estimate history are absent. */
function getTaskEstimate(source: EstimateSource): TaskEstimate {
  return {
    confidence: source.estimateConfidence ?? null,
    durationMinutes:
      source.estimatedDuration ?? source.durationMinutes ?? null,
    effort: source.effort,
    energy: source.energyCost,
  };
}

export {
  EstimateConfidence,
  estimateConfidenceLevels,
  getTaskEstimate,
  isEstimateConfidence,
};
export type { EstimateSource, TaskEstimate };
