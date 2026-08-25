import assert from "node:assert/strict";
import test from "node:test";

import {
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
