"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordEntryError } from "@/lib/entryLogs";
import { formatPhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";

function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = process.env.BASE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return baseUrl.replace(/\/$/, "");
}

function buildQrUrl(qrToken: string): string {
  return `${getBaseUrl()}/verify/${qrToken}`;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return { success: false as const, error: "관리자 권한이 필요합니다." };
  }
  return { success: true as const };
}

async function recordQrError(input: {
  eventId?: string | null;
  attendeeId?: string | null;
  reservationId?: string | null;
  token?: string | null;
  message: string;
}) {
  await recordEntryError({
    eventId: input.eventId,
    attendeeId: input.attendeeId,
    reservationId: input.reservationId,
    source: "QR",
    token: input.token,
    message: input.message,
  });
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  if (input.eventId) revalidatePath(`/events/${input.eventId}`);
  revalidatePath("/scanner");
}

export async function getQRPass(token: string): Promise<
  ActionResult<{
    attendeeName: string;
    phone: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    attendeeCount: number;
    qrUrl: string;
    status: "PENDING" | "ENTERED";
    enteredAt: string | null;
  }>
> {
  const attendee = await prisma.attendee.findUnique({
    where: { qrToken: token },
    include: { event: true, reservation: true },
  });

  if (!attendee) {
    return { success: false, error: "유효하지 않은 QR 코드입니다." };
  }

  if (attendee.status === "CANCELLED" || attendee.reservation?.status === "CANCELLED") {
    return { success: false, error: "취소된 예약의 QR 코드입니다." };
  }

  return {
    success: true,
    data: {
      attendeeName: attendee.name,
      phone: formatPhoneNumber(attendee.phone),
      eventTitle: attendee.event.title,
      eventDate: attendee.event.date.toISOString(),
      eventLocation: attendee.event.location,
      attendeeCount: attendee.attendeeCount,
      qrUrl: attendee.qrUrl || buildQrUrl(attendee.qrToken),
      status: attendee.status === "ENTERED" ? "ENTERED" : "PENDING",
      enteredAt: attendee.enteredAt?.toISOString() ?? null,
    },
  };
}

export async function verifyQRToken(token: string, expectedEventId?: string): Promise<
  ActionResult<{
    attendeeName: string;
    phone: string;
    eventTitle: string;
    enteredAt: string;
    alreadyEntered: boolean;
  }>
> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;
  const selectedEventId = expectedEventId?.trim();

  const attendee = await prisma.attendee.findUnique({
    where: { qrToken: token },
    include: { event: true, reservation: true },
  });

  if (!attendee) {
    const error = "유효하지 않은 QR 코드입니다.";
    await recordQrError({ eventId: selectedEventId, token, message: error });
    return { success: false, error };
  }

  if (attendee.status === "CANCELLED" || attendee.reservation?.status === "CANCELLED") {
    const error = "취소된 예약의 QR 코드입니다.";
    await recordQrError({
      eventId: selectedEventId || attendee.eventId,
      attendeeId: attendee.id,
      reservationId: attendee.reservationId,
      token,
      message: error,
    });
    return { success: false, error };
  }

  if (selectedEventId && attendee.eventId !== selectedEventId) {
    const error = `선택한 설명회의 QR이 아닙니다. 이 QR은 ${attendee.event.title} 예약입니다.`;
    await recordQrError({
      eventId: selectedEventId,
      attendeeId: attendee.id,
      reservationId: attendee.reservationId,
      token,
      message: error,
    });
    return {
      success: false,
      error,
    };
  }

  if (attendee.status === "ENTERED") {
    return {
      success: true,
      data: {
        attendeeName: attendee.name,
        phone: formatPhoneNumber(attendee.phone),
        eventTitle: attendee.event.title,
        enteredAt: attendee.enteredAt!.toISOString(),
        alreadyEntered: true,
      },
    };
  }

  const updated = await prisma.attendee.update({
    where: { qrToken: token },
    data: { status: "ENTERED", enteredAt: new Date() },
    include: { event: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath(`/events/${updated.eventId}`);
  revalidatePath("/scanner");

  return {
    success: true,
    data: {
      attendeeName: updated.name,
      phone: formatPhoneNumber(updated.phone),
      eventTitle: updated.event.title,
      enteredAt: updated.enteredAt!.toISOString(),
      alreadyEntered: false,
    },
  };
}

export async function getMyQRCodes(): Promise<
  ActionResult<
    {
      id: string;
      eventTitle: string;
      eventDate: string;
      qrToken: string;
      qrUrl: string;
      status: string;
    }[]
  >
> {
  const session = await getSession();
  if (!session) return { success: false, error: "로그인이 필요합니다." };

  const attendees = await prisma.attendee.findMany({
    where: { userId: session.userId, status: { not: "CANCELLED" } },
    include: { event: true },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: attendees.map((a) => ({
      id: a.id,
      eventTitle: a.event.title,
      eventDate: a.event.date.toISOString(),
      qrToken: a.qrToken,
      qrUrl: a.qrUrl || buildQrUrl(a.qrToken),
      status: a.status,
    })),
  };
}
