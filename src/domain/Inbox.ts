import { ItemType, type Item, type ItemId } from "./Item";
import { Status } from "./Status";

type CreateInboxItemInput = {
  readonly createdAt: Date;
  readonly id: ItemId;
  readonly title: string;
};

/**
 * Creates an untriaged Atlas Item. Neutral attention, energy, and effort values
 * avoid making prioritization claims before the thought has been clarified.
 */
function createInboxItem(input: CreateInboxItemInput): Item {
  const id = input.id.trim();
  const title = input.title.trim();

  if (!id) {
    throw new Error("An Inbox Item requires an id.");
  }

  if (!title) {
    throw new Error("An Inbox Item requires a title.");
  }

  return {
    areaId: null,
    attentionScore: 50,
    children: [],
    createdAt: new Date(input.createdAt.getTime()),
    description: null,
    effort: 3,
    energyCost: 3,
    id,
    parentId: null,
    projectId: null,
    status: Status.Inbox,
    tags: [],
    title,
    type: ItemType.Idea,
    updatedAt: new Date(input.createdAt.getTime()),
  };
}

export { createInboxItem };
export type { CreateInboxItemInput };
