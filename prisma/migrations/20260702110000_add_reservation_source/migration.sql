CREATE TYPE "ReservationSource" AS ENUM ('ONLINE', 'PHONE');

ALTER TABLE "Reservation"
ADD COLUMN "source" "ReservationSource" NOT NULL DEFAULT 'ONLINE';

CREATE INDEX "Reservation_eventId_source_status_idx"
ON "Reservation"("eventId", "source", "status");
