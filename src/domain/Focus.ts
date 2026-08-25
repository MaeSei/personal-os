import { ItemType, type Item } from "./Item";
import { Status } from "./Status";
import type { Task } from "./Task";

type StatusBound = {
  status: Status;
};

type ActionabilityFields = StatusBound & {
  areaId: Item["areaId"];
  projectId?: Item["projectId"];
  type: ItemType;
};

type ActionItemType = ItemType.Task;

type ActionableFields = {
  areaId: Exclude<Item["areaId"], null>;
  projectId: Exclude<Item["projectId"], undefined>;
  status: Status.Today;
  type: ItemType.Task;
};

type ActionableItem = Task & ActionableFields;

/** Returns true only when an Item is explicitly unable to move forward. */
function isBlocked(item: StatusBound): boolean {
  return item.status === Status.Blocked;
}

/** Returns true only when an Item has reached the completed lifecycle state. */
function isCompleted(item: StatusBound): boolean {
  return item.status === Status.Completed;
}

/**
 * Returns whether an Item is a valid Task available to advance today.
 */
function isActionable<T extends ActionabilityFields>(
  item: T,
): item is T & ActionableFields {
  return (
    item.type === ItemType.Task &&
    item.areaId !== null &&
    item.status === Status.Today &&
    (item.projectId === null ||
      (typeof item.projectId === "string" && item.projectId.trim().length > 0))
  );
}

export { isActionable, isBlocked, isCompleted };
export type {
  ActionabilityFields,
  ActionableFields,
  ActionableItem,
  ActionItemType,
  StatusBound,
};
