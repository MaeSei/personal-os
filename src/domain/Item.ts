import type { AreaId } from "./Area";
import type {
  AttentionScore,
  Effort,
  EnergyCost,
} from "./Attention";
import type { Status } from "./Status";

/** The supported ways an Atlas Item can be interpreted. */
enum ItemType {
  Task = "Task",
  Project = "Project",
  Workflow = "Workflow",
  Reference = "Reference",
  Idea = "Idea",
  Reminder = "Reminder",
  Review = "Review",
}

type ItemId = string;
/** A calendar day without a time zone, serialized as YYYY-MM-DD. */
type CalendarDate = string;

/**
 * The central Atlas entity. Hierarchy is represented in both directions so a
 * loaded Item can identify its parent and expose any already-resolved children.
 */
type Item = {
  /** Inbox Items remain unassigned until they are intentionally triaged. */
  readonly areaId: AreaId | null;
  readonly attentionScore: AttentionScore;
  readonly children: readonly Item[];
  /** Optional place or tool needed to do a Task, such as "Office". */
  readonly context?: string | null;
  readonly createdAt: Date;
  readonly description: string | null;
  /** Optional calendar constraint. It does not imply Today status. */
  readonly dueDate?: CalendarDate | null;
  /** Optional time estimate kept separate from the 1–5 effort scale. */
  readonly durationMinutes?: number | null;
  /** Canonical optional Task estimate; durationMinutes remains compatibility data. */
  readonly estimatedDuration?: number | null;
  readonly energyCost: EnergyCost;
  readonly effort: Effort;
  readonly id: ItemId;
  readonly parentId: ItemId | null;
  /** Explicit Project membership; required by Task and absent elsewhere. */
  readonly projectId?: ItemId | null;
  /** Preferred execution context, independent from an actual reservation. */
  readonly preferredContext?: string | null;
  /** Preferred part of day; it never schedules the Task automatically. */
  readonly preferredTime?: string | null;
  /** Optional day on which the user intends to work on a Task. */
  readonly scheduledDate?: CalendarDate | null;
  /** Primary scheduled allocation, projected from a linked Time Block. */
  readonly scheduledEnd?: Date | null;
  readonly scheduledStart?: Date | null;
  readonly status: Status;
  readonly tags: readonly string[];
  readonly title: string;
  readonly type: ItemType;
  readonly updatedAt: Date;
};

export { ItemType };
export type { CalendarDate, Item, ItemId };
