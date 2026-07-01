"use server";

import { revalidatePath } from "next/cache";
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
  campus?: string;
  round?: string;
  location: string;
  description?: string;
  capacity?: number;
  attendeeCountEnabled?: boolean;
  attendeeCountMax?: number;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const event = await prisma.event.create({
    data: {
      title: data.title,
      date: new Date(data.date),
      campus: data.campus?.trim() || "송파캠퍼스",
      round: data.round?.trim() || null,
      location: data.location,
      description: data.description ?? null,
      capacity: Number.isInteger(data.capacity) && data.capacity! > 0 ? data.capacity! : 9999,
      attendeeCountEnabled: data.attendeeCountEnabled ?? false,
      attendeeCountMax:
        data.attendeeCountEnabled && Number.isInteger(data.attendeeCountMax) && data.attendeeCountMax! > 0
          ? data.attendeeCountMax!
          : 1,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/reserve");
  return { success: true, data: { id: event.id } };
}

export async function getEvents() {
  await requireAdmin();
  const events = await prisma.event.findMany({
    include: {
      attendees: { select: { status: true, attendeeCount: true } },
      reservations: {
        where: { status: "RESERVED" },
        select: { attendeeCount: true },
      },
    },
    orderBy: { date: "desc" },
  });
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date.toISOString(),
    campus: e.campus,
    location: e.location,
    description: e.description,
    capacity: e.capacity,
    reservationStatus: e.reservationStatus,
    reservedCount: e.reservations.reduce((sum, reservation) => sum + reservation.attendeeCount, 0),
    totalCount: e.attendees
      .filter((a: { status: string }) => a.status !== "CANCELLED")
      .reduce((sum: number, a: { attendeeCount: number }) => sum + a.attendeeCount, 0),
    enteredCount: e.attendees
      .filter((a: { status: string }) => a.status === "ENTERED")
      .reduce((sum: number, a: { attendeeCount: number }) => sum + a.attendeeCount, 0),
  }));
}

export async function getEvent(id: string) {
  await requireAdmin();
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      attendees: { orderBy: { createdAt: "asc" } },
      reservations: {
        where: { status: "RESERVED" },
        select: { attendeeCount: true },
      },
    },
  });
  if (!event) return null;
  return {
    id: event.id,
    title: event.title,
    date: event.date.toISOString(),
    campus: event.campus,
    round: event.round,
    location: event.location,
    description: event.description,
    capacity: event.capacity,
    reservationStatus: event.reservationStatus,
    attendeeCountEnabled: event.attendeeCountEnabled,
    attendeeCountMax: event.attendeeCountMax,
    reservedCount: event.reservations.reduce((sum, reservation) => sum + reservation.attendeeCount, 0),
    attendees: event.attendees.map((a: typeof event.attendees[number]) => ({
      id: a.id,
      name: a.name,
      phone: a.phone,
      qrToken: a.qrToken,
      status: a.status,
      attendeeCount: a.attendeeCount,
      enteredAt: a.enteredAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function updateEvent(
  id: string,
  data: {
    title?: string;
    date?: string;
    campus?: string;
    round?: string;
    location?: string;
    description?: string;
    capacity?: number;
    reservationStatus?: "OPEN" | "CLOSED" | "HIDDEN";
    attendeeCountEnabled?: boolean;
    attendeeCountMax?: number;
  }
): Promise<ActionResult> {
  await requireAdmin();
  await prisma.event.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.date && { date: new Date(data.date) }),
      ...(data.campus && { campus: data.campus }),
      ...(data.round !== undefined && { round: data.round || null }),
      ...(data.location && { location: data.location }),
      ...(data.description !== undefined && { description: data.description }),
      ...(Number.isInteger(data.capacity) && data.capacity! > 0 && { capacity: data.capacity }),
      ...(data.reservationStatus && { reservationStatus: data.reservationStatus }),
      ...(data.attendeeCountEnabled !== undefined && {
        attendeeCountEnabled: data.attendeeCountEnabled,
      }),
      ...(Number.isInteger(data.attendeeCountMax) &&
        data.attendeeCountMax! > 0 && { attendeeCountMax: data.attendeeCountMax }),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath(`/events/${id}`);
  revalidatePath("/reserve");
  return { success: true };
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.event.delete({ where: { id } });
  revalidatePath("/dashboard");
  revalidatePath("/reserve");
  return { success: true };
}
