type JsonSchema = Readonly<Record<string, unknown>>;

type StructuredModelRequest = {
  readonly input: unknown;
  readonly instructions: string;
  readonly maxOutputTokens?: number;
  readonly name: string;
  readonly schema: JsonSchema;
};

interface StructuredModelGateway {
  generate(request: StructuredModelRequest): Promise<unknown>;
}

export type { JsonSchema, StructuredModelGateway, StructuredModelRequest };
