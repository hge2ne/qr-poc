import { verifyQRToken } from "@/actions/verify";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await verifyQRToken(token);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-destructive/30 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-destructive mb-2">유효하지 않은 QR</h1>
          <p className="text-muted-foreground text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const data = result.data!;

  if (data.alreadyEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card border border-warning/40 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-warning-foreground mb-4">이미 입장 처리됨</h1>
          <p className="text-foreground font-bold text-2xl">{data.attendeeName}</p>
          <p className="text-muted-foreground text-sm mt-1">{data.phone}</p>
          <p className="text-muted-foreground text-sm mt-0.5">{data.eventTitle}</p>
          <div className="mt-4 bg-warning/10 rounded-lg px-4 py-2">
            <p className="text-warning-foreground text-sm">
              입장 시간: {new Date(data.enteredAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-success/30 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-success/90 mb-4">입장 완료</h1>
        <p className="text-foreground font-bold text-2xl">{data.attendeeName}</p>
        <p className="text-muted-foreground text-sm mt-1">{data.phone}</p>
        <p className="text-muted-foreground text-sm mt-0.5">{data.eventTitle}</p>
        <div className="mt-4 bg-success/10 rounded-lg px-4 py-2">
          <p className="text-success/90 text-sm">
            {new Date(data.enteredAt).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>
    </div>
  );
}
