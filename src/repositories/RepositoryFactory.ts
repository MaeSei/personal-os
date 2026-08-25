import type { AreaRepository } from "@/repositories/AreaRepository";
import type { CalendarRepository } from "@/repositories/CalendarRepository";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { DailyWrapUpRepository } from "@/repositories/DailyWrapUpRepository";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";

/** Complete persistence capability set required by current application logic. */
type RepositorySet = {
  readonly areas: AreaRepository;
  readonly calendars: CalendarRepository;
  readonly items: ItemRepository;
  readonly plans: DayPlanRepository;
  readonly reviews: DailyReviewRepository;
  readonly wrapUps: DailyWrapUpRepository;
};

/** Selects repository implementations without exposing them to services or UI. */
interface RepositoryFactory {
  create(): RepositorySet;
}

export type { RepositoryFactory, RepositorySet };
