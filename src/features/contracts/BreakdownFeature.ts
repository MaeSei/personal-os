import type { Task } from "@/domain";
import type { TaskWriteInput } from "@/features/contracts/ProjectFeature";

type BreakdownTaskDraft = Pick<
  TaskWriteInput,
  "areaId" | "projectId" | "title"
> &
  Partial<
    Pick<
      TaskWriteInput,
      | "context"
      | "contexts"
      | "description"
      | "dueDate"
      | "durationMinutes"
      | "estimatedDuration"
      | "energyCost"
      | "effort"
      | "estimateConfidence"
      | "preferredContext"
      | "preferredTime"
      | "scheduledDate"
      | "status"
    >
  >;

type BreakdownRequest = {
  readonly projectId: string;
  readonly tasks: readonly BreakdownTaskDraft[];
};

/** Replaceable manual or future assisted Project-breakdown capability. */
interface BreakdownFeature {
  breakDown(request: BreakdownRequest): Promise<readonly Task[]>;
}

export type { BreakdownFeature, BreakdownRequest, BreakdownTaskDraft };
