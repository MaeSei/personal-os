import type { FocusModePlan } from "@/domain";
import type { FocusFeature } from "@/features/contracts/FocusFeature";

type FocusModeDependencies = {
  readonly focus: Pick<FocusFeature, "loadFocusMode">;
};

/** Delegates focus-plan preparation to the application layer. */
function loadFocusMode({
  focus,
}: FocusModeDependencies): Promise<FocusModePlan> {
  return focus.loadFocusMode();
}

export { loadFocusMode };
export type { FocusModeDependencies };
