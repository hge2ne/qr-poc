"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recordEntryError } from "@/lib/entryLogs";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";
import type {
  ScannerEntryEvent,
  ScannerEntryResult,
  ScannerLookupReservation,
  ScannerLookupStudent,
} from "./scannerTypes";

type LookupMapValue = Omit<ScannerLookupStudent, "reservations"> & {
  reservations: Map<string, ScannerLookupReservation>;
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = process.env.BASE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return baseUrl.replace(/\/$/, "");
}

function buildQrUrl(qrToken: string): string {
  return `${getBaseUrl()}/verify/${qrToken}`;
}

function normalizeName(name: string): string {
  return name.replace(/\s/g, "").toLowerCase();
}

function reservationKey(data: {
  studentId: string | null;
  phoneNormalized: string;
  studentName: string;
}) {
  if (data.studentId) return `student:${data.studentId}`;
  return `reservation:${data.phoneNormalized}:${normalizeName(data.studentName)}`;
}

function toLookupReservation(reservation: {
  id: string;
  eventId: string;
  attendeeCount: number;
  event: {
    title: string;
    date: Date;
    campus: string;
    round: string | null;
    location: string;
  };
  attendee: {
    status: "PENDING" | "ENTERED" | "CANCELLED";
    enteredAt: Date | null;
  } | null;
}): ScannerLookupReservation {
  return {
    id: reservation.id,
    eventId: reservation.eventId,
    eventTitle: reservation.event.title,
    eventDate: reservation.event.date.toISOString(),
    campus: reservation.event.campus,
    round: reservation.event.round,
    location: reservation.event.location,
    attendeeCount: reservation.attendeeCount,
    attendeeStatus: reservation.attendee?.status ?? null,
    enteredAt: reservation.attendee?.enteredAt?.toISOString() ?? null,
  };
}

function toEntryResult(data: {
  name: string;
  phone: string;
  eventTitle: string;
  enteredAt: Date;
  alreadyEntered: boolean;
}): ScannerEntryResult {
  return {
    attendeeName: data.name,
    phone: formatPhoneNumber(data.phone),
    eventTitle: data.eventTitle,
    enteredAt: data.enteredAt.toISOString(),
    alreadyEntered: data.alreadyEntered,
  };
}

function revalidateEntryPaths(eventId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/phone-reservations");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/scanner");
}

