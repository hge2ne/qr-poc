import { getEvent } from "@/actions/events";
import { deleteEvent } from "@/actions/events";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteEventButton } from "./DeleteEventButton";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const entered = event.attendees.filter((a) => a.status === "ENTERED").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-muted-foreground">대시보드</Link>
        <span className="text-input">/</span>
        <span className="text-sm text-foreground font-medium">{event.title}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
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
            {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">{entered}</p>
            <p className="text-xs text-muted-foreground">/ {event.attendees.length}명 입장</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-muted flex items-center justify-between">
          <h2 className="font-semibold text-foreground">참석자 목록 ({event.attendees.length}명)</h2>
          <Link
            href={`/events/${event.id}/attendees/new`}
            className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + 참석자 등록
          </Link>
        </div>

        {event.attendees.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground">
            <p className="mb-1">등록된 참석자가 없습니다</p>
            <Link href={`/events/${event.id}/attendees/new`} className="text-sm text-primary hover:underline">
              첫 참석자를 등록하세요 →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted bg-background">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">이름</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">연락처</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">상태</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase">입장 시간</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background">
              {event.attendees.map((a) => (
                <tr key={a.id} className="hover:bg-background transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-foreground">{a.name}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.phone}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        a.status === "ENTERED"
                          ? "bg-success/15 text-success/90"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {a.status === "ENTERED" ? "입장 완료" : "미입장"}
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <DeleteEventButton eventId={event.id} />
      </div>
    </div>
  );
}
