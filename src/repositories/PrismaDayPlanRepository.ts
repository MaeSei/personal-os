import type {
  CalendarDate,
  DayPlan,
  DayPlanStatus,
  TimeBlockType,
} from "@/domain";
import { createFocusSession, parseFocusChecklist } from "@/domain";
import type { PrismaClient } from "@/generated/prisma/client";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";

type PrismaProvider = () => PrismaClient;

function fromCalendarDate(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** PostgreSQL adapter for ordered Task commitments and independent blocks. */
class PrismaDayPlanRepository implements DayPlanRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async delete(date: CalendarDate): Promise<void> {
    await this.getClient().dayPlan.deleteMany({
      where: { date: fromCalendarDate(date) },
    });
  }

  async get(date: CalendarDate): Promise<DayPlan | null> {
    const row = await this.getClient().dayPlan.findUnique({
      include: {
        commitments: { orderBy: [{ position: "asc" }, { taskId: "asc" }] },
        timeBlocks: {
          include: {
            linkedProjects: { orderBy: { projectId: "asc" } },
            linkedTasks: { orderBy: { taskId: "asc" } },
          },
          orderBy: [{ startMinute: "asc" }, { id: "asc" }],
        },
      },
      where: { date: fromCalendarDate(date) },
    });

    return row
      ? {
          createdAt: new Date(row.createdAt),
          commitments: row.commitments.map((commitment) => ({
            focused: commitment.focused,
            group: commitment.groupTitle,
            pinned: commitment.pinned,
            session: createFocusSession({
              checklist: parseFocusChecklist(commitment.focusChecklist),
              elapsedSeconds: commitment.focusElapsedSeconds,
              notes: commitment.focusNotes,
              startedAt: commitment.focusStartedAt,
            }),
            taskId: commitment.taskId,
          })),
          date: row.date.toISOString().slice(0, 10),
          id: row.id,
          status: row.status as DayPlanStatus,
          taskIds: row.commitments.map(({ taskId }) => taskId),
          timeBlocks: row.timeBlocks.map((block) => ({
            createdAt: new Date(block.createdAt),
            end: block.endMinute,
            id: block.id,
            linkedProjects: block.linkedProjects.map(({ projectId }) => projectId),
            linkedTasks: block.linkedTasks.map(({ taskId }) => taskId),
            locked: block.locked,
            notes: block.notes,
            start: block.startMinute,
            title: block.title,
            type: block.type as TimeBlockType,
            updatedAt: new Date(block.updatedAt),
          })),
          timeZone: row.timeZone,
          updatedAt: new Date(row.updatedAt),
        }
      : null;
  }

  async save(plan: DayPlan): Promise<void> {
    await this.getClient().$transaction(async (transaction) => {
      await transaction.dayPlan.upsert({
        create: {
          createdAt: plan.createdAt,
          date: fromCalendarDate(plan.date),
          id: plan.id,
          status: plan.status,
          timeZone: plan.timeZone,
          updatedAt: plan.updatedAt,
        },
        update: {
          status: plan.status,
          timeZone: plan.timeZone,
          updatedAt: plan.updatedAt,
        },
        where: { id: plan.id },
      });

      await transaction.dayPlanTask.deleteMany({
        where: { dayPlanId: plan.id },
      });
      if (plan.taskIds.length > 0) {
        await transaction.dayPlanTask.createMany({
          data: plan.commitments.map((commitment, position) => ({
            dayPlanId: plan.id,
            focused: commitment.focused,
            groupTitle: commitment.group,
            pinned: commitment.pinned,
            focusChecklist: commitment.session.checklist.map((item) => ({
              completed: item.completed,
              id: item.id,
              title: item.title,
            })),
            focusElapsedSeconds: commitment.session.elapsedSeconds,
            focusNotes: commitment.session.notes,
            focusStartedAt: commitment.session.startedAt,
            position,
            taskId: commitment.taskId,
          })),
        });
      }

      for (const block of plan.timeBlocks) {
        const data = {
          endMinute: block.end,
          locked: block.locked,
          notes: block.notes,
          startMinute: block.start,
          title: block.title,
          type: block.type,
          updatedAt: block.updatedAt,
        };
        await transaction.timeBlock.upsert({
          create: {
            ...data,
            createdAt: block.createdAt,
            dayPlanId: plan.id,
            id: block.id,
          },
          update: data,
          where: { id: block.id },
        });

        await transaction.timeBlockTask.deleteMany({
          where: { timeBlockId: block.id },
        });
        if (block.linkedTasks.length > 0) {
          await transaction.timeBlockTask.createMany({
            data: block.linkedTasks.map((taskId) => ({
              taskId,
              timeBlockId: block.id,
            })),
          });
        }

        await transaction.timeBlockProject.deleteMany({
          where: { timeBlockId: block.id },
        });
        if (block.linkedProjects.length > 0) {
          await transaction.timeBlockProject.createMany({
            data: block.linkedProjects.map((projectId) => ({
              projectId,
              timeBlockId: block.id,
            })),
          });
        }
      }

      await transaction.timeBlock.deleteMany({
        where: {
          dayPlanId: plan.id,
          ...(plan.timeBlocks.length > 0
            ? { id: { notIn: plan.timeBlocks.map(({ id }) => id) } }
            : {}),
        },
      });
    });
  }
}

export { PrismaDayPlanRepository };
