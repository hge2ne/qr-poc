-- CreateEnum
CREATE TYPE "EntryLogSource" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "EntryLogStatus" AS ENUM ('ERROR');

-- CreateTable
CREATE TABLE "EntryLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "attendeeId" TEXT,
    "reservationId" TEXT,
    "source" "EntryLogSource" NOT NULL,
    "status" "EntryLogStatus" NOT NULL DEFAULT 'ERROR',
    "message" TEXT NOT NULL,
    "token" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryLog_eventId_status_idx" ON "EntryLog"("eventId", "status");

-- CreateIndex
CREATE INDEX "EntryLog_attendeeId_idx" ON "EntryLog"("attendeeId");

-- CreateIndex
CREATE INDEX "EntryLog_reservationId_idx" ON "EntryLog"("reservationId");

-- CreateIndex
CREATE INDEX "EntryLog_createdAt_idx" ON "EntryLog"("createdAt");

-- AddForeignKey
ALTER TABLE "EntryLog" ADD CONSTRAINT "EntryLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLog" ADD CONSTRAINT "EntryLog_attendeeId_fkey" FOREIGN KEY ("attendeeId") REFERENCES "Attendee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryLog" ADD CONSTRAINT "EntryLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
