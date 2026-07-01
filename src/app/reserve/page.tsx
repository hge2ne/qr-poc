import { MobileReservationFlow } from "@/components/mobile/MobileReservationFlow";

// 학부모용 공개 예약 화면 (로그인 불필요). 실기기에서 전체화면 모바일 뷰로 표시.
export default function ReservePage() {
  return (
    <div className="flex min-h-screen justify-center bg-gray-100">
      <div className="flex min-h-screen w-full max-w-md flex-col bg-gray-50 shadow-sm">
        <MobileReservationFlow />
      </div>
    </div>
  );
}
