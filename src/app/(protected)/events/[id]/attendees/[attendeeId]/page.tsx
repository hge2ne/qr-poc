import { getAttendee } from "@/actions/attendees";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeeActions } from "./AttendeeActions";

export default async function AttendeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; attendeeId: string }>;
}) {
  const { id: eventId, attendeeId } = await params;
  const attendee = await getAttendee(attendeeId);
  if (!attendee) notFound();

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">대시보드</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/events/${eventId}`} className="text-sm text-gray-400 hover:text-gray-600">
          {attendee.event.title}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-900 font-medium">{attendee.name}</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{attendee.name}</h1>
            <p className="text-sm text-gray-500">{attendee.phone}</p>
            <p className="text-xs text-gray-400 mt-1">{attendee.event.title}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              attendee.status === "ENTERED"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {attendee.status === "ENTERED" ? "✓ 입장 완료" : "미입장"}
          </span>
        </div>
        {attendee.enteredAt && (
          <p className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
            입장 시간: {new Date(attendee.enteredAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4 text-center">QR 코드</h2>
        <QRCodeDisplay
          value={attendee.qrUrl}
          size={240}
          downloadName={`${attendee.name}_${attendee.event.title}_QR`}
        />
      </div>

      <AttendeeActions attendeeId={attendeeId} eventId={eventId} />
    </div>
  );
}
