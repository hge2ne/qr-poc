import { getEventOptions, getPhoneReservationDashboard } from "@/actions/events";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminCancelReservationButton } from "../events/[id]/AdminCancelReservationButton";
import { PhoneReservationEventSelect } from "./PhoneReservationEventSelect";

function formatEventDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatReservationPath(path: "ENROLLED" | "GUEST") {
  return path === "ENROLLED" ? "재원생" : "비재원생";
}

function ReservationStatusBadge({
  status,
  attendeeStatus,
}: {
  status: "RESERVED" | "CANCELLED";
  attendeeStatus: "PENDING" | "ENTERED" | "CANCELLED" | null;
}) {
  if (status === "CANCELLED" || attendeeStatus === "CANCELLED") {
    return (
      <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive">
        취소
      </span>
    );
  }

  if (attendeeStatus === "ENTERED") {
    return (
      <span className="rounded-full bg-success/15 px-2 py-1 text-xs font-medium text-success/90">
        입장 완료
      </span>
    );
  }

  return (
    <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
      예약
    </span>
  );
}

export default async function PhoneReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/my-qr");

  const eventOptions = await getEventOptions();
  const requestedEventId = (await searchParams).eventId;
  const selectedEventId =
    eventOptions.find((event) => event.id === requestedEventId)?.id ?? eventOptions[0]?.id ?? "";
  const dashboard = selectedEventId
    ? await getPhoneReservationDashboard(selectedEventId)
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">전화예약/취소</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          설명회별 예약 현황과 취소 처리를 확인합니다.
        </p>
      </div>

      {eventOptions.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-muted-foreground">
          <p className="mb-1 text-lg">등록된 설명회가 없습니다</p>
          <Link href="/events/new" className="text-sm text-primary hover:underline">
            첫 설명회를 만들어보세요 →
          </Link>
        </div>
      ) : dashboard && (
        <>
          <div className="mb-4 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-primary">선택된 설명회</span>
                <h2 className="mt-1 text-xl font-bold text-foreground">{dashboard.event.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatEventDate(dashboard.event.date)} {formatEventTime(dashboard.event.date)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboard.event.campus} · {dashboard.event.location}
                </p>
              </div>
              <div className="w-full shrink-0 lg:w-auto">
                <PhoneReservationEventSelect
                  events={eventOptions}
                  currentEventId={selectedEventId}
                />
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">전화 예약인원</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {dashboard.metrics.phoneReservationCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">입장완료 인원</p>
              <p className="mt-1 text-3xl font-bold text-success">
                {dashboard.metrics.enteredCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">미체크</p>
              <p className="mt-1 text-3xl font-bold text-foreground">
                {dashboard.metrics.uncheckedCount}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">취소</p>
              <p className="mt-1 text-3xl font-bold text-destructive">
                {dashboard.metrics.cancelledCount}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex flex-col gap-3 border-b border-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-foreground">
                예약자 목록 ({dashboard.metrics.phoneReservationCount}명)
              </h2>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-muted-foreground">
                  선택된 설명회의 수동예약만 표시
                </span>
                <Link
                  href={`/phone-reservations/${dashboard.event.id}/new`}
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  + 수동예약
                </Link>
              </div>
            </div>
            {dashboard.reservations.length === 0 ? (
              <div className="px-5 py-10 text-center text-muted-foreground">
                <p className="mb-1">수동예약자가 없습니다.</p>
                <Link
                  href={`/phone-reservations/${dashboard.event.id}/new`}
                  className="text-sm text-primary hover:underline"
                >
                  수동예약 시작 →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead>
                    <tr className="border-b border-muted bg-background">
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        이름
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        학부모 연락처
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        구분
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        인원
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        상태
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                        입장 시간
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                        관리
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-background">
                    {dashboard.reservations.map((reservation) => (
                      <tr key={reservation.id} className="transition-colors hover:bg-background">
                        <td className="px-5 py-3.5">
                          <p className="text-sm font-medium text-foreground">
                            {reservation.studentName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[reservation.school, reservation.grade, reservation.className]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {reservation.phone}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {formatReservationPath(reservation.path)}
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {reservation.attendeeCount}명
                        </td>
                        <td className="px-5 py-3.5">
                          <ReservationStatusBadge
                            status={reservation.status}
                            attendeeStatus={reservation.attendeeStatus}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">
                          {reservation.enteredAt
                            ? new Date(reservation.enteredAt).toLocaleString("ko-KR")
                            : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {reservation.status === "CANCELLED" ||
                          reservation.attendeeStatus === "CANCELLED" ? (
                            <span className="text-xs text-muted-foreground">취소됨</span>
                          ) : reservation.attendeeStatus === "ENTERED" ? (
                            <span className="text-xs text-muted-foreground">입장 완료</span>
                          ) : (
                            <AdminCancelReservationButton reservationId={reservation.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
