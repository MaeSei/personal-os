import type { AnalyticsReport } from "./Analytics";
import type { AvailableSlot } from "./AvailabilityService";
import type { DailyReviewResult } from "./DailyReview";
import type { CalendarDate, Item } from "./Item";
import type { Pattern } from "./Patterns";
import { PatternKind } from "./Patterns";
import type { Project } from "./Project";
import { Status } from "./Status";
import type { Task } from "./Task";

const RECOMMENDATION_LIMIT = 7;
const DAY_IN_MILLISECONDS = 86_400_000;

enum RecommendationKind {
  CompleteQuickWin = "CompleteQuickWin",
  DelegateTask = "DelegateTask",
  MoveTask = "MoveTask",
  ReduceWorkload = "ReduceWorkload",
  ReviewProject = "ReviewProject",
  ScheduleDeepWork = "ScheduleDeepWork",
  SplitProject = "SplitProject",
}

enum RecommendationPriority {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

type Recommendation = {
  readonly description: string;
  readonly id: string;
  readonly kind: RecommendationKind;
  readonly priority: RecommendationPriority;
  readonly relatedItemIds: readonly string[];
  readonly title: string;
  readonly why: string;
};

type RecommendationInput = {
  readonly analytics: AnalyticsReport;
  readonly availableSlots: readonly AvailableSlot[];
  readonly calendar: {
    readonly connected: boolean;
    readonly events: readonly RecommendationCalendarEvent[];
  };
  readonly date: CalendarDate;
  readonly now: Date;
  readonly patterns: readonly Pattern[];
  readonly projects: readonly Project[];
  readonly review: DailyReviewResult | null;
  readonly tasks: readonly Task[];
  readonly timeZone: string;
};

type RecommendationCalendarEvent = {
  readonly allDay: boolean;
  readonly busy: boolean;
  readonly end: Date;
  readonly id: string;
  readonly start: Date;
  readonly title: string;
};

function isAvailable(task: Task): boolean {
  return [Status.Active, Status.Today].includes(task.status);
}

function containsItem(items: readonly Item[], itemId: string): boolean {
  return items.some((item) =>
    item.id === itemId || containsItem(item.children, itemId)
  );
}

function tasksForProject(
  project: Project,
  tasks: readonly Task[],
): readonly Task[] {
  return tasks.filter((task) =>
    task.projectId === project.id || containsItem(project.children, task.id)
  );
}

function formatSlot(slot: AvailableSlot, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
  return `${formatter.format(slot.start)}–${formatter.format(slot.end)}`;
}

function recommendReducedWorkload(input: RecommendationInput): Recommendation | null {
  const attention = input.review?.attentionBudget ??
    input.analytics.averageDailyAttention.value;
  const today = input.tasks.filter((task) =>
    isAvailable(task) &&
    (task.status === Status.Today || task.scheduledDate === input.date)
  );
  const lowPlanFit = input.patterns.some((pattern) =>
    pattern.kind === PatternKind.PlanningAccuracy &&
    input.analytics.planningAccuracy.value !== null &&
    input.analytics.planningAccuracy.value < 60
  );
  if ((attention === null || attention >= 50) && !lowPlanFit) return null;
  if (today.length < 3) return null;
  return {
    description: "Choose one primary outcome and move optional work out of today's plan.",
    id: "reduce-todays-workload",
    kind: RecommendationKind.ReduceWorkload,
    priority: RecommendationPriority.High,
    relatedItemIds: today.map(({ id }) => id),
    title: "Reduce today's workload",
    why: `${today.length} Tasks are marked for today while ${attention === null ? "historical plan-fit is low" : `available attention is ${attention}%`}.`,
  };
}

function recommendDeepWork(input: RecommendationInput): Recommendation | null {
  if (!input.review || input.review.energy < 4) return null;
  const slot = [...input.availableSlots]
    .filter(({ duration }) => duration >= 60)
    .sort((left, right) => right.duration - left.duration || left.start.getTime() - right.start.getTime())[0];
  const task = input.tasks.filter((candidate) =>
    isAvailable(candidate) &&
    candidate.energyCost >= 4 &&
    (candidate.estimatedDuration ?? candidate.durationMinutes ?? 0) >= 45 &&
    candidate.scheduledStart === null
  ).sort((left, right) =>
    right.attentionScore - left.attentionScore || left.id.localeCompare(right.id)
  )[0];
  if (!slot || !task) return null;
  const highEnergyPattern = input.patterns.some(({ kind }) => kind === PatternKind.HighEnergy);
  return {
    description: `Reserve ${formatSlot(slot, input.timeZone)} for “${task.title}” if that placement still feels right.`,
    id: `schedule-deep-work:${task.id}`,
    kind: RecommendationKind.ScheduleDeepWork,
    priority: RecommendationPriority.High,
    relatedItemIds: [task.id],
    title: "Schedule deep work",
    why: `Energy is ${input.review.energy}/5, the Task needs ${task.energyCost}/5, and ${input.calendar.connected ? "Calendar" : "the configured working window"} leaves ${Math.round(slot.duration)} open minutes${highEnergyPattern ? "; historical check-ins also show high energy" : ""}.`,
  };
}

function recommendQuickWin(input: RecommendationInput): Recommendation | null {
  const attention = input.review?.attentionBudget ?? input.analytics.averageDailyAttention.value;
  if (attention !== null && attention >= 65) return null;
  const task = input.tasks.filter((candidate) => {
    const duration = candidate.estimatedDuration ?? candidate.durationMinutes;
    return isAvailable(candidate) && duration != null && duration <= 20;
  }).sort((left, right) =>
    right.attentionScore - left.attentionScore || left.id.localeCompare(right.id)
  )[0];
  if (!task) return null;
  const duration = task.estimatedDuration ?? task.durationMinutes ?? 0;
  return {
    description: `Use “${task.title}” as a contained next action.`,
    id: `quick-win:${task.id}`,
    kind: RecommendationKind.CompleteQuickWin,
    priority: RecommendationPriority.Medium,
    relatedItemIds: [task.id],
    title: "Complete a quick win",
    why: `Available attention is ${attention ?? "unknown"} and this Task is estimated at ${duration} minutes.`,
  };
}

function recommendSplitProject(input: RecommendationInput): Recommendation | null {
  const project = input.projects.filter(({ status }) => status === Status.Active)
    .map((candidate) => {
      const tasks = tasksForProject(candidate, input.tasks).filter(isAvailable);
      const minutes = tasks.reduce(
        (total, task) => total + (task.estimatedDuration ?? task.durationMinutes ?? 0),
        0,
      );
      return { minutes, project: candidate, tasks };
    })
    .filter(({ minutes, tasks }) => tasks.length >= 6 || minutes >= 360)
    .sort((left, right) =>
      right.tasks.length - left.tasks.length ||
      right.minutes - left.minutes ||
      left.project.id.localeCompare(right.project.id)
    )[0];
  if (!project) return null;
  return {
    description: `Break “${project.project.title}” into milestones or a smaller active next-action set.`,
    id: `split-project:${project.project.id}`,
    kind: RecommendationKind.SplitProject,
    priority: RecommendationPriority.Medium,
    relatedItemIds: [project.project.id, ...project.tasks.map(({ id }) => id)],
    title: `Split ${project.project.title}`,
    why: `The Project has ${project.tasks.length} open Tasks${project.minutes > 0 ? ` and about ${project.minutes} estimated minutes` : ""}.`,
  };
}

function recommendMoveTask(input: RecommendationInput): Recommendation | null {
  const task = input.tasks.filter((candidate) =>
    isAvailable(candidate) &&
    candidate.dueDate !== null &&
    candidate.dueDate !== undefined &&
    candidate.dueDate < input.date &&
    candidate.scheduledStart === null
  ).sort((left, right) =>
    (left.dueDate ?? "").localeCompare(right.dueDate ?? "") ||
    left.id.localeCompare(right.id)
  )[0];
  if (!task) return null;
  return {
    description: `Move “${task.title}” into a deliberate day or revise its due date.`,
    id: `move-overdue-task:${task.id}`,
    kind: RecommendationKind.MoveTask,
    priority: RecommendationPriority.High,
    relatedItemIds: [task.id],
    title: `Reconsider ${task.title}`,
    why: `Its due date was ${task.dueDate}, but it has no scheduled reservation.`,
  };
}

function recommendDelegation(input: RecommendationInput): Recommendation | null {
  const task = input.tasks.filter((candidate) =>
    isAvailable(candidate) && candidate.tags.some((tag) => tag.toLowerCase() === "delegatable")
  ).sort((left, right) => right.effort - left.effort || left.id.localeCompare(right.id))[0];
  if (!task) return null;
  return {
    description: `Decide who could own “${task.title}” and record the handoff explicitly.`,
    id: `delegate-task:${task.id}`,
    kind: RecommendationKind.DelegateTask,
    priority: RecommendationPriority.Low,
    relatedItemIds: [task.id],
    title: `Consider delegating ${task.title}`,
    why: "The Task is explicitly tagged delegatable; Atlas does not infer delegation from title or behavior.",
  };
}

function recommendProjectReview(input: RecommendationInput): Recommendation | null {
  const project = input.projects.filter(({ status }) => status === Status.Active)
    .map((candidate) => ({
      ageDays: Math.max(0, (input.now.getTime() - candidate.updatedAt.getTime()) / DAY_IN_MILLISECONDS),
      project: candidate,
    }))
    .filter(({ ageDays }) => ageDays >= 30)
    .sort((left, right) =>
      right.ageDays - left.ageDays || left.project.id.localeCompare(right.project.id)
    )[0];
  if (!project) return null;
  return {
    description: `Review the outcome and next action for “${project.project.title}”.`,
    id: `review-project:${project.project.id}`,
    kind: RecommendationKind.ReviewProject,
    priority: RecommendationPriority.Medium,
    relatedItemIds: [project.project.id],
    title: `Review ${project.project.title}`,
    why: `The active Project has no recorded update for ${Math.floor(project.ageDays)} days.`,
  };
}

/** Produces explained suggestions only; recommendations expose no command. */
function generateRecommendations(input: RecommendationInput): readonly Recommendation[] {
  if (!Number.isFinite(input.now.getTime())) {
    throw new Error("Recommendations require a valid current time.");
  }
  const priorities: Record<RecommendationPriority, number> = {
    [RecommendationPriority.High]: 0,
    [RecommendationPriority.Medium]: 1,
    [RecommendationPriority.Low]: 2,
  };
  return [
    recommendReducedWorkload(input),
    recommendDeepWork(input),
    recommendMoveTask(input),
    recommendQuickWin(input),
    recommendSplitProject(input),
    recommendProjectReview(input),
    recommendDelegation(input),
  ].filter((recommendation): recommendation is Recommendation => recommendation !== null)
    .sort((left, right) =>
      priorities[left.priority] - priorities[right.priority] || left.id.localeCompare(right.id)
    )
    .slice(0, RECOMMENDATION_LIMIT);
}

export {
  RECOMMENDATION_LIMIT,
  RecommendationKind,
  RecommendationPriority,
  generateRecommendations,
};
export type {
  Recommendation,
  RecommendationCalendarEvent,
  RecommendationInput,
};
