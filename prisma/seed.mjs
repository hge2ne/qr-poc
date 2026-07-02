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

  const students = [
    ["student-kim-minjun", "김민준", "010-1234-5678", "01012345678", "잠실고", "고등학교 3학년", "3학년 2반", "송파캠퍼스"],
    ["student-lee-seoyeon", "이서연", "010-2345-6789", "01023456789", "영동일고", "고등학교 2학년", "2학년 5반", "송파캠퍼스"],
    ["student-park-doyun", "박도윤", "010-3456-7890", "01034567890", "보성고", "고등학교 3학년", "3학년 7반", "송파캠퍼스"],
    ["student-choi-jiwoo", "최지우", "010-4567-8901", "01045678901", "정신여고", "고등학교 1학년", "1학년 3반", "송파캠퍼스"],
    ["student-jung-hayoon", "정하윤", "010-7788-1122", "01077881122", "방이중", "중학교 3학년", "3학년 1반", "송파캠퍼스"],
    ["student-han-yujun", "한유준", "010-9911-3344", "01099113344", "가락고", "고등학교 2학년", "2학년 4반", "송파캠퍼스"],
    ["student-oh-seojin", "오서진", "010-6655-7788", "01066557788", "오금고", "고등학교 1학년", "1학년 6반", "송파캠퍼스"],
  ];

  for (const student of students) {
    await pool.query(
      `
        INSERT INTO "Student" (
          "id",
          "name",
          "parentPhone",
          "parentPhoneNormalized",
          "school",
          "grade",
          "className",
          "campus",
          "isActive"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        ON CONFLICT ("id") DO UPDATE
        SET
          "name" = EXCLUDED."name",
          "parentPhone" = EXCLUDED."parentPhone",
          "parentPhoneNormalized" = EXCLUDED."parentPhoneNormalized",
          "school" = EXCLUDED."school",
          "grade" = EXCLUDED."grade",
          "className" = EXCLUDED."className",
          "campus" = EXCLUDED."campus",
          "isActive" = true,
          "updatedAt" = now()
      `,
      student
    );
  }

  console.log(`Seeded enrolled students: ${students.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
