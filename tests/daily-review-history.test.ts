import assert from "node:assert/strict";
import test from "node:test";

import { ReviewService } from "../src/application/ReviewService";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";

test("Daily Reviews append historical records instead of overwriting", async () => {
  const repository = new MockDailyReviewRepository();
  let date = "2026-08-24";
  const service = new ReviewService(repository, () => date);

  const first = await service.completeReview({
    energy: 5,
    motivation: 5,
    notes: "Protect the morning.",
    stress: 1,
  });
  date = "2026-08-25";
  const second = await service.completeReview({
    energy: 2,
    motivation: 2,
    notes: "  ",
    stress: 5,
  });

  assert.equal(first.date, "2026-08-24");
  assert.equal(first.notes, "Protect the morning.");
  assert.equal(second.date, "2026-08-25");
  assert.equal(second.notes, null);
  assert.equal(await service.getLatestReview(), second);
  assert.deepEqual(await service.getReviewHistory(), [second, first]);
});
