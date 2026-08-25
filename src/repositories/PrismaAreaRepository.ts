import { isArea, type Area } from "@/domain";
import type { PrismaClient } from "@/generated/prisma/client";
import type { AreaRepository } from "@/repositories/AreaRepository";

type PrismaProvider = () => PrismaClient;

/** PostgreSQL snapshot adapter for configured Areas. */
class PrismaAreaRepository implements AreaRepository {
  constructor(private readonly getClient: PrismaProvider) {}

  async get(): Promise<readonly Area[]> {
    const rows = await this.getClient().area.findMany({
      orderBy: [{ position: "asc" }, { title: "asc" }],
    });

    return rows.map(({ color, description, icon, id, title }) => ({
      color,
      description,
      icon,
      id,
      title,
    }));
  }

  async save(areas: readonly Area[]): Promise<void> {
    if (!areas.every(isArea)) {
      throw new Error("Atlas can only save valid Areas.");
    }

    const uniqueAreas = [
      ...new Map(areas.map((area) => [area.id, area])).values(),
    ];

    await this.getClient().$transaction(async (transaction) => {
      for (const [position, area] of uniqueAreas.entries()) {
        const data = {
          color: area.color,
          description: area.description,
          icon: area.icon,
          position,
          title: area.title,
        };

        await transaction.area.upsert({
          create: { id: area.id, ...data },
          update: data,
          where: { id: area.id },
        });
      }

      await transaction.area.deleteMany(
        uniqueAreas.length > 0
          ? { where: { id: { notIn: uniqueAreas.map(({ id }) => id) } } }
          : undefined,
      );
    });
  }
}

export { PrismaAreaRepository };
