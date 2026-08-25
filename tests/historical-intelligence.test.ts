import assert from "node:assert/strict";
import test from "node:test";

import { AnalyticsService } from "../src/application/AnalyticsService";
import { PatternService } from "../src/application/PatternService";
import { RecommendationService } from "../src/application/RecommendationService";
import { MockCalendarProvider } from "../src/calendar";
import {
  AvailabilityService,
  PatternKind,
  PlanAssessment,
  EstimateAssessment,
  RecommendationKind,
  Status,
  calculateAnalyticsReport,
  createDailyReviewResult,
  createDailyWrapUp,
  createProject,
  createTask,
  detectPatterns,
  generateRecommendations,
  type AnalyticsReport,
  type DailyReviewResult,
  type DailyWrapUp,
  type Pattern,
} from "../src/domain";
import type { DailyReviewRepository } from "../src/repositories/DailyReviewRepository";
import { MockDailyWrapUpRepository } from "../src/repositories/MockDailyWrapUpRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class ReviewHistoryRepository implements DailyReviewRepository {
  constructor(private readonly history: readonly DailyReviewResult[]) {}
  get() { return Promise.resolve(this.history[0] ?? null); }
  getHistory() { return Promise.resolve(this.history); }
  save() { return Promise.resolve(); }
}

function wrapUp(
  date: string,
  tasks: readonly {
    readonly actual: number | null;
    readonly completed: boolean;
    readonly estimate: number | null;
    readonly id: string;
    readonly title: string;
  }[],
  options: {
    readonly carry?: readonly string[];
    readonly plan?: PlanAssessment;
    readonly timeBlocks?: number;
  } = {},
): DailyWrapUp {
  return createDailyWrapUp({
    calendarEventCount: 0,
    carryForwardTaskIds: options.carry ?? [],
    createdAt: new Date(`${date}T18:00:00.000Z`),
    date,
    estimateAssessment: EstimateAssessment.Mixed,
    planAssessment: options.plan ?? PlanAssessment.Partly,
    plannedMinutes: (options.timeBlocks ?? 0) * 60,
    plannedTimeBlockCount: options.timeBlocks ?? 0,
    tasks: tasks.map((task) => ({
      actualDurationSeconds: task.actual,
      completed: task.completed,
      estimatedDurationMinutes: task.estimate,
      taskId: task.id,
      title: task.title,
    })),
  });
}

function analyticsFixture() {
  const reviews = [
    createDailyReviewResult({ energy: 5, motivation: 5, stress: 1 }, "2026-08-25"),
    createDailyReviewResult({ energy: 1, motivation: 1, stress: 5 }, "2026-08-25"),
    createDailyReviewResult({ energy: 3, motivation: 3, stress: 3 }, "2026-08-24"),
    createDailyReviewResult({ energy: 4, motivation: 4, stress: 2 }, "2026-08-23"),
  ];
  const wrapUps = [
    wrapUp("2026-08-23", [
      { actual: 5_400, completed: true, estimate: 60, id: "task-a", title: "A" },
      { actual: 1_800, completed: false, estimate: 30, id: "task-b", title: "B" },
    ], { carry: ["task-b"], plan: PlanAssessment.AsPlanned, timeBlocks: 2 }),
    wrapUp("2026-08-24", [
      { actual: 3_600, completed: true, estimate: 60, id: "task-a", title: "A" },
      { actual: null, completed: false, estimate: 120, id: "task-c", title: "C" },
    ], { plan: PlanAssessment.Partly, timeBlocks: 1 }),
    wrapUp("2026-08-25", [
      { actual: 900, completed: true, estimate: 30, id: "task-d", title: "D" },
    ], { plan: PlanAssessment.Differently }),
  ];
  const createdAt = new Date("2026-08-01T08:00:00.000Z");
  const archived = createTask({
    areaId: "work",
    createdAt,
    id: "task-c",
    status: Status.Archived,
    title: "C",
  });
  const project = {
    ...createProject({
      areaId: "work",
      createdAt,
      energyLevel: 3,
      id: "completed-project",
      outcome: "Done",
      title: "Completed Project",
    }),
    status: Status.Completed as const,
    updatedAt: new Date("2026-08-11T08:00:00.000Z"),
  };
  return { items: [archived, project], reviews, wrapUps };
}

