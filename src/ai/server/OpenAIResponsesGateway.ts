import "server-only";

import type {
  StructuredModelGateway,
  StructuredModelRequest,
} from "./StructuredModelGateway";

type OpenAIResponsesGatewayOptions = {
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs?: number;
};

type ResponseContent = { readonly text?: unknown; readonly type?: unknown };
type ResponseItem = { readonly content?: unknown; readonly type?: unknown };

function outputText(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("The AI provider returned an invalid response.");
  }
  const output = (payload as { readonly output?: unknown }).output;
  if (!Array.isArray(output)) {
    throw new Error("The AI provider returned no structured output.");
  }
  for (const item of output as ResponseItem[]) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content as ResponseContent[]) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  throw new Error("The AI provider returned no usable output.");
}

/** Server-only OpenAI Responses adapter with no tools or persistence. */
class OpenAIResponsesGateway implements StructuredModelGateway {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: OpenAIResponsesGatewayOptions) {
    this.apiKey = options.apiKey.trim();
    this.model = options.model.trim();
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!this.apiKey || !this.model) {
      throw new Error("OpenAI requires an API key and model.");
    }
  }

  async generate(request: StructuredModelRequest): Promise<unknown> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      body: JSON.stringify({
        input: JSON.stringify(request.input),
        instructions: request.instructions,
        max_output_tokens: request.maxOutputTokens ?? 2_500,
        model: this.model,
        store: false,
        text: {
          format: {
            name: request.name,
            schema: request.schema,
            strict: true,
            type: "json_schema",
          },
        },
      }),
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`The AI provider request failed (${response.status}).`);
    }
    const payload: unknown = await response.json();
    try {
      return JSON.parse(outputText(payload)) as unknown;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("The AI provider returned malformed structured output.");
      }
      throw error;
    }
  }
}

export { OpenAIResponsesGateway, outputText };
export type { OpenAIResponsesGatewayOptions };
