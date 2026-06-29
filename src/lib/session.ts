import { cookies } from "next/headers";

export type SessionData = {
  userId: string;
  name: string;
  role: "ADMIN" | "PARENT";
};

const COOKIE_NAME = "qr_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (!cookie?.value) return null;
  try {
    return JSON.parse(Buffer.from(cookie.value, "base64").toString("utf-8")) as SessionData;
  } catch {
    return null;
  }
}

export async function setSession(data: SessionData): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(data)).toString("base64");
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: true,
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
  });
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
