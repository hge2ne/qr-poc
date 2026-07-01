"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createReservation, lookupStudentByPhone } from "@/actions/reservations";
import type {
  ReservationInput,
  ReservationSession,
  ReservationStudent,
} from "@/actions/reservationTypes";
import type { ActionResult } from "@/actions/types";
import { Logo } from "@/components/Logo";
import {
  CAMPUSES,
  DEFAULT_ATTENDEE_COUNT_OPTIONS,
  type Campus,
} from "./mockData";
import { ReservationLookup } from "./ReservationLookup";

type Step = 1 | 2 | 3 | 4 | 5;
type Path = "enrolled" | "guest";

const STEP_LABELS = ["캠퍼스 선택", "설명회 선택", "재원생 조회", "비재원생 입력", "예약 완료"];

type Completed = {
  session: ReservationSession;
  path: Path;
  name: string;
  phone: string;
  extra?: string; // 재원생 학년/반 또는 기존 목업 호환 표시값
  school?: string;
  grade?: string;
  attendeeCount?: number;
};

type MobileReservationFlowProps = {
  initialSessions: ReservationSession[];
  initialError?: string;
  embeddedCheck?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function getAttendeeCountOptions(session: ReservationSession) {
  return session.attendeeCountOptions?.length
    ? session.attendeeCountOptions
    : DEFAULT_ATTENDEE_COUNT_OPTIONS;
}

export function MobileReservationFlow({
  initialSessions,
  initialError = "",
  embeddedCheck = false,
}: MobileReservationFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<Path>("enrolled");
  const [campus, setCampus] = useState<Campus | null>(null);
  const [session, setSession] = useState<ReservationSession | null>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [showCheck, setShowCheck] = useState(false);
  const campusSessions = useMemo(
    () => (campus ? sessions.filter((item) => item.campus === campus) : []),
    [campus, sessions],
  );

  function reset() {
    setStep(1);
    setPath("enrolled");
    setCampus(null);
    setSession(null);
    setCompleted(null);
  }

  function openReservationCheck() {
    if (embeddedCheck) setShowCheck(true);
  }

  function returnToReservationFlow() {
    reset();
    setShowCheck(false);
  }

  async function completeReservation(input: ReservationInput): Promise<ActionResult<Completed>> {
    const result = await createReservation(input);
    if (!result.success || !result.data) {
      return { success: false, error: result.error ?? "예약에 실패했습니다." };
    }

    const { reservation, session: updatedSession } = result.data;
    const nextCompleted: Completed = {
      session: updatedSession,
      path: reservation.path,
      name: reservation.name,
      phone: reservation.phone,
      extra: reservation.extra,
      school: reservation.school,
      grade: reservation.grade,
      attendeeCount: reservation.attendeeCount,
    };

    setSessions((current) =>
      current.map((item) => (item.id === updatedSession.id ? updatedSession : item)),
    );
    setSession(updatedSession);
    setCompleted(nextCompleted);
    setStep(5);
    return { success: true, data: nextCompleted };
  }

  function goBack() {
    setStep((current) => {
      if (current === 2) {
        setCampus(null);
        setSession(null);
        return 1;
      }
      if (current === 3) {
        setSession(null);
        setPath("enrolled");
        return 2;
      }
      if (current === 4) {
        setPath("enrolled");
        return 3;
      }
      return current;
    });
  }

  if (showCheck) {
    return <ReservationLookup onBackToReserve={returnToReservationFlow} />;
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* 앱 바 */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          {step > 1 && step < 5 && (
            <button
              onClick={goBack}
              className="-ml-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
              aria-label="뒤로"
            >
              ‹
            </button>
          )}
          <Logo className="text-xl" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground">설명회 예약</span>
      </header>

      {/* 진행 표시 */}
      {step < 5 && <Stepper current={step} path={path} />}

      {/* 본문 */}
      <div className="flex-1 px-4 py-4">
        {initialError && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {initialError}
          </p>
        )}

        {step === 1 && (
          <CampusStep
            selected={campus}
            onSelect={(nextCampus) => {
              setCampus(nextCampus);
              setSession(null);
              setPath("enrolled");
              setStep(2);
            }}
          />
        )}

        {step === 2 && campus && (
          <SelectSessionStep
            campus={campus}
            sessions={campusSessions}
            selectedId={session?.id}
            onOpenCheck={embeddedCheck ? openReservationCheck : undefined}
            onSelect={(s) => {
              setSession(s);
              setPath("enrolled");
              setStep(3);
            }}
          />
        )}

        {step === 3 && session && (
          <EnrolledStep
            session={session}
            onGuest={() => {
              setPath("guest");
              setStep(4);
            }}
            onDone={(student, phone, attendeeCount) => {
              return completeReservation({
                eventId: session.id,
                path: "enrolled",
                name: student.name,
                phone,
                school: student.school,
                grade: student.grade,
                className: student.className,
                attendeeCount,
              });
            }}
          />
        )}

        {step === 4 && session && (
          <GuestStep
            session={session}
            onDone={(data) => {
              return completeReservation({
                eventId: session.id,
                path: "guest",
                name: data.studentName,
                phone: data.phone,
                school: data.school,
                grade: data.grade,
                attendeeCount: data.attendeeCount,
              });
            }}
          />
        )}

        {step === 5 && completed && (
          <DoneStep
            completed={completed}
            onOpenCheck={embeddedCheck ? openReservationCheck : undefined}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- 진행 표시 ---------- */

function Stepper({ current, path }: { current: Step; path: Path }) {
  return (
    <div className="flex items-center gap-1 bg-card px-4 pb-3">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        // enrolled 경로는 비재원생 입력 단계를 건너뜀
        const skipped = path === "enrolled" && n === 4;
        const done = n < current && !skipped;
        const active = n === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                active
                  ? "bg-primary text-white"
                  : done
                    ? "bg-success/15 text-success/90"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <span
              className={`text-[10px] leading-tight ${
                active ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 선택된 설명회 요약 ---------- */

function SessionSummary({ session }: { session: ReservationSession }) {
  return (
    <div className="mb-4 rounded-xl border border-accent bg-accent p-3">
      <p className="text-xs font-medium text-primary/90">{session.campus}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{session.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDate(session.date)} {session.time} · {session.location}
      </p>
    </div>
  );
}

/* ---------- STEP 1: 캠퍼스 선택 ---------- */

function CampusStep({
  selected,
  onSelect,
}: {
  selected: Campus | null;
  onSelect: (campus: Campus) => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">캠퍼스 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          예약하실 캠퍼스를 선택해 주세요.
        </p>
      </div>

      <div className="space-y-3">
        {CAMPUSES.map((campus) => {
          const active = selected === campus;
          return (
            <button
              key={campus}
              type="button"
              onClick={() => onSelect(campus)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-ring bg-accent"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-sm font-semibold text-foreground">{campus}</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                선택 가능한 설명회를 확인합니다.
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- STEP 2: 설명회 선택 ---------- */

function SelectSessionStep({
  campus,
  sessions,
  selectedId,
  onOpenCheck,
  onSelect,
}: {
  campus: Campus;
  sessions: ReservationSession[];
  selectedId?: string;
  onOpenCheck?: () => void;
  onSelect: (s: ReservationSession) => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-medium text-primary/90">{campus}</p>
        <h2 className="mt-0.5 text-lg font-bold text-foreground">설명회 선택</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          참석하실 설명회를 선택해 주세요.
        </p>
      </div>
      <div className="space-y-3">
        {sessions.length ? sessions.map((s) => {
          const selected = s.id === selectedId;
          const isClosed = s.reservationStatus !== "OPEN";
          const isFull = s.reserved >= s.capacity;
          const disabled = isClosed || isFull;
          return (
            <button
              key={s.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(s)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected
                  ? "border-ring bg-accent"
                  : disabled
                    ? "border-border bg-muted/40 opacity-70"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary/90">{s.campus}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    disabled
                      ? "bg-muted text-muted-foreground"
                      : "bg-success/15 text-success/90"
                  }`}
                >
                  {isFull ? "마감" : isClosed ? "접수중지" : "접수중"}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(s.date)} {s.time}
              </p>
              <p className="text-xs text-muted-foreground">{s.location}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                예약 {s.reserved} / {s.capacity}명
              </p>
              {s.attendeeCountEnabled && (
                <p className="mt-2 text-[11px] font-medium text-primary">
                  참석 인원 입력
                </p>
              )}
            </button>
          );
        }) : (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
            선택 가능한 설명회가 없습니다.
          </div>
        )}
      </div>

      <div className="mt-6 border-t border-muted pt-4">
        {onOpenCheck ? (
          <button
            type="button"
            onClick={onOpenCheck}
            className="w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            예약 조회/취소
          </button>
        ) : (
          <Link
            href="/reserve/check"
            className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            예약 조회/취소
          </Link>
        )}
      </div>
    </div>
  );
}

