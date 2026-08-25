import type { CalendarDate, DayPlan } from "@/domain";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";

/** In-memory Day Plan repository for application-service tests. */
class MockDayPlanRepository implements DayPlanRepository {
  private readonly plans = new Map<CalendarDate, DayPlan>();

  constructor(plans: readonly DayPlan[] = []) {
    plans.forEach((plan) => this.plans.set(plan.date, plan));
  }

  delete(date: CalendarDate): Promise<void> {
    this.plans.delete(date);
    return Promise.resolve();
  }

  get(date: CalendarDate): Promise<DayPlan | null> {
    return Promise.resolve(this.plans.get(date) ?? null);
  }

  save(plan: DayPlan): Promise<void> {
    this.plans.set(plan.date, plan);
    return Promise.resolve();
  }
}

export { MockDayPlanRepository };
