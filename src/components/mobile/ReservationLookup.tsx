"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import {
  cancelReservation,
  cancelReservations,
  findReservationsByContact,
  type StoredReservation,
} from "./reservationStorage";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReservationLookup({ onBackToReserve }: { onBackToReserve?: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<StoredReservation[] | null>(null);
  const [message, setMessage] = useState("");

  function searchReservations(nextName = name, nextPhone = phone) {
    const found = findReservationsByContact({ name: nextName, phone: nextPhone });
    setResults(found);
    setMessage(found.length ? "" : "조회된 예약이 없습니다.");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    searchReservations();
  }

  function refreshResults() {
    searchReservations(name, phone);
  }

  function handleCancel(id: string) {
    if (!window.confirm("이 예약의 취소를 요청하시겠습니까?")) return;
    cancelReservation(id);
    refreshResults();
  }

  function handleCancelAll() {
    if (!results) return;
    const activeIds = results
      .filter((reservation) => reservation.status === "reserved")
      .map((reservation) => reservation.id);

    if (!activeIds.length) return;
    if (!window.confirm("조회된 예약을 모두 취소 요청하시겠습니까?")) return;

    cancelReservations(activeIds);
    refreshResults();
  }

  const activeCount = results?.filter((reservation) => reservation.status === "reserved").length ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <Logo className="text-xl" />
        <span className="text-sm font-semibold text-muted-foreground">예약 조회/취소</span>
      </header>

      <div className="flex-1 px-4 py-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-foreground">예약 조회/취소</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            예약자 이름과 연락처를 입력하면 예약 내역과 취소 요청을 확인할 수 있습니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">예약자 이름 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">연락처 *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full rounded-lg border border-input px-3 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            예약 조회
          </button>
        </form>

        {message && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {message}
          </p>
        )}

        {results && results.length > 0 && (
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                조회된 예약 {results.length}건
              </h3>
              {activeCount > 1 && (
                <button
                  type="button"
                  onClick={handleCancelAll}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  모두 취소 요청
                </button>
              )}
            </div>

            {results.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onCancel={handleCancel}
              />
            ))}
          </div>
        )}

        {onBackToReserve ? (
          <button
            type="button"
            onClick={onBackToReserve}
            className="mt-6 block w-full rounded-lg border border-input py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
          >
            예약 화면으로
          </button>
        ) : (
          <Link
            href="/reserve"
            className="mt-6 block w-full rounded-lg border border-input py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
          >
            예약 화면으로
          </Link>
        )}
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  onCancel,
}: {
  reservation: StoredReservation;
  onCancel: (id: string) => void;
}) {
  const isCancelled = reservation.status === "cancelled";
  const hasSeparatedSchoolGrade = Boolean(reservation.school || reservation.grade);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary/90">
            {reservation.session.campus ?? "송파캠퍼스"}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">
            {reservation.session.title}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            isCancelled
              ? "bg-muted text-muted-foreground"
              : "bg-success/15 text-success/90"
          }`}
        >
          {isCancelled ? "취소 요청 완료" : "예약 완료"}
        </span>
      </div>

      <div className="space-y-2">
        <SummaryRow
          label="일시"
          value={`${formatDate(reservation.session.date)} ${reservation.session.time}`}
        />
        <SummaryRow label="캠퍼스" value={reservation.session.campus ?? "송파캠퍼스"} />
        <SummaryRow label="장소" value={reservation.session.location} />
        <SummaryRow
          label="예약자"
          value={
            reservation.extra && !hasSeparatedSchoolGrade
              ? `${reservation.name} (${reservation.extra})`
              : reservation.name
          }
        />
        {reservation.school && <SummaryRow label="학교" value={reservation.school} />}
        {reservation.grade && <SummaryRow label="학년" value={reservation.grade} />}
        <SummaryRow label="연락처" value={reservation.phone} />
        {reservation.attendeeCount && (
          <SummaryRow label="참석 인원" value={`${reservation.attendeeCount}명`} />
        )}
        <SummaryRow
          label="구분"
          value={reservation.path === "enrolled" ? "재원생" : "비재원생"}
        />
        <SummaryRow label="예약일" value={formatDateTime(reservation.createdAt)} />
        {reservation.cancelledAt && (
          <SummaryRow label="취소 요청일" value={formatDateTime(reservation.cancelledAt)} />
        )}
      </div>

      {isCancelled ? (
        <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-xs font-medium text-muted-foreground">
          취소 요청된 예약입니다
        </p>
      ) : (
        <button
          type="button"
          onClick={() => onCancel(reservation.id)}
          className="mt-4 w-full rounded-lg border border-destructive/30 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          취소 요청
        </button>
      )}
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
