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

/**
 * The central Atlas entity. Hierarchy is represented in both directions so a
 * loaded Item can identify its parent and expose any already-resolved children.
 */
type Item = {
  /** Inbox Items remain unassigned until they are intentionally triaged. */
  readonly areaId: AreaId | null;
  readonly attentionScore: AttentionScore;
  readonly children: readonly Item[];
  readonly createdAt: Date;
  readonly description: string | null;
  readonly energyCost: EnergyCost;
  readonly effort: Effort;
  readonly id: ItemId;
  readonly parentId: ItemId | null;
  readonly status: Status;
  readonly tags: readonly string[];
  readonly title: string;
  readonly type: ItemType;
  readonly updatedAt: Date;
};

export { ItemType };
export type { Item, ItemId };