/* ---------- STEP 3: 재원생 연락처 조회 ---------- */

function EnrolledStep({
  session,
  onGuest,
  onDone,
}: {
  session: ReservationSession;
  onGuest: () => void;
  onDone: (
    student: ReservationStudent,
    phone: string,
    attendeeCount?: number,
  ) => Promise<ActionResult<Completed>>;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [found, setFound] = useState<ReservationStudent | null>(null);
  const attendeeOptions = getAttendeeCountOptions(session);
  const [attendeeCount, setAttendeeCount] = useState(attendeeOptions[0] ?? 1);

  async function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFound(null);
    setLoading(true);
    const result = await lookupStudentByPhone(phone);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error ?? "등록된 재원생 정보를 찾을 수 없습니다.");
      return;
    }
    setFound(result.data);
  }

  async function handleReserve() {
    if (!found) return;
    setError("");
    setReserving(true);
    const result = await onDone(
      found,
      phone,
      session.attendeeCountEnabled ? attendeeCount : undefined,
    );
    setReserving(false);
    if (!result.success) {
      setError(result.error ?? "예약에 실패했습니다.");
    }
  }

  return (
    <div>
      <SessionSummary session={session} />
      <h2 className="text-lg font-bold text-foreground">재원생 연락처 조회</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        학원에 등록된 연락처로 예약자를 확인합니다.
      </p>

      <form onSubmit={handleLookup} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">연락처 *</label>
          <input
            name="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
              setFound(null);
            }}
            placeholder="010-0000-0000"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            예시: 010-1234-5678 (김민준 학부모)
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        {found ? (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4">
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-xs text-success">
                ✓
              </span>
              <div>
                <span className="text-sm font-semibold text-foreground">{found.name}</span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {found.school} · {found.grade} · {found.className}
                </p>
              </div>
            </div>
            {session.attendeeCountEnabled && (
              <AttendeeCountField
                value={attendeeCount}
                options={attendeeOptions}
                onChange={setAttendeeCount}
              />
            )}
            <button
              type="button"
              disabled={reserving}
              onClick={handleReserve}
              className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {reserving ? "예약 중..." : "이 정보로 예약하기"}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "조회 중..." : "연락처 조회"}
          </button>
        )}
      </form>

      <div className="mt-6 border-t border-muted pt-4 text-center">
        <p className="text-xs text-muted-foreground">재원생이 아니신가요?</p>
        <button
          onClick={onGuest}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          비재원생 예약하기 →
        </button>
      </div>
    </div>
  );
}

