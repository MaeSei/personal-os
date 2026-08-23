import type { Item, ItemId } from "../domain";

/** Item mutations required by interactive Atlas experiences. */
interface ItemCommandRepository {
  completeItem(itemId: ItemId): Promise<Item | null>;
}

export type { ItemCommandRepository };
