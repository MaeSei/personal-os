import {
  completeItem as completeDomainItem,
  createProject,
  createDailyReviewResult,
  createInboxItem,
  getInitialArea,
  isBlocked,
  isArea,
  isProject,
  isProjectStatus,
  ItemType,
  NextActionCalculator,
  Status,
  type ActionableItem,
  type Area,
  type DailyReviewResult,
  type EnergyCost,
  type Item,
  type ItemId,
  type Project,
  type ReviewRating,
} from "../domain";
import type { AtlasRepository } from "./AtlasRepository";
import type { InboxRepository } from "./InboxRepository";
import type {
  CompleteOnboardingInput,
  OnboardingRepository,
} from "./OnboardingRepository";
import type { ProjectRepository } from "./ProjectRepository";

const DEFAULT_ITEMS_KEY = "atlas.items.v2";
const DEFAULT_REVIEW_KEY = "atlas.review.v2";
const DEFAULT_AREAS_KEY = "atlas.areas.v1";
const nextActionCalculator = new NextActionCalculator();

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;

type StoredItem = Omit<Item, "children" | "createdAt" | "updatedAt"> & {
  children: StoredItem[];
  createdAt: string;
  updatedAt: string;
};

type StoredReview = Pick<
  DailyReviewResult,
  "energy" | "motivation" | "stress"
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isItemType(value: unknown): value is ItemType {
  return Object.values(ItemType).includes(value as ItemType);
}

function isStatus(value: unknown): value is Status {
  return Object.values(Status).includes(value as Status);
}

