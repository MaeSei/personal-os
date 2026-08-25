const MAX_FOCUS_CHECKLIST_ITEMS = 50;
const MAX_FOCUS_CHECKLIST_TITLE = 160;
const MAX_FOCUS_NOTES_LENGTH = 10_000;

type FocusChecklistItem = {
  readonly completed: boolean;
  readonly id: string;
  readonly title: string;
};

type FocusSession = {
  readonly checklist: readonly FocusChecklistItem[];
  readonly elapsedSeconds: number;
  readonly notes: string | null;
  readonly startedAt: Date | null;
};

type FocusSessionInput = Partial<FocusSession>;

function normalizeChecklist(
  checklist: readonly FocusChecklistItem[],
): readonly FocusChecklistItem[] {
  if (checklist.length > MAX_FOCUS_CHECKLIST_ITEMS) {
    throw new Error("A Focus Session can have at most 50 checklist items.");
  }
  const seen = new Set<string>();
  return checklist.map((item) => {
    const id = item.id.trim();
    const title = item.title.trim();
    if (!id || !title) throw new Error("A checklist item requires an id and title.");
    if (title.length > MAX_FOCUS_CHECKLIST_TITLE) {
      throw new Error("A checklist item must be 160 characters or fewer.");
    }
    if (seen.has(id)) throw new Error("Checklist item ids must be unique.");
    seen.add(id);
    return { completed: item.completed, id, title };
  });
}

function createFocusSession(input: FocusSessionInput = {}): FocusSession {
  const elapsedSeconds = input.elapsedSeconds ?? 0;
  if (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error("Focus elapsed time must be a non-negative whole second.");
  }
  const notes = input.notes?.trim() || null;
  if (notes && notes.length > MAX_FOCUS_NOTES_LENGTH) {
    throw new Error("Focus notes must be 10,000 characters or fewer.");
  }
  const startedAt = input.startedAt ? new Date(input.startedAt.getTime()) : null;
  if (startedAt && !Number.isFinite(startedAt.getTime())) {
    throw new Error("A Focus Session requires a valid start time.");
  }
  return {
    checklist: normalizeChecklist(input.checklist ?? []),
    elapsedSeconds,
    notes,
    startedAt,
  };
}

function parseFocusChecklist(value: unknown): readonly FocusChecklistItem[] {
  if (!Array.isArray(value)) throw new Error("Stored Focus checklist is invalid.");
  const checklist = value.map((entry) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error("Stored Focus checklist is invalid.");
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.completed !== "boolean"
    ) throw new Error("Stored Focus checklist is invalid.");
    return { completed: item.completed, id: item.id, title: item.title };
  });
  return normalizeChecklist(checklist);
}

function getFocusElapsedSeconds(
  session: FocusSession,
  now: Date = new Date(),
): number {
  if (!session.startedAt) return session.elapsedSeconds;
  const currentSegment = Math.max(
    0,
    Math.floor((now.getTime() - session.startedAt.getTime()) / 1000),
  );
  return session.elapsedSeconds + currentSegment;
}

function resumeFocusSession(
  session: FocusSession,
  now: Date = new Date(),
): FocusSession {
  return session.startedAt
    ? session
    : createFocusSession({ ...session, startedAt: now });
}

function pauseFocusSession(
  session: FocusSession,
  now: Date = new Date(),
): FocusSession {
  return createFocusSession({
    ...session,
    elapsedSeconds: getFocusElapsedSeconds(session, now),
    startedAt: null,
  });
}

function updateFocusNotes(session: FocusSession, notes: string | null): FocusSession {
  return createFocusSession({ ...session, notes });
}

function addFocusChecklistItem(
  session: FocusSession,
  item: Omit<FocusChecklistItem, "completed">,
): FocusSession {
  return createFocusSession({
    ...session,
    checklist: [...session.checklist, { ...item, completed: false }],
  });
}

function setFocusChecklistItemCompleted(
  session: FocusSession,
  itemId: string,
  completed: boolean,
): FocusSession {
  if (!session.checklist.some(({ id }) => id === itemId)) {
    throw new Error("The checklist item no longer exists.");
  }
  return createFocusSession({
    ...session,
    checklist: session.checklist.map((item) =>
      item.id === itemId ? { ...item, completed } : item,
    ),
  });
}

function removeFocusChecklistItem(
  session: FocusSession,
  itemId: string,
): FocusSession {
  if (!session.checklist.some(({ id }) => id === itemId)) {
    throw new Error("The checklist item no longer exists.");
  }
  return createFocusSession({
    ...session,
    checklist: session.checklist.filter(({ id }) => id !== itemId),
  });
}

export {
  MAX_FOCUS_CHECKLIST_ITEMS,
  MAX_FOCUS_CHECKLIST_TITLE,
  MAX_FOCUS_NOTES_LENGTH,
  addFocusChecklistItem,
  createFocusSession,
  getFocusElapsedSeconds,
  parseFocusChecklist,
  pauseFocusSession,
  removeFocusChecklistItem,
  resumeFocusSession,
  setFocusChecklistItemCompleted,
  updateFocusNotes,
};
export type { FocusChecklistItem, FocusSession, FocusSessionInput };
