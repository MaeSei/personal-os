import type { FocusModePlan, Item, ItemId } from "@/domain";

/** Feature-facing Focus Mode queries and commands. */
interface FocusFeature {
  completeItem(itemId: ItemId): Promise<Item | null>;
  loadFocusMode(): Promise<FocusModePlan>;
}

export type { FocusFeature };
