import type {
  ActionableItem,
  FocusModePlan,
  FocusSession,
  Item,
  ItemId,
} from "@/domain";

type FocusSessionData = {
  readonly plan: FocusModePlan;
  readonly relatedProject: {
    readonly id: string;
    readonly outcome: string;
    readonly title: string;
  } | null;
  readonly session: FocusSession | null;
  readonly switchTasks: readonly ActionableItem[];
};

/** Feature-facing Focus Mode queries and commands. */
interface FocusFeature {
  addChecklistItem(taskId: ItemId, title: string): Promise<FocusSessionData>;
  completeItem(itemId: ItemId): Promise<Item | null>;
  loadFocusSession(): Promise<FocusSessionData>;
  loadFocusMode(): Promise<FocusModePlan>;
  pauseSession(taskId: ItemId): Promise<FocusSessionData>;
  removeChecklistItem(
    taskId: ItemId,
    checklistItemId: string,
  ): Promise<FocusSessionData>;
  resumeSession(taskId: ItemId): Promise<FocusSessionData>;
  setChecklistItemCompleted(
    taskId: ItemId,
    checklistItemId: string,
    completed: boolean,
  ): Promise<FocusSessionData>;
  switchTask(taskId: ItemId): Promise<FocusSessionData>;
  updateNotes(taskId: ItemId, notes: string | null): Promise<FocusSessionData>;
}

export type { FocusFeature, FocusSessionData };
