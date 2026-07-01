import { getQRPass } from "@/actions/verify";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await getQRPass(token);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-destructive/30 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <div className="text-5xl mb-4">X</div>
          <h1 className="text-xl font-bold text-destructive mb-2">유효하지 않은 QR</h1>
          <p className="text-muted-foreground text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const data = result.data;
  const eventDate = new Date(data.eventDate).toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <main className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
            data.status === "ENTERED"
              ? "bg-warning/10 text-warning-foreground"
              : "bg-success/15 text-success/90"
          }`}
        >
          {data.status === "ENTERED" ? "이미 입장 처리됨" : "입장 대기"}
        </span>
        <h1 className="mt-3 text-xl font-bold text-foreground">입장 QR</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          현장 스캐너가 아래 QR을 인식해야 입장 확인이 진행됩니다.
        </p>

        <div className="mt-5 rounded-xl border border-border bg-background p-4 text-left">
          <SummaryRow label="설명회" value={data.eventTitle} />
          <SummaryRow label="일시" value={eventDate} />
          <SummaryRow label="장소" value={data.eventLocation} />
          <SummaryRow label="예약자" value={data.attendeeName} />
          <SummaryRow label="연락처" value={data.phone} />
          <SummaryRow label="참석 인원" value={`${data.attendeeCount}명`} />
          {data.enteredAt && (
            <SummaryRow
              label="입장 시간"
              value={new Date(data.enteredAt).toLocaleString("ko-KR")}
            />
          )}
        </div>

        <div className="mt-5">
          <QRCodeDisplay
            value={data.qrUrl}
            size={220}
            downloadName={`${data.attendeeName}_${data.eventTitle}_QR`}
          />
        </div>

        <p className="mt-4 rounded-lg bg-info-bg px-3 py-2 text-xs leading-relaxed text-info-bg-foreground">
          이 페이지를 여는 것만으로는 입장 처리되지 않습니다.
        </p>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
