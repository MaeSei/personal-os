import type { Area, AreaId } from "./Area";
import type { Item } from "./Item";
import { isProject, type Project, type ProjectStatus } from "./Project";
import {
  getProjectArtifacts,
  getProjectTaskGroups,
  isProjectMilestone,
  type ProjectMilestone,
  type ProjectNote,
  type ProjectTaskGroup,
} from "./ProjectArtifacts";
import { Status } from "./Status";
import { isTask, type Task } from "./Task";

type ProjectSort = "activity" | "area" | "progress" | "title";
type ProjectStatusFilter = ProjectStatus | "all";

type ProjectFilters = {
  readonly areaId?: AreaId | "all";
  readonly search?: string;
  readonly sort?: ProjectSort;
  readonly status?: ProjectStatusFilter;
};

type ProjectTaskCounts = {
  readonly blocked: number;
  readonly completed: number;
  readonly open: number;
  readonly waiting: number;
};

type ProjectMetrics = {
  readonly counts: ProjectTaskCounts;
  readonly estimatedRemainingMinutes: number;
  readonly lastActivity: Date;
  readonly progress: number;
  readonly progressSource: "milestones" | "tasks";
  readonly remainingEffort: number;
  readonly milestoneCounts: {
    readonly completed: number;
    readonly total: number;
  };
  readonly scheduledWork: {
    readonly count: number;
    readonly nextDate: string | null;
  };
};

type ProjectOverview = {
  readonly area: Area | null;
  readonly metrics: ProjectMetrics;
  readonly project: Project;
};

type ProjectTimelineEntry = {
  readonly date: string;
  readonly item: ProjectMilestone | Task;
  readonly kind:
    | "due"
    | "milestone-completed"
    | "milestone-due"
    | "scheduled"
    | "task-completed";
};

type ProjectDetail = ProjectOverview & {
  readonly blockedTasks: readonly Task[];
  readonly completedTasks: readonly Task[];
  readonly milestones: readonly ProjectMilestone[];
  readonly notes: readonly ProjectNote[];
  readonly relatedProjects: readonly Project[];
  readonly taskGroups: readonly ProjectTaskGroup[];
  readonly taskRoots: readonly Task[];
  readonly timeline: readonly ProjectTimelineEntry[];
  readonly unscheduledTasks: readonly Task[];
  readonly waitingTasks: readonly Task[];
};

function flattenItems(items: readonly Item[]): readonly Item[] {
  const flattened: Item[] = [];
  const seen = new Set<string>();

  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    flattened.push(item);
    item.children.forEach(visit);
  }

  items.forEach(visit);
  return flattened;
}

function flattenTasks(tasks: readonly Task[]): readonly Task[] {
  return flattenItems(tasks).filter(isTask);
}

/** Includes canonical children plus legacy flat Tasks linked to the Project. */
function getProjectTaskRoots(
  project: Project,
  items: readonly Item[],
): readonly Task[] {
  return getProjectTaskGroups(project, items).flatMap(({ tasks }) => tasks);
}

function isOpen(task: Task): boolean {
  return ![Status.Completed, Status.Archived].includes(task.status);
}

function calculateMetrics(project: Project, tasks: readonly Task[]): ProjectMetrics {
  const milestones = project.children.filter(isProjectMilestone);
  const completedMilestones = milestones.filter(
    (milestone) => milestone.status === Status.Completed,
  ).length;
  const visibleTasks = tasks.filter((task) => task.status !== Status.Archived);
  const openTasks = visibleTasks.filter(isOpen);
  const completed = visibleTasks.filter(
    (task) => task.status === Status.Completed,
  ).length;
  const scheduled = openTasks
    .map((task) => task.scheduledDate ?? null)
    .filter((date): date is string => date !== null)
    .sort();
  const lastActivity = [project, ...tasks].reduce(
    (latest, item) =>
      item.updatedAt.getTime() > latest.getTime() ? item.updatedAt : latest,
    project.updatedAt,
  );

  return {
    counts: {
      blocked: openTasks.filter((task) => task.status === Status.Blocked).length,
      completed,
      open: openTasks.length,
      waiting: openTasks.filter((task) => task.status === Status.Waiting).length,
    },
    estimatedRemainingMinutes: openTasks.reduce(
      (total, task) =>
        total + (task.estimatedDuration ?? task.durationMinutes ?? 0),
      0,
    ),
    lastActivity: new Date(lastActivity.getTime()),
    milestoneCounts: {
      completed: completedMilestones,
      total: milestones.length,
    },
    progress: milestones.length > 0
      ? Math.round((completedMilestones / milestones.length) * 100)
      : visibleTasks.length === 0
        ? 0
        : Math.round((completed / visibleTasks.length) * 100),
    progressSource: milestones.length > 0 ? "milestones" : "tasks",
    remainingEffort: openTasks.reduce((total, task) => total + task.effort, 0),
    scheduledWork: {
      count: scheduled.length,
      nextDate: scheduled[0] ?? null,
    },
  };
}

