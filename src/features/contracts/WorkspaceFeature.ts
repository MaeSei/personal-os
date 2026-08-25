import type {
  Area,
  EnergyCost,
  ProjectOverview,
  Task,
  TaskStatus,
  WorkspaceTaskFilters,
} from "@/domain";

type WorkspaceProject = Pick<
  ProjectOverview["project"],
  "id" | "outcome" | "title"
>;

type WorkspaceTask = {
  readonly area: Area | null;
  readonly daily: {
    readonly focused: boolean;
    readonly group: string | null;
    readonly pinned: boolean;
    readonly position: number;
  } | null;
  readonly project: WorkspaceProject | null;
  readonly task: Task;
};

type WorkspaceTaskGroup = {
  readonly id: string;
  readonly tasks: readonly WorkspaceTask[];
  readonly title: string;
};

type WorkspacePlaceInput = {
  readonly beforeTaskId?: string | null;
  readonly group?: string | null;
  readonly pinned?: boolean;
  readonly taskId: string;
};

type WorkspaceProjectGroup = {
  readonly area: Area;
  readonly projects: readonly ProjectOverview[];
};

type WorkspaceData = {
  readonly filterOptions: {
    readonly areas: readonly Area[];
    readonly contexts: readonly string[];
    readonly durations: readonly number[];
    readonly energyLevels: readonly EnergyCost[];
    readonly projects: readonly WorkspaceProject[];
    readonly statuses: readonly TaskStatus[];
  };
  readonly projectGroups: readonly WorkspaceProjectGroup[];
  readonly today: {
    readonly available: readonly WorkspaceTask[];
    readonly focused: WorkspaceTask | null;
    readonly groups: readonly WorkspaceTaskGroup[];
    readonly pinned: readonly WorkspaceTask[];
  };
};

/** User-authored daily context and commands for Atlas's primary surface. */
interface WorkspaceFeature {
  archiveTask(taskId: string): Promise<void>;
  focusTask(taskId: string): Promise<void>;
  loadWorkspace(filters?: WorkspaceTaskFilters): Promise<WorkspaceData>;
  placeTask(input: WorkspacePlaceInput): Promise<void>;
  removeTask(taskId: string): Promise<void>;
  setTaskGroup(taskId: string, group: string | null): Promise<void>;
  setTaskPinned(taskId: string, pinned: boolean): Promise<void>;
}

export type {
  WorkspaceData,
  WorkspaceFeature,
  WorkspacePlaceInput,
  WorkspaceProject,
  WorkspaceProjectGroup,
  WorkspaceTask,
  WorkspaceTaskGroup,
};
