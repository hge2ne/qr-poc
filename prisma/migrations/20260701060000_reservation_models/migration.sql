-- CreateEnum
CREATE TYPE "EventReservationStatus" AS ENUM ('OPEN', 'CLOSED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReservationPath" AS ENUM ('ENROLLED', 'GUEST');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('RESERVED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "AttendeeStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN "attendeeCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "reservationId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "attendeeCountEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attendeeCountMax" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "campus" TEXT NOT NULL DEFAULT '송파캠퍼스',
ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 9999,
ADD COLUMN "reservationStatus" "EventReservationStatus" NOT NULL DEFAULT 'OPEN',
ADD COLUMN "round" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "campus" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "studentId" TEXT,
    "path" "ReservationPath" NOT NULL,
    "studentName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "className" TEXT,
    "attendeeCount" INTEGER NOT NULL DEFAULT 1,
    "status" "ReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- Seed current POC enrolled-student lookup data.
INSERT INTO "Student" (
    "id",
    "name",
    "phone",
    "phoneNormalized",
    "school",
    "grade",
    "className"
) VALUES
    ('student-kim-minjun', '김민준', '010-1234-5678', '01012345678', '잠실고', '고3', '3학년 2반'),
    ('student-lee-seoyeon', '이서연', '010-2345-6789', '01023456789', '영동일고', '고2', '2학년 5반'),
    ('student-park-doyun', '박도윤', '010-3456-7890', '01034567890', '보성고', '고3', '3학년 7반'),
    ('student-choi-jiwoo', '최지우', '010-4567-8901', '01045678901', '정신여고', '고1', '1학년 3반');

-- CreateIndex
CREATE INDEX "Student_phoneNormalized_idx" ON "Student"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Student_campus_idx" ON "Student"("campus");

-- CreateIndex
CREATE INDEX "Reservation_eventId_status_idx" ON "Reservation"("eventId", "status");

-- CreateIndex
CREATE INDEX "Reservation_phoneNormalized_idx" ON "Reservation"("phoneNormalized");

-- CreateIndex
CREATE INDEX "Reservation_studentName_phoneNormalized_idx" ON "Reservation"("studentName", "phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Attendee_reservationId_key" ON "Attendee"("reservationId");

-- AddForeignKey
ALTER TABLE "Attendee" ADD CONSTRAINT "Attendee_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
