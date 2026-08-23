import type { Item } from "../domain";

/** Storage-independent operations required by the Atlas Inbox experience. */
interface InboxRepository {
  capture(title: string): Promise<Item>;
  getInbox(): Promise<readonly Item[]>;
}

export type { InboxRepository };
