import Link from "next/link";
import { notFound } from "next/navigation";
import { getReservationDetail } from "@/actions/reservations";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ReservationDetailPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const result = await getReservationDetail(reservationId);
  if (!result.success || !result.data) notFound();

  const reservation = result.data;
  const isCancelled = reservation.status === "cancelled";
  const canShowQr = !isCancelled && Boolean(reservation.qrUrl);

  return (
    <div className="min-h-screen overflow-x-hidden bg-muted">
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background px-4 py-6 shadow-sm">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold text-primary/90">
            {reservation.session.campus}
          </p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-tight text-foreground">
              예약 상세
            </h1>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isCancelled
                  ? "bg-muted text-muted-foreground"
                  : "bg-success/15 text-success/90"
              }`}
            >
              {isCancelled ? "취소 요청 완료" : "예약 완료"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            예약 정보와 현장 입장 QR을 확인할 수 있습니다.
          </p>

          <div className="mt-5 space-y-2">
            <SummaryRow label="설명회" value={reservation.session.title} />
            <SummaryRow
              label="일시"
              value={`${formatDate(reservation.session.date)} ${reservation.session.time}`}
            />
            <SummaryRow label="캠퍼스" value={reservation.session.campus} />
            <SummaryRow label="장소" value={reservation.session.location} />
            <SummaryRow label="예약자" value={reservation.name} />
            {reservation.school && <SummaryRow label="학교" value={reservation.school} />}
            {reservation.grade && <SummaryRow label="학년" value={reservation.grade} />}
            <SummaryRow label="학부모 연락처" value={reservation.phone} />
            {reservation.attendeeCount && (
              <SummaryRow label="참석 인원" value={`${reservation.attendeeCount}명`} />
            )}
            <SummaryRow
              label="구분"
              value={reservation.path === "enrolled" ? "재원생" : "비재원생"}
            />
            <SummaryRow label="예약일" value={formatDateTime(reservation.createdAt)} />
            {reservation.cancelledAt && (
              <SummaryRow
                label="취소 요청일"
                value={formatDateTime(reservation.cancelledAt)}
              />
            )}
          </div>
        </div>

        <section className="mt-4 rounded-xl border border-info/30 bg-info-bg px-4 py-3">
          <h2 className="text-sm font-semibold text-info-bg-foreground">예약 URL</h2>
          <Link
            href={reservation.reservationUrl}
            className="mt-1 block break-all text-xs font-medium text-info hover:underline"
          >
            {reservation.reservationUrl}
          </Link>
        </section>

        <section className="mt-5 rounded-2xl border border-border bg-card p-5 text-center">
          <h2 className="text-sm font-semibold text-foreground">입장 QR</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            설명회 당일 현장에서 아래 QR 또는 URL을 제시해 주세요.
          </p>
          <div className="mt-4">
            {canShowQr && reservation.qrUrl ? (
              <QRCodeDisplay
                value={reservation.qrUrl}
                size={200}
                downloadName={`${reservation.name}_${reservation.session.title}_QR`}
              />
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                취소 요청된 예약은 QR을 사용할 수 없습니다.
              </p>
            )}
          </div>
        </section>

        <Link
          href="/reserve"
          className="mt-5 rounded-lg border border-input py-2.5 text-center text-sm font-medium text-muted-foreground transition-colors hover:bg-background"
        >
          예약 화면으로
        </Link>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
