import { validateBreakdown, type AIService, type BriefingRequest } from "../ai";
import type { CalendarProvider } from "../calendar";
import {
  EstimateConfidence,
  Status,
  appendProjectArtifact,
  createProjectMilestone,
  createTask,
  dependencyTags,
  groupProjectTask,
  insertTaskIntoItems,
  isProject,
  isTask,
  type CalendarDate,
  type EnergyCost,
  type Item,
  type Project,
} from "../domain";
import type {
  AcceptProjectBreakdownInput,
  AcceptedProjectBreakdown,
  AssistantFeature,
  AssistantStatus,
  InboxClassificationPreview,
  ProjectBreakdownPreview,
} from "../features/contracts/AssistantFeature";
import type { DailyReviewRepository } from "../repositories/DailyReviewRepository";
import type { DailyWrapUpRepository } from "../repositories/DailyWrapUpRepository";
import type { ItemRepository } from "../repositories/ItemRepository";
import type { AreaRepository } from "../repositories/AreaRepository";
import type { AnalyticsReportProvider } from "./AnalyticsService";
import type { MemoryService } from "./MemoryService";
import type { PatternProvider } from "./PatternService";

type AssistantServiceOptions = {
  readonly ai: AIService | null;
  readonly createId: () => string;
  readonly memory?: MemoryService | null;
  readonly model: string | null;
  readonly now?: () => Date;
  readonly provider: string | null;
  readonly timeZone: string;
};

function flatten(items: readonly Item[]): readonly Item[] {
  return items.flatMap((item) => [item, ...flatten(item.children)]);
}

function calendarDate(now: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function toZonedInstant(
  date: CalendarDate,
  minute: number,
  timeZone: string,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day, 0, minute);
  let candidate = target;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = formatter.formatToParts(new Date(candidate));
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((entry) => entry.type === type)?.value ?? 0);
    const represented = Date.UTC(
      part("year"),
      part("month") - 1,
      part("day"),
      part("hour"),
      part("minute"),
    );
    const adjustment = target - represented;
    candidate += adjustment;
    if (adjustment === 0) return new Date(candidate);
  }
  throw new Error("Assistant Calendar boundaries require a valid time zone.");
}

function confidenceLevel(value: number): EstimateConfidence {
  if (value >= 0.8) return EstimateConfidence.High;
  if (value >= 0.5) return EstimateConfidence.Medium;
  return EstimateConfidence.Low;
}

function energyLevel(value: number | null): EnergyCost {
  const normalized = value ?? 3;
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
    throw new Error("AI Task energy is outside Atlas limits.");
  }
  return normalized as EnergyCost;
}

function findProject(items: readonly Item[], projectId: string): Project {
  const project = items.find(
    (item): item is Project => isProject(item) && item.id === projectId,
  );
  if (!project) throw new Error("The Project no longer exists.");
  return project;
}

function isCurrent(item: Item): boolean {
  return item.status !== Status.Completed && item.status !== Status.Archived;
}

/** Orchestrates untrusted AI proposals and explicit accepted writes. */
class AssistantService implements AssistantFeature {
  private readonly now: () => Date;

