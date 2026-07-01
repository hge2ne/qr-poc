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
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-muted-foreground">대시보드</Link>
        <span className="text-input">/</span>
        <Link href={`/events/${eventId}`} className="text-sm text-muted-foreground hover:text-muted-foreground">
          {attendee.event.title}
        </Link>
        <span className="text-input">/</span>
        <span className="text-sm text-foreground font-medium">{attendee.name}</span>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{attendee.name}</h1>
            <p className="text-sm text-muted-foreground">{attendee.phone}</p>
            {(attendee.school || attendee.grade || attendee.className) && (
              <p className="text-xs text-muted-foreground mt-1">
                {[attendee.school, attendee.grade, attendee.className].filter(Boolean).join(" · ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{attendee.event.title}</p>
            <p className="text-xs text-muted-foreground mt-1">참석 인원 {attendee.attendeeCount}명</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              attendee.status === "ENTERED"
                ? "bg-success/15 text-success/90"
                : attendee.status === "CANCELLED"
                  ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {attendee.status === "ENTERED"
              ? "✓ 입장 완료"
              : attendee.status === "CANCELLED"
                ? "취소"
                : "미입장"}
          </span>
        </div>
        {attendee.enteredAt && (
          <p className="text-xs text-success bg-success/10 px-3 py-1.5 rounded-lg">
            입장 시간: {new Date(attendee.enteredAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mb-4">
        <h2 className="font-semibold text-foreground mb-4 text-center">QR 코드</h2>
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