export async function searchScannerStudentsByPhoneLast4(
  last4: string,
  eventId?: string
): Promise<ActionResult<ScannerLookupStudent[]>> {
  await requireAdmin();

  const digits = normalizePhoneNumber(last4);
  if (digits.length !== 4) {
    return { success: false, error: "연락처 뒷자리 4자리를 입력해 주세요." };
  }
  const selectedEventId = cleanText(eventId);

  const [students, reservations] = await Promise.all([
    prisma.student.findMany({
      where: {
        isActive: true,
        phoneNormalized: { endsWith: digits },
      },
      include: {
        reservations: {
          where: {
            status: "RESERVED",
            ...(selectedEventId && { eventId: selectedEventId }),
          },
          include: {
            event: true,
            attendee: {
              select: {
                status: true,
                enteredAt: true,
              },
            },
          },
        },
      },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      take: 30,
    }),
    prisma.reservation.findMany({
      where: {
        status: "RESERVED",
        phoneNormalized: { endsWith: digits },
        ...(selectedEventId && { eventId: selectedEventId }),
      },
      include: {
        event: true,
        student: true,
        attendee: {
          select: {
            status: true,
            enteredAt: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 80,
    }),
  ]);

  const lookupMap = new Map<string, LookupMapValue>();

  for (const student of students) {
    lookupMap.set(`student:${student.id}`, {
      key: `student:${student.id}`,
      studentId: student.id,
      name: student.name,
      phone: formatPhoneNumber(student.phone),
      school: student.school,
      grade: student.grade,
      className: student.className,
      reservations: new Map(
        student.reservations.map((reservation) => [
          reservation.id,
          toLookupReservation(reservation),
        ])
      ),
    });
  }

  for (const reservation of reservations) {
    const key = reservationKey(reservation);
    const existing = lookupMap.get(key);
    const reservationInfo = toLookupReservation(reservation);

    if (existing) {
      existing.reservations.set(reservation.id, reservationInfo);
      continue;
    }

    lookupMap.set(key, {
      key,
      studentId: reservation.studentId,
      name: reservation.student?.name ?? reservation.studentName,
      phone: formatPhoneNumber(reservation.student?.phone ?? reservation.phone),
      school: reservation.student?.school ?? reservation.school,
      grade: reservation.student?.grade ?? reservation.grade,
      className: reservation.student?.className ?? reservation.className,
      reservations: new Map([[reservation.id, reservationInfo]]),
    });
  }

  const results = Array.from(lookupMap.values())
    .map((student) => ({
      ...student,
      reservations: Array.from(student.reservations.values()).sort(
        (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
      ),
    }))
    .sort((a, b) => {
      const reservationDiff = b.reservations.length - a.reservations.length;
      if (reservationDiff !== 0) return reservationDiff;
      return a.name.localeCompare(b.name, "ko-KR");
    });

  return { success: true, data: results };
}

export async function getScannerEntryEvents(): Promise<ActionResult<ScannerEntryEvent[]>> {
  await requireAdmin();

  const events = await prisma.event.findMany({
    where: { reservationStatus: { not: "HIDDEN" } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    take: 50,
  });

  return {
    success: true,
    data: events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.toISOString(),
      campus: event.campus,
      round: event.round,
      location: event.location,
    })),
  };
}

export async function enterReservedReservationFromScanner(
  reservationId: string,
  expectedEventId?: string
): Promise<ActionResult<ScannerEntryResult>> {
  await requireAdmin();

  const selectedEventId = cleanText(expectedEventId);
  const id = cleanText(reservationId);
  if (!id) {
    const error = "예약 정보를 확인할 수 없습니다.";
    if (selectedEventId) {
      await recordEntryError({ eventId: selectedEventId, source: "MANUAL", message: error });
      revalidateEntryPaths(selectedEventId);
    }
    return { success: false, error };
  }

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { attendee: true, event: true },
    });

    if (!reservation) {
      const error = "예약 정보를 찾을 수 없습니다.";
      if (selectedEventId) {
        await tx.entryLog.create({
          data: { eventId: selectedEventId, source: "MANUAL", message: error },
        });
        revalidateEntryPaths(selectedEventId);
      }
      return { success: false, error };
    }
    if (reservation.status === "CANCELLED") {
      const error = "취소된 예약입니다.";
      await tx.entryLog.create({
        data: {
          eventId: selectedEventId || reservation.eventId,
          reservationId: reservation.id,
          attendeeId: reservation.attendee?.id ?? null,
          source: "MANUAL",
          message: error,
        },
      });
      revalidateEntryPaths(selectedEventId || reservation.eventId);
      return { success: false, error };
    }
    if (selectedEventId && reservation.eventId !== selectedEventId) {
      const error = `선택한 설명회의 예약이 아닙니다. 이 예약은 ${reservation.event.title} 예약입니다.`;
      await tx.entryLog.create({
        data: {
          eventId: selectedEventId,
          reservationId: reservation.id,
          attendeeId: reservation.attendee?.id ?? null,
          source: "MANUAL",
          message: error,
        },
      });
      revalidateEntryPaths(selectedEventId);
      return {
        success: false,
        error,
      };
    }
    if (reservation.attendee?.status === "CANCELLED") {
      const error = "취소된 참석자입니다.";
      await tx.entryLog.create({
        data: {
          eventId: reservation.eventId,
          reservationId: reservation.id,
          attendeeId: reservation.attendee.id,
          source: "MANUAL",
          message: error,
        },
      });
      revalidateEntryPaths(reservation.eventId);
      return { success: false, error };
    }
    if (reservation.attendee?.status === "ENTERED" && reservation.attendee.enteredAt) {
      return {
        success: true,
        data: toEntryResult({
          name: reservation.attendee.name,
          phone: reservation.attendee.phone,
          eventTitle: reservation.event.title,
          enteredAt: reservation.attendee.enteredAt,
          alreadyEntered: true,
        }),
      };
    }

    const enteredAt = new Date();
    const qrToken = randomUUID();
    const attendee = reservation.attendee
      ? await tx.attendee.update({
          where: { id: reservation.attendee.id },
          data: { status: "ENTERED", enteredAt },
        })
      : await tx.attendee.create({
          data: {
            eventId: reservation.eventId,
            reservationId: reservation.id,
            name: reservation.studentName,
            phone: reservation.phone,
            path: reservation.path,
            school: reservation.school,
            grade: reservation.grade,
            className: reservation.className,
            attendeeCount: reservation.attendeeCount,
            qrToken,
            qrUrl: buildQrUrl(qrToken),
            status: "ENTERED",
            enteredAt,
          },
        });

    revalidateEntryPaths(reservation.eventId);

    return {
      success: true,
      data: toEntryResult({
        name: attendee.name,
        phone: attendee.phone,
        eventTitle: reservation.event.title,
        enteredAt,
        alreadyEntered: false,
      }),
    };
  });
}

