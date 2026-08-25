import {
  ItemType,
  EstimateConfidence,
  PreferredTime,
  Status,
  type CalendarDate,
  type EnergyCost,
  type Effort,
  type Item,
  type Project,
} from "@/domain";
import {
  Prisma,
  type Item as ItemRow,
  type PrismaClient,
} from "@/generated/prisma/client";
import type { ItemRepository } from "@/repositories/ItemRepository";

type PrismaProvider = () => PrismaClient;
type FlatItem = {
  readonly item: Item;
  readonly parentId: string | null;
  readonly sortOrder: number;
};

function toCalendarDate(date: Date | null): CalendarDate | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function fromCalendarDate(date: CalendarDate | null | undefined): Date | null {
  return date ? new Date(`${date}T00:00:00.000Z`) : null;
}

function flattenItems(
  items: readonly Item[],
  parentId: string | null = null,
): readonly FlatItem[] {
  return items.flatMap((item, sortOrder) => [
    { item, parentId, sortOrder },
    ...flattenItems(item.children, item.id),
  ]);
}

function rowToItem(row: ItemRow, children: readonly Item[]): Item {
  const item: Item = {
    areaId: row.areaId,
    attentionScore: row.attentionScore,
    children,
    context: row.context,
    contexts: [...row.contexts],
    createdAt: new Date(row.createdAt),
    description: row.description,
    dueDate: toCalendarDate(row.dueDate),
    durationMinutes: row.durationMinutes,
    estimateConfidence: row.estimateConfidence as EstimateConfidence | null,
    estimatedDuration: row.estimatedDuration,
    effort: row.effort as Effort,
    energyCost: row.energyCost as EnergyCost,
    id: row.id,
    parentId: row.parentId,
    preferredContext: row.preferredContext,
    preferredTime: row.preferredTime as PreferredTime | null,
    projectId: row.projectId,
    scheduledDate: toCalendarDate(row.scheduledDate),
    scheduledEnd: row.scheduledEnd ? new Date(row.scheduledEnd) : null,
    scheduledStart: row.scheduledStart ? new Date(row.scheduledStart) : null,
    status: row.status as Status,
    tags: [...row.tags],
    title: row.title,
    type: row.type as ItemType,
    updatedAt: new Date(row.updatedAt),
  };

  if (row.type !== ItemType.Project) {
    return item;
  }

  const project = {
    ...item,
    areaId: row.areaId as string,
    energyLevel: row.energyLevel as EnergyCost,
    outcome: row.outcome as string,
    status: row.status as Project["status"],
    type: ItemType.Project,
  } as Project;

  return project;
}

function buildItemTree(rows: readonly ItemRow[]): readonly Item[] {
  const childrenByParent = new Map<string | null, ItemRow[]>();

  for (const row of rows) {
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row);
    childrenByParent.set(row.parentId, siblings);
  }

  const build = (row: ItemRow, path: ReadonlySet<string>): Item => {
    if (path.has(row.id)) {
      throw new Error("Atlas Item hierarchy contains a cycle.");
    }

    const nextPath = new Set(path).add(row.id);
    const children = (childrenByParent.get(row.id) ?? []).map((child) =>
      build(child, nextPath),
    );

    return rowToItem(row, children);
  };

  return (childrenByParent.get(null) ?? []).map((row) => build(row, new Set()));
}

function scalarData(flat: FlatItem) {
  const { item, sortOrder } = flat;
  const project = item.type === ItemType.Project ? (item as Project) : null;

  return {
    areaId: item.areaId,
    attentionScore: item.attentionScore,
    context: item.context ?? null,
    contexts: [...(item.contexts ?? [])],
    createdAt: item.createdAt,
    description: item.description,
    dueDate: fromCalendarDate(item.dueDate),
    durationMinutes: item.durationMinutes ?? null,
    estimateConfidence: item.estimateConfidence ?? null,
    estimatedDuration: item.estimatedDuration ?? item.durationMinutes ?? null,
    effort: item.effort,
    energyCost: item.energyCost,
    energyLevel: project?.energyLevel ?? null,
    outcome: project?.outcome ?? null,
    preferredContext: item.preferredContext ?? item.context ?? null,
    preferredTime: item.preferredTime as PreferredTime | null | undefined,
    scheduledDate: fromCalendarDate(item.scheduledDate),
    scheduledEnd: item.scheduledEnd ?? null,
    scheduledStart: item.scheduledStart ?? null,
    sortOrder,
    status: item.status,
    tags: [...item.tags],
    title: item.title,
    type: item.type,
    updatedAt: item.updatedAt,
  };
}

/** PostgreSQL snapshot adapter that preserves the recursive Item contract. */
class PrismaItemRepository implements ItemRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async get(): Promise<readonly Item[]> {
    const rows = await this.getClient().item.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return buildItemTree(rows);
  }

  async save(items: readonly Item[]): Promise<void> {
    const flatItems = flattenItems(items);
    const ids = flatItems.map(({ item }) => item.id);

    if (new Set(ids).size !== ids.length) {
      throw new Error("Atlas cannot save duplicate Item ids.");
    }

    await this.getClient().$transaction(
      async (transaction) => {
        for (const flat of flatItems) {
          const data = scalarData(flat);

          await transaction.item.upsert({
            create: {
              id: flat.item.id,
              ...data,
              parentId: null,
              projectId: null,
            },
            update: { ...data, parentId: null, projectId: null },
            where: { id: flat.item.id },
          });
        }

        for (const { item, parentId } of flatItems) {
          await transaction.item.update({
            data: { parentId, projectId: item.projectId ?? null },
            where: { id: item.id },
          });
        }

        await transaction.item.deleteMany(
          ids.length > 0 ? { where: { id: { notIn: ids } } } : undefined,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export { PrismaItemRepository };
