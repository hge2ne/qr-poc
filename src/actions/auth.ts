"use server";

import { prisma } from "@/lib/prisma";
import { clearSession, getSession, setSession } from "@/lib/session";
import { redirect } from "next/navigation";
import type { ActionResult } from "./types";

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<ActionResult<{ role: string }>> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "이미 사용 중인 이메일입니다." };
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? ("ADMIN" as const) : ("PARENT" as const);

  const user = await prisma.user.create({
    data: { name, email, password, role },
  });

  await setSession({ userId: user.id, name: user.name, role: user.role });
  return { success: true, data: { role: user.role } };
}

export async function login(
  email: string,
  password: string
): Promise<ActionResult<{ role: string }>> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password) {
    return { success: false, error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  await setSession({ userId: user.id, name: user.name, role: user.role });
  return { success: true, data: { role: user.role } };
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/auth/login");
}

export { getSession };