  constructor(
    private readonly items: ItemRepository,
    private readonly areas: AreaRepository,
    private readonly reviews: DailyReviewRepository,
    private readonly wrapUps: DailyWrapUpRepository,
    private readonly calendar: CalendarProvider,
    private readonly analytics: AnalyticsReportProvider,
    private readonly patterns: PatternProvider,
    private readonly options: AssistantServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date());
  }

  getStatus(): Promise<AssistantStatus> {
    return Promise.resolve({
      enabled: this.options.ai !== null,
      model: this.options.model,
      provider: this.options.provider,
    });
  }

  async proposeProjectBreakdown(projectId: string): Promise<ProjectBreakdownPreview> {
    const ai = this.requireAI();
    const items = await this.items.get();
    const project = findProject(items, projectId);
    const existingTasks = flatten(project.children).filter(isTask);
    const proposal = await ai.breakdown.propose({
      areaId: project.areaId,
      description: project.description,
      existingTasks: existingTasks.map((task) => ({
        id: task.id,
        status: task.status,
        title: task.title,
      })),
      outcome: project.outcome,
      projectId,
      projectTitle: project.title,
    });
    return {
      generatedAt: this.now(),
      projectId,
      projectUpdatedAt: project.updatedAt.toISOString(),
      proposal,
    };
  }

  async acceptProjectBreakdown(
    input: AcceptProjectBreakdownInput,
  ): Promise<AcceptedProjectBreakdown> {
    const stored = await this.items.get();
    const project = findProject(stored, input.preview.projectId);
    if (project.updatedAt.toISOString() !== input.preview.projectUpdatedAt) {
      throw new Error("The Project changed after this proposal was generated.");
    }
    const proposal = validateBreakdown(input.preview.proposal);
    const milestoneSuggestions = new Map(
      proposal.milestones.map((item) => [item.id, item]),
    );
    const taskSuggestions = new Map(
      proposal.tasks.map((item) => [item.id, item]),
    );
    const milestoneIds = [...new Set(input.acceptedMilestoneIds)];
    const taskIds = [...new Set(input.acceptedTaskIds)];
    if (
      milestoneIds.some((id) => !milestoneSuggestions.has(id)) ||
      taskIds.some((id) => !taskSuggestions.has(id))
    ) throw new Error("Accepted AI suggestions must belong to this proposal.");
    if (milestoneIds.length + taskIds.length === 0) {
      return { milestoneCount: 0, taskCount: 0 };
    }

    let items = stored;
    const reserved = new Set(flatten(items).map(({ id }) => id));
    const createId = () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const id = this.options.createId();
        if (!reserved.has(id)) {
          reserved.add(id);
          return id;
        }
      }
      throw new Error("Atlas could not create a unique Item id.");
    };
    const milestoneActualIds = new Map(milestoneIds.map((id) => [id, createId()]));
    const taskActualIds = new Map(taskIds.map((id) => [id, createId()]));
    const now = this.now();

    milestoneIds.forEach((suggestionId) => {
      const suggestion = milestoneSuggestions.get(suggestionId);
      if (!suggestion) return;
      const milestone = createProjectMilestone(project, {
        description: suggestion.description,
        id: milestoneActualIds.get(suggestionId) ?? createId(),
        title: suggestion.title,
      }, now);
      items = appendProjectArtifact(items, project.id, milestone, now);
    });

    taskIds.forEach((suggestionId) => {
      const suggestion = taskSuggestions.get(suggestionId);
      if (!suggestion) return;
      const dependencyIds = suggestion.dependencies
        .filter((id) => taskActualIds.has(id))
        .map((id) => taskActualIds.get(id) ?? "")
        .filter(Boolean);
      const energy = energyLevel(suggestion.energy);
      const task = createTask({
        areaId: project.areaId,
        attentionScore: project.attentionScore,
        contexts: suggestion.contexts,
        createdAt: now,
        description: suggestion.description,
        effort: energy,
        energyCost: energy,
        estimateConfidence: confidenceLevel(suggestion.confidence),
        estimatedDuration: suggestion.estimatedDurationMinutes,
        id: taskActualIds.get(suggestionId) ?? createId(),
        projectId: project.id,
        status: Status.Active,
        tags: dependencyTags(dependencyIds),
        title: suggestion.title,
      });
      items = insertTaskIntoItems(items, task, now);
      const milestoneId = suggestion.milestoneId
        ? milestoneActualIds.get(suggestion.milestoneId) ?? null
        : null;
      if (milestoneId) {
        items = groupProjectTask(items, project.id, task.id, milestoneId, now);
      }
    });

    await this.items.save(items);
    return { milestoneCount: milestoneIds.length, taskCount: taskIds.length };
  }

  async suggestInboxItem(itemId: string): Promise<InboxClassificationPreview> {
    const ai = this.requireAI();
    const [roots, areas] = await Promise.all([
      this.items.get(),
      this.areas.get(),
    ]);
    const item = roots.find((candidate) => candidate.id === itemId);
    if (!item || item.status !== Status.Inbox) {
      throw new Error("The Inbox Item no longer exists.");
    }
    const projects = roots.filter(isProject);
    const suggestion = await ai.classification.classify({
      areas: areas.map(({ id, title }) => ({ id, title })),
      description: item.description,
      projects: projects.map(({ areaId, id, title }) => ({ areaId, id, title })),
      title: item.title,
    });
    const area = suggestion.areaId
      ? areas.find(({ id }) => id === suggestion.areaId) ?? null
      : null;
    const project = suggestion.projectId
      ? projects.find(({ id }) => id === suggestion.projectId) ?? null
      : null;
    return {
      ...suggestion,
      areaTitle: area?.title ?? null,
      itemId,
      projectTitle: project?.title ?? null,
    };
  }

  async getExecutiveBriefing() {
    const ai = this.requireAI();
    const now = this.now();
    const date = calendarDate(now, this.options.timeZone);
    const analytics = await this.analytics.getReport();
    const [patterns, review, roots, calendar, memory] = await Promise.all([
      this.patterns.getPatterns(analytics),
      this.reviews.get(),
      this.items.get(),
      this.calendar.getEvents({
        end: toZonedInstant(date, 24 * 60, this.options.timeZone),
        start: toZonedInstant(date, 0, this.options.timeZone),
        timeZone: this.options.timeZone,
      }),
      this.options.memory?.get() ?? Promise.resolve([]),
    ]);
    const items = flatten(roots);
    const tasks = items.filter(isTask).filter(isCurrent);
    const projects = items.filter(isProject).filter(isCurrent);
    const context = (item: Item) => ({
      areaId: item.areaId,
      contexts: item.contexts,
      description: item.description,
      dueDate: item.dueDate ?? null,
      energy: item.energyCost,
      estimatedDurationMinutes: item.estimatedDuration ?? null,
      id: item.id,
      outcome: isProject(item) ? item.outcome : null,
      projectId: item.projectId ?? null,
      status: item.status,
      title: item.title,
      updatedAt: item.updatedAt.toISOString(),
    });
    const deadlines = tasks
      .filter((task) => task.dueDate !== null)
      .sort((left, right) => (left.dueDate ?? "").localeCompare(right.dueDate ?? ""))
      .slice(0, 12);
    const currentReview = review?.date === date ? review : null;
    const request: BriefingRequest = {
      analytics,
      calendarEvents: calendar.events,
      date,
      deadlines: deadlines.map(context),
      evidenceCatalog: {
        calendar: calendar.events.length > 0
          ? calendar.events.map((event) =>
              `Calendar ${event.id}: ${event.title}, ${event.start.toISOString()}–${event.end.toISOString()}`
            )
          : ["Calendar: no events are present in today's connected Calendar view."],
        deadlines: deadlines.length > 0
          ? deadlines.map((task) =>
              `Deadline ${task.id}: ${task.title}, due ${task.dueDate}`
            )
          : ["Deadlines: no open Task currently has a due date."],
        energy: currentReview
          ? [
              `Daily Review ${date}: energy ${currentReview.energy}/5, stress ${currentReview.stress}/5, motivation ${currentReview.motivation}/5, attention ${currentReview.attentionBudget}%.`,
            ]
          : [`Daily Review ${date}: no current energy assessment is available.`],
        patterns: patterns.length > 0
          ? patterns.map((pattern) =>
              `Pattern ${pattern.id}: ${pattern.description} ${pattern.evidence.join(" ")}`
            )
          : ["Patterns: Atlas has not detected a sufficiently supported historical pattern."],
        projects: projects.length > 0
          ? projects.map((project) =>
              `Project ${project.id}: ${project.title}; outcome: ${project.outcome}`
            )
          : ["Projects: Atlas has no active Project."],
      },
      memory,
      patterns,
      projects: projects.map(context),
      review: currentReview,
      tasks: tasks.map(context),
      timeZone: this.options.timeZone,
    };
    return ai.briefing.brief(request);
  }

  async getReflection() {
    const ai = this.requireAI();
    const analytics = await this.analytics.getReport();
    const [patterns, reviews, wrapUps] = await Promise.all([
      this.patterns.getPatterns(analytics),
      this.reviews.getHistory(),
      this.wrapUps.getHistory(),
    ]);
    return ai.reflection.reflect({ analytics, patterns, reviews, wrapUps });
  }

  private requireAI(): AIService {
    if (!this.options.ai) {
      throw new Error("Atlas AI is not configured. Add OPENAI_API_KEY and OPENAI_MODEL.");
    }
    return this.options.ai;
  }
}

export { AssistantService };
export type { AssistantServiceOptions };
