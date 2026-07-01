"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";

export async function verifyQRToken(token: string): Promise<
  ActionResult<{
    attendeeName: string;
    phone: string;
    eventTitle: string;
    enteredAt: string;
    alreadyEntered: boolean;
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

  if (attendee.status === "ENTERED") {
    return {
      success: true,
      data: {
        attendeeName: attendee.name,
        phone: attendee.phone,
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
  revalidatePath(`/events/${updated.eventId}`);

  return {
    success: true,
    data: {
      attendeeName: updated.name,
      phone: updated.phone,
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

  const base = process.env.BASE_URL || "http://localhost:3000";
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
      qrUrl: `${base}/verify/${a.qrToken}`,
      status: a.status,
    })),
  };
}
