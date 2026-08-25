import type { ActionableItem, AreaProjectGroup, Task } from "@/domain";

type MissionControlFocusItem = {
  readonly item: ActionableItem;
  readonly projectOutcome: string | null;
};

type MissionControlData = {
  readonly attention: {
    readonly budget: number;
    readonly energy: number;
    readonly ratingScale: number;
    readonly stress: number;
  } | null;
  readonly blocked: readonly Task[];
  readonly greeting: {
    readonly dateLabel: string;
    readonly dateTime: string;
    readonly name: string;
    readonly salutation: string;
  };
  readonly inbox: { readonly count: number };
  readonly projectGroups: readonly AreaProjectGroup[];
  readonly today: readonly MissionControlFocusItem[];
};

/** Complete render-ready Mission Control query. */
interface MissionControlFeature {
  loadMissionControl(): Promise<MissionControlData>;
}

export type {
  MissionControlData,
  MissionControlFeature,
  MissionControlFocusItem,
};
