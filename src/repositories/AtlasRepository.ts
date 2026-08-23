import type { DailyReviewResult, Item } from "../domain";
import type { DailyReviewRepository } from "./DailyReviewRepository";
import type { ItemCommandRepository } from "./ItemCommandRepository";
import type { ItemRepository } from "./ItemRepository";
import type { OnboardingRepository } from "./OnboardingRepository";
import type { ProjectRepository } from "./ProjectRepository";

/** Full persistence contract implemented by local storage and, later, Prisma. */
interface AtlasRepository
  extends ItemRepository,
    ItemCommandRepository,
    DailyReviewRepository,
    OnboardingRepository,
    ProjectRepository {
  loadItems(): Promise<readonly Item[]>;
  loadReview(): Promise<DailyReviewResult | null>;
  saveItems(items: readonly Item[]): Promise<void>;
  saveReview(review: DailyReviewResult): Promise<void>;
}

export type { AtlasRepository };
