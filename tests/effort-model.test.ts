import assert from "node:assert/strict";
import test from "node:test";

import {
  EstimateConfidence,
  Status,
  createTask,
  getTaskEstimate,
} from "../src/domain";

const createdAt = new Date("2026-08-25T10:00:00.000Z");

test("the Effort Model exposes one current Task estimate", () => {
  const task = createTask({
    areaId: "work",
    createdAt,
    effort: 4,
    energyCost: 2,
    estimateConfidence: EstimateConfidence.High,
    estimatedDuration: 75,
    id: "estimate",
    status: Status.Today,
    title: "Prepare the handover",
  });

  assert.deepEqual(getTaskEstimate(task), {
    confidence: EstimateConfidence.High,
    durationMinutes: 75,
    effort: 4,
    energy: 2,
  });
});

test("confidence stays unknown when the user has not assessed it", () => {
  const task = createTask({
    areaId: "home",
    createdAt,
    id: "unknown-confidence",
    title: "Measure the shelf",
  });

  assert.equal(task.estimateConfidence, null);
  assert.equal(getTaskEstimate(task).confidence, null);
});

test("the Task boundary rejects unsupported confidence values", () => {
  assert.throws(
    () => createTask({
      areaId: "work",
      createdAt,
      estimateConfidence: "Certain" as EstimateConfidence,
      id: "invalid-confidence",
      title: "Invalid estimate",
    }),
    /estimate confidence/,
  );
});
