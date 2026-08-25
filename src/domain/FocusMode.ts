import type { ActionableItem } from "./Focus";
import type { FocusPlan } from "./FocusPlan";
import type { Task } from "./Task";

type FocusModePlan = {
  /** The single Item that deserves attention now. */
  readonly currentFocus: ActionableItem | null;
  /** The next concrete Item, kept visible without exposing the wider plan. */
  readonly nextAction: ActionableItem | null;
  /** Blockers that may prevent progress and therefore still need awareness. */
  readonly blockedItems: readonly Task[];
};

/**
 * FocusPlan already guarantees concrete work. This projection keeps only two
 * actions while retaining blockers that can affect them.
 */
function buildFocusModePlan(focusPlan: FocusPlan): FocusModePlan {
  return {
    blockedItems: focusPlan.blockedItems,
    currentFocus: focusPlan.focusItems[0] ?? null,
    nextAction: focusPlan.focusItems[1] ?? null,
  };
}

export { buildFocusModePlan };
export type { FocusModePlan };
