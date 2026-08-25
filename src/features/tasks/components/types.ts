import type {
  AreaId,
  CalendarDate,
  Effort,
  EnergyCost,
  EstimateConfidence,
  PreferredTime,
  Task,
  TaskStatus,
} from "@/domain";

type TaskEditorValue = {
  readonly areaId: AreaId;
  readonly context: string | null;
  readonly contexts: readonly string[];
  readonly description: string | null;
  readonly dueDate: CalendarDate | null;
  readonly durationMinutes: number | null;
  readonly effort: Effort;
  readonly estimateConfidence: EstimateConfidence | null;
  readonly estimatedDuration: number | null;
  readonly energyCost: EnergyCost;
  readonly projectId: string | null;
  readonly preferredContext: string | null;
  readonly preferredTime: PreferredTime | null;
  readonly scheduledDate: CalendarDate | null;
  readonly scheduledEnd?: Date | null;
  readonly scheduledStart?: Date | null;
  readonly status: TaskStatus;
  readonly title: string;
};

function taskToEditorValue(
  task: Task,
  containingProjectId: string | null = task.projectId,
): TaskEditorValue {
  return {
    areaId: task.areaId,
    context: task.context ?? null,
    contexts: [...task.contexts],
    description: task.description,
    dueDate: task.dueDate ?? null,
    durationMinutes: task.durationMinutes ?? null,
    effort: task.effort,
    estimateConfidence: task.estimateConfidence,
    estimatedDuration: task.estimatedDuration ?? task.durationMinutes ?? null,
    energyCost: task.energyCost,
    projectId: containingProjectId,
    preferredContext: task.preferredContext ?? task.context ?? null,
    preferredTime: task.preferredTime ?? null,
    scheduledDate: task.scheduledDate ?? null,
    scheduledEnd: task.scheduledEnd ?? null,
    scheduledStart: task.scheduledStart ?? null,
    status: task.status,
    title: task.title,
  };
}

export { taskToEditorValue };
export type { TaskEditorValue };
