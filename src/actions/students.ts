"use server";

import { prisma } from "@/lib/prisma";
import { formatPhoneNumber } from "@/lib/phone";
import { getSession } from "@/lib/session";
import type { ActionResult } from "./types";

export type StudentRosterItem = {
  id: string;
  name: string;
  school: string;
  grade: string;
  parentPhone: string;
};

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("관리자 권한이 필요합니다.");
  }
  return session;
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
