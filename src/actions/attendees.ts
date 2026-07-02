"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}

function buildQrUrl(qrToken: string): string {
  const base = process.env.BASE_URL || "http://localhost:3000";
  return `${base}/verify/${qrToken}`;
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
}): Promise<ActionResult<{ id: string; qrToken: string; qrUrl: string }>> {
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
    },
  });
  const qrUrl = buildQrUrl(attendee.qrToken);
  revalidatePath(`/events/${data.eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath("/reserve");
  return { success: true, data: { id: attendee.id, qrToken: attendee.qrToken, qrUrl } };
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
    qrUrl: buildQrUrl(a.qrToken),
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
    qrUrl: buildQrUrl(a.qrToken),
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
  const attendee = await prisma.attendee.delete({ where: { id } });
  revalidatePath(`/events/${attendee.eventId}`);
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath("/reserve");
  return { success: true };
}
