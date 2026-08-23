import { ItemType, type Item } from "./Item";
import { Status } from "./Status";

type StatusBound = {
  status: Status;
};

type ActionabilityFields = StatusBound & {
  type: ItemType;
};

type ActionItemType = Exclude<ItemType, ItemType.Project>;

type ActionableFields = {
  status: Status.Today;
  type: ActionItemType;
};

type ActionableItem = Item & ActionableFields;

/** Returns true only when an Item is explicitly unable to move forward. */
function isBlocked(item: StatusBound): boolean {
  return item.status === Status.Blocked;
}

/** Returns true only when an Item has reached the completed lifecycle state. */
function isCompleted(item: StatusBound): boolean {
  return item.status === Status.Completed;
}

/**
 * Returns whether an Item is concrete work available to advance today.
 * Projects organize that work and can never become actions themselves.
 */
function isActionable<T extends ActionabilityFields>(
  item: T,
): item is T & ActionableFields {
  return item.type !== ItemType.Project && item.status === Status.Today;
}

export { isActionable, isBlocked, isCompleted };
export type {
  ActionabilityFields,
  ActionableFields,
  ActionableItem,
  ActionItemType,
  StatusBound,
};
