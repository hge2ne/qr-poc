import { getEvent } from "@/actions/events";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendeeRegistrationForm } from "./AttendeeRegistrationForm";

function getAttendeeCountOptions(attendeeCountMax: number) {
  const max = Math.max(1, attendeeCountMax);
  return Array.from({ length: max }, (_, index) => index + 1);
}

export default async function NewAttendeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          QR 운영
        </Link>
        <span className="text-input">/</span>
        <Link
          href={`/events/${event.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {event.title}
        </Link>
        <span className="text-input">/</span>
        <span className="text-sm font-medium text-foreground">참석자 등록</span>
      </div>

      <AttendeeRegistrationForm
        eventId={event.id}
        attendeeCountEnabled={event.attendeeCountEnabled}
        attendeeCountOptions={
          event.attendeeCountEnabled ? getAttendeeCountOptions(event.attendeeCountMax) : [1]
        }
      />
    </div>
  );
}
