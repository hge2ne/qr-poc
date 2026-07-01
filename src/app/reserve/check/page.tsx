import { ReservationLookup } from "@/components/mobile/ReservationLookup";

// 학부모용 공개 예약 조회 화면 (로그인 불필요). 목업 예약 내역은 브라우저 저장소에서 조회.
export default function ReserveCheckPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-muted">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background shadow-sm">
        <ReservationLookup />
      </div>
    </div>
  );
}
