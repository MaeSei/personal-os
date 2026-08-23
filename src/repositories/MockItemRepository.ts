import {
  isBlocked,
  isProject,
  ItemType,
  NextActionCalculator,
  Status,
  type ActionableItem,
  type Item,
  type Project,
} from "../domain";
import type { ItemRepository } from "./ItemRepository";
import type { ProjectRepository } from "./ProjectRepository";

const nextActionCalculator = new NextActionCalculator();

/** In-memory repository retained for isolated domain and loader tests. */
class MockItemRepository implements ItemRepository, ProjectRepository {
  constructor(private readonly items: readonly Item[] = []) {}

  getItems(): Promise<readonly Item[]> {
    return Promise.resolve(this.items);
  }

  getInbox(): Promise<readonly Item[]> {
    return Promise.resolve(
      this.items.filter(
        (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
      ),
    );
  }

  getInboxCount(): Promise<number> {
    return Promise.resolve(
      this.items.filter(
        (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
      ).length,
    );
  }

  getToday(): Promise<readonly ActionableItem[]> {
    return Promise.resolve(nextActionCalculator.getTodayActions(this.items));
  }

  getProjects(): Promise<readonly Project[]> {
    return Promise.resolve(this.items.filter(isProject));
  }

  getBlocked(): Promise<readonly Item[]> {
    return Promise.resolve(
      this.items.filter(
        (item) => item.type !== ItemType.Project && isBlocked(item),
      ),
    );
  }
}

export { MockItemRepository };
