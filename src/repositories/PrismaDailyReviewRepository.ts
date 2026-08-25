import {
  type DailyReviewResult,
  type ReviewRating,
} from "@/domain";
import type {
  DailyReview as DailyReviewRow,
  PrismaClient,
} from "@/generated/prisma/client";
import type { DailyReviewRepository } from "@/repositories/DailyReviewRepository";

type PrismaProvider = () => PrismaClient;

function toDomain(row: DailyReviewRow): DailyReviewResult {
  return {
    attentionBudget: row.attentionBudget,
    date: row.date.toISOString().slice(0, 10),
    energy: row.energy as ReviewRating,
    motivation: row.motivation as ReviewRating,
    notes: row.notes,
    stress: row.stress as ReviewRating,
    summary: row.summary,
  };
}

/** Append-only PostgreSQL adapter for historical Daily Reviews. */
class PrismaDailyReviewRepository implements DailyReviewRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async get(): Promise<DailyReviewResult | null> {
    const row = await this.getClient().dailyReview.findFirst({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    return row ? toDomain(row) : null;
  }

  async getHistory(): Promise<readonly DailyReviewResult[]> {
    const rows = await this.getClient().dailyReview.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    });

    return rows.map(toDomain);
  }

  async save(review: DailyReviewResult): Promise<void> {
    await this.getClient().dailyReview.create({
      data: {
        attentionBudget: review.attentionBudget,
        date: new Date(`${review.date}T00:00:00.000Z`),
        energy: review.energy,
        motivation: review.motivation,
        notes: review.notes,
        stress: review.stress,
        summary: review.summary,
      },
    });
  }
}

export { PrismaDailyReviewRepository };
