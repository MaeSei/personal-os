import {
  DayPlanStatus,
  Status,
  addFocusChecklistItem,
  buildFocusModePlan,
  completeItem as completeDomainItem,
  createDayPlan,
  createFocusSession,
  findTask,
  focusDailyTask,
  getPlannedTasks,
  getProjectForItem,
  isProject,
  pauseFocusSession,
  placeDailyTask,
  removeFocusChecklistItem,
  resumeFocusSession,
  setFocusChecklistItemCompleted,
  updateDailyTaskSession,
  updateDayPlan,
  updateFocusNotes,
  type ActionableItem,
  type AttentionEngine,
  type CalendarDate,
  type DayPlan,
  type FocusModePlan,
  type Item,
  type ItemId,
} from "../domain";
import type {
  FocusFeature,
  FocusSessionData,
} from "@/features/contracts/FocusFeature";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";
import type { ItemRepository } from "@/repositories/ItemRepository";
import type { DayPlanRepository } from "@/repositories/DayPlanRepository";

type FocusDateProvider = () => CalendarDate;
type IdGenerator = () => string;
type NowProvider = () => Date;

type FocusContext = {
  readonly dayPlan: DayPlan | null;
  readonly focusItems: readonly ActionableItem[];
  readonly items: readonly Item[];
  readonly plan: FocusModePlan;
};

/** Owns one generic, resumable execution session within today's commitment. */
class FocusService implements FocusFeature {
  constructor(
    private readonly itemRepository: ItemRepository,
    private readonly reviewRepository: DailyReviewRepository,
    private readonly attentionEngine: AttentionEngine,
    private readonly dayPlanRepository: DayPlanRepository,
    private readonly getDate: FocusDateProvider,
    private readonly timeZone: string,
    private readonly createId: IdGenerator,
    private readonly getNow: NowProvider = () => new Date(),
  ) {}

  async loadFocusMode(): Promise<FocusModePlan> {
    return (await this.loadContext()).plan;
  }

  async loadFocusSession(): Promise<FocusSessionData> {
    return this.toSessionData(await this.loadContext());
  }

  async resumeSession(taskId: ItemId): Promise<FocusSessionData> {
    return this.mutatePreparedSession(taskId, (session) =>
      resumeFocusSession(session, this.getNow()),
    );
  }

  async pauseSession(taskId: ItemId): Promise<FocusSessionData> {
    const date = this.getDate();
    const plan = await this.dayPlanRepository.get(date);
    if (!plan) throw new Error("There is no Focus Session to pause.");
    await this.dayPlanRepository.save(
      updateDailyTaskSession(plan, taskId, (session) =>
        pauseFocusSession(session, this.getNow()),
      ),
    );
    return this.loadFocusSession();
  }

  async updateNotes(
    taskId: ItemId,
    notes: string | null,
  ): Promise<FocusSessionData> {
    return this.mutatePreparedSession(taskId, (session) =>
      updateFocusNotes(session, notes),
    );
  }

  async addChecklistItem(
    taskId: ItemId,
    title: string,
  ): Promise<FocusSessionData> {
    return this.mutatePreparedSession(taskId, (session) =>
      addFocusChecklistItem(session, { id: this.createId(), title }),
    );
  }

  async setChecklistItemCompleted(
    taskId: ItemId,
    checklistItemId: string,
    completed: boolean,
  ): Promise<FocusSessionData> {
    return this.mutatePreparedSession(taskId, (session) =>
      setFocusChecklistItemCompleted(session, checklistItemId, completed),
    );
  }

  async removeChecklistItem(
    taskId: ItemId,
    checklistItemId: string,
  ): Promise<FocusSessionData> {
    return this.mutatePreparedSession(taskId, (session) =>
      removeFocusChecklistItem(session, checklistItemId),
    );
  }

  async switchTask(taskId: ItemId): Promise<FocusSessionData> {
    const { items, plan } = await this.getMutableContext(taskId);
    await this.dayPlanRepository.save(this.preparePlan(plan, items, taskId));
    return this.loadFocusSession();
  }

