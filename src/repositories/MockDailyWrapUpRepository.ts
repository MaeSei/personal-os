import type { CalendarDate, DailyWrapUp } from "@/domain";
import type { DailyWrapUpRepository } from "@/repositories/DailyWrapUpRepository";

/** In-memory Daily Wrap-Up repository for application-service tests. */
class MockDailyWrapUpRepository implements DailyWrapUpRepository {
  private readonly wrapUps = new Map<CalendarDate, DailyWrapUp>();

  constructor(wrapUps: readonly DailyWrapUp[] = []) {
    wrapUps.forEach((wrapUp) => this.wrapUps.set(wrapUp.date, wrapUp));
  }

  get(date: CalendarDate): Promise<DailyWrapUp | null> {
    return Promise.resolve(this.wrapUps.get(date) ?? null);
  }

  getHistory(): Promise<readonly DailyWrapUp[]> {
    return Promise.resolve(
      [...this.wrapUps.values()].sort((left, right) =>
        right.date.localeCompare(left.date)
      ),
    );
  }

  save(wrapUp: DailyWrapUp): Promise<void> {
    if (this.wrapUps.has(wrapUp.date)) {
      return Promise.reject(new Error("This day already has a Daily Wrap-Up."));
    }
    this.wrapUps.set(wrapUp.date, wrapUp);
    return Promise.resolve();
  }
}

export { MockDailyWrapUpRepository };
