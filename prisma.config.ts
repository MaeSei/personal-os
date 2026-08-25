import "dotenv/config";

import { defineConfig } from "prisma/config";

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  datasource: databaseUrl ? { url: databaseUrl } : undefined,
  migrations: {
    path: "prisma/migrations",
  },
  schema: "prisma/schema.prisma",
});
