import type {
  DailyPlannerData,
  PlannerInboxItem,
  PlannerProject,
  PlannerTask,
} from "@/features/contracts/PlannerFeature";

type WorkspaceSearchResults = {
  readonly inbox: readonly PlannerInboxItem[];
  readonly projects: readonly PlannerProject[];
  readonly tasks: readonly PlannerTask[];
};

function includesQuery(values: readonly (string | null | undefined)[], query: string) {
  return values.some((value) => value?.toLocaleLowerCase().includes(query));
}

function searchWorkspace(
  data: Pick<DailyPlannerData, "inbox" | "projects" | "taskPool">,
  value: string,
): WorkspaceSearchResults {
  const query = value.trim().toLocaleLowerCase();
  if (!query) {
    return { inbox: data.inbox, projects: data.projects, tasks: data.taskPool };
  }

  return {
    inbox: data.inbox.filter(({ title }) => includesQuery([title], query)),
    projects: data.projects.filter(({ outcome, title }) =>
      includesQuery([title, outcome], query)),
    tasks: data.taskPool.filter((task) => includesQuery([
      task.title,
      task.area.title,
      task.project?.title,
      task.project?.outcome,
      task.preferredContext,
      task.preferredTime,
    ], query)),
  };
}

export { searchWorkspace };
export type { WorkspaceSearchResults };
