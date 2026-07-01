"use client";

import { createAttendee } from "@/actions/attendees";
import { lookupStudentByPhone } from "@/actions/reservations";
import type { ReservationStudent } from "@/actions/reservationTypes";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { GRADE_OPTIONS } from "@/lib/grades";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import { useState } from "react";

type RegistrationPath = "enrolled" | "guest";

type CreatedResult = {
  id: string;
  qrToken: string;
  qrUrl: string;
  name: string;
};

type AttendeeRegistrationFormProps = {
  eventId: string;
  attendeeCountEnabled: boolean;
  attendeeCountOptions: number[];
};

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
    <div>
      <label className="mb-1 block text-sm font-medium text-foreground">참석 인원 *</label>
      <select
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

export function AttendeeRegistrationForm({
  eventId,
  attendeeCountEnabled,
  attendeeCountOptions,
}: AttendeeRegistrationFormProps) {
  const countOptions = attendeeCountOptions.length ? attendeeCountOptions : [1];
  const [registrationPath, setRegistrationPath] = useState<RegistrationPath>("enrolled");
  const [enrolledPhone, setEnrolledPhone] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(countOptions[0] ?? 1);
  const [found, setFound] = useState<ReservationStudent | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);

  function selectPath(nextPath: RegistrationPath) {
    setRegistrationPath(nextPath);
    setError("");
    setFound(null);
  }

  async function handleLookup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setFound(null);
    setLoading(true);
    const result = await lookupStudentByPhone(enrolledPhone);
    setLoading(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "등록된 재원생 정보를 찾을 수 없습니다.");
      return;
    }
    setFound(result.data);
  }

  async function handleEnrolledSubmit() {
    if (!found) return;
    setError("");
    setSubmitting(true);
    const result = await createAttendee({
      eventId,
      name: found.name,
      phone: enrolledPhone,
      path: "ENROLLED",
      school: found.school,
      grade: found.grade,
      className: found.className,
      attendeeCount: attendeeCountEnabled ? attendeeCount : undefined,
    });
    setSubmitting(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "등록에 실패했습니다.");
      return;
    }
    setCreated({ ...result.data, name: found.name });
  }

  async function handleGuestSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("studentName") as HTMLInputElement).value;
    const school = (form.elements.namedItem("school") as HTMLInputElement).value;
    const grade = (form.elements.namedItem("grade") as HTMLSelectElement).value;

    setError("");
    setSubmitting(true);
    const result = await createAttendee({
      eventId,
      name,
      phone: guestPhone,
      path: "GUEST",
      school,
      grade,
      attendeeCount: attendeeCountEnabled ? attendeeCount : undefined,
    });
    setSubmitting(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "등록에 실패했습니다.");
      return;
    }
    setCreated({ ...result.data, name });
  }

  if (created) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15 mb-4">
          <span className="text-xl text-success">✓</span>
        </div>
        <h2 className="mb-1 text-lg font-bold text-foreground">{created.name} 님 등록 완료</h2>
        <p className="mb-6 text-sm text-muted-foreground">QR 코드를 다운로드하여 학부모에게 전달하세요</p>
        <QRCodeDisplay value={created.qrUrl} size={220} downloadName={`${created.name}_QR`} />
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setFound(null);
              setEnrolledPhone("");
              setGuestPhone("");
              setError("");
            }}
            className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            다음 참석자 등록
          </button>
          <Link
            href={`/events/${eventId}`}
            className="flex-1 rounded-lg border border-input py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const pathButtonBase =
    "flex-1 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors";
  const selectedPath = "border-primary bg-primary text-white";
  const unselectedPath = "border-input bg-card text-muted-foreground hover:bg-background";

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h1 className="mb-2 text-xl font-bold text-foreground">참석자 등록</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        재원 여부를 선택하면 해당 상황에 맞는 입력 폼이 열립니다.
      </p>

      <div className="mb-5 flex gap-2 rounded-xl bg-background p-1">
        <button
          type="button"
          onClick={() => selectPath("enrolled")}
          className={`${pathButtonBase} ${registrationPath === "enrolled" ? selectedPath : unselectedPath}`}
        >
          재원생
        </button>
        <button
          type="button"
          onClick={() => selectPath("guest")}
          className={`${pathButtonBase} ${registrationPath === "guest" ? selectedPath : unselectedPath}`}
        >
          비재원생
        </button>
      </div>

      {registrationPath === "enrolled" ? (
        <form onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">연락처 *</label>
            <input
              name="phone"
              type="tel"
              required
              value={enrolledPhone}
              onChange={(e) => {
                setEnrolledPhone(formatPhoneNumber(e.target.value));
                setError("");
                setFound(null);
              }}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
              {attendeeCountEnabled && (
                <div className="mt-3">
                  <AttendeeCountField
                    value={attendeeCount}
                    options={countOptions}
                    onChange={setAttendeeCount}
                  />
                </div>
              )}
              <button
                type="button"
                disabled={submitting}
                onClick={handleEnrolledSubmit}
                className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "등록 중..." : "이 정보로 등록하기"}
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
      ) : (
        <form onSubmit={handleGuestSubmit} className="space-y-4">
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
              <select
                name="grade"
                required
                defaultValue=""
                className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="" disabled>
                  학년 선택
                </option>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">연락처 *</label>
            <input
              name="phone"
              type="tel"
              required
              value={guestPhone}
              onChange={(e) => {
                setGuestPhone(formatPhoneNumber(e.target.value));
                setError("");
              }}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {attendeeCountEnabled && (
            <AttendeeCountField
              value={attendeeCount}
              options={countOptions}
              onChange={setAttendeeCount}
            />
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "등록 및 QR 생성"}
          </button>
        </form>
      )}
    </div>
  );
}
