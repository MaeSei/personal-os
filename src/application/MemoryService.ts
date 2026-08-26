import type { MemoryEntry, MemoryId, MemoryType } from "../domain";

type MemoryQuery = {
  readonly ids?: readonly MemoryId[];
  readonly sourceIds?: readonly string[];
  readonly types?: readonly MemoryType[];
};

/** Architecture-only port for future structured Memory persistence. */
interface MemoryService {
  get(query?: MemoryQuery): Promise<readonly MemoryEntry[]>;
  save(entry: MemoryEntry): Promise<void>;
}

export type { MemoryQuery, MemoryService };
