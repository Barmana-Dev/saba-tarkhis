import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI configuration. The seed command used to live in `package.json`
 * under the deprecated `prisma.seed` key; Prisma 7 removes that key entirely,
 * so it lives here instead. `.env` is loaded explicitly because the CLI no
 * longer does it once a config file exists.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
