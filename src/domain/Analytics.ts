import {
  PlanAssessment,
  type DailyWrapUp,
} from "./DailyWrapUp";
import type { DailyReviewResult } from "./DailyReview";
import { ItemType, type CalendarDate, type Item } from "./Item";
import { isProject } from "./Project";
import { Status } from "./Status";

const MILLISECONDS_PER_DAY = 86_400_000;

type AnalyticsMetric = {
  readonly sampleSize: number;
  readonly value: number | null;
};

type DurationVariance = {
  readonly accuracy: number;
  readonly actualMinutes: number;
  readonly date: CalendarDate;
  readonly estimatedMinutes: number;
  readonly taskId: string;
  readonly title: string;
  readonly varianceMinutes: number;
  readonly variancePercent: number;
};

type DurationAnalytics = {
  readonly accuracy: AnalyticsMetric;
  readonly averageAbsoluteVarianceMinutes: AnalyticsMetric;
  readonly averageEstimatedMinutes: AnalyticsMetric;
  readonly averageVarianceMinutes: AnalyticsMetric;
  readonly variances: readonly DurationVariance[];
};

type TaskOutcomeAnalytics = {
  /** Planned Task occurrences marked complete at wrap-up. */
  readonly completed: number;
  /** Historical Tasks later archived without a recorded completion. */
  readonly cancelled: number;
  /** Incomplete Task occurrences deliberately carried into tomorrow. */
  readonly rescheduled: number;
  /** Incomplete Task occurrences left out of tomorrow's draft. */
  readonly postponed: number;
};

type AnalyticsReport = {
  readonly averageDailyAttention: AnalyticsMetric;
  readonly averageEnergy: AnalyticsMetric;
  readonly averageMotivation: AnalyticsMetric;
  readonly averageProjectDurationDays: AnalyticsMetric;
  readonly averageStress: AnalyticsMetric;
  readonly averageTaskDurationMinutes: AnalyticsMetric;
  readonly averageTimeBlocksPerDay: AnalyticsMetric;
  readonly completionRate: AnalyticsMetric;
  readonly durationEstimates: DurationAnalytics;
  readonly generatedAt: Date;
  readonly period: {
    readonly from: CalendarDate | null;
    readonly reviewDays: number;
    readonly to: CalendarDate | null;
    readonly wrapUpDays: number;
  };
  readonly planningAccuracy: AnalyticsMetric;
  readonly taskOutcomes: TaskOutcomeAnalytics;
};

