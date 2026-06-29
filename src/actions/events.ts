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

export async function createEvent(data: {
  title: string;
  date: string;
  location: string;
  description?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const event = await prisma.event.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      location: data.location,
      description: data.description ?? null,
    },
  });
  return { success: true, data: { id: event.id } };
}

export async function getEvents() {
  await requireAdmin();
  const events = await prisma.event.findMany({
    include: {
      attendees: { select: { status: true } },
    },
    orderBy: { date: "desc" },
  });
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    location: e.location,
    description: e.description,
    totalCount: e.attendees.length,
    enteredCount: e.attendees.filter((a: { status: string }) => a.status === "ENTERED").length,
  }));
}

export async function getEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendees: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    date: event.date.toISOString(),
    location: event.location,
    description: event.description,
    attendees: event.attendees.map((a: typeof event.attendees[number]) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      qrToken: a.qrToken,
      status: a.status,
      enteredAt: a.enteredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function updateEvent(
  id: string,
  data: { title?: string; date?: string; location?: string; description?: string }
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.event.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.location && { location: data.location }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
  return { success: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  return { success: true };
}
