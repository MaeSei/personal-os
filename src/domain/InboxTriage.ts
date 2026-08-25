import type { AreaId } from "./Area";
import type { Effort, EnergyCost } from "./Attention";
import type { EstimateConfidence } from "./EffortModel";
import {
  ItemType,
  type CalendarDate,
  type Item,
  type ItemId,
} from "./Item";
import { createProject, type Project } from "./Project";
import { Status } from "./Status";
import { createTask, type Task } from "./Task";
import type { PreferredTime } from "./Task";

type InboxTaskInput = {
  readonly areaId: AreaId;
  readonly context?: string | null;
  readonly contexts?: readonly string[];
  readonly description?: string | null;
  readonly dueDate?: CalendarDate | null;
  readonly durationMinutes?: number | null;
  readonly effort?: Effort;
  readonly estimateConfidence?: EstimateConfidence | null;
  readonly estimatedDuration?: number | null;
  readonly energyCost?: EnergyCost;
  readonly projectId?: ItemId | null;
  readonly preferredContext?: string | null;
  readonly preferredTime?: PreferredTime | null;
  readonly scheduledDate?: CalendarDate | null;
  readonly title?: string;
};

type InboxProjectInput = {
  readonly areaId: AreaId;
  readonly description?: string | null;
  readonly outcome: string;
  readonly title: string;
};

function assertInboxItem(item: Item): void {
  if (item.status !== Status.Inbox) {
    throw new Error("Only an Inbox Item can be processed.");
  }
}

/** Converts in place conceptually: identity and capture time are preserved. */
function convertInboxToTask(
  item: Item,
  input: InboxTaskInput,
  processedAt: Date,
): Task {
  assertInboxItem(item);

  return {
    ...createTask({
      areaId: input.areaId,
      attentionScore: item.attentionScore,
      context: input.context,
      contexts: input.contexts,
      createdAt: item.createdAt,
      description:
        input.description === undefined ? item.description : input.description,
      dueDate: input.dueDate,
      durationMinutes: input.durationMinutes,
      estimateConfidence: input.estimateConfidence,
      estimatedDuration: input.estimatedDuration,
      effort: input.effort ?? item.effort,
      energyCost: input.energyCost ?? item.energyCost,
      id: item.id,
      projectId: input.projectId,
      preferredContext: input.preferredContext,
      preferredTime: input.preferredTime,
      scheduledDate: input.scheduledDate,
      status: Status.Today,
      tags: item.tags,
      title: input.title?.trim() || item.title,
    }),
    updatedAt: new Date(processedAt.getTime()),
  };
}

/** Converts an Inbox thought into an outcome container without requiring work. */
function convertInboxToProject(
  item: Item,
  input: InboxProjectInput,
  processedAt: Date,
): Project {
  assertInboxItem(item);

  return {
    ...createProject({
      areaId: input.areaId,
      attentionScore: item.attentionScore,
      createdAt: item.createdAt,
      description: input.description ?? null,
      energyLevel: item.energyCost,
      id: item.id,
      outcome: input.outcome,
      title: input.title,
    }),
    updatedAt: new Date(processedAt.getTime()),
  };
}

function moveInboxToSomeday(item: Item, processedAt: Date): Item {
  assertInboxItem(item);
  return {
    ...item,
    status: Status.Someday,
    updatedAt: new Date(processedAt.getTime()),
  };
}

function convertInboxToReference(item: Item, processedAt: Date): Item {
  assertInboxItem(item);
  return {
    ...item,
    status: Status.Active,
    type: ItemType.Reference,
    updatedAt: new Date(processedAt.getTime()),
  };
}

export {
  convertInboxToProject,
  convertInboxToReference,
  convertInboxToTask,
  moveInboxToSomeday,
};
export type { InboxProjectInput, InboxTaskInput };
