import { getEvents } from "@/actions/events";
import { getSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/my-qr");

  const events = await getEvents();
  const totalAttendees = events.reduce((sum, e) => sum + e.totalCount, 0);
  const totalEntered = events.reduce((sum, e) => sum + e.enteredCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">대시보드</h1>
        <Link
          href="/events/new"
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          + 새 설명회 생성
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">전체 설명회</p>
          <p className="text-3xl font-bold text-foreground mt-1">{events.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">전체 예약 인원</p>
          <p className="text-3xl font-bold text-foreground mt-1">{totalAttendees}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">입장 완료</p>
          <p className="text-3xl font-bold text-success mt-1">{totalEntered}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-muted flex items-center justify-between">
          <h2 className="font-semibold text-foreground">설명회 목록</h2>
        </div>
        {events.length === 0 ? (
          <div className="px-5 py-12 text-center text-muted-foreground">
            <p className="text-lg mb-1">등록된 설명회가 없습니다</p>
            <Link href="/events/new" className="text-sm text-primary hover:underline">
              첫 설명회를 만들어보세요 →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-muted bg-background">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">설명회명</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">날짜</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">장소</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">예약 / 입장</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-background">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-background transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/events/${event.id}`} className="text-primary hover:underline font-medium text-sm">
                      {event.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.campus}</p>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{event.location}</td>
                  <td className="px-5 py-3.5 text-sm text-right">
                    <span className="text-success font-medium">{event.enteredCount}</span>
                    <span className="text-muted-foreground"> / {event.totalCount}명</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
