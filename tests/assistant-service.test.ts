import assert from "node:assert/strict";
import test from "node:test";

import {
  type AIService,
  type BriefingRequest,
  type ExecutiveBriefing,
  validateBreakdown,
  validateBriefing,
  validateClassification,
  validateReflection,
} from "../src/ai";
import { AssistantService } from "../src/application/AssistantService";
import type { AnalyticsReportProvider } from "../src/application/AnalyticsService";
import type { PatternProvider } from "../src/application/PatternService";
import { MockCalendarProvider } from "../src/calendar";
import {
  MemoryType,
  calculateAnalyticsReport,
  createInboxItem,
  createMemoryEntry,
  createProject,
  getTaskDependencyIds,
  isProject,
  isProjectMilestone,
  isTask,
  type Area,
  type AnalyticsReport,
  type Pattern,
} from "../src/domain";
import type { AreaRepository } from "../src/repositories/AreaRepository";
import { MockDailyReviewRepository } from "../src/repositories/MockDailyReviewRepository";
import { MockDailyWrapUpRepository } from "../src/repositories/MockDailyWrapUpRepository";
import { MockItemRepository } from "../src/repositories/MockItemRepository";

class Areas implements AreaRepository {
  constructor(private readonly values: readonly Area[]) {}
  get() { return Promise.resolve(this.values); }
  save() { return Promise.resolve(); }
}

class Analytics implements AnalyticsReportProvider {
  constructor(private readonly report: AnalyticsReport) {}
  getReport() { return Promise.resolve(this.report); }
}

class Patterns implements PatternProvider {
  getPatterns(): Promise<readonly Pattern[]> { return Promise.resolve([]); }
}

const work: Area = {
  color: "green",
  description: "Professional outcomes.",
  icon: "W",
  id: "work",
  title: "Work",
};

const briefing: ExecutiveBriefing = {
  attentionBudget: null,
  deepWork: [],
  greeting: "Good morning, Maike.",
  observations: [],
  opportunities: [],
  quickWins: [],
  risks: [],
  suggestedTimeBlocks: [],
  suggestedWorkspace: [],
};

function fakeAI(): AIService {
  return {
    breakdown: {
      propose: () => Promise.resolve({
        milestones: [{
          confidence: 0.9,
          description: "Foundation complete.",
          id: "milestone-foundation",
          reason: "Makes progress visible.",
          title: "Foundation",
        }],
        summary: "A small outcome-first breakdown.",
        tasks: [
          {
            confidence: 0.9,
            contexts: ["Computer"],
            dependencies: [],
            description: null,
            energy: 4,
            estimatedDurationMinutes: 45,
            id: "draft-foundation",
            milestoneId: "milestone-foundation",
            reason: "Creates the base.",
            title: "Prepare foundation",
          },
          {
            confidence: 0.7,
            contexts: ["Computer"],
            dependencies: ["draft-foundation"],
            description: null,
            energy: 3,
            estimatedDurationMinutes: 30,
            id: "draft-verify",
            milestoneId: "milestone-foundation",
            reason: "Verifies the outcome.",
            title: "Verify foundation",
          },
        ],
        warnings: [],
      }),
    },
    briefing: { brief: () => Promise.resolve(briefing) },
    classification: {
      classify: () => Promise.resolve({
        areaId: "work",
        confidence: 0.86,
        contexts: ["Computer"],
        energy: 2,
        estimatedDurationMinutes: 15,
        projectId: "project-atlas",
        reason: "It directly advances the Atlas outcome.",
      }),
    },
    conversation: null,
    planning: null,
    reflection: {
      reflect: () => Promise.resolve({
        learnings: [],
        reflections: [],
        suggestions: [],
      }),
    },
  };
}

function fixture() {
  let nextId = 0;
  const project = createProject({
    areaId: work.id,
    createdAt: new Date("2026-08-25T08:00:00.000Z"),
    energyLevel: 3,
    id: "project-atlas",
    outcome: "Atlas supports an intentional day.",
    title: "Atlas",
  });
  const inbox = createInboxItem({
    createdAt: new Date("2026-08-25T08:00:00.000Z"),
    id: "inbox-thought",
    title: "Prepare pricing",
  });
  const items = new MockItemRepository([project, inbox]);
  const analytics = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-25T08:00:00.000Z"),
    items: [project],
    reviews: [],
    wrapUps: [],
  });
  const service = new AssistantService(
    items,
    new Areas([work]),
    new MockDailyReviewRepository(),
    new MockDailyWrapUpRepository(),
    new MockCalendarProvider(),
    new Analytics(analytics),
    new Patterns(),
    {
      ai: fakeAI(),
      createId: () => `accepted-${++nextId}`,
      model: "configured-model",
      now: () => new Date("2026-08-25T09:00:00.000Z"),
      provider: "OpenAI",
      timeZone: "Europe/Stockholm",
    },
  );
  return { items, service };
}

