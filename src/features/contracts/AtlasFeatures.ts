import type { AreaFeature } from "@/features/contracts/AreaFeature";
import type { BreakdownFeature } from "@/features/contracts/BreakdownFeature";
import type { FocusFeature } from "@/features/contracts/FocusFeature";
import type { InboxFeature } from "@/features/contracts/InboxFeature";
import type { MissionControlFeature } from "@/features/contracts/MissionControlFeature";
import type { PlannerFeature } from "@/features/contracts/PlannerFeature";
import type { ProjectFeature } from "@/features/contracts/ProjectFeature";
import type { ReviewFeature } from "@/features/contracts/ReviewFeature";

/** The complete UI-facing capability set supplied by the composition root. */
type AtlasFeatures = {
  readonly areas: AreaFeature;
  readonly breakdown: BreakdownFeature;
  readonly focus: FocusFeature;
  readonly inbox: InboxFeature;
  readonly missionControl: MissionControlFeature;
  readonly planner: PlannerFeature;
  readonly projects: ProjectFeature;
  readonly review: ReviewFeature;
};

export type { AtlasFeatures };
