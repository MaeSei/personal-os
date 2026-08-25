import { isActionable } from "./Focus";
import type { AreaId } from "./Area";
import type { ItemId } from "./Item";
import type { ItemType } from "./Item";
import type { Status } from "./Status";

/** Energy required by an Item, from very light (1) to very demanding (5). */
type EnergyCost = 1 | 2 | 3 | 4 | 5;

/** Amount of work involved in an Item, from very small (1) to very large (5). */
type Effort = 1 | 2 | 3 | 4 | 5;

/** Energy currently available to the user; zero represents no capacity. */
type EnergyLevel = 0 | EnergyCost;

/** A normalized score from 0 to 100. */
type AttentionScore = number;

type AttentionCandidate = {
  areaId: AreaId | null;
  attentionScore: AttentionScore;
  energyCost: EnergyCost;
  effort: Effort;
  projectId?: ItemId | null;
  status: Status;
  type: ItemType;
};

type EnergyEstimateInput = {
  energyCost: EnergyCost;
  effort: Effort;
};

const MIN_ATTENTION = 0;
const MAX_ATTENTION = 100;

function clampAttention(score: number): AttentionScore {
  if (!Number.isFinite(score)) {
    return MIN_ATTENTION;
  }

  return Math.min(Math.max(score, MIN_ATTENTION), MAX_ATTENTION);
}

/**
 * Estimates total energy demand on the shared 1–5 scale. Intrinsic energy cost
 * and the amount of effort carry equal weight; rounding up avoids understating
 * an Item whose effort falls between two levels.
 */
function estimateEnergy(item: EnergyEstimateInput): EnergyCost {
  return Math.ceil((item.energyCost + item.effort) / 2) as EnergyCost;
}

/**
 * Calculates an Item's effective attention score for the user's current energy.
 * Non-actionable Items score zero. Items that cost more energy than is available
 * are reduced proportionally; sufficiently matched Items keep their base score.
 */
function calculateAttention(
  item: AttentionCandidate,
  availableEnergy: EnergyLevel,
): AttentionScore {
  if (!isActionable(item)) {
    return MIN_ATTENTION;
  }

  const baseScore = clampAttention(item.attentionScore);
  const energyFit = Math.min(availableEnergy / estimateEnergy(item), 1);

  return Math.round(baseScore * energyFit);
}

export { calculateAttention, estimateEnergy };
export type {
  AttentionCandidate,
  AttentionScore,
  EnergyCost,
  EnergyEstimateInput,
  EnergyLevel,
  Effort,
};
