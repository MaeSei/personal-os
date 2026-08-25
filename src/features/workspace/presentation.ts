import type { WorkspaceTaskFilters } from "@/domain";
import type { WorkspaceTask } from "@/features/contracts/WorkspaceFeature";

type MoveDirection = "down" | "up";
type DailyMoveTarget = { readonly beforeTaskId: string | null };

function countActiveWorkspaceFilters(filters: WorkspaceTaskFilters): number {
  return Object.values(filters).filter(
    (value) => value !== null && value !== undefined && value !== "",
  ).length;
}

/** Resolves button and keyboard reordering without crossing list boundaries. */
function getDailyMoveTarget(
  tasks: readonly WorkspaceTask[],
  taskId: string,
  direction: MoveDirection,
): DailyMoveTarget | null {
  const index = tasks.findIndex(({ task }) => task.id === taskId);
  if (
    index < 0 ||
    (direction === "up" && index === 0) ||
    (direction === "down" && index === tasks.length - 1)
  ) {
    return null;
  }
  return {
    beforeTaskId:
      direction === "up"
        ? tasks[index - 1]?.task.id ?? null
        : tasks[index + 2]?.task.id ?? null,
  };
}

export { countActiveWorkspaceFilters, getDailyMoveTarget };
export type { DailyMoveTarget, MoveDirection };
