import {
  getProjectForItem,
  getPlannedTasks,
  groupProjectsByArea,
  isProject,
  DayPlanStatus,
  ItemType,
  REVIEW_RATING_MAX,
  Status,
  type AttentionEngine,
} from "../domain";
import type {
  MissionControlData,
  MissionControlFeature,
} from "@/features/contracts/MissionControlFeature";
import type { AreaRepository } from "@/repositories/AreaRepository";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";

type MissionControlContext = {
  readonly locale: string;
  readonly now?: Date;
  readonly timeZone: string;
  readonly userName: string;
};

type MissionControlServiceDependencies = {
  readonly areaRepository: AreaRepository;
  readonly attentionEngine: AttentionEngine;
  readonly context: MissionControlContext;
  readonly dayPlanRepository: DayPlanRepository;
  readonly itemRepository: ItemRepository;
  readonly reviewRepository: DailyReviewRepository;
};

function getDatePart(
  parts: readonly Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function createGreeting(
  context: MissionControlContext,
): MissionControlData["greeting"] {
  const now = context.now ?? new Date();
  const hour = Number(
    new Intl.DateTimeFormat(context.locale, {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: context.timeZone,
    }).format(now),
  );
  const salutation =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const displayDateParts = new Intl.DateTimeFormat(context.locale, {
    day: "numeric",
    month: "long",
    timeZone: context.timeZone,
    weekday: "long",
  }).formatToParts(now);
  const dateLabel = `${getDatePart(
    displayDateParts,
    "weekday",
  )} · ${getDatePart(displayDateParts, "day")} ${getDatePart(
    displayDateParts,
    "month",
  )}`;
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: context.timeZone,
    year: "numeric",
  }).formatToParts(now);
  const dateTime = ["year", "month", "day"]
    .map((part) =>
      getDatePart(dateParts, part as Intl.DateTimeFormatPartTypes),
    )
    .join("-");

  return {
    dateLabel,
    dateTime,
    name: context.userName,
    salutation,
  };
}

/** Application boundary that prepares all render-ready Mission Control data. */
class MissionControlService implements MissionControlFeature {
  constructor(
    private readonly dependencies: MissionControlServiceDependencies,
  ) {}

  async loadMissionControl(): Promise<MissionControlData> {
    const {
      areaRepository,
      attentionEngine,
      context,
      dayPlanRepository,
      itemRepository,
      reviewRepository,
    } = this.dependencies;
    const greeting = createGreeting(context);
    const [areas, items, review, dayPlan] = await Promise.all([
      areaRepository.get(),
      itemRepository.get(),
      reviewRepository.get(),
      dayPlanRepository.get(greeting.dateTime),
    ]);
    const inboxCount = items.filter(
      (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
    ).length;
    const projects = items.filter(isProject);
    const activeProjects = projects.filter(
      (project) => project.status === Status.Active,
    );
    const currentReview = review?.date === greeting.dateTime ? review : null;
    const focusPlan = await attentionEngine.createFocusPlan(currentReview, items);
    const plannedTasks = dayPlan?.status === DayPlanStatus.Started
      ? getPlannedTasks(dayPlan, items)
      : null;

    return {
      attention: currentReview
        ? {
            budget: currentReview.attentionBudget,
            energy: currentReview.energy,
            ratingScale: REVIEW_RATING_MAX,
            stress: currentReview.stress,
          }
        : null,
      blocked: focusPlan.blockedItems,
      greeting,
      inbox: { count: inboxCount },
      projectGroups: groupProjectsByArea(areas, activeProjects),
      today: (plannedTasks ?? focusPlan.focusItems).map((item) => ({
        item,
        projectOutcome: getProjectForItem(item, projects)?.outcome ?? null,
      })),
    };
  }
}

export { MissionControlService, createGreeting };
export type {
  MissionControlContext,
  MissionControlServiceDependencies,
};