  async completeItem(itemId: ItemId): Promise<Item | null> {
    const now = this.getNow();
    const [items, plan] = await Promise.all([
      this.itemRepository.get(),
      this.dayPlanRepository.get(this.getDate()),
    ]);
    const result = completeDomainItem(items, itemId, now);
    if (!result.completedItem) return null;
    if (plan?.taskIds.includes(itemId)) {
      let updated = updateDailyTaskSession(plan, itemId, (session) =>
        pauseFocusSession(session, now),
      );
      updated = updateDayPlan(updated, {
        commitments: updated.commitments.map((entry) =>
          entry.taskId === itemId ? { ...entry, focused: false } : entry,
        ),
      }, now);
      await this.dayPlanRepository.save(updated);
    }
    await this.itemRepository.save(result.items);
    return result.completedItem;
  }

  private async mutatePreparedSession(
    taskId: ItemId,
    update: Parameters<typeof updateDailyTaskSession>[2],
  ): Promise<FocusSessionData> {
    const { items, plan } = await this.getMutableContext(taskId);
    const prepared = this.preparePlan(plan, items, taskId);
    await this.dayPlanRepository.save(
      updateDailyTaskSession(prepared, taskId, update),
    );
    return this.loadFocusSession();
  }

  private async getMutableContext(taskId: ItemId) {
    const date = this.getDate();
    const items = await this.itemRepository.get();
    const plan = (await this.dayPlanRepository.get(date)) ?? createDayPlan({
      createdAt: this.getNow(),
      date,
      id: `day-plan-${date}`,
      timeZone: this.timeZone,
    });
    if (!findTask(items, taskId)) throw new Error("The focus Task no longer exists.");
    return { items, plan };
  }

  private preparePlan(
    source: DayPlan,
    items: readonly Item[],
    taskId: ItemId,
  ): DayPlan {
    const task = findTask(items, taskId);
    const projects = items.filter(isProject);
    const project = task ? getProjectForItem(task, projects) : null;
    if (
      !task ||
      ![Status.Active, Status.Today].includes(task.status) ||
      (project && project.status !== Status.Active)
    ) throw new Error("Only available Tasks can become the current focus.");
    let plan = source.taskIds.includes(taskId)
      ? source
      : placeDailyTask(source, { taskId });
    const now = this.getNow();
    plan = updateDayPlan(plan, {
      commitments: plan.commitments.map((entry) =>
        entry.taskId !== taskId && entry.session.startedAt
          ? { ...entry, session: pauseFocusSession(entry.session, now) }
          : entry,
      ),
    }, now);
    return focusDailyTask(plan, taskId, now);
  }

  private async loadContext(): Promise<FocusContext> {
    const date = this.getDate();
    const [items, review, dayPlan] = await Promise.all([
      this.itemRepository.get(),
      this.reviewRepository.get(),
      this.dayPlanRepository.get(date),
    ]);
    const focusPlan = await this.attentionEngine.createFocusPlan(
      review?.date === date ? review : null,
      items,
    );
    const focusItems = dayPlan?.status === DayPlanStatus.Started
      ? getPlannedTasks(dayPlan, items)
      : focusPlan.focusItems;
    return {
      dayPlan,
      focusItems,
      items,
      plan: buildFocusModePlan({ ...focusPlan, deferredItems: [], focusItems }),
    };
  }

  private toSessionData(context: FocusContext): FocusSessionData {
    const current = context.plan.currentFocus;
    const commitment = current
      ? context.dayPlan?.commitments.find(({ taskId }) => taskId === current.id)
      : null;
    const project = current
      ? getProjectForItem(current, context.items.filter(isProject))
      : null;
    return {
      plan: context.plan,
      relatedProject: project
        ? { id: project.id, outcome: project.outcome, title: project.title }
        : null,
      session: current ? commitment?.session ?? createFocusSession() : null,
      switchTasks: current
        ? context.focusItems.filter(({ id }) => id !== current.id)
        : [],
    };
  }
}

export { FocusService };
export type { FocusDateProvider };
