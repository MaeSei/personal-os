import { AreaService } from "./AreaService";
import { CalendarService } from "./CalendarService";
import { ManualBreakdownService } from "./BreakdownService";
import { FocusService } from "./FocusService";
import { InboxService } from "./InboxService";
import {
  MissionControlService,
  type MissionControlContext,
} from "./MissionControlService";
import { PlannerService } from "./PlannerService";
import { ProjectService } from "./ProjectService";
import { ReviewService } from "./ReviewService";
import { PlanningRulesEngine, RuleBasedAttentionEngine } from "../domain";
import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";
import type { RepositorySet } from "@/repositories/RepositoryFactory";
import type { CalendarProvider } from "@/calendar";

type ServiceContainerOptions = {
  readonly calendarProvider: CalendarProvider;
  readonly createId: () => string;
  readonly missionControlContext: MissionControlContext;
};

function getCalendarDate(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}

/** Builds concrete services, then exposes only their feature contracts. */
class ServiceContainer {
  readonly features: AtlasFeatures;

  constructor(
    repositories: RepositorySet,
    options: ServiceContainerOptions,
  ) {
    const attentionEngine = new RuleBasedAttentionEngine();
    const calendar = new CalendarService(options.calendarProvider);
    const planningRules = new PlanningRulesEngine();
    const projects = new ProjectService(
      repositories.items,
      repositories.areas,
      options.createId,
    );

    this.features = {
      areas: new AreaService(repositories.areas),
      breakdown: new ManualBreakdownService(projects),
      focus: new FocusService(
        repositories.items,
        repositories.reviews,
        attentionEngine,
        repositories.plans,
        () =>
          getCalendarDate(
            options.missionControlContext.timeZone,
            options.missionControlContext.now ?? new Date(),
          ),
      ),
      inbox: new InboxService(
        repositories.items,
        repositories.areas,
        options.createId,
      ),
      missionControl: new MissionControlService({
        areaRepository: repositories.areas,
        attentionEngine,
        context: options.missionControlContext,
        dayPlanRepository: repositories.plans,
        itemRepository: repositories.items,
        reviewRepository: repositories.reviews,
      }),
      planner: new PlannerService(
        repositories.plans,
        repositories.items,
        repositories.areas,
        repositories.reviews,
        planningRules,
        calendar,
        options.createId,
        options.missionControlContext,
      ),
      projects,
      review: new ReviewService(repositories.reviews, () =>
        getCalendarDate(
          options.missionControlContext.timeZone,
          options.missionControlContext.now ?? new Date(),
        ),
      ),
    };
  }
}

export { ServiceContainer };
export type { ServiceContainerOptions };
