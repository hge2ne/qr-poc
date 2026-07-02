ALTER TABLE "Attendee" ADD COLUMN "qrUrl" TEXT;

WITH "AttendeeQrBase" AS (
    SELECT
        a."id",
        CASE
            WHEN r."reservationUrl" ~ '^https?://'
                THEN regexp_replace(r."reservationUrl", '/reserve/[^/?#]+.*$', '')
            ELSE 'http://localhost:3000'
        END AS "baseUrl"
    FROM "Attendee" a
    LEFT JOIN "Reservation" r ON r."id" = a."reservationId"
)
UPDATE "Attendee" a
SET "qrUrl" = b."baseUrl" || '/verify/' || a."qrToken"
FROM "AttendeeQrBase" b
WHERE a."id" = b."id";

ALTER TABLE "Attendee" ALTER COLUMN "qrUrl" SET NOT NULL;

CREATE UNIQUE INDEX "Attendee_qrUrl_key" ON "Attendee"("qrUrl");
