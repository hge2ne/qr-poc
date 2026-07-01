import { getReservationSessions } from "@/actions/reservations";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MobileReservationFlow } from "@/components/mobile/MobileReservationFlow";

export default async function MobilePreviewPage() {
  const session = await getSession();
  if (session?.role !== "ADMIN") redirect("/my-qr");
  const sessions = await getReservationSessions();

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">모바일 예약 프리뷰</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            학부모가 휴대폰에서 보는 설명회 예약 화면입니다. 실제 DB 예약 흐름과 연결됩니다.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            학부모 공개 주소: <code className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">/reserve</code> (로그인 불필요)
          </p>
        </div>
        <Link
          href="/reserve"
          target="_blank"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          실제 화면 열기 →
        </Link>
      </div>

      <PhoneFrame>
        <MobileReservationFlow
          embeddedCheck
          initialSessions={sessions.data ?? []}
          initialError={sessions.success ? undefined : sessions.error}
        />
      </PhoneFrame>
    </div>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[390px]">
      <div className="relative rounded-[2.5rem] border-[10px] border-foreground bg-foreground shadow-xl">
        {/* 노치 */}
        <div className="absolute left-1/2 top-0 z-20 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-foreground" />
        <div className="relative h-[760px] overflow-hidden rounded-[1.9rem] bg-background">
          {/* 상태바 */}
          <div className="flex items-center justify-between bg-card px-6 pb-1 pt-3 text-xs font-semibold text-foreground">
            <span>9:41</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <span>●●●●</span>
              <span>Wi-Fi</span>
              <span>100%</span>
            </span>
          </div>
          {/* 스크롤 영역 */}
          <div className="h-[calc(100%-2rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
