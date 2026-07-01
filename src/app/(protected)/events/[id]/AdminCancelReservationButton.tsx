"use client";

import { adminCancelReservation } from "@/actions/reservations";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminCancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    if (!confirm("이 예약을 취소하시겠습니까? 취소된 QR은 입장에 사용할 수 없습니다.")) return;

    startTransition(async () => {
      try {
        const result = await adminCancelReservation({ id: reservationId });
        if (!result.success) {
          alert(result.error ?? "예약 취소에 실패했습니다.");
          return;
        }
        router.refresh();
      } catch {
        alert("예약 취소에 실패했습니다.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isPending}
      className="rounded-md border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "취소 중..." : "예약 취소"}
    </button>
  );
}
