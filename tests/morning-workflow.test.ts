import assert from "node:assert/strict";
import test from "node:test";

import { MissionControlService } from "../src/application/MissionControlService";
import {
  DayPlanStatus,
  RuleBasedAttentionEngine,
  Status,
  createDailyReviewResult,
  createDayPlan,
  createTask,
  initialAreas,
  updateDayPlan,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";
import { MockDayPlanRepository } from "../src/repositories/MockDayPlanRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class AreaMemoryRepository implements AreaRepository {
  get() { return Promise.resolve(initialAreas); }
  save() { return Promise.resolve(); }
}

test("Mission Control publishes a Day Plan only after Start Day", async () => {
  const createdAt = new Date("2026-08-25T06:00:00.000Z");
  const suggested = createTask({
    areaId: "work",
    attentionScore: 100,
    createdAt,
    energyCost: 1,
    id: "suggested",
    status: Status.Today,
    title: "Rule-based suggestion",
  });
  const selected = createTask({
    areaId: "home",
    attentionScore: 10,
    createdAt,
    energyCost: 5,
    id: "selected",
    status: Status.Today,
    title: "Intentional selection",
  });
  const draft = createDayPlan({
    createdAt,
    date: "2026-08-25",
    id: "day-plan-2026-08-25",
    taskIds: [selected.id],
    timeZone: "Europe/Stockholm",
  });
  const plans = new MockDayPlanRepository([draft]);
  const service = new MissionControlService({
    areaRepository: new AreaMemoryRepository(),
    attentionEngine: new RuleBasedAttentionEngine(),
    context: {
      locale: "en-GB",
      now: new Date("2026-08-25T08:00:00.000Z"),
      timeZone: "Europe/Stockholm",
      userName: "Maike",
    },
    dayPlanRepository: plans,
    itemRepository: new MockItemRepository([suggested, selected]),
    reviewRepository: new MockDailyReviewRepository(
      createDailyReviewResult(
        { energy: 5, motivation: 5, stress: 1 },
        "2026-08-25",
      ),
    ),
  });

  const beforeStart = await service.loadMissionControl();
  assert.equal(beforeStart.today[0]?.item.id, suggested.id);

  await plans.save(updateDayPlan(draft, { status: DayPlanStatus.Started }));
  const afterStart = await service.loadMissionControl();
  assert.deepEqual(afterStart.today.map(({ item }) => item.id), [selected.id]);
});
