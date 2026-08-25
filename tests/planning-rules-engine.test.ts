import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PLANNING_DURATION_MINUTES,
  PlanningRuleMatch,
  PlanningRulesEngine,
  Status,
  createProject,
  createTask,
  type CreateTaskInput,
} from "../src/domain";

const createdAt = new Date("2026-08-25T06:00:00.000Z");
const engine = new PlanningRulesEngine();

type TaskOverrides = Partial<Omit<
  CreateTaskInput,
  "areaId" | "createdAt" | "id" | "title"
>>;

function task(id: string, overrides: TaskOverrides = {}) {
  return createTask({
    areaId: "work",
    attentionScore: 50,
    createdAt,
    energyCost: 3,
    id,
    status: Status.Active,
    title: id,
    ...overrides,
  });
}

function suggest(items: Parameters<PlanningRulesEngine["getSuggestions"]>[0]["items"], overrides: Partial<Parameters<PlanningRulesEngine["getSuggestions"]>[0]> = {}) {
  return engine.getSuggestions({
    availableMinutes: null,
    date: "2026-08-25",
    items,
    limit: 20,
    ...overrides,
  });
}

function place(
  items: Parameters<PlanningRulesEngine["getSuggestedPlacements"]>[0]["items"],
  overrides: Partial<Parameters<PlanningRulesEngine["getSuggestedPlacements"]>[0]> = {},
) {
  return engine.getSuggestedPlacements({
    availableEnergy: null,
    availableSlots: [{ end: 17 * 60, start: 9 * 60 }],
    date: "2026-08-25",
    items,
    limit: 20,
    ...overrides,
  });
}

test("Planning Rules exclude unavailable lifecycle states", () => {
  const suggestions = suggest([
    task("active"),
    task("today", { status: Status.Today }),
    task("waiting", { status: Status.Waiting }),
    task("blocked", { status: Status.Blocked }),
    task("completed", { status: Status.Completed }),
    task("archived", { status: Status.Archived }),
    task("someday", { status: Status.Someday }),
  ]);

  assert.deepEqual(
    suggestions.map(({ task: candidate }) => candidate.id).sort(),
    ["active", "today"],
  );
  assert.equal(suggestions.every(({ matchedRules }) =>
    matchedRules.includes(PlanningRuleMatch.Available)), true);
});

test("Tasks matching the current context are preferred", () => {
  const suggestions = suggest([
    task("a-other", { preferredContext: "Home" }),
    task("z-match", { preferredContext: "@Office" }),
  ], { currentContext: "office" });

  assert.equal(suggestions[0]?.task.id, "z-match");
  assert.equal(
    suggestions[0]?.matchedRules.includes(PlanningRuleMatch.Context),
    true,
  );
  assert.match(suggestions[0]?.reason ?? "", /current context/i);
});

test("Tasks whose estimates fit the remaining time are preferred", () => {
  const suggestions = suggest([
    task("a-too-long", { estimatedDuration: 90 }),
    task("z-fits", { estimatedDuration: 30 }),
    task("unknown", { estimatedDuration: null }),
  ], { availableMinutes: 45 });

  assert.equal(suggestions[0]?.task.id, "z-fits");
  assert.equal(
    suggestions[0]?.matchedRules.includes(PlanningRuleMatch.FitsTime),
    true,
  );
  assert.equal(
    suggestions.at(-1)?.task.id,
    "a-too-long",
  );
});

test("Only the first available Task from an active Project is suggested", () => {
  const waiting = task("waiting", { projectId: "active-project", status: Status.Waiting });
  const next = task("next", { projectId: "active-project" });
  const future = task("future", { projectId: "active-project" });
  const activeProject = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "active-project",
      outcome: "Outcome reached.",
      title: "Active Project",
    }),
    children: [waiting, next, future],
  };
  const hidden = task("hidden", { projectId: "blocked-project" });
  const blockedProject = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "blocked-project",
      outcome: "Outcome blocked.",
      title: "Blocked Project",
    }),
    children: [hidden],
    status: Status.Blocked as const,
  };

  const suggestions = suggest([activeProject, blockedProject]);

  assert.deepEqual(suggestions.map(({ task: candidate }) => candidate.id), ["next"]);
});

