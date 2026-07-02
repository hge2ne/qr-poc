"use client";

import {
  enterReservedReservationFromScanner,
  enterUnreservedStudentFromScanner,
  getScannerEntryEvents,
  searchScannerStudentsByPhoneLast4,
} from "@/actions/scanner";
import type {
  ScannerEntryEvent,
  ScannerEntryResult,
  ScannerLookupStudent,
} from "@/actions/scannerTypes";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { useEffect, useMemo, useState } from "react";

type ScannerManualEntryProps = {
  onEntryComplete?: (result: ScannerEntryResult) => void;
};

const DIGIT_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function formatEventDate(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(event: { campus: string; round: string | null; location: string }) {
  return [event.campus, event.round, event.location].filter(Boolean).join(" · ");
}

export function ScannerManualEntry({ onEntryComplete }: ScannerManualEntryProps) {
  const [last4, setLast4] = useState("");
  const [students, setStudents] = useState<ScannerLookupStudent[]>([]);
  const [entryEvents, setEntryEvents] = useState<ScannerEntryEvent[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [entryResult, setEntryResult] = useState<ScannerEntryResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    let ignore = false;
    getScannerEntryEvents()
      .then((result) => {
        if (ignore) return;
        if (result.success && result.data) {
          setEntryEvents(result.data);
        }
      })
      .catch(() => {
        if (!ignore) setError("설명회 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!ignore) setEventsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const expandedStudent = useMemo(
    () => students.find((student) => student.key === expandedKey) ?? null,
    [expandedKey, students]
  );

  function resetLookupState() {
    setStudents([]);
    setExpandedKey(null);
    setEntryResult(null);
    setHasSearched(false);
  }

  function appendDigit(digit: string) {
    if (searching) return;
    setLast4((current) => {
      if (current.length >= 4) return current;
      return `${current}${digit}`.slice(0, 4);
    });
    setError("");
    resetLookupState();
  }

  function deleteDigit() {
    if (searching) return;
    setLast4((current) => current.slice(0, -1));
    setError("");
    resetLookupState();
  }

  function clearDigits() {
    if (searching) return;
    setLast4("");
    setError("");
    resetLookupState();
  }

  async function handleSearch() {
    const digits = normalizePhoneNumber(last4);
    if (digits.length !== 4) {
      setError("연락처 뒷자리 4자리를 입력해 주세요.");
      setStudents([]);
      setExpandedKey(null);
      setEntryResult(null);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setError("");
    setEntryResult(null);
    setExpandedKey(null);

    try {
      const result = await searchScannerStudentsByPhoneLast4(digits);
      if (!result.success || !result.data) {
        setError(result.error ?? "학생 조회에 실패했습니다.");
        setStudents([]);
        setHasSearched(true);
        return;
      }

      setStudents(result.data);
      setHasSearched(true);
    } catch {
      setError("학생 조회 중 오류가 발생했습니다.");
      setStudents([]);
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  async function handleReservedEntry(reservationId: string) {
    setEnteringId(reservationId);
    setError("");
    setEntryResult(null);

    try {
      const result = await enterReservedReservationFromScanner(reservationId);
      if (!result.success || !result.data) {
        setError(result.error ?? "입장 처리에 실패했습니다.");
        return;
      }

      setEntryResult(result.data);
      onEntryComplete?.(result.data);
      setStudents((current) =>
        current.map((student) => ({
          ...student,
          reservations: student.reservations.map((reservation) =>
            reservation.id === reservationId
              ? {
                  ...reservation,
                  attendeeStatus: "ENTERED",
                  enteredAt: result.data?.enteredAt ?? reservation.enteredAt,
                }
              : reservation
          ),
        }))
      );
    } catch {
      setError("입장 처리 중 오류가 발생했습니다.");
    } finally {
      setEnteringId(null);
    }
  }

  async function handleUnreservedEntry(studentId: string, eventId: string) {
    const actionId = `${studentId}:${eventId}`;
    setEnteringId(actionId);
    setError("");
    setEntryResult(null);

    try {
      const result = await enterUnreservedStudentFromScanner({ studentId, eventId });
      if (!result.success || !result.data) {
        setError(result.error ?? "입장 처리에 실패했습니다.");
        return;
      }

      setEntryResult(result.data);
      onEntryComplete?.(result.data);
    } catch {
      setError("입장 처리 중 오류가 발생했습니다.");
    } finally {
      setEnteringId(null);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">연락처 입장</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">예약 연락처 뒷자리 4자리</p>
        </div>
        <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">
          수동
        </span>
      </div>

      <div className="mb-4">
        <div
          className="mb-3 grid grid-cols-4 gap-2"
          aria-label="입력된 연락처 뒷자리"
          aria-live="polite"
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`flex h-14 items-center justify-center rounded-lg border text-xl font-bold transition-colors ${
                last4[index]
                  ? "border-primary bg-accent text-primary"
                  : "border-input bg-background text-muted-foreground"
              }`}
            >
              {last4[index] ?? ""}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2" aria-label="연락처 뒷자리 키패드">
          {DIGIT_KEYS.map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={searching || last4.length >= 4}
              onClick={() => appendDigit(digit)}
              className="flex h-14 items-center justify-center rounded-lg border border-input bg-card font-display text-xl font-bold text-foreground transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            disabled={searching || last4.length === 0}
            onClick={deleteDigit}
            className="flex h-14 items-center justify-center rounded-lg border border-input bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            지움
          </button>
          <button
            type="button"
            disabled={searching || last4.length >= 4}
            onClick={() => appendDigit("0")}
            className="flex h-14 items-center justify-center rounded-lg border border-input bg-card font-display text-xl font-bold text-foreground transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={searching || last4.length !== 4}
            onClick={handleSearch}
            className="flex h-14 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? "조회 중" : "조회"}
          </button>
        </div>

        {last4.length > 0 && (
          <button
            type="button"
            disabled={searching}
            onClick={clearDigits}
            className="mt-2 w-full rounded-lg border border-input bg-card py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background disabled:opacity-50"
          >
            초기화
          </button>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {entryResult && (
        <div
          className={`mb-4 rounded-xl border p-4 ${
            entryResult.alreadyEntered
              ? "border-warning/40 bg-warning/10"
              : "border-success/30 bg-success/10"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p
              className={`text-sm font-semibold ${
                entryResult.alreadyEntered ? "text-warning-foreground" : "text-success"
              }`}
            >
              {entryResult.alreadyEntered ? "이미 입장 완료" : "입장 완료"}
            </p>
            <span className="text-xs text-muted-foreground">
              {new Date(entryResult.enteredAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="text-base font-bold text-foreground">{entryResult.attendeeName}</p>
          <p className="text-xs text-muted-foreground">{entryResult.phone}</p>
          <p className="mt-1 text-sm text-muted-foreground">{entryResult.eventTitle}</p>
        </div>
      )}

      {!hasSearched && (
        <div className="rounded-xl border border-dashed border-input bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">검색 대기</p>
        </div>
      )}

      {hasSearched && !searching && students.length === 0 && (
        <div className="rounded-xl border border-dashed border-input bg-background px-4 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">조회된 학생이 없습니다</p>
        </div>
      )}

      {students.length > 0 && (
        <div className="space-y-3">
          {students.map((student) => {
            const hasReservations = student.reservations.length > 0;
            const isExpanded = expandedKey === student.key;
            const canEnterWithoutReservation = !hasReservations && Boolean(student.studentId);

            return (
              <div key={student.key} className="overflow-hidden rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setExpandedKey(isExpanded ? null : student.key)}
                  className="w-full bg-card p-4 text-left transition-colors hover:bg-background"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-foreground">{student.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {student.school} · {student.grade}
                        {student.className ? ` · ${student.className}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        hasReservations
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {hasReservations ? "예약" : "미예약"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">
                      {formatPhoneNumber(student.phone)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {isExpanded ? "접기" : "선택"}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border bg-background p-3">
                    {hasReservations ? (
                      <div className="space-y-2">
                        {student.reservations.map((reservation) => {
                          const entered = reservation.attendeeStatus === "ENTERED";
                          const buttonLabel = entered
                            ? "입장 완료"
                            : enteringId === reservation.id
                              ? "처리 중"
                              : "입장 처리";

                          return (
                            <button
                              key={reservation.id}
                              type="button"
                              disabled={enteringId !== null || entered}
                              onClick={() => handleReservedEntry(reservation.id)}
                              className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              <div className="mb-1 flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {reservation.eventTitle}
                                </p>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                    entered
                                      ? "bg-success/15 text-success"
                                      : "bg-primary text-white"
                                  }`}
                                >
                                  {buttonLabel}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatEventDate(reservation.eventDate)}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {eventLabel(reservation)} · {reservation.attendeeCount}명
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : canEnterWithoutReservation ? (
                      <div className="space-y-2">
                        {eventsLoading && (
                          <p className="rounded-lg bg-card px-3 py-3 text-center text-sm text-muted-foreground">
                            설명회 목록 로딩 중
                          </p>
                        )}
                        {!eventsLoading && entryEvents.length === 0 && (
                          <p className="rounded-lg bg-card px-3 py-3 text-center text-sm text-muted-foreground">
                            선택 가능한 설명회가 없습니다
                          </p>
                        )}
                        {!eventsLoading &&
                          entryEvents.map((event) => {
                            const actionId = `${student.studentId}:${event.id}`;
                            return (
                              <button
                                key={event.id}
                                type="button"
                                disabled={enteringId !== null}
                                onClick={() =>
                                  handleUnreservedEntry(student.studentId as string, event.id)
                                }
                                className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <div className="mb-1 flex items-start justify-between gap-2">
                                  <p className="text-sm font-semibold text-foreground">
                                    {event.title}
                                  </p>
                                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white">
                                    {enteringId === actionId ? "처리 중" : "현장 입장"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatEventDate(event.date)}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {eventLabel(event)}
                                </p>
                              </button>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="rounded-lg bg-card px-3 py-3 text-center text-sm text-muted-foreground">
                        예약 정보만 있는 학생은 예약 선택으로만 입장 처리할 수 있습니다
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {expandedStudent && expandedStudent.reservations.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          예약 {expandedStudent.reservations.length}건 중 입장할 설명회를 선택하세요.
        </p>
      )}
    </section>
  );
}
