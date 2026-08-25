import type {
  Area,
  AreaId,
  CalendarDate,
  EnergyCost,
  PreferredTime,
  Project,
  ProjectDetail,
  ProjectFilters,
  ProjectOverview,
  Task,
  TaskStatus,
} from "@/domain";

type CompleteOnboardingInput = {
  readonly areas: readonly Area[];
  readonly projectAreaId: AreaId;
  readonly projectEnergyLevel: EnergyCost;
  readonly projectNextAction: string;
  readonly projectOutcome: string;
  readonly projectTitle: string;
};

type TaskWriteInput = {
  readonly areaId: AreaId;
  readonly context?: string | null;
  readonly description?: string | null;
  readonly dueDate?: CalendarDate | null;
  readonly durationMinutes?: number | null;
  readonly estimatedDuration?: number | null;
  readonly energyCost: EnergyCost;
  readonly projectId: string | null;
  readonly preferredContext?: string | null;
  readonly preferredTime?: PreferredTime | null;
  readonly scheduledDate?: CalendarDate | null;
  readonly status: TaskStatus;
  readonly title: string;
};

type ProjectOverviewData = {
  readonly areas: readonly Area[];
  readonly projects: readonly ProjectOverview[];
};

type ProjectDetailData = {
  readonly areas: readonly Area[];
  readonly detail: ProjectDetail;
  readonly projects: readonly Project[];
};

/** Project workspace queries and commands exposed to feature UI. */
interface ProjectFeature {
  completeOnboarding(input: CompleteOnboardingInput): Promise<Project>;
  createTask(input: TaskWriteInput): Promise<Task>;
  createTasks(inputs: readonly TaskWriteInput[]): Promise<readonly Task[]>;
  deleteTask(taskId: string): Promise<void>;
  getProjects(): Promise<readonly Project[]>;
  loadOverview(filters?: ProjectFilters): Promise<ProjectOverviewData>;
  loadProject(projectId: string): Promise<ProjectDetailData | null>;
  reorderTask(
    projectId: string,
    taskId: string,
    direction: "down" | "up",
  ): Promise<void>;
  updateTask(taskId: string, input: TaskWriteInput): Promise<Task>;
}

export type {
  CompleteOnboardingInput,
  ProjectDetailData,
  ProjectFeature,
  ProjectOverviewData,
  TaskWriteInput,
};
