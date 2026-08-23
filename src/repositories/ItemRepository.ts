import type { ActionableItem, Item } from "../domain";

/** Read operations available to consumers of the Atlas Item collection. */
interface ItemRepository {
  getItems(): Promise<readonly Item[]>;
  getInbox(): Promise<readonly Item[]>;
  getInboxCount(): Promise<number>;
  getToday(): Promise<readonly ActionableItem[]>;
  getBlocked(): Promise<readonly Item[]>;
}

export type { ItemRepository };