export async function enterUnreservedStudentFromScanner(data: {
  studentId: string;
  eventId: string;
}): Promise<ActionResult<ScannerEntryResult>> {
  await requireAdmin();

  const studentId = cleanText(data.studentId);
  const eventId = cleanText(data.eventId);
  if (!studentId || !eventId) {
    const error = "학생과 설명회를 선택해 주세요.";
    if (eventId) {
      await recordEntryError({ eventId, source: "MANUAL", message: error });
      revalidateEntryPaths(eventId);
    }
    return { success: false, error };
  }

  return prisma.$transaction(async (tx) => {
    const [student, event] = await Promise.all([
      tx.student.findFirst({
        where: { id: studentId, isActive: true },
      }),
      tx.event.findUnique({
        where: { id: eventId },
      }),
    ]);

    if (!student) {
      const error = "학생 정보를 찾을 수 없습니다.";
      await tx.entryLog.create({
        data: { eventId, source: "MANUAL", message: error },
      });
      revalidateEntryPaths(eventId);
      return { success: false, error };
    }
    if (!event || event.reservationStatus === "HIDDEN") {
      const error = "입장 가능한 설명회를 찾을 수 없습니다.";
      await tx.entryLog.create({
        data: { eventId, source: "MANUAL", message: error },
      });
      revalidateEntryPaths(eventId);
      return { success: false, error };
    }

    const normalizedPhone = normalizePhoneNumber(student.phone);
    const phoneVariants = Array.from(
      new Set([student.phone, formatPhoneNumber(student.phone), normalizedPhone].filter(Boolean))
    );
    const existing = await tx.attendee.findFirst({
      where: {
        eventId,
        reservationId: null,
        name: student.name,
        phone: { in: phoneVariants },
        status: { not: "CANCELLED" },
      },
      include: { event: true },
      orderBy: { createdAt: "asc" },
    });

    if (existing?.status === "ENTERED" && existing.enteredAt) {
      return {
        success: true,
        data: toEntryResult({
          name: existing.name,
          phone: existing.phone,
          eventTitle: existing.event.title,
          enteredAt: existing.enteredAt,
          alreadyEntered: true,
        }),
      };
    }

    const enteredAt = new Date();
    const qrToken = randomUUID();
    const attendee = existing
      ? await tx.attendee.update({
          where: { id: existing.id },
          data: { status: "ENTERED", enteredAt },
        })
      : await tx.attendee.create({
          data: {
            eventId,
            name: student.name,
            phone: student.phone,
            path: "ENROLLED",
            school: student.school,
            grade: student.grade,
            className: student.className,
            attendeeCount: 1,
            qrToken,
            qrUrl: buildQrUrl(qrToken),
            status: "ENTERED",
            enteredAt,
          },
        });

    revalidateEntryPaths(eventId);

    return {
      success: true,
      data: toEntryResult({
        name: attendee.name,
        phone: attendee.phone,
        eventTitle: event.title,
        enteredAt,
        alreadyEntered: false,
      }),
    };
  });
}
