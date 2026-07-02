"use client";

import { deleteAttendee } from "@/actions/attendees";
import { useRouter } from "next/navigation";

export function AttendeeActions({ attendeeId, eventId }: { attendeeId: string; eventId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("이 참석자를 취소하시겠습니까? 연결된 예약도 함께 취소됩니다.")) return;
    const result = await deleteAttendee(attendeeId);
    if (!result.success) {
      alert(result.error ?? "참석자 취소에 실패했습니다.");
      return;
    }
    router.push(`/events/${eventId}`);
    router.refresh();
  }

  return (
    <div className="flex justify-end">
      <button onClick={handleDelete} className="text-sm text-destructive hover:text-destructive transition-colors">
        참석자 취소
      </button>
    </div>
  );
}
