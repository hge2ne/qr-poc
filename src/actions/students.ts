"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";

export type StudentRosterItem = {
  id: string;
  name: string;
  school: string;
  grade: string;
  className: string;
  parentPhone: string;
};

export type CreateStudentInput = {
  name: string;
  school: string;
  grade: string;
  className: string;
  parentPhone: string;
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

export async function getStudentRoster(): Promise<ActionResult<StudentRosterItem[]>> {
  await requireAdmin();

  const students = await prisma.student.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      className: true,
      parentPhone: true,
    },
    orderBy: [{ school: "asc" }, { grade: "asc" }, { name: "asc" }],
  });

  return {
    success: true,
    data: students.map((student) => ({
      ...student,
      parentPhone: formatPhoneNumber(student.parentPhone),
    })),
  };
}

export async function createStudent(
  input: CreateStudentInput
): Promise<ActionResult<StudentRosterItem>> {
  await requireAdmin();

  const name = cleanText(input.name);
  const school = cleanText(input.school);
  const grade = cleanText(input.grade);
  const className = cleanText(input.className);
  const parentPhoneNormalized = normalizePhoneNumber(input.parentPhone);

  if (!name || !school || !grade || !className || !parentPhoneNormalized) {
    return { success: false, error: "학생 정보를 모두 입력해 주세요." };
  }

  if (parentPhoneNormalized.length < 9) {
    return { success: false, error: "학부모 연락처를 정확히 입력해 주세요." };
  }

  const duplicate = await prisma.student.findFirst({
    where: {
      name,
      parentPhoneNormalized,
      isActive: true,
    },
    select: { id: true },
  });

  if (duplicate) {
    return { success: false, error: "이미 등록된 학생과 학부모 연락처입니다." };
  }

  const student = await prisma.student.create({
    data: {
      name,
      school,
      grade,
      className,
      parentPhone: formatPhoneNumber(parentPhoneNormalized),
      parentPhoneNormalized,
      campus: "송파캠퍼스",
    },
    select: {
      id: true,
      name: true,
      school: true,
      grade: true,
      className: true,
      parentPhone: true,
    },
  });

  revalidatePath("/students");
  revalidatePath("/dashboard");
  revalidatePath("/scanner");

  return {
    success: true,
    data: {
      ...student,
      parentPhone: formatPhoneNumber(student.parentPhone),
    },
  };
}
