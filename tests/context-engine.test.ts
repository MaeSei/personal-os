import assert from "node:assert/strict";
import test from "node:test";

import {
  Status,
  builtInContexts,
  canCompleteInContext,
  createTask,
  filterTasksByContext,
  getAvailableContexts,
  normalizeContexts,
  type CreateTaskInput,
} from "../src/domain";

const createdAt = new Date("2026-08-25T08:00:00.000Z");

function task(
  id: string,
  overrides: Partial<Omit<CreateTaskInput, "createdAt" | "id" | "title">> = {},
) {
  return createTask({
    areaId: "work",
    createdAt,
    id,
    status: Status.Today,
    title: id,
    ...overrides,
  });
}

test("contexts canonicalize built-ins and deduplicate custom values", () => {
  assert.deepEqual(
    normalizeContexts([" @computer ", "COMPUTER", "Garden shed", "garden shed", ""]),
    ["Computer", "Garden shed"],
  );
  assert.deepEqual(builtInContexts, [
    "Computer", "Phone", "Home", "RV", "Lab", "Errands", "Calls", "Anywhere",
  ]);
});

test("Tasks store multiple contexts while preserving the primary legacy value", () => {
  const multi = task("multi", { contexts: ["Phone", "Calls", "phone"] });
  const legacy = task("legacy", { preferredContext: "@lab" });

  assert.deepEqual(multi.contexts, ["Phone", "Calls"]);
  assert.equal(multi.preferredContext, "Phone");
  assert.equal(multi.context, "Phone");
  assert.deepEqual(legacy.contexts, ["Lab"]);
});

test("context eligibility includes unrestricted and Anywhere Tasks", () => {
  assert.equal(canCompleteInContext(task("computer", { contexts: ["Computer"] }), "computer"), true);
  assert.equal(canCompleteInContext(task("computer", { contexts: ["Computer"] }), "Home"), false);
  assert.equal(canCompleteInContext(task("anywhere", { contexts: ["Anywhere"] }), "Lab"), true);
  assert.equal(canCompleteInContext(task("open"), "RV"), true);
});

test("Workspace filtering combines every supported constraint without reordering", () => {
  const matching = task("matching", {
    areaId: "home",
    contexts: ["Home", "Phone"],
    energyCost: 2,
    estimatedDuration: 30,
    projectId: "renovation",
  });
  const expensive = task("expensive", {
    areaId: "home",
    contexts: ["Home"],
    energyCost: 5,
    estimatedDuration: 20,
    projectId: "renovation",
  });
  const unknownDuration = task("unknown", {
    areaId: "home",
    contexts: ["Home"],
    energyCost: 1,
    projectId: "renovation",
  });
  const tasks = Object.freeze([matching, expensive, unknownDuration]);

  const result = filterTasksByContext(tasks, {
    areaId: "home",
    context: "Home",
    maxDuration: 45,
    maxEnergy: 3,
    projectId: "renovation",
    status: Status.Today,
  });

  assert.deepEqual(result.map(({ id }) => id), ["matching"]);
  assert.deepEqual(tasks.map(({ id }) => id), ["matching", "expensive", "unknown"]);
});

test("available contexts keep built-ins stable and append custom values", () => {
  const contexts = getAvailableContexts([
    task("one", { contexts: ["Workshop", "Computer"] }),
    task("two", { contexts: ["Client site", "workshop"] }),
  ]);

  assert.deepEqual(contexts.slice(0, builtInContexts.length), builtInContexts);
  assert.deepEqual(contexts.slice(builtInContexts.length), ["Client site", "Workshop"]);
});

test("invalid filter and context input is rejected at the domain boundary", () => {
  assert.throws(() => filterTasksByContext([], { maxDuration: 0 }), /duration filter/);
  assert.throws(() => filterTasksByContext([], { maxEnergy: 9 as 5 }), /energy filter/);
  assert.throws(() => normalizeContexts(["x".repeat(81)]), /80 characters/);
});
