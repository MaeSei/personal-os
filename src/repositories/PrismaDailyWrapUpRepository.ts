import type {
  CalendarDate,
  DailyWrapUp,
  EstimateAssessment,
  PlanAssessment,
} from "@/domain";
import type {
  DailyWrapUp as DailyWrapUpRow,
  DailyWrapUpTask as DailyWrapUpTaskRow,
  PrismaClient,
} from "@/generated/prisma/client";
import type { DailyWrapUpRepository } from "@/repositories/DailyWrapUpRepository";

type PrismaProvider = () => PrismaClient;
type RowWithTasks = DailyWrapUpRow & { readonly tasks: readonly DailyWrapUpTaskRow[] };

function fromCalendarDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toDomain(row: RowWithTasks): DailyWrapUp {
  return {
    createdAt: new Date(row.createdAt),
    date: row.date.toISOString().slice(0, 10),
    estimateAssessment: row.estimateAssessment as EstimateAssessment,
    metrics: {
      actualFocusSeconds: row.actualFocusSeconds,
      calendarEventCount: row.calendarEventCount,
      completedTaskCount: row.completedTaskCount,
      incompleteTaskCount: row.incompleteTaskCount,
      plannedMinutes: row.plannedMinutes,
      plannedTaskCount: row.plannedTaskCount,
      plannedTimeBlockCount: row.plannedTimeBlockCount,
    },
    notes: row.notes,
    planAssessment: row.planAssessment as PlanAssessment,
    tasks: row.tasks.map((task) => ({
      actualDurationSeconds: task.actualDurationSeconds,
      carriedForward: task.carriedForward,
      completed: task.completed,
      estimatedDurationMinutes: task.estimatedDurationMinutes,
      taskId: task.taskId,
      title: task.title,
    })),
  };
}

/** PostgreSQL adapter for one immutable Daily Wrap-Up per date. */
class PrismaDailyWrapUpRepository implements DailyWrapUpRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async get(date: CalendarDate): Promise<DailyWrapUp | null> {
    const row = await this.getClient().dailyWrapUp.findUnique({
      include: { tasks: { orderBy: { taskId: "asc" } } },
      where: { date: fromCalendarDate(date) },
    });
    return row ? toDomain(row) : null;
  }

  async getHistory(): Promise<readonly DailyWrapUp[]> {
    const rows = await this.getClient().dailyWrapUp.findMany({
      include: { tasks: { orderBy: { taskId: "asc" } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toDomain);
  }

  async save(wrapUp: DailyWrapUp): Promise<void> {
    await this.getClient().dailyWrapUp.create({
      data: {
        actualFocusSeconds: wrapUp.metrics.actualFocusSeconds,
        calendarEventCount: wrapUp.metrics.calendarEventCount,
        completedTaskCount: wrapUp.metrics.completedTaskCount,
        createdAt: wrapUp.createdAt,
        date: fromCalendarDate(wrapUp.date),
        estimateAssessment: wrapUp.estimateAssessment,
        id: `daily-wrap-up-${wrapUp.date}`,
        incompleteTaskCount: wrapUp.metrics.incompleteTaskCount,
        notes: wrapUp.notes,
        planAssessment: wrapUp.planAssessment,
        plannedMinutes: wrapUp.metrics.plannedMinutes,
        plannedTaskCount: wrapUp.metrics.plannedTaskCount,
        plannedTimeBlockCount: wrapUp.metrics.plannedTimeBlockCount,
        tasks: {
          create: wrapUp.tasks.map((task) => ({
            actualDurationSeconds: task.actualDurationSeconds,
            carriedForward: task.carriedForward,
            completed: task.completed,
            estimatedDurationMinutes: task.estimatedDurationMinutes,
            taskId: task.taskId,
            title: task.title,
          })),
        },
      },
    });
  }
}

export { PrismaDailyWrapUpRepository };
