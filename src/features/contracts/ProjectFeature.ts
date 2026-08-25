import type {
  Area,
  AreaId,
  CalendarDate,
  EnergyCost,
  Project,
  ProjectDetail,
  ProjectFilters,
  ProjectOverview,
  ProjectMilestone,
  ProjectNote,
  Task,
} from "@/domain";
import type { TaskWriteInput } from "@/features/contracts/TaskFeature";

type CompleteOnboardingInput = {
  readonly areas: readonly Area[];
  readonly projectAreaId: AreaId;
  readonly projectEnergyLevel: EnergyCost;
  readonly projectNextAction: string;
  readonly projectOutcome: string;
  readonly projectTitle: string;
};

type ProjectOverviewData = {
  readonly areas: readonly Area[];
  readonly projects: readonly ProjectOverview[];
};

type ProjectMilestoneInput = {
  readonly description?: string | null;
  readonly dueDate?: CalendarDate | null;
  readonly title: string;
};

type ProjectDetailData = {
  readonly areas: readonly Area[];
  readonly detail: ProjectDetail;
  readonly projects: readonly Project[];
};

/** Project workspace queries and commands exposed to feature UI. */
interface ProjectFeature {
  createMilestone(projectId: string, input: ProjectMilestoneInput): Promise<ProjectMilestone>;
  createNote(projectId: string, body: string, pinned: boolean): Promise<ProjectNote>;
  completeOnboarding(input: CompleteOnboardingInput): Promise<Project>;
  createTask(input: TaskWriteInput): Promise<Task>;
  createTasks(inputs: readonly TaskWriteInput[]): Promise<readonly Task[]>;
  deleteTask(taskId: string): Promise<void>;
  deleteMilestone(projectId: string, milestoneId: string): Promise<void>;
  deleteNote(projectId: string, noteId: string): Promise<void>;
  getProjects(): Promise<readonly Project[]>;
  loadOverview(filters?: ProjectFilters): Promise<ProjectOverviewData>;
  loadProject(projectId: string): Promise<ProjectDetailData | null>;
  groupTask(projectId: string, taskId: string, milestoneId: string | null): Promise<void>;
  linkRelatedProject(projectId: string, relatedProjectId: string): Promise<void>;
  reorderTask(
    projectId: string,
    taskId: string,
    direction: "down" | "up",
  ): Promise<void>;
  updateTask(taskId: string, input: TaskWriteInput): Promise<Task>;
  setMilestoneCompleted(projectId: string, milestoneId: string, completed: boolean): Promise<void>;
  setNotePinned(projectId: string, noteId: string, pinned: boolean): Promise<void>;
  unlinkRelatedProject(projectId: string, relatedProjectId: string): Promise<void>;
}

export type {
  CompleteOnboardingInput,
  ProjectDetailData,
  ProjectFeature,
  ProjectMilestoneInput,
  ProjectOverviewData,
  TaskWriteInput,
};
