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
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">대시보드</Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">{event.title}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{event.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {new Date(event.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}{" "}
              {new Date(event.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-sm text-gray-500">{event.location}</p>
            {event.description && <p className="text-sm text-gray-400 mt-1">{event.description}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{entered}</p>
            <p className="text-xs text-gray-400">/ {event.attendees.length}명 입장</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">참석자 목록 ({event.attendees.length}명)</h2>
          <Link
            href={`/events/${event.id}/attendees/new`}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 참석자 등록
          </Link>
        </div>

        {event.attendees.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400">
            <p className="mb-1">등록된 참석자가 없습니다</p>
            <Link href={`/events/${event.id}/attendees/new`} className="text-sm text-blue-600 hover:underline">
              첫 참석자를 등록하세요 →
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">이름</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">연락처</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">입장 시간</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase">QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {event.attendees.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{a.name}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{a.phone}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        a.status === "ENTERED"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {a.status === "ENTERED" ? "입장 완료" : "미입장"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">
                    {a.enteredAt ? new Date(a.enteredAt).toLocaleString("ko-KR") : "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link
                      href={`/events/${event.id}/attendees/${a.id}`}
                      className="text-xs text-blue-600 hover:underline"
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
