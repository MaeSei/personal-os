import type {
  MissionControlData,
  MissionControlFeature,
} from "@/features/contracts/MissionControlFeature";

type MissionControlDependencies = {
  readonly missionControl: Pick<MissionControlFeature, "loadMissionControl">;
};

/** Delegates the Mission Control use case to the application layer. */
function loadMissionControl({
  missionControl,
}: MissionControlDependencies): Promise<MissionControlData> {
  return missionControl.loadMissionControl();
}

export { loadMissionControl };
export type { MissionControlDependencies };
