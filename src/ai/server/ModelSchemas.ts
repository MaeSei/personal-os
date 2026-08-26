import type { JsonSchema } from "./StructuredModelGateway";

const nullableString = { type: ["string", "null"] } as const;
const nullableNumber = { type: ["number", "null"] } as const;
const stringArray = { items: { type: "string" }, type: "array" } as const;

const breakdownSchema: JsonSchema = {
  additionalProperties: false,
  properties: {
    milestones: {
      items: {
        additionalProperties: false,
        properties: {
          confidence: { maximum: 1, minimum: 0, type: "number" },
          description: nullableString,
          id: { type: "string" },
          reason: { type: "string" },
          title: { type: "string" },
        },
        required: ["confidence", "description", "id", "reason", "title"],
        type: "object",
      },
      type: "array",
    },
    summary: { type: "string" },
    tasks: {
      items: {
        additionalProperties: false,
        properties: {
          confidence: { maximum: 1, minimum: 0, type: "number" },
          contexts: stringArray,
          dependencies: stringArray,
          description: nullableString,
          estimatedDurationMinutes: nullableNumber,
          energy: nullableNumber,
          id: { type: "string" },
          milestoneId: nullableString,
          reason: { type: "string" },
          title: { type: "string" },
        },
        required: [
          "confidence", "contexts", "dependencies", "description",
          "estimatedDurationMinutes", "energy", "id", "milestoneId",
          "reason", "title",
        ],
        type: "object",
      },
      type: "array",
    },
    warnings: stringArray,
  },
  required: ["milestones", "summary", "tasks", "warnings"],
  type: "object",
};

const classificationSchema: JsonSchema = {
  additionalProperties: false,
  properties: {
    areaId: nullableString,
    confidence: { maximum: 1, minimum: 0, type: "number" },
    contexts: stringArray,
    estimatedDurationMinutes: nullableNumber,
    energy: nullableNumber,
    projectId: nullableString,
    reason: { type: "string" },
  },
  required: [
    "areaId", "confidence", "contexts", "estimatedDurationMinutes",
    "energy", "projectId", "reason",
  ],
  type: "object",
};

const observationSchema = {
  additionalProperties: false,
  properties: {
    confidence: { maximum: 1, minimum: 0, type: "number" },
    evidence: stringArray,
    summary: { type: "string" },
  },
  required: ["confidence", "evidence", "summary"],
  type: "object",
} as const;

const reflectionSchema: JsonSchema = {
  additionalProperties: false,
  properties: {
    learnings: { items: observationSchema, type: "array" },
    reflections: { items: observationSchema, type: "array" },
    suggestions: { items: observationSchema, type: "array" },
  },
  required: ["learnings", "reflections", "suggestions"],
  type: "object",
};

const evidenceSchema = {
  additionalProperties: false,
  properties: {
    calendar: stringArray,
    deadlines: stringArray,
    energy: stringArray,
    patterns: stringArray,
    projects: stringArray,
  },
  required: ["calendar", "deadlines", "energy", "patterns", "projects"],
  type: "object",
} as const;

const suggestionSchema = {
  additionalProperties: false,
  properties: {
    confidence: { maximum: 1, minimum: 0, type: "number" },
    evidence: evidenceSchema,
    itemIds: stringArray,
    reason: { type: "string" },
    title: { type: "string" },
  },
  required: ["confidence", "evidence", "itemIds", "reason", "title"],
  type: "object",
} as const;

const timeBlockSuggestionSchema = {
  additionalProperties: false,
  properties: {
    ...suggestionSchema.properties,
    durationMinutes: { maximum: 480, minimum: 5, type: "number" },
    preferredWindow: { type: "string" },
  },
  required: [...suggestionSchema.required, "durationMinutes", "preferredWindow"],
  type: "object",
} as const;

const briefingSchema: JsonSchema = {
  additionalProperties: false,
  properties: {
    attentionBudget: nullableNumber,
    deepWork: { items: suggestionSchema, type: "array" },
    greeting: { type: "string" },
    observations: { items: suggestionSchema, type: "array" },
    opportunities: { items: suggestionSchema, type: "array" },
    quickWins: { items: suggestionSchema, type: "array" },
    risks: { items: suggestionSchema, type: "array" },
    suggestedTimeBlocks: { items: timeBlockSuggestionSchema, type: "array" },
    suggestedWorkspace: { items: suggestionSchema, type: "array" },
  },
  required: [
    "attentionBudget", "deepWork", "greeting", "observations",
    "opportunities", "quickWins", "risks", "suggestedTimeBlocks",
    "suggestedWorkspace",
  ],
  type: "object",
};

export {
  breakdownSchema,
  briefingSchema,
  classificationSchema,
  reflectionSchema,
};
