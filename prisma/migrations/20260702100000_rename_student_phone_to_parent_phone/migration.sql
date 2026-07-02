ALTER TABLE "Student" RENAME COLUMN "phone" TO "parentPhone";
ALTER TABLE "Student" RENAME COLUMN "phoneNormalized" TO "parentPhoneNormalized";
ALTER INDEX "Student_phoneNormalized_idx" RENAME TO "Student_parentPhoneNormalized_idx";