/* ---------- STEP 4: 비재원생 예약 입력 ---------- */

function GuestStep({
  session,
  onDone,
}: {
  session: ReservationSession;
  onDone: (data: {
    studentName: string;
    school: string;
    grade: string;
    phone: string;
    attendeeCount?: number;
  }) => Promise<ActionResult<Completed>>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const attendeeOptions = getAttendeeCountOptions(session);
  const [attendeeCount, setAttendeeCount] = useState(attendeeOptions[0] ?? 1);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const studentName = (form.elements.namedItem("studentName") as HTMLInputElement).value;
    const school = (form.elements.namedItem("school") as HTMLInputElement).value;
    const grade = (form.elements.namedItem("grade") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
    const result = await onDone({
      studentName,
      school,
      grade,
      phone,
      attendeeCount: session.attendeeCountEnabled ? attendeeCount : undefined,
    });
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "예약에 실패했습니다.");
    }
  }

  return (
    <div>
      <SessionSummary session={session} />
      <h2 className="text-lg font-bold text-foreground">비재원생 예약</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        학생 정보를 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">학생 이름 *</label>
          <input
            name="studentName"
            type="text"
            required
            placeholder="홍길동"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">학교 *</label>
            <input
              name="school"
              type="text"
              required
              placeholder="예: 방산중"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">학년 *</label>
            <input
              name="grade"
              type="text"
              required
              placeholder="예: 중3"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">연락처 *</label>
          <input
            name="phone"
            type="tel"
            required
            placeholder="010-0000-0000"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {session.attendeeCountEnabled && (
          <AttendeeCountField
            value={attendeeCount}
            options={attendeeOptions}
            onChange={setAttendeeCount}
          />
        )}
        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "예약 중..." : "예약 완료하기"}
        </button>
      </form>
    </div>
  );
}

