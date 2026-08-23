import { createInboxItem, type Item } from "../domain";
import type { InboxRepository } from "./InboxRepository";

const DEFAULT_STORAGE_KEY = "atlas.inbox.v1";

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;

type StoredInboxItem = {
  createdAt: string;
  id: string;
  title: string;
};

function isStoredInboxItem(value: unknown): value is StoredInboxItem {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.createdAt === "string" &&
    Number.isFinite(Date.parse(item.createdAt)) &&
    typeof item.id === "string" &&
    typeof item.title === "string"
  );
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `inbox-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Browser-backed Inbox storage hidden behind the repository contract. */
class LocalStorageInboxRepository implements InboxRepository {
  constructor(
    private readonly storage?: StorageAdapter,
    private readonly storageKey: string = DEFAULT_STORAGE_KEY,
  ) {}

  capture(title: string): Promise<Item> {
    const item = createInboxItem({
      createdAt: new Date(),
      id: createId(),
      title,
    });
    const storedItem: StoredInboxItem = {
      createdAt: item.createdAt.toISOString(),
      id: item.id,
      title: item.title,
    };
    const items = [
      storedItem,
      ...this.readStoredItems().filter((stored) => stored.id !== item.id),
    ];

    this.getStorage().setItem(this.storageKey, JSON.stringify(items));
    return Promise.resolve(item);
  }

  getInbox(): Promise<readonly Item[]> {
    const items = this.readStoredItems()
      .map((stored) =>
        createInboxItem({
          createdAt: new Date(stored.createdAt),
          id: stored.id,
          title: stored.title,
        }),
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return Promise.resolve(items);
  }

  private getStorage(): StorageAdapter {
    if (this.storage) {
      return this.storage;
    }

    if (typeof window === "undefined") {
      throw new Error("Inbox storage is only available in the browser.");
    }

    return window.localStorage;
  }

  private readStoredItems(): StoredInboxItem[] {
    const storedValue = this.getStorage().getItem(this.storageKey);

    if (!storedValue) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);
      return Array.isArray(parsed) ? parsed.filter(isStoredInboxItem) : [];
    } catch {
      return [];
    }
  }
}

export { LocalStorageInboxRepository };
export type { StorageAdapter };
