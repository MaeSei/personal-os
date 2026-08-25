import { migrateLegacyTasks, type Item } from "../domain";
import type { ItemRepository } from "./ItemRepository";

/** In-memory Item repository retained for isolated service tests. */
class MockItemRepository implements ItemRepository {
  constructor(private items: readonly Item[] = []) {}

  get(): Promise<readonly Item[]> {
    const migration = migrateLegacyTasks(this.items);

    if (migration.changed) {
      this.items = migration.items;
    }

    return Promise.resolve(this.items);
  }

  save(items: readonly Item[]): Promise<void> {
    this.items = items;
    return Promise.resolve();
  }
}

export { MockItemRepository };