test("Accepted Tasks are excluded and limits are deterministic", () => {
  const items = Object.freeze([task("b"), task("a"), task("excluded")]);
  const suggestions = suggest(
    items,
    { excludedTaskIds: ["excluded"], limit: 1 },
  );

  assert.deepEqual(suggestions.map(({ task: candidate }) => candidate.id), ["a"]);
  assert.deepEqual(items.map(({ id }) => id), ["b", "a", "excluded"]);
  assert.equal(items.every(({ status }) => status === Status.Active), true);
});

test("Planning Rules validate capacity and limit inputs", () => {
  assert.throws(
    () => suggest([], { availableMinutes: -1 }),
    /Available time/,
  );
  assert.throws(
    () => suggest([], { limit: 1.5 }),
    /suggestion limit/,
  );
  assert.throws(
    () => suggest([], { date: "2026-02-30" }),
    /YYYY-MM-DD/,
  );
});

test("Suggested placements reserve exact Task durations without overlap", () => {
  const placements = place([
    task("large", { attentionScore: 100, estimatedDuration: 90 }),
    task("first", { attentionScore: 90, estimatedDuration: 60 }),
    task("second", { attentionScore: 80, estimatedDuration: 30 }),
  ], {
    availableSlots: [{ end: 11 * 60 + 30, start: 9 * 60 }],
  });

  assert.deepEqual(
    placements.map(({ duration, end, start, task: candidate }) => ({
      duration,
      end,
      id: candidate.id,
      start,
    })),
    [
      { duration: 90, end: 630, id: "large", start: 540 },
      { duration: 60, end: 690, id: "first", start: 630 },
    ],
  );
});

test("A Task that cannot fit is skipped while smaller work can use the slot", () => {
  const placements = place([
    task("too-large", { attentionScore: 100, estimatedDuration: 90 }),
    task("fits", { attentionScore: 50, estimatedDuration: 30 }),
  ], {
    availableSlots: [{ end: 9 * 60 + 45, start: 9 * 60 }],
  });

  assert.deepEqual(placements.map(({ task: candidate }) => candidate.id), ["fits"]);
  assert.deepEqual(
    { duration: placements[0]?.duration, end: placements[0]?.end, start: placements[0]?.start },
    { duration: 30, end: 570, start: 540 },
  );
});

test("Unknown duration uses one documented planning window", () => {
  const placements = place([task("unknown")], {
    availableSlots: [{ end: 10 * 60, start: 9 * 60 }],
  });

  assert.equal(placements[0]?.duration, DEFAULT_PLANNING_DURATION_MINUTES);
  assert.equal(placements[0]?.end, 9 * 60 + DEFAULT_PLANNING_DURATION_MINUTES);
});

test("Energy fit can outrank higher-impact work without making it unavailable", () => {
  const placements = place([
    task("demanding", { attentionScore: 80, energyCost: 5, estimatedDuration: 30 }),
    task("matched", { attentionScore: 70, energyCost: 2, estimatedDuration: 30 }),
  ], {
    availableEnergy: 2,
    availableSlots: [{ end: 10 * 60, start: 9 * 60 }],
  });

  assert.deepEqual(placements.map(({ task: candidate }) => candidate.id), [
    "matched",
    "demanding",
  ]);
  assert.equal(
    placements[0]?.matchedRules.includes(PlanningRuleMatch.Energy),
    true,
  );
  assert.equal(
    placements[1]?.matchedRules.includes(PlanningRuleMatch.Energy),
    false,
  );
});

test("Current context influences placement order and explanation", () => {
  const placements = place([
    task("other", { attentionScore: 70, contexts: ["Home"], estimatedDuration: 30 }),
    task("matched", { attentionScore: 65, contexts: ["Lab"], estimatedDuration: 30 }),
  ], {
    currentContext: "@lab",
    availableSlots: [{ end: 10 * 60, start: 9 * 60 }],
  });

  assert.equal(placements[0]?.task.id, "matched");
  assert.match(placements[0]?.reason ?? "", /current context/i);
});

