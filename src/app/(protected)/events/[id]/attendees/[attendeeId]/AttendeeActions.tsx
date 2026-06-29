"use client";

import { deleteAttendee } from "@/actions/attendees";
import { useRouter } from "next/navigation";

export function AttendeeActions({ attendeeId, eventId }: { attendeeId: string; eventId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("이 참석자를 삭제하시겠습니까?")) return;
    await deleteAttendee(attendeeId);
    router.push(`/events/${eventId}`);
  }

  return (
    <div className="flex justify-end">
      <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 transition-colors">
        참석자 삭제
      </button>
    </div>
  );
}
