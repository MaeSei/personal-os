import type { Item } from "../domain";

/** Persistence boundary for the complete Atlas Item collection. */
interface ItemRepository {
  get(): Promise<readonly Item[]>;
  save(items: readonly Item[]): Promise<void>;
}

export type { ItemRepository };