test("AnalyticsService calculates historical averages, outcomes, and stored variance", async () => {
  const fixture = analyticsFixture();
  const service = new AnalyticsService(
    new ReviewHistoryRepository(fixture.reviews),
    new MockDailyWrapUpRepository(fixture.wrapUps),
    new MockItemRepository(fixture.items),
    () => new Date("2026-08-26T08:00:00.000Z"),
  );

  const report = await service.getReport();

  assert.deepEqual(report.averageEnergy, { sampleSize: 3, value: 4 });
  assert.deepEqual(report.averageStress, { sampleSize: 3, value: 2 });
  assert.deepEqual(report.averageMotivation, { sampleSize: 3, value: 4 });
  assert.deepEqual(report.averageDailyAttention, { sampleSize: 3, value: 76 });
  assert.deepEqual(report.completionRate, { sampleSize: 5, value: 60 });
  assert.deepEqual(report.planningAccuracy, { sampleSize: 3, value: 50 });
  assert.deepEqual(report.averageTaskDurationMinutes, { sampleSize: 4, value: 48.75 });
  assert.deepEqual(report.averageProjectDurationDays, { sampleSize: 1, value: 10 });
  assert.deepEqual(report.averageTimeBlocksPerDay, { sampleSize: 3, value: 1 });
  assert.deepEqual(report.durationEstimates.averageVarianceMinutes, {
    sampleSize: 4,
    value: 3.75,
  });
  assert.deepEqual(report.durationEstimates.averageAbsoluteVarianceMinutes, {
    sampleSize: 4,
    value: 11.25,
  });
  assert.deepEqual(report.durationEstimates.accuracy, { sampleSize: 4, value: 75 });
  assert.deepEqual(report.taskOutcomes, {
    cancelled: 1,
    completed: 3,
    postponed: 1,
    rescheduled: 1,
  });
  assert.equal(report.durationEstimates.variances[0]?.varianceMinutes, 30);
});

test("analytics returns null metrics instead of inventing evidence", () => {
  const report = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-26T08:00:00.000Z"),
    items: [],
    reviews: [],
    wrapUps: [],
  });

  assert.deepEqual(report.averageEnergy, { sampleSize: 0, value: null });
  assert.deepEqual(report.completionRate, { sampleSize: 0, value: null });
  assert.deepEqual(report.durationEstimates.variances, []);
  assert.equal(report.period.from, null);
});

test("actual Task duration does not require an estimate, but variance does", () => {
  const report = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-26T08:00:00.000Z"),
    items: [],
    reviews: [],
    wrapUps: [wrapUp("2026-08-25", [{
      actual: 1_200,
      completed: true,
      estimate: null,
      id: "unestimated",
      title: "Unestimated work",
    }])],
  });

  assert.deepEqual(report.averageTaskDurationMinutes, {
    sampleSize: 1,
    value: 20,
  });
  assert.deepEqual(report.durationEstimates.variances, []);
  assert.deepEqual(report.durationEstimates.accuracy, {
    sampleSize: 0,
    value: null,
  });
});

test("PatternService emits only threshold-backed historical patterns", async () => {
  const reviews = [
    createDailyReviewResult({ energy: 5, motivation: 4, stress: 2 }, "2026-08-03"),
    createDailyReviewResult({ energy: 4, motivation: 4, stress: 2 }, "2026-08-04"),
    createDailyReviewResult({ energy: 5, motivation: 4, stress: 2 }, "2026-08-10"),
    createDailyReviewResult({ energy: 4, motivation: 4, stress: 2 }, "2026-08-11"),
  ];
  const wrapUps = [
    wrapUp("2026-08-03", [{ actual: null, completed: true, estimate: 90, id: "long", title: "Long work" }], { plan: PlanAssessment.AsPlanned }),
    wrapUp("2026-08-04", [{ actual: null, completed: false, estimate: 90, id: "long", title: "Long work" }], { plan: PlanAssessment.Differently }),
    wrapUp("2026-08-10", [{ actual: null, completed: true, estimate: 30, id: "monday", title: "Monday" }], { plan: PlanAssessment.AsPlanned }),
    wrapUp("2026-08-11", [{ actual: null, completed: false, estimate: 90, id: "long", title: "Long work" }], { plan: PlanAssessment.Differently }),
  ];
  const analytics = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-12T08:00:00.000Z"),
    items: [],
    reviews,
    wrapUps,
  });
  const service = new PatternService(
    { getReport: () => Promise.resolve(analytics) },
    new ReviewHistoryRepository(reviews),
    new MockDailyWrapUpRepository(wrapUps),
  );

  const patterns = await service.getPatterns();

  assert.ok(patterns.some(({ kind }) => kind === PatternKind.HighEnergy));
  assert.ok(patterns.some(({ kind }) => kind === PatternKind.LongTaskAvoidance));
  assert.ok(patterns.some(({ kind }) => kind === PatternKind.BestWeekday));
  assert.ok(patterns.some(({ kind }) => kind === PatternKind.PlanningAccuracy));
  assert.ok(patterns.every(({ confidence, evidence, recommendation }) =>
    confidence >= 0 && confidence <= 100 && evidence.length > 0 && recommendation.length > 0
  ));
  const emptyAnalytics = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-12T08:00:00.000Z"),
    items: [],
    reviews: reviews.slice(0, 2),
    wrapUps: [],
  });
  assert.deepEqual(detectPatterns({
    analytics: emptyAnalytics,
    reviews: reviews.slice(0, 2),
    wrapUps: [],
  }), []);
});

