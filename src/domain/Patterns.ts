import type { AnalyticsReport } from "./Analytics";
import type { DailyReviewResult } from "./DailyReview";
import type { DailyWrapUp } from "./DailyWrapUp";

const MIN_PATTERN_SAMPLES = 3;
const LONG_TASK_MINUTES = 60;

enum PatternKind {
  BestWeekday = "BestWeekday",
  HighEnergy = "HighEnergy",
  LongTaskAvoidance = "LongTaskAvoidance",
  PlanningAccuracy = "PlanningAccuracy",
}

type Pattern = {
  readonly confidence: number;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly id: string;
  readonly kind: PatternKind;
  readonly recommendation: string;
};

type PatternInput = {
  readonly analytics: AnalyticsReport;
  /** One already-selected Review per date. */
  readonly reviews: readonly DailyReviewResult[];
  readonly wrapUps: readonly DailyWrapUp[];
};

function confidence(sampleSize: number, strength = 1): number {
  return Math.round(Math.min(95, 45 + sampleSize * 5 + strength * 20));
}

function detectHighEnergy(input: PatternInput): Pattern | null {
  const average = input.analytics.averageEnergy;
  if (
    average.value === null ||
    average.sampleSize < MIN_PATTERN_SAMPLES ||
    average.value < 4
  ) return null;
  return {
    confidence: confidence(average.sampleSize, (average.value - 4) / 1),
    description: "Morning check-ins consistently report high available energy.",
    evidence: [
      `Average energy ${average.value}/5 across ${average.sampleSize} days.`,
    ],
    id: "high-energy-check-ins",
    kind: PatternKind.HighEnergy,
    recommendation: "Protect demanding work early when Calendar capacity allows.",
  };
}

function detectLongTaskAvoidance(input: PatternInput): Pattern | null {
  const byTask = new Map<string, {
    incomplete: number;
    samples: number;
    title: string;
  }>();
  input.wrapUps.forEach(({ tasks }) => tasks.forEach((task) => {
    if ((task.estimatedDurationMinutes ?? 0) < LONG_TASK_MINUTES) return;
    const current = byTask.get(task.taskId) ?? {
      incomplete: 0,
      samples: 0,
      title: task.title,
    };
    byTask.set(task.taskId, {
      incomplete: current.incomplete + (task.completed ? 0 : 1),
      samples: current.samples + 1,
      title: task.title,
    });
  }));
  const candidate = [...byTask.entries()]
    .filter(([, value]) => value.samples >= 2 && value.incomplete / value.samples >= 2 / 3)
    .sort((left, right) =>
      right[1].incomplete / right[1].samples - left[1].incomplete / left[1].samples ||
      right[1].samples - left[1].samples ||
      left[0].localeCompare(right[0])
    )[0];
  if (!candidate) return null;
  const [taskId, value] = candidate;
  const rate = Math.round((value.incomplete / value.samples) * 100);
  return {
    confidence: confidence(value.samples, rate / 100),
    description: `Long work such as “${value.title}” is repeatedly left unfinished.`,
    evidence: [
      `${value.incomplete} of ${value.samples} planned appearances were incomplete (${rate}%).`,
      `The stored estimate is at least ${LONG_TASK_MINUTES} minutes.`,
    ],
    id: `long-task-avoidance:${taskId}`,
    kind: PatternKind.LongTaskAvoidance,
    recommendation: "Split the work into a smaller verifiable next action before planning it again.",
  };
}

function detectBestWeekday(input: PatternInput): Pattern | null {
  if (input.wrapUps.length < 4) return null;
  const weekdays = new Map<string, { completed: number; planned: number; days: number }>();
  input.wrapUps.forEach((wrapUp) => {
    const label = new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      weekday: "long",
    }).format(new Date(`${wrapUp.date}T00:00:00.000Z`));
    const value = weekdays.get(label) ?? { completed: 0, days: 0, planned: 0 };
    weekdays.set(label, {
      completed: value.completed + wrapUp.metrics.completedTaskCount,
      days: value.days + 1,
      planned: value.planned + wrapUp.metrics.plannedTaskCount,
    });
  });
  const ranked = [...weekdays.entries()]
    .filter(([, value]) => value.days >= 2 && value.planned > 0)
    .map(([weekday, value]) => ({
      ...value,
      rate: (value.completed / value.planned) * 100,
      weekday,
    }))
    .sort((left, right) => right.rate - left.rate || left.weekday.localeCompare(right.weekday));
  const best = ranked[0];
  if (!best) return null;
  const gap = best.rate - (ranked[1]?.rate ?? best.rate);
  return {
    confidence: confidence(best.days, Math.min(1, gap / 25)),
    description: `${best.weekday} currently has the strongest recorded completion rate.`,
    evidence: [
      `${Math.round(best.rate)}% completion across ${best.days} ${best.weekday} wrap-ups.`,
      ranked[1]
        ? `${Math.round(gap)} percentage points above ${ranked[1].weekday}.`
        : "No other weekday has enough samples for comparison.",
    ],
    id: `best-weekday:${best.weekday.toLowerCase()}`,
    kind: PatternKind.BestWeekday,
    recommendation: "Use this as weak planning evidence, not a fixed productivity rule.",
  };
}

function detectPlanningAccuracy(input: PatternInput): Pattern | null {
  const accuracy = input.analytics.planningAccuracy;
  if (accuracy.value === null || accuracy.sampleSize < MIN_PATTERN_SAMPLES) return null;
  const low = accuracy.value < 60;
  return {
    confidence: confidence(accuracy.sampleSize, Math.abs(accuracy.value - 50) / 50),
    description: low
      ? "Recent days often diverge from the original plan."
      : "Recent days usually remain close to the original plan.",
    evidence: [
      `Average plan-fit score ${accuracy.value}% across ${accuracy.sampleSize} wrap-ups.`,
    ],
    id: "planning-accuracy",
    kind: PatternKind.PlanningAccuracy,
    recommendation: low
      ? "Commit to fewer outcomes and leave more unallocated capacity."
      : "Keep the current planning scope while continuing to review variance.",
  };
}

/** Detects only patterns supported by stored historical evidence. */
function detectPatterns(input: PatternInput): readonly Pattern[] {
  return [
    detectHighEnergy(input),
    detectLongTaskAvoidance(input),
    detectBestWeekday(input),
    detectPlanningAccuracy(input),
  ].filter((pattern): pattern is Pattern => pattern !== null)
    .sort((left, right) => right.confidence - left.confidence || left.id.localeCompare(right.id));
}

export { LONG_TASK_MINUTES, MIN_PATTERN_SAMPLES, PatternKind, detectPatterns };
export type { Pattern, PatternInput };
