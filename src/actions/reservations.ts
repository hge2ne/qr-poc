"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import { sendReservationSuccessSms } from "@/lib/sms";
import type { ActionResult } from "./types";
import type {
  ReservationInput,
  ReservationMutationData,
  ReservationPath,
  ReservationSession,
  ReservationStudent,
  StoredReservation,
} from "./reservationTypes";

type EventWithCounts = {
  id: string;
  title: string;
  date: Date;
  campus: string;
  round: string | null;
  location: string;
  capacity: number;
  reservationStatus: "OPEN" | "CLOSED" | "HIDDEN";
  attendeeCountEnabled: boolean;
  attendeeCountMax: number;
  createdAt: Date;
  reservations: { attendeeCount: number }[];
  attendees: { attendeeCount: number }[];
};

const DEFAULT_ROUND = "신규 회차";

function getBaseUrl(): string {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const baseUrl = process.env.BASE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return baseUrl.replace(/\/$/, "");
}

function buildQrUrl(qrToken: string): string {
  return `${getBaseUrl()}/verify/${qrToken}`;
}

function buildReservationUrl(reservationId: string): string {
  return `${getBaseUrl()}/reserve/${reservationId}`;
}

function displayReservationUrl(reservationId: string, reservationUrl: string): string {
  if (reservationUrl.startsWith("/")) return `${getBaseUrl()}${reservationUrl}`;
  return reservationUrl || buildReservationUrl(reservationId);
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function normalizeName(name: string): string {
  return name.replace(/\s/g, "").toLowerCase();
}

function cleanText(value: string | undefined): string {
  return value?.trim() ?? "";
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
}

function getDateParts(date: Date) {
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
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`.replace(/^24:/, "00:"),
  };
}

function attendeeCountOptions(enabled: boolean, max: number): number[] | undefined {
  if (!enabled) return undefined;
  const safeMax = Math.max(1, Math.min(max, 50));
  return Array.from({ length: safeMax }, (_, index) => index + 1);
}

function countReservedSeats(event: EventWithCounts): number {
  const reservationSeats = event.reservations.reduce((sum, item) => sum + item.attendeeCount, 0);
  const manualAttendeeSeats = event.attendees.reduce((sum, item) => sum + item.attendeeCount, 0);
  return reservationSeats + manualAttendeeSeats;
}

function toReservationSession(event: EventWithCounts, reserved = countReservedSeats(event)): ReservationSession {
  const { date, time } = getDateParts(event.date);
  return {
    id: event.id,
    campus: event.campus,
    round: event.round ?? DEFAULT_ROUND,
    title: event.title,
    date,
    time,
    location: event.location,
    capacity: event.capacity,
    reserved,
    reservationStatus: event.reservationStatus,
    attendeeCountEnabled: event.attendeeCountEnabled,
    attendeeCountOptions: attendeeCountOptions(event.attendeeCountEnabled, event.attendeeCountMax),
    createdAt: event.createdAt.toISOString(),
  };
}

function toStoredReservation(
  reservation: {
    id: string;
    path: "ENROLLED" | "GUEST";
    studentName: string;
    phone: string;
    school: string;
    grade: string;
    className: string | null;
    attendeeCount: number;
    reservationUrl: string;
    status: "RESERVED" | "CANCELLED";
    createdAt: Date;
    cancelledAt: Date | null;
    event: {
      id: string;
      title: string;
      date: Date;
      campus: string;
      round: string | null;
      location: string;
    };
    attendee?: { qrToken: string; qrUrl: string } | null;
  }
): StoredReservation {
  const { date, time } = getDateParts(reservation.event.date);
  const path: ReservationPath = reservation.path === "ENROLLED" ? "enrolled" : "guest";
  return {
    id: reservation.id,
    session: {
      id: reservation.event.id,
      campus: reservation.event.campus,
      round: reservation.event.round ?? DEFAULT_ROUND,
      title: reservation.event.title,
      date,
      time,
      location: reservation.event.location,
    },
    path,
    name: reservation.studentName,
    phone: formatPhoneNumber(reservation.phone),
    extra: reservation.className ? `${reservation.grade} · ${reservation.className}` : reservation.grade,
    school: reservation.school,
    grade: reservation.grade,
    attendeeCount: reservation.attendeeCount,
    reservationUrl: displayReservationUrl(reservation.id, reservation.reservationUrl),
    qrUrl: reservation.attendee?.qrUrl,
    status: reservation.status === "RESERVED" ? "reserved" : "cancelled",
    createdAt: reservation.createdAt.toISOString(),
    cancelledAt: reservation.cancelledAt?.toISOString(),
  };
}

export async function getReservationSessions(): Promise<ActionResult<ReservationSession[]>> {
  const events = await prisma.event.findMany({
    where: { reservationStatus: { not: "HIDDEN" } },
    include: {
      reservations: {
        where: { status: "RESERVED" },
        select: { attendeeCount: true },
      },
      attendees: {
        where: {
          reservationId: null,
          status: { not: "CANCELLED" },
        },
        select: { attendeeCount: true },
      },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return {
    success: true,
    data: events.map((event) => toReservationSession(event)),
  };
}

export async function lookupStudentByParentPhone(
  parentPhone: string
): Promise<ActionResult<ReservationStudent>> {
  const parentPhoneNormalized = normalizePhone(parentPhone);
  if (parentPhoneNormalized.length < 9) {
    return { success: false, error: "학부모 연락처를 정확히 입력해 주세요." };
  }

  const student = await prisma.student.findFirst({
    where: {
      parentPhoneNormalized,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!student) {
    return { success: false, error: "등록된 재원생 학부모 연락처를 찾을 수 없습니다." };
  }

  return {
    success: true,
    data: {
      id: student.id,
      name: student.name,
      parentPhone: student.parentPhone,
      school: student.school,
      grade: student.grade,
      className: student.className,
    },
  };
}

export async function createReservation(
  input: ReservationInput
): Promise<ActionResult<ReservationMutationData>> {
  const eventId = cleanText(input.eventId);
  let phone = cleanText(input.phone);
  let phoneNormalized = normalizePhone(phone);
  const path = input.path;

  if (!eventId) return { success: false, error: "설명회를 선택해 주세요." };
  if (path !== "enrolled" && path !== "guest") {
    return { success: false, error: "예약 구분이 올바르지 않습니다." };
  }
  if (phoneNormalized.length < 9) {
    return { success: false, error: "학부모 연락처를 정확히 입력해 주세요." };
  }

  const result = await prisma.$transaction<ActionResult<ReservationMutationData>>(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      include: {
        reservations: {
          where: { status: "RESERVED" },
          select: { attendeeCount: true },
        },
        attendees: {
          where: {
            reservationId: null,
            status: { not: "CANCELLED" },
          },
          select: { attendeeCount: true },
        },
      },
    });
    if (!event) return { success: false, error: "설명회를 찾을 수 없습니다." };
    if (event.reservationStatus !== "OPEN") {
      return { success: false, error: "현재 예약 가능한 설명회가 아닙니다." };
    }

    const attendeeCount = event.attendeeCountEnabled
      ? Number(input.attendeeCount)
      : 1;
    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      return { success: false, error: "참석 인원을 선택해 주세요." };
    }
    if (event.attendeeCountEnabled && attendeeCount > event.attendeeCountMax) {
      return { success: false, error: "선택 가능한 참석 인원을 초과했습니다." };
    }

    let studentId: string | undefined;
    let name = cleanText(input.name);
    let school = cleanText(input.school);
    let grade = cleanText(input.grade);
    let className = cleanText(input.className);

    if (path === "enrolled") {
      const student = await tx.student.findFirst({
        where: { parentPhoneNormalized: phoneNormalized, isActive: true },
        orderBy: { createdAt: "asc" },
      });
      if (!student) {
        return { success: false, error: "등록된 재원생 학부모 연락처를 찾을 수 없습니다." };
      }
      studentId = student.id;
      name = student.name;
      phone = student.parentPhone;
      phoneNormalized = student.parentPhoneNormalized;
      school = student.school;
      grade = student.grade;
      className = student.className;
    }

    if (!name || !school || !grade) {
      return { success: false, error: "학생 정보를 모두 입력해 주세요." };
    }

    const duplicate = await tx.reservation.findFirst({
      where: {
        eventId,
        phoneNormalized,
        studentName: name,
        status: "RESERVED",
      },
    });
    if (duplicate) {
      return { success: false, error: "이미 예약된 설명회입니다." };
    }

    const reserved = countReservedSeats(event);
    if (reserved + attendeeCount > event.capacity) {
      return { success: false, error: "정원이 마감된 설명회입니다." };
    }

    const reservationId = randomUUID();
    const reservation = await tx.reservation.create({
      data: {
        id: reservationId,
        eventId,
        studentId,
        path: path === "enrolled" ? "ENROLLED" : "GUEST",
        studentName: name,
        phone,
        phoneNormalized,
        school,
        grade,
        className: className || null,
        attendeeCount,
        reservationUrl: buildReservationUrl(reservationId),
      },
      include: { event: true },
    });

    const qrToken = randomUUID();
    const attendee = await tx.attendee.create({
      data: {
        eventId,
        reservationId: reservation.id,
        name,
        phone,
        path: path === "enrolled" ? "ENROLLED" : "GUEST",
        school,
        grade,
        className: className || null,
        attendeeCount,
        qrToken,
        qrUrl: buildQrUrl(qrToken),
      },
    });

    const session = toReservationSession(event, reserved + attendeeCount);
    // Revalidating /reserve here refreshes the active mobile flow and clears the completion screen.
    revalidatePath("/reserve/check");
    revalidatePath(`/reserve/${reservation.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/phone-reservations");
    revalidatePath(`/events/${eventId}`);

    return {
      success: true,
      data: {
        reservation: toStoredReservation({ ...reservation, attendee }),
        session,
      },
    };
  });

  if (!result.success || !result.data) return result;

  const { reservation } = result.data;
  const sms = await sendReservationSuccessSms({
    to: reservation.phone,
    studentName: reservation.name,
    eventTitle: reservation.session.title,
    eventDateText: `${reservation.session.date} ${reservation.session.time}`,
    location: reservation.session.location,
    reservationUrl: reservation.reservationUrl,
    qrUrl: reservation.qrUrl,
  });

  return {
    ...result,
    data: {
      ...result.data,
      smsStatus: sms.status,
    },
  };
}

