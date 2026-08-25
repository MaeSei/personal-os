import type { CalendarDate, DayPlan } from "@/domain";

/** Date-scoped persistence boundary for the user's ordered daily plan. */
interface DayPlanRepository {
  get(date: CalendarDate): Promise<DayPlan | null>;
  save(plan: DayPlan): Promise<void>;
}

export type { DayPlanRepository };
