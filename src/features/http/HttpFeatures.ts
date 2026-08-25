import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";

const DATE_KEYS = new Set([
  "createdAt",
  "end",
  "lastActivity",
  "scheduledEnd",
  "scheduledStart",
  "start",
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
  breakdown: {
    breakDown: (request) =>
      callFeature("breakdown", "breakDown", [request]),
  },
  focus: {
    completeItem: (itemId) =>
      callFeature("focus", "completeItem", [itemId]),
    loadFocusMode: () => callFeature("focus", "loadFocusMode"),
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
    createTask: (input) => callFeature("projects", "createTask", [input]),
    createTasks: (inputs) =>
      callFeature("projects", "createTasks", [inputs]),
    deleteTask: (taskId) =>
      callFeature("projects", "deleteTask", [taskId]),
    getProjects: () => callFeature("projects", "getProjects"),
    loadOverview: (filters) =>
      callFeature("projects", "loadOverview", [filters]),
    loadProject: (projectId) =>
      callFeature("projects", "loadProject", [projectId]),
    reorderTask: (projectId, taskId, direction) =>
      callFeature("projects", "reorderTask", [projectId, taskId, direction]),
    updateTask: (taskId, input) =>
      callFeature("projects", "updateTask", [taskId, input]),
  },
  review: {
    completeReview: (input) =>
      callFeature("review", "completeReview", [input]),
    getLatestReview: () => callFeature("review", "getLatestReview"),
    getReviewHistory: () => callFeature("review", "getReviewHistory"),
  },
};

export { httpFeatures };