export async function findReservationsByContact(data: {
  name: string;
  phone: string;
}): Promise<ActionResult<StoredReservation[]>> {
  const name = normalizeName(data.name);
  const phoneNormalized = normalizePhone(data.phone);

  if (!name || phoneNormalized.length < 9) {
    return { success: true, data: [] };
  }

  const reservations = await prisma.reservation.findMany({
    where: { phoneNormalized },
    include: {
      event: true,
      attendee: {
        select: { qrToken: true, qrUrl: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    success: true,
    data: reservations
      .filter((reservation) => normalizeName(reservation.studentName) === name)
      .map(toStoredReservation),
  };
}

export async function cancelReservation(data: {
  id: string;
  name: string;
  phone: string;
}): Promise<ActionResult> {
  const id = cleanText(data.id);
  const name = normalizeName(data.name);
  const phoneNormalized = normalizePhone(data.phone);

  if (!id || !name || phoneNormalized.length < 9) {
    return { success: false, error: "예약 정보를 확인할 수 없습니다." };
  }

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { attendee: true },
    });

    if (
      !reservation ||
      reservation.phoneNormalized !== phoneNormalized ||
      normalizeName(reservation.studentName) !== name
    ) {
      return { success: false, error: "예약 정보를 확인할 수 없습니다." };
    }

    if (reservation.status === "CANCELLED") return { success: true };
    if (reservation.attendee?.status === "ENTERED") {
      return { success: false, error: "이미 입장 완료된 예약은 취소할 수 없습니다." };
    }

    await tx.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    if (reservation.attendee) {
      await tx.attendee.update({
        where: { id: reservation.attendee.id },
        data: { status: "CANCELLED" },
      });
    }

    revalidatePath("/reserve");
    revalidatePath("/reserve/check");
    revalidatePath(`/reserve/${reservation.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/phone-reservations");
    revalidatePath(`/events/${reservation.eventId}`);

    return { success: true };
  });
}

export async function cancelReservations(data: {
  ids: string[];
  name: string;
  phone: string;
}): Promise<ActionResult> {
  const ids = data.ids.map(cleanText).filter(Boolean);
  const name = normalizeName(data.name);
  const phoneNormalized = normalizePhone(data.phone);

  if (!ids.length || !name || phoneNormalized.length < 9) {
    return { success: false, error: "예약 정보를 확인할 수 없습니다." };
  }

  return prisma.$transaction(async (tx) => {
    const reservations = await tx.reservation.findMany({
      where: { id: { in: ids }, phoneNormalized },
      include: { attendee: true },
    });

    const cancellable = reservations.filter((reservation) => {
      return (
        normalizeName(reservation.studentName) === name &&
        reservation.status === "RESERVED" &&
        reservation.attendee?.status !== "ENTERED"
      );
    });

    if (!cancellable.length) {
      return { success: false, error: "취소 가능한 예약이 없습니다." };
    }

    const cancelledAt = new Date();
    await tx.reservation.updateMany({
      where: { id: { in: cancellable.map((reservation) => reservation.id) } },
      data: { status: "CANCELLED", cancelledAt },
    });
    await tx.attendee.updateMany({
      where: {
        reservationId: { in: cancellable.map((reservation) => reservation.id) },
        status: { not: "ENTERED" },
      },
      data: { status: "CANCELLED" },
    });

    const eventIds = new Set(cancellable.map((reservation) => reservation.eventId));
    revalidatePath("/reserve");
    revalidatePath("/reserve/check");
    for (const reservation of cancellable) revalidatePath(`/reserve/${reservation.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/phone-reservations");
    for (const eventId of eventIds) revalidatePath(`/events/${eventId}`);

    return { success: true };
  });
}

export async function adminCancelReservation(data: {
  id: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const id = cleanText(data.id);
  if (!id) {
    return { success: false, error: "예약 정보를 확인할 수 없습니다." };
  }

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id },
      include: { attendee: true },
    });

    if (!reservation) {
      return { success: false, error: "예약 정보를 확인할 수 없습니다." };
    }
    if (reservation.status === "CANCELLED") return { success: true };
    if (reservation.attendee?.status === "ENTERED") {
      return { success: false, error: "이미 입장 완료된 예약은 취소할 수 없습니다." };
    }

    const cancelledAt = new Date();
    await tx.reservation.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt,
      },
    });

    if (reservation.attendee) {
      await tx.attendee.update({
        where: { id: reservation.attendee.id },
        data: { status: "CANCELLED" },
      });
    }

    revalidatePath("/reserve");
    revalidatePath("/reserve/check");
    revalidatePath(`/reserve/${reservation.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/phone-reservations");
    revalidatePath(`/events/${reservation.eventId}`);

    return { success: true };
  });
}

export async function getReservationDetail(
  reservationId: string
): Promise<ActionResult<StoredReservation>> {
  const id = cleanText(reservationId);
  if (!id) return { success: false, error: "예약 정보를 확인할 수 없습니다." };

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      event: true,
      attendee: {
        select: { qrToken: true, qrUrl: true },
      },
    },
  });

  if (!reservation) {
    return { success: false, error: "예약 정보를 찾을 수 없습니다." };
  }

  return {
    success: true,
    data: toStoredReservation(reservation),
  };
}
