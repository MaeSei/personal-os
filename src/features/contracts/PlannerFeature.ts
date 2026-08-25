import type {
  CalendarDate,
  DayPlanStatus,
  Effort,
  EnergyCost,
  EstimateConfidence,
  PreferredTime,
  TaskStatus,
  TimeBlockType,
} from "@/domain";
import type { CalendarEvent } from "@/calendar";

type PlannerProject = {
  readonly id: string;
  readonly outcome: string;
  readonly title: string;
};

type PlannerInboxItem = {
  readonly createdAt: Date;
  readonly id: string;
  readonly title: string;
};

type PlannerTask = {
  readonly area: { readonly icon: string; readonly id: string; readonly title: string };
  readonly context: string | null;
  readonly contexts: readonly string[];
  readonly dueDate: CalendarDate | null;
  readonly effort: Effort;
  readonly estimateConfidence: EstimateConfidence | null;
  readonly estimatedDuration: number | null;
  readonly energyCost: EnergyCost;
  readonly id: string;
  readonly project: PlannerProject | null;
  readonly preferredContext: string | null;
  readonly preferredTime: PreferredTime | null;
  readonly scheduledDate: CalendarDate | null;
  readonly scheduledEnd: Date | null;
  readonly scheduledStart: Date | null;
  readonly status: TaskStatus;
  readonly title: string;
};

type PlanningSuggestion = {
  readonly placement: PlannerAvailableSlot;
  readonly reason: string;
  readonly task: PlannerTask;
};

type PlannerAvailableSlot = {
  /** Whole schedulable minutes inside this local-day slot. */
  readonly duration: number;
  readonly end: number;
  readonly start: number;
};

type PlannerTimeBlock = {
  readonly end: number;
  readonly id: string;
  readonly linkedProjects: readonly PlannerProject[];
  readonly linkedTasks: readonly PlannerTask[];
  readonly locked: boolean;
  readonly notes: string | null;
  readonly start: number;
  readonly title: string;
  readonly type: TimeBlockType;
};

type DailyPlannerData = {
  readonly attention: {
    readonly budget: number;
    readonly energy: number;
    readonly motivation: number;
    readonly stress: number;
    readonly summary: string;
  } | null;
  readonly availableTime: {
    readonly plannedMinutes: number;
    readonly remainingMinutes: number;
    readonly totalMinutes: number;
  };
  readonly availableSlots: readonly PlannerAvailableSlot[];
  readonly calendar: {
    readonly connected: boolean;
    readonly events: readonly CalendarEvent[];
    readonly message: string;
    readonly timeZone: string;
  };
  readonly commitments: readonly PlannerTask[];
  readonly inbox: readonly PlannerInboxItem[];
  readonly morning: {
    readonly activeProjectCount: number;
    readonly availableTaskCount: number;
    readonly date: CalendarDate;
    readonly dateLabel: string;
    readonly inboxCount: number;
    readonly name: string;
  };
  readonly plan: {
    readonly persisted: boolean;
    readonly status: DayPlanStatus;
    readonly updatedAt: Date;
  };
  readonly projects: readonly PlannerProject[];
  readonly suggestions: readonly PlanningSuggestion[];
  readonly taskPool: readonly PlannerTask[];
  readonly timeBlocks: readonly PlannerTimeBlock[];
};

type TimeBlockWriteInput = {
  readonly end: number;
  readonly linkedProjectIds?: readonly string[];
  readonly linkedTaskIds?: readonly string[];
  readonly locked?: boolean;
  readonly notes?: string | null;
  readonly start: number;
  readonly title: string;
  readonly type: TimeBlockType;
};

type TimeBlockUpdateInput = Pick<
  TimeBlockWriteInput,
  "notes" | "title" | "type"
>;

/** UI-facing Daily Planner queries and explicit planning commands. */
interface PlannerFeature {
  createTimeBlock(input: TimeBlockWriteInput): Promise<DailyPlannerData>;
  deleteTimeBlock(blockId: string): Promise<DailyPlannerData>;
  discardDraft(): Promise<DailyPlannerData>;
  duplicateTimeBlock(blockId: string, start: number): Promise<DailyPlannerData>;
  linkProjectToTimeBlock(blockId: string, projectId: string): Promise<DailyPlannerData>;
  linkTaskToTimeBlock(blockId: string, taskId: string): Promise<DailyPlannerData>;
  loadPlanner(): Promise<DailyPlannerData>;
  mergeTimeBlocks(firstBlockId: string, secondBlockId: string): Promise<DailyPlannerData>;
  moveTask(taskId: string, direction: "down" | "up"): Promise<DailyPlannerData>;
  moveTimeBlock(blockId: string, start: number): Promise<DailyPlannerData>;
  placeTask(taskId: string, beforeTaskId?: string | null): Promise<DailyPlannerData>;
  placeTasks(taskIds: readonly string[]): Promise<DailyPlannerData>;
  removeTask(taskId: string): Promise<DailyPlannerData>;
  resizeTimeBlock(blockId: string, end: number): Promise<DailyPlannerData>;
  scheduleTaskInSlot(taskId: string, start: number): Promise<DailyPlannerData>;
  saveDraft(): Promise<DailyPlannerData>;
  setTimeBlockLocked(blockId: string, locked: boolean): Promise<DailyPlannerData>;
  splitTimeBlock(blockId: string, splitAt: number): Promise<DailyPlannerData>;
  startDay(): Promise<DailyPlannerData>;
  unlinkProjectFromTimeBlock(blockId: string, projectId: string): Promise<DailyPlannerData>;
  unlinkTaskFromTimeBlock(blockId: string, taskId: string): Promise<DailyPlannerData>;
  unscheduleTask(taskId: string): Promise<DailyPlannerData>;
  updateTimeBlock(blockId: string, input: TimeBlockUpdateInput): Promise<DailyPlannerData>;
}

export type {
  DailyPlannerData,
  PlannerFeature,
  PlannerAvailableSlot,
  PlannerInboxItem,
  PlannerProject,
  PlannerTask,
  PlannerTimeBlock,
  PlanningSuggestion,
  TimeBlockUpdateInput,
  TimeBlockWriteInput,
};
