import {
  Status,
  buildProjectOverview,
  clearTaskSchedule,
  createDayPlan,
  filterTasksByContext,
  findTask,
  focusDailyTask,
  getAvailableContexts,
  getProjectForItem,
  isProject,
  isTask,
  placeDailyTask,
  removeDailyTask,
  replaceTaskInItems,
  setDailyTaskGroup,
  setDailyTaskPinned,
  type CalendarDate,
  type Item,
  type Project,
  type Task,
  type WorkspaceTaskFilters,
} from "../domain";
import type {
  WorkspaceData,
  WorkspaceFeature,
  WorkspacePlaceInput,
  WorkspaceTask,
  WorkspaceTaskGroup,
} from "../features/contracts/WorkspaceFeature";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { DayPlanRepository } from "../repositories/DayPlanRepository";
import type { ItemRepository } from "../repositories/ItemRepository";

type WorkspaceContext = {
  readonly now?: Date;
  readonly timeZone: string;
};

function flattenItems(items: readonly Item[]): readonly Item[] {
  const result: Item[] = [];
  const visited = new Set<string>();
  function visit(item: Item) {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    result.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return result;
}

function getCalendarDate(date: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isDailyCandidate(task: Task, projects: readonly Project[]): boolean {
  if (![Status.Active, Status.Today].includes(task.status)) return false;
  const project = getProjectForItem(task, projects);
  return project === null || project.status === Status.Active;
}

/** Owns the explicitly assembled, date-scoped Daily Workspace. */
class WorkspaceService implements WorkspaceFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly areaRepository: AreaRepository,
    private readonly dayPlanRepository: DayPlanRepository,
    private readonly context: WorkspaceContext,
  ) {}

  async loadWorkspace(filters: WorkspaceTaskFilters = {}): Promise<WorkspaceData> {
    const date = this.getDate();
    const [items, areas, plan] = await Promise.all([
      this.itemRepository.get(),
      this.areaRepository.get(),
      this.dayPlanRepository.get(date),
    ]);
    const allItems = flattenItems(items);
    const projects = allItems.filter(isProject);
    const activeOverviews = projects
      .filter(({ status }) =>
        [Status.Active, Status.Waiting, Status.Blocked].includes(status),
      )
      .map((project) => buildProjectOverview(project, items, areas));
    const projectGroups = areas
      .map((area) => ({
        area,
        projects: activeOverviews.filter(({ project }) => project.areaId === area.id),
      }))
      .filter(({ projects: groupedProjects }) => groupedProjects.length > 0);
    const visibleTasks = allItems.filter(
      (item): item is Task =>
        isTask(item) &&
        ![Status.Archived, Status.Completed, Status.Someday].includes(item.status),
    );
    const filteredIds = new Set(
      filterTasksByContext(visibleTasks, filters).map(({ id }) => id),
    );
    const committedIds = new Set(plan?.taskIds ?? []);
    const toWorkspaceTask = (
      task: Task,
      daily: WorkspaceTask["daily"] = null,
    ): WorkspaceTask => {
      const project = getProjectForItem(task, projects);
      return {
        area: areas.find(({ id }) => id === task.areaId) ?? null,
        daily,
        project: project
          ? { id: project.id, outcome: project.outcome, title: project.title }
          : null,
        task,
      };
    };
    const taskById = new Map(visibleTasks.map((task) => [task.id, task]));
    const dailyTasks = (plan?.commitments ?? []).flatMap((commitment, position) => {
      const task = taskById.get(commitment.taskId);
      return task && filteredIds.has(task.id)
        ? [toWorkspaceTask(task, { ...commitment, position })]
        : [];
    });
    const grouped = new Map<string, WorkspaceTask[]>();
    dailyTasks.filter(({ daily }) => !daily?.pinned).forEach((task) => {
      const title = task.daily?.group ?? "Ungrouped";
      grouped.set(title, [...(grouped.get(title) ?? []), task]);
    });
    const groups: WorkspaceTaskGroup[] = [...grouped].map(([title, tasks]) => ({
      id: title === "Ungrouped" ? "ungrouped" : `group-${title}`,
      tasks,
      title,
    }));

    return {
      filterOptions: {
        areas,
        contexts: getAvailableContexts(visibleTasks),
        durations: [15, 30, 45, 60, 90, 120],
        energyLevels: [1, 2, 3, 4, 5],
        projects: activeOverviews.map(({ project }) => ({
          id: project.id,
          outcome: project.outcome,
          title: project.title,
        })),
        statuses: [Status.Active, Status.Today, Status.Waiting, Status.Blocked],
      },
      projectGroups,
      today: {
        available: filterTasksByContext(
          visibleTasks.filter(
            (task) => isDailyCandidate(task, projects) && !committedIds.has(task.id),
          ),
          filters,
        ).map((task) => toWorkspaceTask(task)),
        focused: dailyTasks.find(({ daily }) => daily?.focused) ?? null,
        groups,
        pinned: dailyTasks.filter(({ daily }) => daily?.pinned),
      },
    };
  }

  async placeTask(input: WorkspacePlaceInput): Promise<void> {
    const { beforeTaskId, group, pinned, taskId } = input;
    const { plan, projects, tasks } = await this.getMutableContext();
    const task = tasks.find(({ id }) => id === taskId);
    const alreadyCommitted = plan.taskIds.includes(taskId);
    if (!task || (!alreadyCommitted && !isDailyCandidate(task, projects))) {
      throw new Error("Only available Tasks can be added to today's Workspace.");
    }
    await this.dayPlanRepository.save(
      placeDailyTask(plan, { beforeTaskId, group, pinned, taskId }),
    );
  }

  async setTaskPinned(taskId: string, pinned: boolean): Promise<void> {
    const { plan } = await this.getMutableContext();
    await this.dayPlanRepository.save(setDailyTaskPinned(plan, taskId, pinned));
  }

  async setTaskGroup(taskId: string, group: string | null): Promise<void> {
    const { plan } = await this.getMutableContext();
    await this.dayPlanRepository.save(setDailyTaskGroup(plan, taskId, group));
  }

  async focusTask(taskId: string): Promise<void> {
    const { plan } = await this.getMutableContext();
    await this.dayPlanRepository.save(focusDailyTask(plan, taskId));
  }

  async removeTask(taskId: string): Promise<void> {
    const { items, plan } = await this.getMutableContext();
    await this.dayPlanRepository.save(removeDailyTask(plan, taskId));
    const task = findTask(items, taskId);
    if (task?.scheduledStart || task?.scheduledDate === plan.date) {
      await this.itemRepository.save(
        replaceTaskInItems(items, clearTaskSchedule(task), new Date()),
      );
    }
  }

  async archiveTask(taskId: string): Promise<void> {
    const { items, plan } = await this.getMutableContext();
    const task = findTask(items, taskId);
    if (!task) throw new Error("The Task no longer exists.");
    const now = new Date();
    const archived = {
      ...clearTaskSchedule(task, now),
      status: Status.Archived as const,
      updatedAt: now,
    };
    await this.itemRepository.save(replaceTaskInItems(items, archived, now));
    if (plan.taskIds.includes(taskId)) {
      await this.dayPlanRepository.save(removeDailyTask(plan, taskId));
    }
  }

  private getDate(): CalendarDate {
    return getCalendarDate(this.context.now ?? new Date(), this.context.timeZone);
  }

  private async getMutableContext() {
    const date = this.getDate();
    const items = await this.itemRepository.get();
    const allItems = flattenItems(items);
    const tasks = allItems.filter(isTask);
    const projects = allItems.filter(isProject);
    const plan = (await this.dayPlanRepository.get(date)) ?? createDayPlan({
      createdAt: this.context.now ?? new Date(),
      date,
      id: `day-plan-${date}`,
      timeZone: this.context.timeZone,
    });
    return { items, plan, projects, tasks };
  }
}

export { WorkspaceService };
export type { WorkspaceContext };
