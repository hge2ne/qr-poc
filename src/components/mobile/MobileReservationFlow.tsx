"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  MOCK_SESSIONS,
  findStudentByPhone,
  type MockSession,
  type MockStudent,
} from "./mockData";

type Step = 1 | 2 | 3 | 4;
type Path = "enrolled" | "guest";

const STEP_LABELS = ["회차 선택", "재원생 조회", "비재원생 입력", "예약 완료"];

type Completed = {
  session: MockSession;
  path: Path;
  name: string;
  phone: string;
  extra?: string; // 학년/반 또는 학생 이름
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function MobileReservationFlow() {
  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<Path>("enrolled");
  const [session, setSession] = useState<MockSession | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);

  function reset() {
    setStep(1);
    setPath("enrolled");
    setSession(null);
    setCompleted(null);
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* 앱 바 */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          {step > 1 && step < 4 && (
            <button
              onClick={() => setStep((s) => (s === 3 ? 2 : ((s - 1) as Step)))}
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
      {step < 4 && <Stepper current={step} path={path} />}

      {/* 본문 */}
      <div className="flex-1 px-4 py-4">
        {step === 1 && (
          <SelectSessionStep
            selectedId={session?.id}
            onSelect={(s) => {
              setSession(s);
              setPath("enrolled");
              setStep(2);
            }}
          />
        )}

        {step === 2 && session && (
          <EnrolledStep
            session={session}
            onGuest={() => {
              setPath("guest");
              setStep(3);
            }}
            onDone={(student, phone) => {
              setCompleted({
                session,
                path: "enrolled",
                name: student.name,
                phone,
                extra: `${student.grade} · ${student.className}`,
              });
              setStep(4);
            }}
          />
        )}

        {step === 3 && session && (
          <GuestStep
            session={session}
            onDone={(data) => {
              setCompleted({
                session,
                path: "guest",
                name: data.parentName,
                phone: data.phone,
                extra: data.studentName ? `학생 ${data.studentName}` : undefined,
              });
              setStep(4);
            }}
          />
        )}

        {step === 4 && completed && <DoneStep completed={completed} onReset={reset} />}
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
        // enrolled 경로는 3단계(비재원생 입력)를 건너뜀
        const skipped = path === "enrolled" && n === 3;
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

/* ---------- 선택된 회차 요약 ---------- */

function SessionSummary({ session }: { session: MockSession }) {
  return (
    <div className="mb-4 rounded-xl border border-accent bg-accent p-3">
      <p className="text-xs font-medium text-primary/90">{session.round}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{session.title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {formatDate(session.date)} {session.time} · {session.location}
      </p>
    </div>
  );
}

/* ---------- STEP 1: 회차 선택 ---------- */

function SelectSessionStep({
  selectedId,
  onSelect,
}: {
  selectedId?: string;
  onSelect: (s: MockSession) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-foreground">설명회 회차 선택</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        참석하실 회차를 선택해 주세요.
      </p>
      <div className="space-y-3">
        {MOCK_SESSIONS.map((s) => {
          const remaining = s.capacity - s.reserved;
          const full = remaining <= 0;
          const selected = s.id === selectedId;
          return (
            <button
              key={s.id}
              disabled={full}
              onClick={() => onSelect(s)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                full
                  ? "cursor-not-allowed border-border bg-background opacity-60"
                  : selected
                    ? "border-ring bg-accent"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-primary/90">{s.round}</span>
                {full ? (
                  <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    마감
                  </span>
                ) : (
                  <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success/90">
                    잔여 {remaining}석
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-foreground">{s.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(s.date)} {s.time}
              </p>
              <p className="text-xs text-muted-foreground">{s.location}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- STEP 2: 재원생 연락처 조회 ---------- */

function EnrolledStep({
  session,
  onGuest,
  onDone,
}: {
  session: MockSession;
  onGuest: () => void;
  onDone: (student: MockStudent, phone: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<MockStudent | null>(null);

  function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFound(null);
    setLoading(true);
    // 목업 조회 (약간의 지연으로 실제 조회처럼 표현)
    setTimeout(() => {
      const student = findStudentByPhone(phone);
      setLoading(false);
      if (!student) {
        setError("등록된 재원생 정보를 찾을 수 없습니다.");
        return;
      }
      setFound(student);
    }, 400);
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
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-xs text-success">
                ✓
              </span>
              <span className="text-sm font-semibold text-foreground">{found.name}</span>
              <span className="text-xs text-muted-foreground">
                {found.grade} · {found.className}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDone(found, phone)}
              className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              이 정보로 예약하기
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

/* ---------- STEP 3: 비재원생 예약 입력 ---------- */

function GuestStep({
  session,
  onDone,
}: {
  session: MockSession;
  onDone: (data: { parentName: string; phone: string; studentName: string }) => void;
}) {
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const parentName = (form.elements.namedItem("parentName") as HTMLInputElement).value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement).value;
    const studentName = (form.elements.namedItem("studentName") as HTMLInputElement).value;
    // 목업 제출 (지연 후 완료)
    setTimeout(() => {
      setLoading(false);
      onDone({ parentName, phone, studentName });
    }, 400);
  }

  return (
    <div>
      <SessionSummary session={session} />
      <h2 className="text-lg font-bold text-foreground">비재원생 예약</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        예약자 정보를 입력해 주세요.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">학부모 이름 *</label>
          <input
            name="parentName"
            type="text"
            required
            placeholder="홍길동"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            학생 이름 <span className="font-normal text-muted-foreground">(선택)</span>
          </label>
          <input
            name="studentName"
            type="text"
            placeholder="자녀 이름"
            className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
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

/* ---------- STEP 4: 예약 완료 ---------- */

function DoneStep({ completed, onReset }: { completed: Completed; onReset: () => void }) {
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
        <SummaryRow label="회차" value={`${session.round} · ${session.title}`} />
        <SummaryRow label="일시" value={`${formatDate(session.date)} ${session.time}`} />
        <SummaryRow label="장소" value={session.location} />
        <SummaryRow
          label="예약자"
          value={
            completed.extra ? `${completed.name} (${completed.extra})` : completed.name
          }
        />
        <SummaryRow label="연락처" value={completed.phone} />
        <SummaryRow
          label="구분"
          value={completed.path === "enrolled" ? "재원생" : "비재원생"}
        />
      </div>

      <button
        onClick={onReset}
        className="mt-6 w-full rounded-lg border border-input py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
      >
        처음으로
      </button>
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
