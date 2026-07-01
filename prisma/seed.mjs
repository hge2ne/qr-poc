import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is required to seed the database.");
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  await pool.query(
    `
      INSERT INTO "User" ("id", "name", "email", "password", "role")
      VALUES ($1, $2, $3, $4, $5::"Role")
      ON CONFLICT ("email") DO UPDATE
      SET
        "name" = EXCLUDED."name",
        "password" = EXCLUDED."password",
        "role" = EXCLUDED."role"
    `,
    ["admin", "Admin", "admin", "admin", "ADMIN"]
  );

  console.log("Seeded admin user: admin / admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