function AttendeeCountField({
  value,
  options,
  onChange,
}: {
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="mt-3">
      <label className="mb-1 block text-sm font-medium text-foreground">참석 인원 *</label>
      <select
        name="attendeeCount"
        required
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}명
          </option>
        ))}
      </select>
    </div>
  );
}

/* ---------- STEP 5: 예약 완료 ---------- */

function DoneStep({
  completed,
  onOpenCheck,
  onReset,
}: {
  completed: Completed;
  onOpenCheck?: () => void;
  onReset: () => void;
}) {
  const { session } = completed;
  return (
    <div className="flex flex-col items-center pt-6 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
        <span className="text-2xl text-success">✓</span>
      </div>
      <h2 className="text-lg font-bold text-foreground">예약이 완료되었습니다</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        입장 안내는 문자로 전송됩니다.
      </p>

      <div className="mt-6 w-full space-y-2 rounded-xl border border-border bg-card p-4 text-left">
        <SummaryRow label="설명회" value={session.title} />
        <SummaryRow label="일시" value={`${formatDate(session.date)} ${session.time}`} />
        <SummaryRow label="캠퍼스" value={session.campus} />
        <SummaryRow label="장소" value={session.location} />
        <SummaryRow
          label="예약자"
          value={
            completed.path === "enrolled" && completed.extra
              ? `${completed.name} (${completed.extra})`
              : completed.name
          }
        />
        {completed.school && <SummaryRow label="학교" value={completed.school} />}
        {completed.grade && <SummaryRow label="학년" value={completed.grade} />}
        <SummaryRow label="연락처" value={completed.phone} />
        {completed.attendeeCount && (
          <SummaryRow label="참석 인원" value={`${completed.attendeeCount}명`} />
        )}
        <SummaryRow
          label="구분"
          value={completed.path === "enrolled" ? "재원생" : "비재원생"}
        />
      </div>

      <div className="mt-6 grid w-full gap-2">
        <button
          onClick={onReset}
          className="w-full rounded-lg border border-input py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
        >
          처음으로
        </button>
        {onOpenCheck ? (
          <button
            type="button"
            onClick={onOpenCheck}
            className="w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            예약 조회/취소
          </button>
        ) : (
          <Link
            href="/reserve/check"
            className="w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            예약 조회/취소
          </Link>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
