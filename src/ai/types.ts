type AISuggestion<T> = {
  readonly confidence: number;
  readonly explanation: string;
  readonly value: T;
};

type AIConversationMessage = {
  readonly content: string;
  readonly role: "assistant" | "user";
};

type AIItemContext = {
  readonly areaId: string | null;
  readonly contexts?: readonly string[];
  readonly description: string | null;
  readonly dueDate?: string | null;
  readonly energy?: number;
  readonly estimatedDurationMinutes?: number | null;
  readonly id: string;
  readonly outcome?: string | null;
  readonly projectId: string | null;
  readonly status: string;
  readonly title: string;
  readonly updatedAt?: string;
};

export type { AIConversationMessage, AIItemContext, AISuggestion };
