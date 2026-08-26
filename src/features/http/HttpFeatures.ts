import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";

const DATE_KEYS = new Set([
  "createdAt",
  "generatedAt",
  "connectedAt",
  "at",
  "end",
  "lastActivity",
  "lastSyncedAt",
  "scheduledEnd",
  "scheduledStart",
  "start",
  "startedAt",
  "updatedAt",
]);

type ErrorPayload = { readonly error?: unknown };

function reviveDates(value: unknown, key?: string): unknown {
  if (typeof value === "string" && key && DATE_KEYS.has(key)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => reviveDates(entry));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entry]) => [
        entryKey,
        reviveDates(entry, entryKey),
      ]),
    );
  }

  return value;
}

async function callFeature<Result>(
  feature: keyof AtlasFeatures,
  operation: string,
  args: readonly unknown[] = [],
): Promise<Result> {
  const response = await fetch("/api/atlas", {
    body: JSON.stringify({ args, feature, operation }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const error = payload as ErrorPayload;
    throw new Error(
      typeof error.error === "string"
        ? error.error
        : "Atlas could not complete the request.",
    );
  }

  return reviveDates(payload) as Result;
}

/** Browser adapters for the feature contracts exposed by the Atlas server. */
const httpFeatures: AtlasFeatures = {
  areas: {
    getAreas: () => callFeature("areas", "getAreas"),
    saveAreas: (areas) => callFeature("areas", "saveAreas", [areas]),
  },
  assistant: {
    acceptProjectBreakdown: (input) =>
      callFeature("assistant", "acceptProjectBreakdown", [input]),
    getExecutiveBriefing: () =>
      callFeature("assistant", "getExecutiveBriefing"),
    getReflection: () => callFeature("assistant", "getReflection"),
    getStatus: () => callFeature("assistant", "getStatus"),
    proposeProjectBreakdown: (projectId) =>
      callFeature("assistant", "proposeProjectBreakdown", [projectId]),
    suggestInboxItem: (itemId) =>
      callFeature("assistant", "suggestInboxItem", [itemId]),
  },
  breakdown: {
    breakDown: (request) =>
      callFeature("breakdown", "breakDown", [request]),
  },
  calendar: {
    disconnect: () => callFeature("calendar", "disconnect"),
    getConnection: () => callFeature("calendar", "getConnection"),
    refresh: () => callFeature("calendar", "refresh"),
    selectCalendars: (calendarIds) =>
      callFeature("calendar", "selectCalendars", [calendarIds]),
  },
  focus: {
    addChecklistItem: (taskId, title) =>
      callFeature("focus", "addChecklistItem", [taskId, title]),
    completeItem: (itemId) =>
      callFeature("focus", "completeItem", [itemId]),
    loadFocusSession: () => callFeature("focus", "loadFocusSession"),
    loadFocusMode: () => callFeature("focus", "loadFocusMode"),
    pauseSession: (taskId) =>
      callFeature("focus", "pauseSession", [taskId]),
    removeChecklistItem: (taskId, checklistItemId) =>
      callFeature("focus", "removeChecklistItem", [taskId, checklistItemId]),
    resumeSession: (taskId) =>
      callFeature("focus", "resumeSession", [taskId]),
    setChecklistItemCompleted: (taskId, checklistItemId, completed) =>
      callFeature("focus", "setChecklistItemCompleted", [
        taskId,
        checklistItemId,
        completed,
      ]),
    switchTask: (taskId) =>
      callFeature("focus", "switchTask", [taskId]),
    updateNotes: (taskId, notes) =>
      callFeature("focus", "updateNotes", [taskId, notes]),
  },
  inbox: {
    addFirstTask: (projectId, title) =>
      callFeature("inbox", "addFirstTask", [projectId, title]),
    capture: (title) => callFeature("inbox", "capture", [title]),
    deleteInboxItem: (itemId) =>
      callFeature("inbox", "deleteInboxItem", [itemId]),
    getInbox: () => callFeature("inbox", "getInbox"),
    getProcessingData: () => callFeature("inbox", "getProcessingData"),
    processAsProject: (input) =>
      callFeature("inbox", "processAsProject", [input]),
    processAsReference: (itemId) =>
      callFeature("inbox", "processAsReference", [itemId]),
    processAsSomeday: (itemId) =>
      callFeature("inbox", "processAsSomeday", [itemId]),
    processAsTask: (input) =>
      callFeature("inbox", "processAsTask", [input]),
  },
  missionControl: {
    loadMissionControl: () =>
      callFeature("missionControl", "loadMissionControl"),
  },
  planner: {
    createTimeBlock: (input) =>
      callFeature("planner", "createTimeBlock", [input]),
    deleteTimeBlock: (blockId) =>
      callFeature("planner", "deleteTimeBlock", [blockId]),
    discardDraft: () => callFeature("planner", "discardDraft"),
    duplicateTimeBlock: (blockId, start) =>
      callFeature("planner", "duplicateTimeBlock", [blockId, start]),
    linkProjectToTimeBlock: (blockId, projectId) =>
      callFeature("planner", "linkProjectToTimeBlock", [blockId, projectId]),
    linkTaskToTimeBlock: (blockId, taskId) =>
      callFeature("planner", "linkTaskToTimeBlock", [blockId, taskId]),
    loadPlanner: () => callFeature("planner", "loadPlanner"),
    mergeTimeBlocks: (firstBlockId, secondBlockId) =>
      callFeature("planner", "mergeTimeBlocks", [firstBlockId, secondBlockId]),
    moveTask: (taskId, direction) =>
      callFeature("planner", "moveTask", [taskId, direction]),
    moveTimeBlock: (blockId, start) =>
      callFeature("planner", "moveTimeBlock", [blockId, start]),
    placeTask: (taskId, beforeTaskId) =>
      callFeature("planner", "placeTask", [taskId, beforeTaskId]),
    placeTasks: (taskIds) =>
      callFeature("planner", "placeTasks", [taskIds]),
    removeTask: (taskId) =>
      callFeature("planner", "removeTask", [taskId]),
    resizeTimeBlock: (blockId, end) =>
      callFeature("planner", "resizeTimeBlock", [blockId, end]),
    scheduleTaskInSlot: (taskId, start) =>
      callFeature("planner", "scheduleTaskInSlot", [taskId, start]),
    saveDraft: () => callFeature("planner", "saveDraft"),
    setTimeBlockLocked: (blockId, locked) =>
      callFeature("planner", "setTimeBlockLocked", [blockId, locked]),
    splitTimeBlock: (blockId, splitAt) =>
      callFeature("planner", "splitTimeBlock", [blockId, splitAt]),
    startDay: () => callFeature("planner", "startDay"),
    unlinkProjectFromTimeBlock: (blockId, projectId) =>
      callFeature("planner", "unlinkProjectFromTimeBlock", [blockId, projectId]),
    unlinkTaskFromTimeBlock: (blockId, taskId) =>
      callFeature("planner", "unlinkTaskFromTimeBlock", [blockId, taskId]),
    unscheduleTask: (taskId) =>
      callFeature("planner", "unscheduleTask", [taskId]),
    updateTimeBlock: (blockId, input) =>
      callFeature("planner", "updateTimeBlock", [blockId, input]),
  },
  projects: {
    completeOnboarding: (input) =>
      callFeature("projects", "completeOnboarding", [input]),
    createMilestone: (projectId, input) =>
      callFeature("projects", "createMilestone", [projectId, input]),
    createNote: (projectId, body, pinned) =>
      callFeature("projects", "createNote", [projectId, body, pinned]),
    createTask: (input) => callFeature("projects", "createTask", [input]),
    createTasks: (inputs) =>
      callFeature("projects", "createTasks", [inputs]),
    deleteTask: (taskId) =>
      callFeature("projects", "deleteTask", [taskId]),
    deleteMilestone: (projectId, milestoneId) =>
      callFeature("projects", "deleteMilestone", [projectId, milestoneId]),
    deleteNote: (projectId, noteId) =>
      callFeature("projects", "deleteNote", [projectId, noteId]),
    getProjects: () => callFeature("projects", "getProjects"),
    loadOverview: (filters) =>
      callFeature("projects", "loadOverview", [filters]),
    loadProject: (projectId) =>
      callFeature("projects", "loadProject", [projectId]),
    groupTask: (projectId, taskId, milestoneId) =>
      callFeature("projects", "groupTask", [projectId, taskId, milestoneId]),
    linkRelatedProject: (projectId, relatedProjectId) =>
      callFeature("projects", "linkRelatedProject", [projectId, relatedProjectId]),
    reorderTask: (projectId, taskId, direction) =>
      callFeature("projects", "reorderTask", [projectId, taskId, direction]),
    updateTask: (taskId, input) =>
      callFeature("projects", "updateTask", [taskId, input]),
    setMilestoneCompleted: (projectId, milestoneId, completed) =>
      callFeature("projects", "setMilestoneCompleted", [projectId, milestoneId, completed]),
    setNotePinned: (projectId, noteId, pinned) =>
      callFeature("projects", "setNotePinned", [projectId, noteId, pinned]),
    unlinkRelatedProject: (projectId, relatedProjectId) =>
      callFeature("projects", "unlinkRelatedProject", [projectId, relatedProjectId]),
  },
  review: {
    completeReview: (input) =>
      callFeature("review", "completeReview", [input]),
    getLatestReview: () => callFeature("review", "getLatestReview"),
    getReviewHistory: () => callFeature("review", "getReviewHistory"),
  },
  tasks: {
    convertToProject: (taskId, outcome) =>
      callFeature("tasks", "convertToProject", [taskId, outcome]),
    deleteTask: (taskId) => callFeature("tasks", "deleteTask", [taskId]),
    detachFromProject: (taskId) =>
      callFeature("tasks", "detachFromProject", [taskId]),
    duplicateTask: (taskId) =>
      callFeature("tasks", "duplicateTask", [taskId]),
    loadTask: (taskId) => callFeature("tasks", "loadTask", [taskId]),
    moveTask: (taskId, input) =>
      callFeature("tasks", "moveTask", [taskId, input]),
    updateTask: (taskId, input) =>
      callFeature("tasks", "updateTask", [taskId, input]),
  },
  workspace: {
    archiveTask: (taskId) =>
      callFeature("workspace", "archiveTask", [taskId]),
    focusTask: (taskId) =>
      callFeature("workspace", "focusTask", [taskId]),
    loadWorkspace: (filters) =>
      callFeature("workspace", "loadWorkspace", [filters]),
    placeTask: (input) =>
      callFeature("workspace", "placeTask", [input]),
    removeTask: (taskId) =>
      callFeature("workspace", "removeTask", [taskId]),
    setTaskGroup: (taskId, group) =>
      callFeature("workspace", "setTaskGroup", [taskId, group]),
    setTaskPinned: (taskId, pinned) =>
      callFeature("workspace", "setTaskPinned", [taskId, pinned]),
  },
  wrapUp: {
    completeWrapUp: (input) =>
      callFeature("wrapUp", "completeWrapUp", [input]),
    loadWrapUp: () => callFeature("wrapUp", "loadWrapUp"),
  },
};

export { httpFeatures };