function isRating(value: unknown): value is ReviewRating {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isEnergyCost(value: unknown): value is EnergyCost {
  return isRating(value);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function deserializeAreaId(
  value: Record<string, unknown>,
): string | null | undefined {
  if (value.areaId === null) {
    return null;
  }

  if (typeof value.areaId === "string" && value.areaId.trim()) {
    return value.areaId;
  }

  if (value.area === null) {
    return null;
  }

  if (typeof value.area === "string") {
    return getInitialArea(value.area)?.id;
  }

  return undefined;
}

function serializeItem(item: Item): StoredItem {
  return {
    ...item,
    children: item.children.map(serializeItem),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function deserializeItem(value: unknown): Item | null {
  if (!isRecord(value)) {
    return null;
  }

  const createdAt = parseDate(value.createdAt);
  const updatedAt = parseDate(value.updatedAt);
  const areaId = deserializeAreaId(value);
  const children = Array.isArray(value.children)
    ? value.children.map(deserializeItem)
    : null;
  const validChildren = children?.filter(
    (child): child is Item => child !== null,
  );

  if (
    !createdAt ||
    !updatedAt ||
    !children ||
    !validChildren ||
    validChildren.length !== children.length ||
    areaId === undefined ||
    !isItemType(value.type) ||
    (value.type === ItemType.Project && areaId === null) ||
    !isStatus(value.status) ||
    !isEnergyCost(value.energyCost) ||
    !isEnergyCost(value.effort) ||
    typeof value.attentionScore !== "number" ||
    !Number.isFinite(value.attentionScore) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !isNullableString(value.description) ||
    !isNullableString(value.parentId) ||
    !isStringArray(value.tags)
  ) {
    return null;
  }

  const item: Item = {
    areaId,
    attentionScore: value.attentionScore,
    children: validChildren,
    createdAt,
    description: value.description,
    effort: value.effort,
    energyCost: value.energyCost,
    id: value.id,
    parentId: value.parentId,
    status: value.status,
    tags: value.tags,
    title: value.title,
    type: value.type,
    updatedAt,
  };

  if (item.type !== ItemType.Project || item.areaId === null) {
    return item;
  }

  const outcome =
    typeof value.outcome === "string" && value.outcome.trim()
      ? value.outcome.trim()
      : item.description?.trim() || item.title;
  const energyLevel = isEnergyCost(value.energyLevel)
    ? value.energyLevel
    : item.energyCost;

  const project: Project = {
    ...item,
    areaId: item.areaId,
    energyLevel,
    outcome,
    status: isProjectStatus(item.status) ? item.status : Status.Active,
    type: ItemType.Project,
  };

  return project;
}

function deserializeReview(value: unknown): DailyReviewResult | null {
  if (
    !isRecord(value) ||
    !isRating(value.energy) ||
    !isRating(value.motivation) ||
    !isRating(value.stress)
  ) {
    return null;
  }

  return createDailyReviewResult({
    energy: value.energy,
    motivation: value.motivation,
    stress: value.stress,
  });
}

function createId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Browser persistence adapter shared by all current Atlas experiences. */
class LocalStorageRepository
  implements
    AtlasRepository,
    InboxRepository,
    OnboardingRepository,
    ProjectRepository
{
  constructor(
    private readonly storage?: StorageAdapter,
    private readonly itemsKey: string = DEFAULT_ITEMS_KEY,
    private readonly reviewKey: string = DEFAULT_REVIEW_KEY,
    private readonly areasKey: string = DEFAULT_AREAS_KEY,
  ) {}

  async loadItems(): Promise<readonly Item[]> {
    const storedValue = this.getStorage().getItem(this.itemsKey);

    if (!storedValue) {
      await this.saveItems([]);
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const items = parsed.map(deserializeItem);
      return items.every((item) => item !== null) ? items : [];
    } catch {
      return [];
    }
  }

  saveItems(items: readonly Item[]): Promise<void> {
    const storedItems = items.map(serializeItem);
    this.getStorage().setItem(this.itemsKey, JSON.stringify(storedItems));
    return Promise.resolve();
  }

  async loadReview(): Promise<DailyReviewResult | null> {
    const storedValue = this.getStorage().getItem(this.reviewKey);

    if (!storedValue) {
      return null;
    }

    try {
      return deserializeReview(JSON.parse(storedValue));
    } catch {
      return null;
    }
  }

  saveReview(review: DailyReviewResult): Promise<void> {
    const storedReview: StoredReview = {
      energy: review.energy,
      motivation: review.motivation,
      stress: review.stress,
    };

    this.getStorage().setItem(this.reviewKey, JSON.stringify(storedReview));
    return Promise.resolve();
  }

  getItems(): Promise<readonly Item[]> {
    return this.loadItems();
  }

  async getInbox(): Promise<readonly Item[]> {
    return (await this.loadItems()).filter(
      (item) => item.type !== ItemType.Project && item.status === Status.Inbox,
    );
  }

  async getInboxCount(): Promise<number> {
    return (await this.getInbox()).length;
  }

  async getToday(): Promise<readonly ActionableItem[]> {
    return nextActionCalculator.getTodayActions(await this.loadItems());
  }

  async getProjects(): Promise<readonly Project[]> {
    return (await this.loadItems()).filter(isProject);
  }

  async getBlocked(): Promise<readonly Item[]> {
    return (await this.loadItems()).filter(
      (item) => item.type !== ItemType.Project && isBlocked(item),
    );
  }

  getLatestReview(): Promise<DailyReviewResult | null> {
    return this.loadReview();
  }

  async getAreas(): Promise<readonly Area[]> {
    const storedValue = this.getStorage().getItem(this.areasKey);

    if (!storedValue) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(storedValue);

      if (!Array.isArray(parsed)) {
        return [];
      }

      const areas = parsed.map((value) =>
        isArea(value)
          ? value
          : typeof value === "string"
            ? getInitialArea(value)
            : null,
      );

      if (areas.some((area) => area === null)) {
        return [];
      }

      const validAreas = areas.filter((area): area is Area => area !== null);
      const uniqueAreas = [
        ...new Map(validAreas.map((area) => [area.id, area])).values(),
      ];

      if (!parsed.every(isArea)) {
        await this.saveAreas(uniqueAreas);
      }

      return uniqueAreas;
    } catch {
      return [];
    }
  }

  saveAreas(areas: readonly Area[]): Promise<void> {
    if (!areas.every(isArea)) {
      throw new Error("Atlas can only save valid Areas.");
    }

    const uniqueAreas = [
      ...new Map(areas.map((area) => [area.id, area])).values(),
    ];

    this.getStorage().setItem(this.areasKey, JSON.stringify(uniqueAreas));
    return Promise.resolve();
  }

  async completeOnboarding(input: CompleteOnboardingInput): Promise<Project> {
    const areas = [
      ...new Map(input.areas.map((area) => [area.id, area])).values(),
    ];

    if (
      areas.length === 0 ||
      !areas.every(isArea) ||
      !areas.some((area) => area.id === input.projectAreaId)
    ) {
      throw new Error("Onboarding requires valid Areas for the first Project.");
    }

    const project = createProject({
      areaId: input.projectAreaId,
      createdAt: new Date(),
      energyLevel: input.projectEnergyLevel,
      id: createId(),
      initialNextAction: {
        id: createId(),
        title: input.projectNextAction,
      },
      outcome: input.projectOutcome,
      title: input.projectTitle,
    });
    const items = await this.loadItems();

    await this.saveItems([
      project,
      ...items.filter((stored) => stored.id !== project.id),
    ]);
    await this.saveAreas(areas);

    return project;
  }

  async capture(title: string): Promise<Item> {
    const item = createInboxItem({
      createdAt: new Date(),
      id: createId(),
      title,
    });
    const items = await this.loadItems();

    await this.saveItems([item, ...items.filter((stored) => stored.id !== item.id)]);
    return item;
  }

  async completeItem(itemId: ItemId): Promise<Item | null> {
    const result = completeDomainItem(await this.loadItems(), itemId);

    if (!result.completedItem) {
      return null;
    }

    await this.saveItems(result.items);
    return result.completedItem;
  }

  private getStorage(): StorageAdapter {
    if (this.storage) {
      return this.storage;
    }

    if (typeof window === "undefined") {
      throw new Error("Atlas local storage is only available in the browser.");
    }

    return window.localStorage;
  }
}

export { LocalStorageRepository };
export type { StorageAdapter };
