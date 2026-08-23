import type { ActionableItem, AreaProjectGroup, Item } from "@/domain";

type MissionControlFocusItem = {
  readonly item: ActionableItem;
  readonly projectOutcome: string | null;
};

/** Render-ready Mission Control data with all decisions already resolved. */
type MissionControlData = {
  attention: {
    budget: number;
    energy: number;
    ratingScale: number;
    stress: number;
  } | null;
  blocked: readonly Item[];
  greeting: {
    dateLabel: string;
    dateTime: string;
    name: string;
    salutation: string;
  };
  inbox: {
    count: number;
  };
  projectGroups: readonly AreaProjectGroup[];
  today: readonly MissionControlFocusItem[];
};

export type { MissionControlData, MissionControlFocusItem };