type AnalyticsInput = {
  readonly generatedAt: Date;
  readonly items: readonly Item[];
  /** Newest record first; only the latest Review for each date is analysed. */
  readonly reviews: readonly DailyReviewResult[];
  readonly wrapUps: readonly DailyWrapUp[];
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function metric(values: readonly number[]): AnalyticsMetric {
  return {
    sampleSize: values.length,
    value: values.length > 0
      ? round(values.reduce((total, value) => total + value, 0) / values.length)
      : null,
  };
}

function percentage(numerator: number, denominator: number): AnalyticsMetric {
  return {
    sampleSize: denominator,
    value: denominator > 0 ? round((numerator / denominator) * 100) : null,
  };
}

function flattenItems(items: readonly Item[]): readonly Item[] {
  const flattened: Item[] = [];
  const seen = new Set<string>();
  function visit(item: Item) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    flattened.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return flattened;
}

/** Selects one deterministic Review per day from newest-first history. */
function selectDailyReviews(
  reviews: readonly DailyReviewResult[],
): readonly DailyReviewResult[] {
  const seen = new Set<CalendarDate>();
  return reviews.filter((review) => {
    if (seen.has(review.date)) return false;
    seen.add(review.date);
    return true;
  });
}

function calculateDurationVariances(
  wrapUps: readonly DailyWrapUp[],
): readonly DurationVariance[] {
  return wrapUps.flatMap((wrapUp) => wrapUp.tasks.flatMap((task) => {
    if (
      task.estimatedDurationMinutes === null ||
      task.actualDurationSeconds === null
    ) return [];
    const estimatedMinutes = task.estimatedDurationMinutes;
    const actualMinutes = round(task.actualDurationSeconds / 60);
    const varianceMinutes = round(actualMinutes - estimatedMinutes);
    const variancePercent = round((varianceMinutes / estimatedMinutes) * 100);
    return [{
      accuracy: round(Math.max(0, 100 - Math.abs(variancePercent))),
      actualMinutes,
      date: wrapUp.date,
      estimatedMinutes,
      taskId: task.taskId,
      title: task.title,
      varianceMinutes,
      variancePercent,
    }];
  }));
}

function calculateAnalyticsReport(input: AnalyticsInput): AnalyticsReport {
  const generatedAt = new Date(input.generatedAt);
  if (!Number.isFinite(generatedAt.getTime())) {
    throw new Error("Analytics requires a valid generation time.");
  }
  const reviews = selectDailyReviews(input.reviews);
  const wrapUps = [...input.wrapUps].sort((left, right) =>
    left.date.localeCompare(right.date)
  );
  const allItems = flattenItems(input.items);
  const variances = calculateDurationVariances(wrapUps);
  const plannedTaskCount = wrapUps.reduce(
    (total, wrapUp) => total + wrapUp.metrics.plannedTaskCount,
    0,
  );
  const completedTaskCount = wrapUps.reduce(
    (total, wrapUp) => total + wrapUp.metrics.completedTaskCount,
    0,
  );
  const completedIds = new Set(
    wrapUps.flatMap(({ tasks }) => tasks.filter(({ completed }) => completed)
      .map(({ taskId }) => taskId)),
  );
  const historicalIds = new Set(
    wrapUps.flatMap(({ tasks }) => tasks.map(({ taskId }) => taskId)),
  );
  const cancelled = new Set(
    allItems.filter((item) =>
      item.type === ItemType.Task &&
      item.status === Status.Archived &&
      historicalIds.has(item.id) &&
      !completedIds.has(item.id)
    ).map(({ id }) => id),
  ).size;
  const projectDurations = allItems.filter(isProject)
    .filter(({ status }) => status === Status.Completed)
    .flatMap((project) => {
      const duration = project.updatedAt.getTime() - project.createdAt.getTime();
      return duration >= 0 ? [duration / MILLISECONDS_PER_DAY] : [];
    });
  const actualTaskDurations = wrapUps.flatMap(({ tasks }) => tasks.flatMap((task) =>
    task.actualDurationSeconds === null
      ? []
      : [round(task.actualDurationSeconds / 60)]
  ));
  const periodDates = [
    ...reviews.map(({ date }) => date),
    ...wrapUps.map(({ date }) => date),
  ].sort();
  const planScores = wrapUps.map(({ planAssessment }) => {
    if (planAssessment === PlanAssessment.AsPlanned) return 100;
    if (planAssessment === PlanAssessment.Partly) return 50;
    return 0;
  });

  return {
    averageDailyAttention: metric(reviews.map(({ attentionBudget }) => attentionBudget)),
    averageEnergy: metric(reviews.map(({ energy }) => energy)),
    averageMotivation: metric(reviews.map(({ motivation }) => motivation)),
    averageProjectDurationDays: metric(projectDurations),
    averageStress: metric(reviews.map(({ stress }) => stress)),
    averageTaskDurationMinutes: metric(actualTaskDurations),
    averageTimeBlocksPerDay: metric(
      wrapUps.map(({ metrics }) => metrics.plannedTimeBlockCount),
    ),
    completionRate: percentage(completedTaskCount, plannedTaskCount),
    durationEstimates: {
      accuracy: metric(variances.map(({ accuracy }) => accuracy)),
      averageAbsoluteVarianceMinutes: metric(
        variances.map(({ varianceMinutes }) => Math.abs(varianceMinutes)),
      ),
      averageEstimatedMinutes: metric(
        variances.map(({ estimatedMinutes }) => estimatedMinutes),
      ),
      averageVarianceMinutes: metric(
        variances.map(({ varianceMinutes }) => varianceMinutes),
      ),
      variances,
    },
    generatedAt,
    period: {
      from: periodDates[0] ?? null,
      reviewDays: reviews.length,
      to: periodDates.at(-1) ?? null,
      wrapUpDays: wrapUps.length,
    },
    planningAccuracy: metric(planScores),
    taskOutcomes: {
      cancelled,
      completed: completedTaskCount,
      postponed: wrapUps.reduce(
        (total, wrapUp) => total + wrapUp.tasks.filter(
          (task) => !task.completed && !task.carriedForward,
        ).length,
        0,
      ),
      rescheduled: wrapUps.reduce(
        (total, wrapUp) => total + wrapUp.tasks.filter(
          (task) => !task.completed && task.carriedForward,
        ).length,
        0,
      ),
    },
  };
}

export { calculateAnalyticsReport, calculateDurationVariances, selectDailyReviews };
export type {
  AnalyticsInput,
  AnalyticsMetric,
  AnalyticsReport,
  DurationAnalytics,
  DurationVariance,
  TaskOutcomeAnalytics,
};
