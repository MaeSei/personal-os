import { Status } from "./Status";
import type { Item, ItemId } from "./Item";

type ItemCompletionResult = {
  readonly completedItem: Item | null;
  readonly items: readonly Item[];
};

function findItem(items: readonly Item[], itemId: ItemId): Item | null {
  for (const item of items) {
    if (item.id === itemId) {
      return item;
    }

    const child = findItem(item.children, itemId);

    if (child) {
      return child;
    }
  }

  return null;
}

/**
 * Completes one Item without mutating repository data. Its parent and any
 * containing ancestors receive the same activity timestamp.
 */
function completeItem(
  items: readonly Item[],
  itemId: ItemId,
  completedAt: Date = new Date(),
): ItemCompletionResult {
  const target = findItem(items, itemId);

  if (!target) {
    return { completedItem: null, items };
  }

  let completedItem: Item | null = null;
  const parentId = target.parentId;
  const timestamp = completedAt.getTime();

  function updateItem(item: Item): Item {
    const children = item.children.map(updateItem);
    const childrenChanged = children.some(
      (child, index) => child !== item.children[index],
    );
    const isTarget = item.id === itemId;
    const isParent = item.id === parentId;

    if (!isTarget && !isParent && !childrenChanged) {
      return item;
    }

    const updatedItem: Item = {
      ...item,
      children,
      status: isTarget ? Status.Completed : item.status,
      updatedAt: new Date(timestamp),
    };

    if (isTarget) {
      completedItem = updatedItem;
    }

    return updatedItem;
  }

  const updatedItems = items.map(updateItem);

  return { completedItem, items: updatedItems };
}

export { completeItem };
export type { ItemCompletionResult };
