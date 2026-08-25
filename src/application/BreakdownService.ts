import { Status, type Task } from "../domain";
import type {
  BreakdownFeature,
  BreakdownRequest,
} from "@/features/contracts/BreakdownFeature";
import type {
  ProjectFeature,
  TaskWriteInput,
} from "@/features/contracts/ProjectFeature";

/** Manual baseline. An AI implementation can satisfy the same contract later. */
class ManualBreakdownService implements BreakdownFeature {
  constructor(private readonly projectFeature: ProjectFeature) {}

  breakDown(request: BreakdownRequest): Promise<readonly Task[]> {
    const tasks = request.tasks
      .map((task) => ({ ...task, title: task.title.trim() }))
      .filter((task) => task.title.length > 0)
      .map((task): TaskWriteInput => ({
        areaId: task.areaId,
        context: task.context ?? null,
        contexts: task.contexts,
        description: task.description ?? null,
        dueDate: task.dueDate ?? null,
        durationMinutes: task.durationMinutes ?? null,
        effort: task.effort ?? task.energyCost ?? 3,
        estimateConfidence: task.estimateConfidence ?? null,
        estimatedDuration: task.estimatedDuration ?? task.durationMinutes ?? null,
        energyCost: task.energyCost ?? 3,
        projectId: request.projectId,
        preferredContext: task.preferredContext ?? task.context ?? null,
        preferredTime: task.preferredTime ?? null,
        scheduledDate: task.scheduledDate ?? null,
        status: task.status ?? Status.Active,
        title: task.title,
      }));

    if (tasks.length === 0) {
      throw new Error("A Project breakdown requires at least one Task.");
    }

    return this.projectFeature.createTasks(tasks);
  }
}

export { ManualBreakdownService };
