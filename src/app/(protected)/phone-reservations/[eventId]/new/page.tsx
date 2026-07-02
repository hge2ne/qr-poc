import { getEvent } from "@/actions/events";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneManualReservationForm } from "../../PhoneManualReservationForm";

function getAttendeeCountOptions(attendeeCountMax: number) {
  const max = Math.max(1, attendeeCountMax);
  return Array.from({ length: max }, (_, index) => index + 1);
}

export default async function NewPhoneReservationPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const event = await getEvent(eventId);
  if (!event) notFound();

  const phoneReservationsHref = `/phone-reservations?eventId=${event.id}`;

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={phoneReservationsHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          전화예약/취소
        </Link>
        <span className="text-input">/</span>
        <Link
          href={phoneReservationsHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {event.title}
        </Link>
        <span className="text-input">/</span>
        <span className="text-sm font-medium text-foreground">수동예약</span>
      </div>

      <PhoneManualReservationForm
        eventId={event.id}
        returnHref={phoneReservationsHref}
        attendeeCountEnabled={event.attendeeCountEnabled}
        attendeeCountOptions={
          event.attendeeCountEnabled ? getAttendeeCountOptions(event.attendeeCountMax) : [1]
        }
      />
    </div>
  );
}
