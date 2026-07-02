"use client";

import { createPhoneReservation, lookupStudentByParentPhone } from "@/actions/reservations";
import type { ReservationStudent, SmsDeliveryStatus } from "@/actions/reservationTypes";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import { StudentLookupResultList } from "@/components/StudentLookupResultList";
import { GRADE_OPTIONS } from "@/lib/grades";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import { useState } from "react";

type ReservationPath = "enrolled" | "guest";

type CreatedResult = {
  name: string;
  qrUrl?: string;
  smsStatus?: SmsDeliveryStatus;
};

type PhoneManualReservationFormProps = {
  eventId: string;
  returnHref: string;
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
        onChange={(event) => onChange(Number(event.target.value))}
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

export function PhoneManualReservationForm({
  eventId,
  returnHref,
  attendeeCountEnabled,
  attendeeCountOptions,
}: PhoneManualReservationFormProps) {
  const countOptions = attendeeCountOptions.length ? attendeeCountOptions : [1];
  const [reservationPath, setReservationPath] = useState<ReservationPath>("enrolled");
  const [enrolledPhone, setEnrolledPhone] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [attendeeCount, setAttendeeCount] = useState(countOptions[0] ?? 1);
  const [foundStudents, setFoundStudents] = useState<ReservationStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedResult | null>(null);
  const selectedStudent =
    foundStudents.find((student) => student.id === selectedStudentId) ?? null;

  function getSmsNotice(status?: SmsDeliveryStatus) {
    if (status === "sent") return "예약 완료 문자를 학부모 연락처로 발송했습니다.";
    if (status === "failed") return "예약은 완료됐지만 문자 발송에 실패했습니다.";
    return "문자 발송 설정이 완료되면 학부모 연락처로 예약 안내가 발송됩니다.";
  }

  function selectPath(nextPath: ReservationPath) {
    setReservationPath(nextPath);
    setError("");
    setFoundStudents([]);
    setSelectedStudentId("");
  }

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFoundStudents([]);
    setSelectedStudentId("");
    setLoading(true);

    try {
      const result = await lookupStudentByParentPhone(enrolledPhone);
      if (!result.success || !result.data?.length) {
        setError(result.error ?? "등록된 재원생 정보를 찾을 수 없습니다.");
        return;
      }
      setFoundStudents(result.data);
      setSelectedStudentId(result.data[0]?.id ?? "");
    } catch {
      setError("재원생 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrolledSubmit() {
    if (!selectedStudent) return;
    setError("");
    setSubmitting(true);

    try {
      const result = await createPhoneReservation({
        eventId,
        path: "enrolled",
        studentId: selectedStudent.id,
        name: selectedStudent.name,
        phone: selectedStudent.parentPhone,
        school: selectedStudent.school,
        grade: selectedStudent.grade,
        className: selectedStudent.className,
        attendeeCount: attendeeCountEnabled ? attendeeCount : undefined,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "예약에 실패했습니다.");
        return;
      }
      setCreated({
        name: selectedStudent.name,
        qrUrl: result.data.reservation.qrUrl,
        smsStatus: result.data.smsStatus,
      });
    } catch {
      setError("예약에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGuestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = (form.elements.namedItem("studentName") as HTMLInputElement).value;
    const school = (form.elements.namedItem("school") as HTMLInputElement).value;
    const grade = (form.elements.namedItem("grade") as HTMLSelectElement).value;

    setError("");
    setSubmitting(true);

    try {
      const result = await createPhoneReservation({
        eventId,
        path: "guest",
        name,
        phone: guestPhone,
        school,
        grade,
        attendeeCount: attendeeCountEnabled ? attendeeCount : undefined,
      });

      if (!result.success || !result.data) {
        setError(result.error ?? "예약에 실패했습니다.");
        return;
      }
      setCreated({
        name,
        qrUrl: result.data.reservation.qrUrl,
        smsStatus: result.data.smsStatus,
      });
    } catch {
      setError("예약에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
          <span className="text-xl text-success">✓</span>
        </div>
        <h2 className="mb-1 text-lg font-bold text-foreground">{created.name} 님 예약 완료</h2>
        <p className="mb-6 text-sm text-muted-foreground">{getSmsNotice(created.smsStatus)}</p>
        {created.qrUrl && (
          <QRCodeDisplay value={created.qrUrl} size={220} downloadName={`${created.name}_QR`} />
        )}
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCreated(null);
              setFoundStudents([]);
              setSelectedStudentId("");
              setEnrolledPhone("");
              setGuestPhone("");
              setError("");
            }}
            className="flex-1 rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            다음 수동예약
          </button>
          <Link
            href={returnHref}
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
    <div className="rounded-xl border border-border bg-card p-6">
      <h1 className="mb-2 text-xl font-bold text-foreground">수동예약 등록</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        재원 여부를 선택하면 해당 상황에 맞는 입력 폼이 열립니다.
      </p>

      <div className="mb-5 flex gap-2 rounded-xl bg-background p-1">
        <button
          type="button"
          onClick={() => selectPath("enrolled")}
          className={`${pathButtonBase} ${reservationPath === "enrolled" ? selectedPath : unselectedPath}`}
        >
          재원생
        </button>
        <button
          type="button"
          onClick={() => selectPath("guest")}
          className={`${pathButtonBase} ${reservationPath === "guest" ? selectedPath : unselectedPath}`}
        >
          비재원생
        </button>
      </div>

      {reservationPath === "enrolled" ? (
        <form key="enrolled" onSubmit={handleLookup} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              학부모 연락처 *
            </label>
            <input
              name="phone"
              type="tel"
              required
              value={enrolledPhone}
              onChange={(event) => {
                setEnrolledPhone(formatPhoneNumber(event.target.value));
                setError("");
                setFoundStudents([]);
                setSelectedStudentId("");
              }}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {foundStudents.length > 0 ? (
            <div>
              <StudentLookupResultList
                students={foundStudents}
                selectedStudentId={selectedStudentId}
                onSelect={setSelectedStudentId}
              />
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
                disabled={submitting || !selectedStudent}
                onClick={handleEnrolledSubmit}
                className="mt-3 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "예약 중..." : "선택한 학생으로 예약하기"}
              </button>
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "조회 중..." : "학부모 연락처 조회"}
            </button>
          )}
        </form>
      ) : (
        <form key="guest" onSubmit={handleGuestSubmit} className="space-y-4">
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
            <label className="mb-1 block text-sm font-medium text-foreground">
              예약자 연락처 *
            </label>
            <input
              name="phone"
              type="tel"
              required
              value={guestPhone}
              onChange={(event) => {
                setGuestPhone(formatPhoneNumber(event.target.value));
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
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? "예약 중..." : "예약 및 QR 생성"}
          </button>
        </form>
      )}
    </div>
  );
}
