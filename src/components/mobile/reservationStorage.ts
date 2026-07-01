import {
  DEFAULT_ATTENDEE_COUNT_OPTIONS,
  MOCK_SESSIONS,
  normalizePhone,
  type Campus,
  type MockSession,
} from "./mockData";

export type ReservationPath = "enrolled" | "guest";
export type ReservationStatus = "reserved" | "cancelled";

export type StoredReservation = {
  id: string;
  session: Pick<MockSession, "id" | "campus" | "round" | "title" | "date" | "time" | "location">;
  path: ReservationPath;
  name: string;
  phone: string;
  extra?: string;
  school?: string;
  grade?: string;
  attendeeCount?: number;
  status: ReservationStatus;
  createdAt: string;
  cancelledAt?: string;
};

export type ReservationInput = {
  session: MockSession;
  path: ReservationPath;
  name: string;
  phone: string;
  extra?: string;
  school?: string;
  grade?: string;
  attendeeCount?: number;
};

type CreatedSessionInput = {
  id: string;
  campus?: Campus;
  title: string;
  dateTime: string;
  location: string;
  attendeeCountEnabled: boolean;
  attendeeCountOptions?: number[];
};

const CUSTOM_SESSIONS_KEY = "qr-poc.customSessions";
const RESERVATIONS_KEY = "qr-poc.reservations";
const CUSTOM_SESSIONS_EVENT = "qr-poc.customSessionsChanged";
const DEFAULT_CAMPUS: Campus = "송파캠퍼스";

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return parseJson(raw, fallback);
  } catch {
    return fallback;
  }
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(name: string) {
  return name.replace(/\s/g, "").toLowerCase();
}

function getDateParts(dateTime: string) {
  const [date = "", timeWithSeconds = ""] = dateTime.split("T");
  return {
    date,
    time: timeWithSeconds.slice(0, 5) || "00:00",
  };
}

export function getCustomSessions(): MockSession[] {
  return readJson<MockSession[]>(CUSTOM_SESSIONS_KEY, []);
}

function mergeSessions(customSessions: MockSession[]) {
  const seen = new Set<string>();
  return [...customSessions, ...MOCK_SESSIONS].map(normalizeSession).filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}

function normalizeSession(session: MockSession): MockSession {
  return {
    ...session,
    campus: session.campus ?? DEFAULT_CAMPUS,
  };
}

export function getReservationSessions(): MockSession[] {
  return mergeSessions(getCustomSessions());
}

export function getReservationSessionsSnapshot() {
  if (!hasStorage()) return "";
  return window.localStorage.getItem(CUSTOM_SESSIONS_KEY) ?? "";
}

export function getReservationSessionsServerSnapshot() {
  return "";
}

export function getReservationSessionsFromSnapshot(snapshot: string): MockSession[] {
  return mergeSessions(parseJson<MockSession[]>(snapshot, []));
}

export function subscribeReservationSessions(onStoreChange: () => void) {
  if (!hasStorage()) return () => {};

  function handleStorage(event: StorageEvent) {
    if (event.key === CUSTOM_SESSIONS_KEY) onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CUSTOM_SESSIONS_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CUSTOM_SESSIONS_EVENT, onStoreChange);
  };
}

export function saveCreatedEventSession(input: CreatedSessionInput) {
  const { date, time } = getDateParts(input.dateTime);
  const session: MockSession = {
    id: input.id,
    campus: input.campus ?? DEFAULT_CAMPUS,
    round: "신규 회차",
    title: input.title,
    date,
    time,
    location: input.location,
    capacity: 9999,
    reserved: 0,
    attendeeCountEnabled: input.attendeeCountEnabled,
    attendeeCountOptions: input.attendeeCountEnabled
      ? (input.attendeeCountOptions ?? DEFAULT_ATTENDEE_COUNT_OPTIONS)
      : undefined,
    createdAt: new Date().toISOString(),
  };

  const current = getCustomSessions().filter((item) => item.id !== session.id);
  writeJson(CUSTOM_SESSIONS_KEY, [session, ...current]);
  if (hasStorage()) window.dispatchEvent(new Event(CUSTOM_SESSIONS_EVENT));
  return session;
}

export function getStoredReservations(): StoredReservation[] {
  return readJson<StoredReservation[]>(RESERVATIONS_KEY, []);
}

export function addReservation(input: ReservationInput): StoredReservation {
  const reservation: StoredReservation = {
    id: createId("reservation"),
    session: {
      id: input.session.id,
      campus: input.session.campus ?? DEFAULT_CAMPUS,
      round: input.session.round,
      title: input.session.title,
      date: input.session.date,
      time: input.session.time,
      location: input.session.location,
    },
    path: input.path,
    name: input.name,
    phone: input.phone,
    extra: input.extra,
    school: input.school,
    grade: input.grade,
    attendeeCount: input.attendeeCount,
    status: "reserved",
    createdAt: new Date().toISOString(),
  };

  writeJson(RESERVATIONS_KEY, [reservation, ...getStoredReservations()]);
  return reservation;
}

export function findReservationsByContact(data: {
  name: string;
  phone: string;
}): StoredReservation[] {
  const name = normalizeName(data.name);
  const phone = normalizePhone(data.phone);

  if (!name || phone.length < 9) return [];

  return getStoredReservations().filter((reservation) => {
    return normalizeName(reservation.name) === name && normalizePhone(reservation.phone) === phone;
  });
}

export function cancelReservation(id: string): StoredReservation[] {
  const updated = getStoredReservations().map((reservation) => {
    if (reservation.id !== id || reservation.status === "cancelled") return reservation;
    return {
      ...reservation,
      status: "cancelled" as const,
      cancelledAt: new Date().toISOString(),
    };
  });

  writeJson(RESERVATIONS_KEY, updated);
  return updated;
}

export function cancelReservations(ids: string[]): StoredReservation[] {
  const targetIds = new Set(ids);
  const cancelledAt = new Date().toISOString();
  const updated = getStoredReservations().map((reservation) => {
    if (!targetIds.has(reservation.id) || reservation.status === "cancelled") return reservation;
    return {
      ...reservation,
      status: "cancelled" as const,
      cancelledAt,
    };
  });

  writeJson(RESERVATIONS_KEY, updated);
  return updated;
}
