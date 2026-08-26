import { AreaService } from "./AreaService";
import { AnalyticsService } from "./AnalyticsService";
import { AssistantService } from "./AssistantService";
import { CalendarService } from "./CalendarService";
import { ManualBreakdownService } from "./BreakdownService";
import { FocusService } from "./FocusService";
import { InboxService } from "./InboxService";
import {
  MissionControlService,
  type MissionControlContext,
} from "./MissionControlService";
import { PlannerService } from "./PlannerService";
import { PatternService } from "./PatternService";
import { ProjectService } from "./ProjectService";
import { ReviewService } from "./ReviewService";
import { TaskService } from "./TaskService";
import { WorkspaceService } from "./WorkspaceService";
import { WrapUpService } from "./WrapUpService";
import {
  AvailabilityService,
  PlanningRulesEngine,
  RuleBasedAttentionEngine,
  type CalendarDate,
} from "../domain";
import type { AtlasFeatures } from "@/features/contracts/AtlasFeatures";
import type { CalendarOAuthFeature } from "@/features/contracts/CalendarFeature";
import type { RepositorySet } from "@/repositories/RepositoryFactory";
import type { CalendarSyncProvider } from "@/calendar";
import type { TokenCipher } from "@/server/security/TokenCipher";
import type { AIService } from "@/ai";

type ServiceContainerOptions = {
  readonly aiModel?: string | null;
  readonly aiProvider?: string | null;
  readonly aiService?: AIService | null;
  readonly calendarProvider: CalendarSyncProvider | null;
  readonly calendarTokenCipher: TokenCipher | null;
  readonly createId: () => string;
  readonly missionControlContext: MissionControlContext;
};

function getCalendarDate(timeZone: string, now: Date): CalendarDate {
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
  readonly calendarOAuth: CalendarOAuthFeature;
  readonly features: AtlasFeatures;

  constructor(
    repositories: RepositorySet,
    options: ServiceContainerOptions,
  ) {
    const attentionEngine = new RuleBasedAttentionEngine();
    const calendar = new CalendarService(
      repositories.calendars,
      options.calendarProvider,
      options.calendarTokenCipher,
      { timeZone: options.missionControlContext.timeZone },
    );
    const availability = new AvailabilityService();
    const planningRules = new PlanningRulesEngine();
    const analytics = new AnalyticsService(
      repositories.reviews,
      repositories.wrapUps,
      repositories.items,
      () => options.missionControlContext.now ?? new Date(),
    );
    const patterns = new PatternService(
      analytics,
      repositories.reviews,
      repositories.wrapUps,
    );
    const tasks = new TaskService(
      repositories.items,
      repositories.areas,
      options.createId,
    );
    const projects = new ProjectService(
      repositories.items,
      repositories.areas,
      options.createId,
      tasks,
    );

    this.features = {
      areas: new AreaService(repositories.areas),
      assistant: new AssistantService(
        repositories.items,
        repositories.areas,
        repositories.reviews,
        repositories.wrapUps,
        calendar,
        analytics,
        patterns,
        {
          ai: options.aiService ?? null,
          createId: options.createId,
          model: options.aiModel ?? null,
          provider: options.aiProvider ?? null,
          timeZone: options.missionControlContext.timeZone,
        },
      ),
      breakdown: new ManualBreakdownService(projects),
      calendar,
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
        options.missionControlContext.timeZone,
        options.createId,
        () => options.missionControlContext.now ?? new Date(),
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
        availability,
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
      tasks,
      workspace: new WorkspaceService(
        repositories.items,
        repositories.areas,
        repositories.plans,
        options.missionControlContext,
      ),
      wrapUp: new WrapUpService(
        repositories.wrapUps,
        repositories.plans,
        repositories.items,
        calendar,
        options.missionControlContext,
      ),
    };
    this.calendarOAuth = calendar;
  }
}

export { ServiceContainer };
export type { ServiceContainerOptions };
