import type { AreaId } from "./Area";
import type { EnergyCost } from "./Attention";
import type { ItemId } from "./Item";
import { Status } from "./Status";
import type { Task, TaskStatus } from "./Task";

const builtInContexts = [
  "Computer",
  "Phone",
  "Home",
  "RV",
  "Lab",
  "Errands",
  "Calls",
  "Anywhere",
] as const;

type BuiltInContext = (typeof builtInContexts)[number];
type TaskContext = string;

type WorkspaceTaskFilters = {
  readonly areaId?: AreaId | null;
  readonly context?: TaskContext | null;
  readonly maxDuration?: number | null;
  readonly maxEnergy?: EnergyCost | null;
  readonly projectId?: ItemId | null;
  readonly status?: TaskStatus | null;
};

const builtInByName = new Map(
  builtInContexts.map((context) => [context.toLocaleLowerCase(), context]),
);
const validTaskStatuses = new Set<string>(
  Object.values(Status).filter((status) => status !== Status.Inbox),
);

function normalizeContext(value: string | null | undefined): TaskContext | null {
  const normalized = value?.trim().replace(/^@/, "").replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > 80) {
    throw new Error("A Task context must be 80 characters or fewer.");
  }

  return builtInByName.get(normalized.toLocaleLowerCase()) ?? normalized;
}

/** Canonicalizes built-ins and removes custom-context duplicates by name. */
function normalizeContexts(
  values: readonly (string | null | undefined)[],
): readonly TaskContext[] {
  const contexts: TaskContext[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const context = normalizeContext(value);
    const key = context?.toLocaleLowerCase();
    if (!context || !key || seen.has(key)) continue;
    seen.add(key);
    contexts.push(context);
  }

  return contexts;
}

/** Uses the canonical array when present and otherwise reads legacy fields. */
function getTaskContexts(
  task: Pick<Task, "context" | "contexts" | "preferredContext">,
): readonly TaskContext[] {
  return normalizeContexts(
    task.contexts === undefined
      ? [task.preferredContext, task.context]
      : task.contexts,
  );
}

/**
 * Answers whether a Task can run in a current context. Unconstrained Tasks and
 * Tasks marked Anywhere remain available wherever the user is.
 */
function canCompleteInContext(
  task: Pick<Task, "context" | "contexts" | "preferredContext">,
  currentContext: string,
): boolean {
  const selected = normalizeContext(currentContext);
  if (!selected) return true;
  const contexts = getTaskContexts(task);

  return (
    contexts.length === 0 ||
    contexts.includes("Anywhere") ||
    contexts.some(
      (context) =>
        context.toLocaleLowerCase() === selected.toLocaleLowerCase(),
    )
  );
}

function normalizeFilters(filters: WorkspaceTaskFilters): WorkspaceTaskFilters {
  const maxDuration = filters.maxDuration ?? null;
  const maxEnergy = filters.maxEnergy ?? null;
  const status = filters.status ?? null;

  if (
    maxDuration !== null &&
    (!Number.isInteger(maxDuration) || maxDuration <= 0)
  ) {
    throw new Error("A duration filter must be a positive number of minutes.");
  }
  if (
    maxEnergy !== null &&
    (!Number.isInteger(maxEnergy) || maxEnergy < 1 || maxEnergy > 5)
  ) {
    throw new Error("An energy filter must be between 1 and 5.");
  }
  if (
    status !== null &&
    !validTaskStatuses.has(status)
  ) {
    throw new Error("A Workspace status filter must be a Task status.");
  }

  return {
    areaId: filters.areaId?.trim() || null,
    context: normalizeContext(filters.context),
    maxDuration,
    maxEnergy,
    projectId: filters.projectId?.trim() || null,
    status,
  };
}

/** Pure, stable filtering; input order is preserved and no Task is mutated. */
function filterTasksByContext(
  tasks: readonly Task[],
  filters: WorkspaceTaskFilters = {},
): readonly Task[] {
  const normalized = normalizeFilters(filters);

  return tasks.filter((task) => {
    const duration = task.estimatedDuration ?? task.durationMinutes ?? null;
    return (
      (!normalized.areaId || task.areaId === normalized.areaId) &&
      (!normalized.projectId || task.projectId === normalized.projectId) &&
      (!normalized.status || task.status === normalized.status) &&
      (!normalized.maxEnergy || task.energyCost <= normalized.maxEnergy) &&
      (!normalized.maxDuration ||
        (duration !== null && duration <= normalized.maxDuration)) &&
      (!normalized.context || canCompleteInContext(task, normalized.context))
    );
  });
}

/** Built-ins stay visible; custom values are discovered from persisted Tasks. */
function getAvailableContexts(tasks: readonly Task[]): readonly TaskContext[] {
  const custom = normalizeContexts(tasks.flatMap(getTaskContexts)).filter(
    (context) => !builtInByName.has(context.toLocaleLowerCase()),
  );

  return [...builtInContexts, ...custom.sort((left, right) => left.localeCompare(right))];
}

export {
  builtInContexts,
  canCompleteInContext,
  filterTasksByContext,
  getAvailableContexts,
  getTaskContexts,
  normalizeContext,
  normalizeContexts,
};
export type { BuiltInContext, TaskContext, WorkspaceTaskFilters };
