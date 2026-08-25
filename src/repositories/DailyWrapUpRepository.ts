import type { CalendarDate, DailyWrapUp } from "@/domain";

/** One immutable, date-scoped end-of-day evidence snapshot. */
interface DailyWrapUpRepository {
  get(date: CalendarDate): Promise<DailyWrapUp | null>;
  getHistory(): Promise<readonly DailyWrapUp[]>;
  save(wrapUp: DailyWrapUp): Promise<void>;
}

export type { DailyWrapUpRepository };
