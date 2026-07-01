-- Store the public reservation detail URL once per reservation.
ALTER TABLE "Reservation" ADD COLUMN "reservationUrl" TEXT;

UPDATE "Reservation"
SET "reservationUrl" = '/reserve/' || "id"
WHERE "reservationUrl" IS NULL;

ALTER TABLE "Reservation" ALTER COLUMN "reservationUrl" SET NOT NULL;

CREATE UNIQUE INDEX "Reservation_reservationUrl_key" ON "Reservation"("reservationUrl");
