import type {
  Area,
  AreaId,
  CalendarDate,
  Effort,
  EnergyCost,
  EstimateConfidence,
  PreferredTime,
  Project,
  Task,
  TaskStatus,
} from "@/domain";

type TaskWriteInput = {
  readonly areaId: AreaId;
  readonly context?: string | null;
  readonly contexts?: readonly string[];
  readonly description?: string | null;
  readonly dueDate?: CalendarDate | null;
  readonly durationMinutes?: number | null;
  readonly effort?: Effort;
  readonly estimateConfidence?: EstimateConfidence | null;
  readonly estimatedDuration?: number | null;
  readonly energyCost: EnergyCost;
  readonly projectId: string | null;
  readonly preferredContext?: string | null;
  readonly preferredTime?: PreferredTime | null;
  readonly scheduledDate?: CalendarDate | null;
  readonly status: TaskStatus;
  readonly title: string;
};

type TaskAssignmentInput = {
  readonly areaId: AreaId;
  readonly projectId: string | null;
};

type TaskDependency = Pick<Task, "id" | "status" | "title">;

type TaskNote = {
  readonly body: string;
  readonly createdAt: Date;
  readonly id: string;
};

type TaskHistoryEntry = {
  readonly approximate?: boolean;
  readonly at: Date;
  readonly kind: "completed" | "created" | "updated";
};

type TaskDetailData = {
  readonly area: Area | null;
  readonly areas: readonly Area[];
  readonly dependencies: readonly TaskDependency[];
  readonly history: readonly TaskHistoryEntry[];
  readonly notes: readonly TaskNote[];
  readonly project: Project | null;
  readonly projects: readonly Project[];
  readonly task: Task;
};

/** Task detail queries and explicit Task lifecycle commands exposed to UI. */
interface TaskFeature {
  convertToProject(taskId: string, outcome: string): Promise<Project>;
  deleteTask(taskId: string): Promise<void>;
  detachFromProject(taskId: string): Promise<Task>;
  duplicateTask(taskId: string): Promise<Task>;
  loadTask(taskId: string): Promise<TaskDetailData | null>;
  moveTask(taskId: string, input: TaskAssignmentInput): Promise<Task>;
  updateTask(taskId: string, input: TaskWriteInput): Promise<Task>;
}

export type {
  TaskAssignmentInput,
  TaskDependency,
  TaskDetailData,
  TaskFeature,
  TaskHistoryEntry,
  TaskNote,
  TaskWriteInput,
};
