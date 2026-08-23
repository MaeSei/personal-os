import {
  getProjectForItem,
  groupProjectsByArea,
  REVIEW_RATING_MAX,
  type AttentionEngine,
} from "@/domain";
import type { MissionControlData } from "@/features/mission-control/types";
import type { AreaRepository } from "@/repositories/AreaRepository";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";
import type { ProjectRepository } from "@/repositories/ProjectRepository";

type MissionControlContext = {
  locale: string;
  now?: Date;
  timeZone: string;
  userName: string;
};

type MissionControlDependencies = {
  areaRepository: AreaRepository;
  attentionEngine: AttentionEngine;
  context: MissionControlContext;
  itemRepository: ItemRepository;
  projectRepository: ProjectRepository;
  reviewRepository: DailyReviewRepository;
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

/** Coordinates domain services and returns data ready for the UI to render. */
async function loadMissionControl({
  areaRepository,
  attentionEngine,
  context,
  itemRepository,
  projectRepository,
  reviewRepository,
}: MissionControlDependencies): Promise<MissionControlData> {
  const [areas, inboxCount, items, projects, review] = await Promise.all([
    areaRepository.getAreas(),
    itemRepository.getInboxCount(),
    itemRepository.getItems(),
    projectRepository.getProjects(),
    reviewRepository.getLatestReview(),
  ]);
  const focusPlan = await attentionEngine.createFocusPlan(review, items);

  return {
    attention: review
      ? {
          budget: review.attentionBudget,
          energy: review.energy,
          ratingScale: REVIEW_RATING_MAX,
          stress: review.stress,
        }
      : null,
    blocked: focusPlan.blockedItems,
    greeting: createGreeting(context),
    inbox: { count: inboxCount },
    projectGroups: groupProjectsByArea(areas, projects),
    today: focusPlan.focusItems.map((item) => ({
      item,
      projectOutcome: getProjectForItem(item, projects)?.outcome ?? null,
    })),
  };
}

export { createGreeting, loadMissionControl };
export type { MissionControlContext, MissionControlDependencies };
