import type { Area, AreaId, EnergyCost, Project } from "../domain";
import type { AreaRepository } from "./AreaRepository";

type CompleteOnboardingInput = {
  readonly areas: readonly Area[];
  readonly projectEnergyLevel: EnergyCost;
  readonly projectAreaId: AreaId;
  readonly projectNextAction: string;
  readonly projectOutcome: string;
  readonly projectTitle: string;
};

/** Persistence operations required to establish a new Atlas workspace. */
interface OnboardingRepository extends AreaRepository {
  completeOnboarding(input: CompleteOnboardingInput): Promise<Project>;
}

export type { CompleteOnboardingInput, OnboardingRepository };
