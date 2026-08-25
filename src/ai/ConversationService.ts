import type { AIConversationMessage, AIItemContext } from "./types";

type ConversationRequest = {
  readonly context: readonly AIItemContext[];
  readonly messages: readonly AIConversationMessage[];
};

type ConversationResponse = {
  readonly message: AIConversationMessage & { readonly role: "assistant" };
  readonly referencedItemIds: readonly string[];
};

/** Provider-neutral conversational capability. It owns no persistence. */
interface ConversationService {
  respond(request: ConversationRequest): Promise<ConversationResponse>;
}

export type { ConversationRequest, ConversationResponse, ConversationService };