test("Only Tasks whose prerequisites are complete receive placements", () => {
  const completed = task("completed-prerequisite", { status: Status.Completed });
  const open = task("open-prerequisite");
  const ready = task("ready", { attentionScore: 80, estimatedDuration: 30 });
  const unresolved = task("unresolved", { attentionScore: 100, estimatedDuration: 30 });
  const missing = task("missing", { attentionScore: 90, estimatedDuration: 30 });
  const placements = place([completed, open, ready, unresolved, missing], {
    dependencies: [
      { prerequisiteTaskIds: [completed.id], taskId: ready.id },
      { prerequisiteTaskIds: [open.id], taskId: unresolved.id },
      { prerequisiteTaskIds: ["not-in-snapshot"], taskId: missing.id },
    ],
  });

  assert.deepEqual(
    placements.map(({ task: candidate }) => candidate.id),
    ["ready", "open-prerequisite"],
  );
  assert.equal(
    placements[0]?.matchedRules.includes(PlanningRuleMatch.Dependencies),
    true,
  );
  assert.match(placements[0]?.reason ?? "", /prerequisites are complete/i);
});

test("An unresolved Project action yields to the next independent action", () => {
  const prerequisite = task("prerequisite");
  const dependent = task("dependent", { projectId: "project" });
  const independent = task("independent", { projectId: "project" });
  const project = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "project",
      outcome: "Outcome reached.",
      title: "Project",
    }),
    children: [dependent, independent],
  };

  const placements = place([prerequisite, project], {
    dependencies: [{ prerequisiteTaskIds: [prerequisite.id], taskId: dependent.id }],
  });

  assert.equal(placements.some(({ task: candidate }) => candidate.id === "dependent"), false);
  assert.equal(placements.some(({ task: candidate }) => candidate.id === "independent"), true);
});

test("Dependency cycles remain unresolved instead of leaking into the plan", () => {
  const first = task("first");
  const second = task("second");
  const placements = place([first, second], {
    dependencies: [
      { prerequisiteTaskIds: [second.id], taskId: first.id },
      { prerequisiteTaskIds: [first.id], taskId: second.id },
    ],
  });

  assert.deepEqual(placements, []);
});

test("Blocked and Waiting work never receives a placement", () => {
  const placements = place([
    task("active"),
    task("blocked", { status: Status.Blocked }),
    task("waiting", { status: Status.Waiting }),
  ]);

  assert.deepEqual(placements.map(({ task: candidate }) => candidate.id), ["active"]);
});

test("Available Slots are normalized deterministically without mutating input", () => {
  const slots = Object.freeze([
    Object.freeze({ end: 660, start: 600 }),
    Object.freeze({ end: 600, start: 540 }),
  ]);
  const candidate = task("candidate", { estimatedDuration: 90 });
  const placements = place([candidate], { availableSlots: slots });

  assert.deepEqual(
    placements.map(({ end, start }) => ({ end, start })),
    [{ end: 630, start: 540 }],
  );
  assert.deepEqual(slots, [
    { end: 660, start: 600 },
    { end: 600, start: 540 },
  ]);
  assert.equal(candidate.scheduledStart, null);
  assert.equal(candidate.scheduledEnd, null);
  assert.equal(candidate.status, Status.Active);
});

test("No capacity or a zero limit returns no placement", () => {
  assert.deepEqual(place([task("candidate")], { availableSlots: [] }), []);
  assert.deepEqual(place([task("candidate")], { limit: 0 }), []);
});

test("Placement input rejects invalid slots, energy, dependencies, and limits", () => {
  assert.throws(
    () => place([], { availableSlots: [{ end: 540, start: 540 }] }),
    /Available Slots/,
  );
  assert.throws(
    () => place([], { availableEnergy: 6 as never }),
    /Available energy/,
  );
  assert.throws(
    () => place([], {
      dependencies: [{ prerequisiteTaskIds: ["self"], taskId: "self" }],
    }),
    /depend on itself/,
  );
  assert.throws(
    () => place([], { limit: -1 }),
    /suggestion limit/,
  );
});
