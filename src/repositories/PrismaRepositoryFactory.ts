import "server-only";

import { getPrismaClient } from "@/lib/prisma";
import { PrismaAreaRepository } from "@/repositories/PrismaAreaRepository";
import { PrismaDailyReviewRepository } from "@/repositories/PrismaDailyReviewRepository";
import { PrismaDayPlanRepository } from "@/repositories/PrismaDayPlanRepository";
import { PrismaItemRepository } from "@/repositories/PrismaItemRepository";
import type {
  RepositoryFactory,
  RepositorySet,
} from "@/repositories/RepositoryFactory";

/** Server composition factory for all PostgreSQL repository adapters. */
class PrismaRepositoryFactory implements RepositoryFactory {
  create(): RepositorySet {
    return {
      areas: new PrismaAreaRepository(getPrismaClient),
      items: new PrismaItemRepository(getPrismaClient),
      plans: new PrismaDayPlanRepository(getPrismaClient),
      reviews: new PrismaDailyReviewRepository(getPrismaClient),
    };
  }
}

export { PrismaRepositoryFactory };
