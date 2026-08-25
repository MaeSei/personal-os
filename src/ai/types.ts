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
  readonly description: string | null;
  readonly id: string;
  readonly projectId: string | null;
  readonly status: string;
  readonly title: string;
};

export type { AIConversationMessage, AIItemContext, AISuggestion };
