import { verifyQRToken } from "@/actions/verify";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await verifyQRToken(token);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-red-200 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-red-600 mb-2">유효하지 않은 QR</h1>
          <p className="text-gray-500 text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const data = result.data!;

  if (data.alreadyEntered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-yellow-200 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-yellow-700 mb-4">이미 입장 처리됨</h1>
          <p className="text-gray-900 font-bold text-2xl">{data.attendeeName}</p>
          <p className="text-gray-500 text-sm mt-1">{data.phone}</p>
          <p className="text-gray-400 text-sm mt-0.5">{data.eventTitle}</p>
          <div className="mt-4 bg-yellow-50 rounded-lg px-4 py-2">
            <p className="text-yellow-700 text-sm">
              입장 시간: {new Date(data.enteredAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border border-green-200 rounded-2xl p-10 text-center max-w-sm w-full mx-4">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-xl font-bold text-green-700 mb-4">입장 완료</h1>
        <p className="text-gray-900 font-bold text-2xl">{data.attendeeName}</p>
        <p className="text-gray-500 text-sm mt-1">{data.phone}</p>
        <p className="text-gray-400 text-sm mt-0.5">{data.eventTitle}</p>
        <div className="mt-4 bg-green-50 rounded-lg px-4 py-2">
          <p className="text-green-700 text-sm">
            {new Date(data.enteredAt).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>
    </div>
  );
}