test("Project AI proposes without writing and accepts only explicit selections", async () => {
  const { items, service } = fixture();
  const before = await items.get();
  const preview = await service.proposeProjectBreakdown("project-atlas");
  assert.deepEqual(await items.get(), before);

  const accepted = await service.acceptProjectBreakdown({
    acceptedMilestoneIds: ["milestone-foundation"],
    acceptedTaskIds: ["draft-foundation", "draft-verify"],
    preview,
  });
  assert.deepEqual(accepted, { milestoneCount: 1, taskCount: 2 });
  const project = (await items.get()).find(isProject);
  assert.ok(project);
  const milestone = project.children.find(isProjectMilestone);
  assert.ok(milestone);
  const tasks = milestone.children.filter(isTask);
  assert.deepEqual(tasks.map(({ title }) => title), ["Prepare foundation", "Verify foundation"]);
  assert.deepEqual(getTaskDependencyIds(tasks[1]), [tasks[0].id]);
});

test("accepting none and Inbox AI suggestions never mutate stored Items", async () => {
  const { items, service } = fixture();
  const preview = await service.proposeProjectBreakdown("project-atlas");
  const before = await items.get();
  assert.deepEqual(await service.acceptProjectBreakdown({
    acceptedMilestoneIds: [],
    acceptedTaskIds: [],
    preview,
  }), { milestoneCount: 0, taskCount: 0 });
  const suggestion = await service.suggestInboxItem("inbox-thought");
  assert.equal(suggestion.confidence, 0.86);
  assert.equal(suggestion.areaTitle, "Work");
  assert.equal(suggestion.projectTitle, "Atlas");
  assert.deepEqual(await items.get(), before);
});

test("Project acceptance revalidates a browser-returned proposal before writing", async () => {
  const { items, service } = fixture();
  const preview = await service.proposeProjectBreakdown("project-atlas");
  const before = await items.get();
  const task = preview.proposal.tasks[0];
  assert.ok(task);

  await assert.rejects(service.acceptProjectBreakdown({
    acceptedMilestoneIds: [],
    acceptedTaskIds: [task.id],
    preview: {
      ...preview,
      proposal: {
        ...preview.proposal,
        tasks: [{ ...task, energy: 99 }],
      },
    },
  }), /outside Atlas limits/);
  assert.deepEqual(await items.get(), before);
});

test("Memory is structured and validates links without invoking an LLM", () => {
  const person = createMemoryEntry({
    id: "person-lars",
    links: [],
    occurredAt: null,
    sourceIds: [],
    summary: "Lars is connected to pricing work.",
    title: "Lars",
    type: MemoryType.Person,
  }, new Date("2026-08-25T09:00:00.000Z"));
  const commitment = createMemoryEntry({
    id: "commitment-pricing",
    links: [{ entryId: person.id, relation: "promised-to" }],
    occurredAt: new Date("2026-08-25T08:30:00.000Z"),
    sourceIds: ["inbox-thought"],
    summary: "Send pricing to Lars.",
    title: "Send pricing",
    type: MemoryType.Commitment,
  });
  assert.equal(commitment.links[0]?.entryId, "person-lars");
  assert.deepEqual(commitment.sourceIds, ["inbox-thought"]);
});

test("AI output validation rejects invented references before application use", () => {
  assert.throws(() => validateClassification({
    areaId: "invented-area",
    confidence: 0.9,
    contexts: ["Computer"],
    energy: 2,
    estimatedDurationMinutes: 15,
    projectId: null,
    reason: "Invented destination.",
  }, {
    areas: [{ id: "work", title: "Work" }],
    description: null,
    projects: [],
    title: "Prepare pricing",
  }), /unknown Area/);

  assert.throws(() => validateBreakdown({
    milestones: [],
    summary: "Invalid dependency.",
    tasks: [{
      confidence: 0.8,
      contexts: [],
      dependencies: ["missing-task"],
      description: null,
      energy: 3,
      estimatedDurationMinutes: 30,
      id: "task-one",
      milestoneId: null,
      reason: "Invalid.",
      title: "Task one",
    }],
    warnings: [],
  }), /dependencies are invalid/);

  assert.throws(() => validateReflection({
    learnings: [],
    reflections: [{ confidence: 0.8, evidence: [], summary: "Unsupported." }],
    suggestions: [],
  }), /requires evidence/);

  const analytics = calculateAnalyticsReport({
    generatedAt: new Date("2026-08-25T09:00:00.000Z"),
    items: [],
    reviews: [],
    wrapUps: [],
  });
  const request: BriefingRequest = {
    analytics,
    calendarEvents: [],
    date: "2026-08-25",
    deadlines: [],
    evidenceCatalog: {
      calendar: ["Calendar: none."],
      deadlines: ["Deadlines: none."],
      energy: ["Energy: not reviewed."],
      patterns: ["Patterns: none."],
      projects: ["Projects: none."],
    },
    memory: [],
    patterns: [],
    projects: [],
    review: null,
    tasks: [],
    timeZone: "Europe/Stockholm",
  };
  assert.throws(() => validateBriefing({
    ...briefing,
    observations: [{
      confidence: 0.8,
      evidence: {
        calendar: ["Invented meeting."],
        deadlines: ["Deadlines: none."],
        energy: ["Energy: not reviewed."],
        patterns: ["Patterns: none."],
        projects: ["Projects: none."],
      },
      itemIds: [],
      reason: "Unsupported evidence.",
      title: "Invented advice",
    }],
  }, request), /did not supply/);
});
