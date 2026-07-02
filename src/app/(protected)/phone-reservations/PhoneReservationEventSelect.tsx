"use client";

import { useRouter } from "next/navigation";

type EventOption = {
  id: string;
  title: string;
  date: string;
  campus: string;
  round: string | null;
  location: string;
};

function formatEventOption(event: EventOption) {
  const date = new Date(event.date).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  return [event.title, date, event.campus, event.round, event.location]
    .filter(Boolean)
    .join(" · ");
}

export function PhoneReservationEventSelect({
  events,
  currentEventId,
}: {
  events: EventOption[];
  currentEventId: string;
}) {
  const router = useRouter();

  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        설명회 선택
      </span>
      <select
        value={currentEventId}
        onChange={(event) => router.push(`/phone-reservations?eventId=${event.target.value}`)}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring sm:w-[360px]"
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {formatEventOption(event)}
          </option>
        ))}
      </select>
    </label>
  );
}