function buildProjectOverview(
  project: Project,
  items: readonly Item[],
  areas: readonly Area[],
): ProjectOverview {
  const tasks = flattenTasks(getProjectTaskRoots(project, items));

  return {
    area: areas.find((area) => area.id === project.areaId) ?? null,
    metrics: calculateMetrics(project, tasks),
    project,
  };
}

function filterProjectOverviews(
  overviews: readonly ProjectOverview[],
  filters: ProjectFilters = {},
): readonly ProjectOverview[] {
  const areaId = filters.areaId ?? "all";
  const query = filters.search?.trim().toLocaleLowerCase() ?? "";
  const sort = filters.sort ?? "activity";
  const status = filters.status ?? Status.Active;
  const filtered = overviews.filter(({ area, project }) => {
    const matchesSearch =
      !query ||
      [project.title, project.outcome, project.description, area?.title]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLocaleLowerCase().includes(query));

    return (
      (areaId === "all" || project.areaId === areaId) &&
      (status === "all" || project.status === status) &&
      matchesSearch
    );
  });

  return [...filtered].sort((left, right) => {
    if (sort === "area") {
      return (left.area?.title ?? "").localeCompare(right.area?.title ?? "") ||
        left.project.title.localeCompare(right.project.title);
    }
    if (sort === "progress") {
      return right.metrics.progress - left.metrics.progress ||
        left.project.title.localeCompare(right.project.title);
    }
    if (sort === "title") {
      return left.project.title.localeCompare(right.project.title);
    }
    return right.metrics.lastActivity.getTime() - left.metrics.lastActivity.getTime();
  });
}

function buildProjectDetail(
  project: Project,
  items: readonly Item[],
  areas: readonly Area[],
): ProjectDetail {
  const taskRoots = getProjectTaskRoots(project, items);
  const tasks = flattenTasks(taskRoots);
  const projects = items.filter(isProject);
  const artifacts = getProjectArtifacts(project, projects);
  const timeline = tasks.flatMap((task): ProjectTimelineEntry[] => [
    ...(task.scheduledDate
      ? [{ date: task.scheduledDate, item: task, kind: "scheduled" as const }]
      : []),
    ...(task.dueDate
      ? [{ date: task.dueDate, item: task, kind: "due" as const }]
      : []),
    ...(task.status === Status.Completed
      ? [{ date: task.updatedAt.toISOString().slice(0, 10), item: task, kind: "task-completed" as const }]
      : []),
  ]).concat(artifacts.milestones.flatMap((milestone): ProjectTimelineEntry[] => [
    ...(milestone.dueDate
      ? [{ date: milestone.dueDate, item: milestone, kind: "milestone-due" as const }]
      : []),
    ...(milestone.status === Status.Completed
      ? [{
          date: milestone.updatedAt.toISOString().slice(0, 10),
          item: milestone,
          kind: "milestone-completed" as const,
        }]
      : []),
  ])).sort((left, right) => left.date.localeCompare(right.date));

  return {
    ...buildProjectOverview(project, items, areas),
    blockedTasks: tasks.filter((task) => task.status === Status.Blocked),
    completedTasks: tasks.filter((task) => task.status === Status.Completed),
    milestones: artifacts.milestones,
    notes: artifacts.notes,
    relatedProjects: artifacts.relatedProjects,
    taskGroups: getProjectTaskGroups(project, items),
    taskRoots,
    timeline,
    unscheduledTasks: tasks.filter(
      (task) => isOpen(task) && !task.scheduledStart && !task.scheduledDate,
    ),
    waitingTasks: tasks.filter((task) => task.status === Status.Waiting),
  };
}

export {
  buildProjectDetail,
  buildProjectOverview,
  filterProjectOverviews,
  getProjectTaskRoots,
};
export type {
  ProjectDetail,
  ProjectFilters,
  ProjectMetrics,
  ProjectOverview,
  ProjectSort,
  ProjectStatusFilter,
  ProjectTaskCounts,
  ProjectTimelineEntry,
};
