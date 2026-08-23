import type { ActionableItem } from "./Focus";
import type { FocusPlan } from "./FocusPlan";
import { ItemType, type Item } from "./Item";

type FocusModePlan = {
  /** The single Item that deserves attention now. */
  readonly currentFocus: ActionableItem | null;
  /** The next concrete Item, kept visible without exposing the wider plan. */
  readonly nextAction: ActionableItem | null;
  /** Blockers that may prevent progress and therefore still need awareness. */
  readonly blockedItems: readonly Item[];
};

function isVisibleInFocusMode(item: Item): boolean {
  return item.type !== ItemType.Project;
}

/**
 * FocusPlan already guarantees concrete work. This projection keeps only two
 * actions while retaining blockers that can affect them.
 */
function buildFocusModePlan(focusPlan: FocusPlan): FocusModePlan {
  return {
    blockedItems: focusPlan.blockedItems.filter(isVisibleInFocusMode),
    currentFocus: focusPlan.focusItems[0] ?? null,
    nextAction: focusPlan.focusItems[1] ?? null,
  };
}

export { buildFocusModePlan };
export type { FocusModePlan };
