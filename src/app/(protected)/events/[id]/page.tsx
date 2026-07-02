import { getEvent, getEventOptions } from "@/actions/events";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCancelReservationButton } from "./AdminCancelReservationButton";
import { DeleteEventButton } from "./DeleteEventButton";
import { EventDashboardSelect } from "./EventDashboardSelect";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, eventOptions] = await Promise.all([getEvent(id), getEventOptions()]);
  if (!event) notFound();

  const activeAttendeeCount = event.attendees
    .filter((a) => a.status !== "CANCELLED")
    .reduce((sum, attendee) => sum + attendee.attendeeCount, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">QR 운영</Link>
        <span className="text-input">/</span>
        <span className="text-sm text-foreground font-medium">{event.title}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{event.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(event.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}{" "}
              {new Date(event.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-muted-foreground">{event.location}</p>
            <p className="text-sm text-muted-foreground">{event.campus}</p>
            {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
          </div>
          <div className="w-full shrink-0 lg:w-auto">
            <EventDashboardSelect events={eventOptions} currentEventId={event.id} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">정원</p>
          <p className="text-3xl font-bold text-foreground mt-1">{event.metrics.capacityCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">학원재원생 전체 인원</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">체크인 완료</p>
          <p className="text-3xl font-bold text-success mt-1">{event.metrics.checkedInCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">미체크</p>
          <p className="text-3xl font-bold text-foreground mt-1">{event.metrics.uncheckedReservationCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">예약 인원 중 미체크</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">수동 체크</p>
          <p className="text-3xl font-bold text-primary mt-1">{event.metrics.manualCheckCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground">오류</p>
          <p className="text-3xl font-bold text-destructive mt-1">{event.metrics.errorCount}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-muted flex items-center justify-between">
          <h2 className="font-semibold text-foreground">참석자 목록 ({activeAttendeeCount}명)</h2>
          <Link
            href={`/events/${event.id}/attendees/new`}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + 수동 체크인
          </Link>
        </div>

        {event.attendees.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <p className="mb-1">등록된 참석자가 없습니다</p>
            <Link href={`/events/${event.id}/attendees/new`} className="text-sm text-primary hover:underline">
              수동 체크인 시작 →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-muted bg-background">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">이름</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">학부모 연락처</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">인원</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">상태</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">입장 시간</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">QR</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-background">
                {event.attendees.map((a) => (
                  <tr key={a.id} className="hover:bg-background transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-foreground">{a.name}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.phone}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.attendeeCount}명</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          a.status === "ENTERED"
                            ? "bg-success/15 text-success/90"
                            : a.status === "CANCELLED"
                              ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {a.status === "ENTERED"
                          ? "입장 완료"
                          : a.status === "CANCELLED"
                            ? "취소"
                            : "미입장"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">
                      {a.enteredAt ? new Date(a.enteredAt).toLocaleString("ko-KR") : "-"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/events/${event.id}/attendees/${a.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        QR 보기
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {a.reservationId ? (
                        a.status === "CANCELLED" ? (
                          <span className="text-xs text-muted-foreground">취소됨</span>
                        ) : a.status === "ENTERED" ? (
                          <span className="text-xs text-muted-foreground">입장 완료</span>
                        ) : (
                          <AdminCancelReservationButton reservationId={a.reservationId} />
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">미예약</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <DeleteEventButton eventId={event.id} />
      </div>
    </div>
  );
}
