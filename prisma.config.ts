import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { defineConfig } from "prisma/config";
import { getMigrationDatabaseUrl } from "./src/lib/databaseUrl";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getMigrationDatabaseUrl(),
  },
});
