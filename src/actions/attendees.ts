"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildQrUrl } from "@/lib/appUrls";
import { formatPhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import { sendReservationSuccessSms } from "@/lib/sms";
import type { SmsDeliveryStatus } from "./reservationTypes";
import type { ActionResult } from "./types";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}

function formatEventDateText(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const eventDate = `${get("year")}-${get("month")}-${get("day")}`;
  const eventTime = `${get("hour")}:${get("minute")}`.replace(/^24:/, "00:");
  return `${eventDate} ${eventTime}`;
}

export async function createAttendee(data: {
  eventId: string;
  name: string;
  phone: string;
  userId?: string;
  path?: "ENROLLED" | "GUEST";
  school?: string;
  grade?: string;
  className?: string;
  attendeeCount?: number;
}): Promise<ActionResult<{
  id: string;
  qrToken: string;
  qrUrl: string;
  smsStatus?: SmsDeliveryStatus;
  smsError?: string;
}>> {
  await requireAdmin();
  const attendeeCount =
    Number.isInteger(data.attendeeCount) && data.attendeeCount! > 0 ? data.attendeeCount! : 1;
  const path = data.path === "ENROLLED" || data.path === "GUEST" ? data.path : null;
  const name = data.name.trim();
  const phone = data.phone.trim();
  const school = data.school?.trim() || null;
  const grade = data.grade?.trim() || null;
  const className = data.className?.trim() || null;

  if (!name || !phone) {
    return { success: false, error: "이름과 연락처를 입력해 주세요." };
  }
  if (path === "GUEST" && (!school || !grade)) {
    return { success: false, error: "학생 정보를 모두 입력해 주세요." };
  }

  const qrToken = randomUUID();
  const qrUrl = buildQrUrl(qrToken);
  const attendee = await prisma.attendee.create({
    data: {
      eventId: data.eventId,
      name,
      phone,
      userId: data.userId ?? null,
      path,
      school,
      grade,
      className,
      attendeeCount,
      qrToken,
      qrUrl,
    },
    include: { event: true },
  });
  revalidatePath(`/events/${data.eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath("/reserve");

  const sms = await sendReservationSuccessSms({
    to: attendee.phone,
    studentName: attendee.name,
    eventTitle: attendee.event.title,
    eventDateText: formatEventDateText(attendee.event.date),
    location: attendee.event.location,
    qrUrl,
  });

  return {
    success: true,
    data: {
      id: attendee.id,
      qrToken: attendee.qrToken,
      qrUrl,
      smsStatus: sms.status,
      smsError: sms.error,
    },
  };
}

export async function getAttendees(eventId: string) {
  await requireAdmin();
  const attendees = await prisma.attendee.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
  });
  return attendees.map((a) => ({
    id: a.id,
    name: a.name,
    phone: formatPhoneNumber(a.phone),
    qrToken: a.qrToken,
    qrUrl: a.qrUrl,
    status: a.status,
    attendeeCount: a.attendeeCount,
    path: a.path,
    school: a.school,
    grade: a.grade,
    className: a.className,
    enteredAt: a.enteredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function getAttendee(id: string) {
  await requireAdmin();
  const a = await prisma.attendee.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    phone: formatPhoneNumber(a.phone),
    eventId: a.eventId,
    qrToken: a.qrToken,
    qrUrl: a.qrUrl,
    status: a.status,
    attendeeCount: a.attendeeCount,
    path: a.path,
    school: a.school,
    grade: a.grade,
    className: a.className,
    enteredAt: a.enteredAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    event: {
      id: a.event.id,
      title: a.event.title,
      date: a.event.date.toISOString(),
      location: a.event.location,
    },
  };
}

export async function updateAttendee(
  id: string,
  data: { name?: string; phone?: string; attendeeCount?: number }
): Promise<ActionResult> {
  await requireAdmin();
  const attendee = await prisma.attendee.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.phone && { phone: data.phone }),
      ...(Number.isInteger(data.attendeeCount) &&
        data.attendeeCount! > 0 && { attendeeCount: data.attendeeCount }),
    },
  });
  revalidatePath(`/events/${attendee.eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath("/reserve");
  return { success: true };
}

export async function deleteAttendee(id: string): Promise<ActionResult> {
  await requireAdmin();

  const result = await prisma.$transaction<ActionResult<{ eventId: string; reservationId?: string }>>(
    async (tx) => {
      const attendee = await tx.attendee.findUnique({
        where: { id },
        include: { reservation: true },
      });

      if (!attendee) {
        return { success: false, error: "참석자 정보를 찾을 수 없습니다." };
      }
      if (attendee.status === "ENTERED") {
        return { success: false, error: "이미 입장 완료된 참석자는 취소할 수 없습니다." };
      }

      const cancelledAt = new Date();
      if (attendee.reservation && attendee.reservation.status !== "CANCELLED") {
        await tx.reservation.update({
          where: { id: attendee.reservation.id },
          data: { status: "CANCELLED", cancelledAt },
        });
      }

      if (attendee.status !== "CANCELLED") {
        await tx.attendee.update({
          where: { id: attendee.id },
          data: { status: "CANCELLED" },
        });
      }

      return {
        success: true,
        data: {
          eventId: attendee.eventId,
          reservationId: attendee.reservationId ?? undefined,
        },
      };
    }
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error ?? "참석자 취소에 실패했습니다." };
  }

  revalidatePath(`/events/${result.data.eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath("/reserve");
  revalidatePath("/reserve/check");
  if (result.data.reservationId) revalidatePath(`/reserve/${result.data.reservationId}`);
  return { success: true };
}