function recommendationAnalytics(): AnalyticsReport {
  return calculateAnalyticsReport({
    generatedAt: new Date("2026-08-25T08:00:00.000Z"),
    items: [],
    reviews: [createDailyReviewResult({ energy: 4, motivation: 1, stress: 5 }, "2026-08-25")],
    wrapUps: [
      wrapUp("2026-08-22", [], { plan: PlanAssessment.Differently }),
      wrapUp("2026-08-23", [], { plan: PlanAssessment.Partly }),
      wrapUp("2026-08-24", [], { plan: PlanAssessment.Differently }),
    ],
  });
}

test("RecommendationService combines every input and never exposes execution", async () => {
  const now = new Date("2026-08-25T08:00:00.000Z");
  const project = {
    ...createProject({
      areaId: "work",
      createdAt: new Date("2026-06-01T08:00:00.000Z"),
      energyLevel: 4,
      id: "project",
      outcome: "Ready",
      title: "Large Project",
    }),
    updatedAt: new Date("2026-07-01T08:00:00.000Z"),
  };
  const projectTasks = Array.from({ length: 6 }, (_, index) => createTask({
    areaId: "work",
    attentionScore: 90 - index,
    createdAt: now,
    energyCost: index === 0 ? 4 : 3,
    estimatedDuration: index === 0 ? 90 : 60,
    id: `project-task-${index}`,
    projectId: project.id,
    status: index < 3 ? Status.Today : Status.Active,
    tags: index === 1 ? ["delegatable"] : [],
    title: `Project Task ${index}`,
  }));
  const overdue = createTask({
    areaId: "home",
    createdAt: now,
    dueDate: "2026-08-20",
    estimatedDuration: 15,
    id: "overdue",
    status: Status.Today,
    title: "Overdue quick task",
  });
  const review = createDailyReviewResult(
    { energy: 4, motivation: 1, stress: 5 },
    "2026-08-25",
  );
  const analytics = recommendationAnalytics();
  const patterns: readonly Pattern[] = [{
    confidence: 80,
    description: "High energy is common.",
    evidence: ["Four check-ins."],
    id: "high-energy",
    kind: PatternKind.HighEnergy,
    recommendation: "Protect demanding work.",
  }, {
    confidence: 80,
    description: "Plans often change.",
    evidence: ["Three wrap-ups."],
    id: "planning-accuracy",
    kind: PatternKind.PlanningAccuracy,
    recommendation: "Commit less.",
  }];
  const service = new RecommendationService(
    { getReport: () => Promise.resolve(analytics) },
    { getPatterns: () => Promise.resolve(patterns) },
    new MockCalendarProvider({ connected: true, events: [] }),
    new ReviewHistoryRepository([review]),
    new MockItemRepository([project, ...projectTasks, overdue]),
    new AvailabilityService(),
    { now, timeZone: "Europe/Stockholm" },
  );

  const recommendations = await service.getRecommendations();
  const kinds = new Set(recommendations.map(({ kind }) => kind));

  assert.ok(kinds.has(RecommendationKind.ReduceWorkload));
  assert.ok(kinds.has(RecommendationKind.ScheduleDeepWork));
  assert.ok(kinds.has(RecommendationKind.MoveTask));
  assert.ok(kinds.has(RecommendationKind.CompleteQuickWin));
  assert.ok(kinds.has(RecommendationKind.SplitProject));
  assert.ok(kinds.has(RecommendationKind.ReviewProject));
  assert.ok(kinds.has(RecommendationKind.DelegateTask));
  assert.ok(recommendations.every(({ why }) => why.trim().length > 0));
  assert.ok(recommendations.every((recommendation) => !("execute" in recommendation)));
});

test("recommendations stay empty when current evidence supports no action", () => {
  const analytics = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-25T08:00:00.000Z"),
    items: [],
    reviews: [],
    wrapUps: [],
  });
  assert.deepEqual(generateRecommendations({
    analytics,
    availableSlots: [],
    calendar: { connected: false, events: [] },
    date: "2026-08-25",
    now: new Date("2026-08-25T08:00:00.000Z"),
    patterns: [],
    projects: [],
    review: null,
    tasks: [],
    timeZone: "Europe/Stockholm",
  }), []);
});
