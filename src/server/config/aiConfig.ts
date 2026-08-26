import type { AIService } from "@/ai";
import { OpenAIResponsesGateway } from "@/ai/server/OpenAIResponsesGateway";
import { createStructuredAIService } from "@/ai/server/StructuredAIService";

type AIIntegration = {
  readonly model: string | null;
  readonly provider: "OpenAI" | null;
  readonly service: AIService | null;
};

/** Creates optional server-only AI capabilities without exposing credentials. */
function createAIIntegration(
  environment: NodeJS.ProcessEnv = process.env,
): AIIntegration {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  const model = environment.OPENAI_MODEL?.trim();
  if (!apiKey || !model) {
    return { model: model || null, provider: null, service: null };
  }
  const gateway = new OpenAIResponsesGateway({ apiKey, model });
  return {
    model,
    provider: "OpenAI",
    service: createStructuredAIService(gateway),
  };
}

export { createAIIntegration };
export type { AIIntegration };
