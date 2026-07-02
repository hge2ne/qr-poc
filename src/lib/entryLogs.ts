import { prisma } from "@/lib/prisma";

type EntryErrorInput = {
  eventId?: string | null;
  attendeeId?: string | null;
  reservationId?: string | null;
  source: "QR" | "MANUAL";
  message: string;
  token?: string | null;
};

export async function recordEntryError(input: EntryErrorInput) {
  try {
    await prisma.entryLog.create({
      data: {
        eventId: input.eventId || null,
        attendeeId: input.attendeeId || null,
        reservationId: input.reservationId || null,
        source: input.source,
        message: input.message,
        token: input.token || null,
      },
    });
  } catch (error) {
    console.error("Failed to record entry error", error);
  }
}
