"use client";

import { deleteEvent } from "@/actions/events";
import { useRouter } from "next/navigation";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("이 설명회를 삭제하면 모든 참석자 데이터도 함께 삭제됩니다. 계속하시겠습니까?")) return;
    await deleteEvent(eventId);
    router.push("/dashboard");
  }

  return (
    <button onClick={handleDelete} className="text-sm text-red-400 hover:text-red-600 transition-colors">
      이 설명회 삭제
    </button>
  );
}
