type MemoryId = string;

enum MemoryType {
  Project = "Project",
  Person = "Person",
  Commitment = "Commitment",
  Conversation = "Conversation",
  Review = "Review",
  Planning = "Planning",
}

type MemoryLink = {
  readonly entryId: MemoryId;
  readonly relation: string;
};

type MemoryEntry = {
  readonly createdAt: Date;
  readonly id: MemoryId;
  readonly links: readonly MemoryLink[];
  readonly occurredAt: Date | null;
  readonly sourceIds: readonly string[];
  readonly summary: string;
  readonly title: string;
  readonly type: MemoryType;
  readonly updatedAt: Date;
};

type CreateMemoryEntryInput = Omit<MemoryEntry, "createdAt" | "updatedAt">;

function createMemoryEntry(
  input: CreateMemoryEntryInput,
  now: Date = new Date(),
): MemoryEntry {
  const id = input.id.trim();
  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!id || !title || !summary) {
    throw new Error("Memory requires an id, title, and summary.");
  }
  if (!Object.values(MemoryType).includes(input.type)) {
    throw new Error("Memory requires a supported type.");
  }
  const createdAt = new Date(now);
  if (!Number.isFinite(createdAt.getTime())) {
    throw new Error("Memory requires a valid creation time.");
  }
  const links = input.links.map((link) => ({
    entryId: link.entryId.trim(),
    relation: link.relation.trim(),
  }));
  if (links.some((link) => !link.entryId || !link.relation)) {
    throw new Error("Memory links require an entry id and relation.");
  }
  return {
    ...input,
    createdAt,
    id,
    links,
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : null,
    sourceIds: [...new Set(input.sourceIds.map((value) => value.trim()).filter(Boolean))],
    summary,
    title,
    updatedAt: new Date(createdAt),
  };
}

export { MemoryType, createMemoryEntry };
export type { CreateMemoryEntryInput, MemoryEntry, MemoryId, MemoryLink };
