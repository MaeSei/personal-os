import type {
  BreakdownProposal,
  BriefingRequest,
  BriefingSuggestion,
  ClassificationRequest,
  ClassificationResult,
  ExecutiveBriefing,
  ReflectionObservation,
  ReflectionResult,
} from "./index";

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`AI ${label} is invalid.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`AI ${label} is invalid.`);
  }
  return value.trim();
}

function optionalText(value: unknown, label: string): string | null {
  return value === null ? null : text(value, label);
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`AI ${label} is invalid.`);
  }
  return value;
}

function confidence(value: unknown): number {
  const result = number(value, "confidence");
  if (result < 0 || result > 1) throw new Error("AI confidence is invalid.");
  return result;
}

function list(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`AI ${label} is invalid.`);
  return value;
}

function textList(value: unknown, label: string): readonly string[] {
  return [...new Set(list(value, label).map((entry) => text(entry, label)))];
}

function optionalInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
): number | null {
  if (value === null) return null;
  const result = number(value, label);
  if (!Number.isInteger(result) || result < minimum || result > maximum) {
    throw new Error(`AI ${label} is outside Atlas limits.`);
  }
  return result;
}

function validateBreakdown(value: unknown): BreakdownProposal {
  const result = object(value, "Project breakdown");
  const milestones = list(result.milestones, "Milestones").slice(0, 8).map((entry) => {
    const milestone = object(entry, "Milestone");
    return {
      confidence: confidence(milestone.confidence),
      description: optionalText(milestone.description, "Milestone description"),
      id: text(milestone.id, "Milestone id"),
      reason: text(milestone.reason, "Milestone reason"),
      title: text(milestone.title, "Milestone title"),
    };
  });
  const milestoneIds = new Set(milestones.map(({ id }) => id));
  if (milestoneIds.size !== milestones.length) {
    throw new Error("AI Milestone ids must be unique.");
  }
  const tasks = list(result.tasks, "Tasks").slice(0, 24).map((entry) => {
    const task = object(entry, "Task");
    const id = text(task.id, "Task id");
    const milestoneId = optionalText(task.milestoneId, "Task Milestone id");
    if (milestoneId && !milestoneIds.has(milestoneId)) {
      throw new Error("AI Task references an unknown Milestone.");
    }
    return {
      confidence: confidence(task.confidence),
      contexts: textList(task.contexts, "Task contexts"),
      dependencies: textList(task.dependencies, "Task dependencies"),
      description: optionalText(task.description, "Task description"),
      energy: optionalInteger(task.energy, "Task energy", 1, 5),
      estimatedDurationMinutes: optionalInteger(
        task.estimatedDurationMinutes,
        "Task duration",
        5,
        480,
      ),
      id,
      milestoneId,
      reason: text(task.reason, "Task reason"),
      title: text(task.title, "Task title"),
    };
  });
  const taskIds = new Set(tasks.map(({ id }) => id));
  if (taskIds.size !== tasks.length) throw new Error("AI Task ids must be unique.");
  tasks.forEach((task) => {
    if (task.dependencies.includes(task.id) || task.dependencies.some((id) => !taskIds.has(id))) {
      throw new Error("AI Task dependencies are invalid.");
    }
  });
  return {
    milestones,
    summary: text(result.summary, "Project breakdown summary"),
    tasks,
    warnings: textList(result.warnings, "Project breakdown warnings"),
  };
}

function validateClassification(
  value: unknown,
  request: ClassificationRequest,
): ClassificationResult {
  const result = object(value, "Inbox classification");
  const areaId = optionalText(result.areaId, "Area id");
  const projectId = optionalText(result.projectId, "Project id");
  if (areaId && !request.areas.some(({ id }) => id === areaId)) {
    throw new Error("AI referenced an unknown Area.");
  }
  const project = projectId
    ? request.projects.find(({ id }) => id === projectId)
    : null;
  if (projectId && !project) throw new Error("AI referenced an unknown Project.");
  if (project && areaId !== project.areaId) {
    throw new Error("AI Project and Area suggestions conflict.");
  }
  return {
    areaId,
    confidence: confidence(result.confidence),
    contexts: textList(result.contexts, "Inbox contexts"),
    energy: optionalInteger(result.energy, "Inbox energy", 1, 5),
    estimatedDurationMinutes: optionalInteger(
      result.estimatedDurationMinutes,
      "Inbox duration",
      5,
      480,
    ),
    projectId,
    reason: text(result.reason, "Inbox reason"),
  };
}

function validateObservation(value: unknown): ReflectionObservation {
  const result = object(value, "Reflection observation");
  const evidence = textList(result.evidence, "Reflection evidence");
  if (evidence.length === 0) {
    throw new Error("Every reflection requires evidence.");
  }
  return {
    confidence: confidence(result.confidence),
    evidence,
    summary: text(result.summary, "Reflection summary"),
  };
}

function validateReflection(value: unknown): ReflectionResult {
  const result = object(value, "Reflection");
  const observations = (key: string) =>
    list(result[key], key).slice(0, 5).map(validateObservation);
  return {
    learnings: observations("learnings"),
    reflections: observations("reflections"),
    suggestions: observations("suggestions"),
  };
}

function validateBriefingSuggestion(
  value: unknown,
  allowedIds: ReadonlySet<string>,
  evidenceCatalog: BriefingRequest["evidenceCatalog"],
): BriefingSuggestion {
  const result = object(value, "Briefing suggestion");
  const evidence = object(result.evidence, "Briefing evidence");
  const itemIds = textList(result.itemIds, "Briefing Item ids");
  if (itemIds.some((id) => !allowedIds.has(id))) {
    throw new Error("AI briefing referenced an unknown Atlas Item.");
  }
  const references = {
    calendar: textList(evidence.calendar, "Calendar evidence"),
    deadlines: textList(evidence.deadlines, "Deadline evidence"),
    energy: textList(evidence.energy, "Energy evidence"),
    patterns: textList(evidence.patterns, "Pattern evidence"),
    projects: textList(evidence.projects, "Project evidence"),
  };
  if (Object.values(references).some((entries) => entries.length === 0)) {
    throw new Error("Every briefing suggestion requires complete evidence.");
  }
  Object.entries(references).forEach(([category, entries]) => {
    const allowed = new Set(
      evidenceCatalog[category as keyof typeof evidenceCatalog],
    );
    if (entries.some((entry) => !allowed.has(entry))) {
      throw new Error("AI briefing cited evidence that Atlas did not supply.");
    }
  });
  return {
    confidence: confidence(result.confidence),
    evidence: references,
    itemIds,
    reason: text(result.reason, "Briefing reason"),
    title: text(result.title, "Briefing title"),
  };
}

function validateBriefing(
  value: unknown,
  request: BriefingRequest,
): ExecutiveBriefing {
  const result = object(value, "Executive briefing");
  const allowedIds = new Set([
    ...request.projects.map(({ id }) => id),
    ...request.tasks.map(({ id }) => id),
  ]);
  const suggestions = (key: string) =>
    list(result[key], key).slice(0, 5)
      .map((entry) => validateBriefingSuggestion(
        entry,
        allowedIds,
        request.evidenceCatalog,
      ));
  const timeBlocks = list(result.suggestedTimeBlocks, "Time Blocks").slice(0, 5)
    .map((entry) => {
      const base = validateBriefingSuggestion(
        entry,
        allowedIds,
        request.evidenceCatalog,
      );
      const block = object(entry, "Time Block");
      return {
        ...base,
        durationMinutes: optionalInteger(
          block.durationMinutes,
          "Time Block duration",
          5,
          480,
        ) ?? 30,
        preferredWindow: text(block.preferredWindow, "Time Block window"),
      };
    });
  return {
    attentionBudget: request.review?.attentionBudget ?? null,
    deepWork: suggestions("deepWork"),
    greeting: text(result.greeting, "Greeting"),
    observations: suggestions("observations"),
    opportunities: suggestions("opportunities"),
    quickWins: suggestions("quickWins"),
    risks: suggestions("risks"),
    suggestedTimeBlocks: timeBlocks,
    suggestedWorkspace: suggestions("suggestedWorkspace"),
  };
}

export {
  validateBreakdown,
  validateBriefing,
  validateClassification,
  validateReflection,
};
