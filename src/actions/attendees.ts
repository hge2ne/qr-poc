"use server";

import { prisma } from "@/lib/prisma";
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
}): Promise<ActionResult<{ id: string; qrToken: string; qrUrl: string }>> {
  await requireAdmin();
  const attendee = await prisma.attendee.create({
    data: {
      eventId: data.eventId,
      name: data.name,
      phone: data.phone,
      userId: data.userId ?? null,
    },
  });
  const qrUrl = buildQrUrl(attendee.qrToken);
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
    phone: a.phone,
    qrToken: a.qrToken,
    qrUrl: buildQrUrl(a.qrToken),
    status: a.status,
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
    phone: a.phone,
    eventId: a.eventId,
    qrToken: a.qrToken,
    qrUrl: buildQrUrl(a.qrToken),
    status: a.status,
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
  data: { name?: string; phone?: string }
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.attendee.update({ where: { id }, data });
  return { success: true };
}

export async function deleteAttendee(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.attendee.delete({ where: { id } });
  return { success: true };
}
